"""Version Review kit: the server side, as a mixin for any http.server handler.

    class Handler(ReviewsMixin, http.server.SimpleHTTPRequestHandler):
        REVIEWS_DIR = '/path/to/ideas/reviews'

    GET  /__reviews/<name>                     the review file <name>.json ({} if none yet)
    POST /__reviews/<name>                     replace it (JSON object, up to 1 MB), written atomically
    GET  /__reviews/<name>/thumbs/<file>.jpg   a still made by review_thumbs.py, read-only
    GET  /__reviews/<name>/thumbs/thumbs.json  the list of stills

Before the first POST of each calendar day the file is copied to <name>.json.bak-YYYY-MM-DD
(once a day, never overwritten), so a bad save can always be undone by hand.
Addresses are matched by strict patterns, so no path can climb out of the reviews folder.
There is no way to write a still from the browser: stills come only from the script.
Bind the server to 127.0.0.1: the notes are private.

Safety (2026-11-04):
- A file that exists but cannot be read answers 500, never {}, so the browser keeps its change
  and never writes a near-empty file over the real one.
- A POST may carry "_ifrev": the "_rev" it last read. If the file has moved on since, the answer
  is 409 and the browser reads again, merges again and retries. Every write adds 1 to "_rev".
- A POST that says "schema": 2 may not drop item ids the file on disk has (409).
- Saves are serialised by a lock and go through a unique temporary file.
"""
import json
import os
import re
import shutil
import tempfile
import threading
import time

REVIEW_PATH = re.compile(r'^/__reviews/([a-z0-9-]{1,60})$')
THUMB_PATH = re.compile(r'^/__reviews/([a-z0-9-]{1,60})/thumbs/([a-z0-9-]{1,80}\.jpg|thumbs\.json)$')
MAX_BODY = 1_000_000
# one save at a time, across every handler thread: backup, write and replace never overlap
_LOCK = threading.Lock()


class ReviewsMixin:
    REVIEWS_DIR = None   # set by the subclass

    def _rv_path(self):
        return self.path.split('?')[0].split('#')[0]

    def _rv_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def reviews_get(self):
        """Answer a GET if it is a review address. Returns True when handled."""
        p = self._rv_path()
        m = REVIEW_PATH.match(p)
        if m:
            f = os.path.join(self.REVIEWS_DIR, m.group(1) + '.json')
            try:
                with _LOCK, open(f, encoding='utf-8') as fh:
                    data = json.load(fh)
            except FileNotFoundError:
                data = {}
            except (OSError, ValueError):
                # unreadable is not empty: say so, so nothing is saved on top of it
                self.send_error(500, 'review file unreadable')
                return True
            self._rv_json(200, data)
            return True
        m = THUMB_PATH.match(p)
        if m:
            f = os.path.join(self.REVIEWS_DIR, 'thumbs', m.group(1), m.group(2))
            try:
                with open(f, 'rb') as fh:
                    data = fh.read()
            except OSError:
                self.send_error(404)
                return True
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg' if f.endswith('.jpg') else 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
            return True
        return False

    def reviews_post(self):
        """Answer a POST if it is a review address. Returns True when handled."""
        m = REVIEW_PATH.match(self._rv_path())
        if not m:
            return False
        f = os.path.join(self.REVIEWS_DIR, m.group(1) + '.json')
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            self.send_error(400)
            return True
        if n <= 0 or n > MAX_BODY:
            self.send_error(413)
            return True
        try:
            data = json.loads(self.rfile.read(n).decode('utf-8'))
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            self.send_error(400)
            return True
        os.makedirs(self.REVIEWS_DIR, exist_ok=True)
        with _LOCK:
            try:
                with open(f, encoding='utf-8') as fh:
                    disk = json.load(fh)
                if not isinstance(disk, dict):
                    raise ValueError
            except FileNotFoundError:
                disk = None
            except (OSError, ValueError):
                self.send_error(500, 'review file unreadable')
                return True
            rev = (disk or {}).get('_rev', 0)
            if not isinstance(rev, int):
                rev = 0
            # older pages (logo, references) never see a _rev unless the kit has written the file
            counted = '_ifrev' in data or data.get('schema') == 2 or '_rev' in (disk or {})
            if '_ifrev' in data:
                if data.pop('_ifrev') != rev:
                    self._rv_json(409, {'ok': False, 'rev': rev})
                    return True
            if disk and data.get('schema') == 2 and isinstance(disk.get('items'), dict):
                lost = set(disk['items']) - set((data.get('items') or {}))
                if lost:
                    self._rv_json(409, {'ok': False, 'rev': rev, 'missing': sorted(lost)[:20]})
                    return True
            # the day's first save keeps a copy of the file as it was
            bak = f + '.bak-' + time.strftime('%Y-%m-%d')
            if disk is not None and not os.path.exists(bak):
                shutil.copy2(f, bak)
            data['_saved'] = time.strftime('%Y-%m-%d %H:%M:%S')
            if counted:
                data['_rev'] = rev + 1
            fd, tmp = tempfile.mkstemp(dir=self.REVIEWS_DIR, prefix='.' + m.group(1) + '.', suffix='.tmp')
            try:
                with os.fdopen(fd, 'w', encoding='utf-8') as fh:
                    json.dump(data, fh, ensure_ascii=False, indent=2)
                os.replace(tmp, f)
            except BaseException:
                try:
                    os.unlink(tmp)
                except OSError:
                    pass
                raise
        self._rv_json(200, {'ok': True, 'saved': data['_saved'], 'rev': data.get('_rev')})
        return True
