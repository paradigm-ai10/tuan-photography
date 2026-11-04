#!/usr/bin/env python3
"""Version Review kit: a small local server for a project that has none of its own.

    python3 review_server.py [--port 8642] [--root <folder to serve>] [--reviews <folder for the notes>]

Serves the folder as plain files (no caching, so a reload shows the latest), plus the review
endpoints from reviews_mixin.py. Bound to 127.0.0.1 only: nobody else on the network can reach it.
"""
import argparse
import functools
import http.server
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reviews_mixin import ReviewsMixin  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8642)
    ap.add_argument('--root', default='.')
    ap.add_argument('--reviews', default='reviews')
    a = ap.parse_args()
    reviews = os.path.abspath(a.reviews)

    class Handler(ReviewsMixin, http.server.SimpleHTTPRequestHandler):
        REVIEWS_DIR = reviews

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            super().end_headers()

        def log_message(self, fmt, *args):
            pass

        def do_GET(self):
            if not self.reviews_get():
                super().do_GET()

        def do_POST(self):
            if not self.reviews_post():
                self.send_error(404)

    handler = functools.partial(Handler, directory=os.path.abspath(a.root))
    # a longer queue than the default 5, so a burst of saves and pictures is never turned away
    http.server.ThreadingHTTPServer.request_queue_size = 64
    with http.server.ThreadingHTTPServer(('127.0.0.1', a.port), handler) as httpd:
        print(f'http://localhost:{a.port}/  (notes in {reviews})')
        httpd.serve_forever()


if __name__ == '__main__':
    main()
