#!/bin/zsh
# Nhấp đúp để mở VSTEP Phòng luyện (chạy offline tại http://localhost:4173)
cd "$(dirname "$0")/app" || exit 1
URL="http://localhost:4173/"
if lsof -nP -iTCP:4173 -sTCP:LISTEN >/dev/null 2>&1; then
  open "$URL"; exit 0
fi
[ -d node_modules ] || npm install
npm run build --silent || exit 1
echo "\n  VSTEP Phòng luyện đang chạy tại $URL  (đóng cửa sổ này để tắt)\n"
npx vite preview --port 4173 --strictPort --open
