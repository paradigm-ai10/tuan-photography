#!/usr/bin/env python3
"""tuan photography 的本機伺服器 — local preview server.

跟 python -m http.server 幾乎一樣，只多做一件事：叫瀏覽器不要快取。
少了這個，每次改完 css / js 都得手動 Cmd+Shift+R 才看得到變化。

只綁 127.0.0.1：網站還沒公開，不開放給同一個 Wi-Fi 的其他裝置。
只送出網站資料夾（design 1/）裡的東西：原始照片、筆記、靈感都不在伺服器看得到的範圍內。

    python3 tools/serve.py                          design 1/ on port 8642
    python3 tools/serve.py 8643 experiments/<name>/design 1   an experiment, beside it
    python3 tools/serve.py auto elements            "auto": the port the app hands over in PORT (8647 if none)

評分頁（好／不好、筆記）：/__reviews/<名字> 讀寫 ideas/reviews/<名字>.json。ideas/ 不上 GitHub，
所以他的筆記只留在這台 Mac；Claude 直接讀那個檔，不用他複製貼上。
Review pages (good / not, notes): GET and POST /__reviews/<name> read and write
ideas/reviews/<name>.json, private (ideas/ is gitignored), read by Claude straight from the file.
The review kit's endpoints come from reviews_mixin.py (2026-11-04): also the stills under
/__reviews/<name>/thumbs/, a copy of each file before its first save of the day, a 1 MB cap.
"""
import functools
import http.server
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reviews_mixin import ReviewsMixin  # noqa: E402

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVIEWS = os.path.join(PROJECT, 'ideas', 'reviews')


class NoCacheHandler(ReviewsMixin, http.server.SimpleHTTPRequestHandler):
    REVIEWS_DIR = REVIEWS
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webmanifest': 'application/manifest+json',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # 安靜一點，終端機只留啟動訊息

    def do_GET(self):
        if not self.reviews_get():
            return super().do_GET()

    def do_POST(self):
        if not self.reviews_post():
            return self.send_error(404)


def main():
    port = sys.argv[1] if len(sys.argv) > 1 else '8642'
    # "auto": the Claude app assigns a free port through PORT, so two chats can both preview the same folder
    port = int(os.environ.get('PORT', 8647)) if port == 'auto' else int(port)
    os.chdir(PROJECT)   # 專案資料夾
    # 第二個參數：要預覽的資料夾（從專案資料夾算起），給 experiments/ 裡的試作版用
    os.chdir(sys.argv[2] if len(sys.argv) > 2 else "design 1")
    handler = functools.partial(NoCacheHandler, directory=os.getcwd())
    # a longer queue than the default 5, so a burst of saves and pictures is never turned away
    http.server.ThreadingHTTPServer.request_queue_size = 64
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        httpd.serve_forever()


if __name__ == '__main__':
    main()
