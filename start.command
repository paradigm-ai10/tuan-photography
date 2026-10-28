#!/bin/bash
# 雙擊這個檔案就會開啟 tuan photography。關掉這個終端機視窗即可停止。
cd "$(dirname "$0")" || exit 1
python3 tools/finder_view.py >/dev/null 2>&1

# the site on 8642; design 2 (the Journey page) is served from inside it, as design 1/journey
if lsof -i ":8642" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "網站已經在 8642 執行中…"
else
  python3 tools/serve.py 8642 "design 1" >/dev/null &
fi
sleep 1

open "http://localhost:8642"

echo
echo "  網站：http://localhost:8642"
echo "  Journey 旅程頁：http://localhost:8642/journey/"
echo
echo "要停止伺服器，關掉這個視窗，或按 Ctrl+C。"
wait
