#!/usr/bin/env bash
# Build app → deploy/www → nginx container vstep-web, chỉ trong tailnet.
#
#   bash deploy/deploy.sh          # build + đồng bộ + (re)start + kiểm tra
#   bash deploy/deploy.sh up       # chỉ khởi động lại container (vd. sau reboot, khi Docker lên trước Tailscale)
#   bash deploy/deploy.sh status   # trạng thái + kiểm tra HTTP
#   bash deploy/deploy.sh down     # dừng và gỡ container
#
# ⛔ Không đổi cổng sang 0.0.0.0, không bật Funnel: xem CLAUDE.md → Hard rules.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
APP="$ROOT/app"
TS_IP="100.125.162.41"
PORT=6698
URL="http://$TS_IP:$PORT/"
NPM_CACHE="${NPM_CACHE:-${TMPDIR:-/tmp}/vstep-npm-cache}"   # npm cache hệ thống thuộc root

compose() { docker compose -f "$HERE/docker-compose.yml" -p vstep "$@"; }

check() {
  if ! ip -4 addr show | grep -q "inet $TS_IP/"; then
    echo "⛔ Máy chưa có IP Tailscale $TS_IP (tailscale chưa lên?)." >&2; return 1
  fi
  local code
  for _ in 1 2 3 4 5; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
    [ "$code" = 200 ] && break
    sleep 1
  done
  if [ "$code" != 200 ]; then echo "✗ $URL trả $code" >&2; return 1; fi
  echo "✓ $URL → 200"
  if ss -ltnH | awk '{print $4}' | grep -qE "^(0\.0\.0\.0|\*|\[::\]):$PORT$"; then
    echo "⛔ Cổng $PORT đang mở trên mọi interface!" >&2; return 1
  fi
  echo "✓ Chỉ lắng nghe trên $TS_IP:$PORT (tailnet)"
}

up() {
  mkdir -p "$HERE/www"
  [ -f "$HERE/www/index.html" ] || { echo "⛔ deploy/www trống, chạy: bash deploy/deploy.sh" >&2; exit 1; }
  compose up -d --remove-orphans
  check
}

case "${1:-deploy}" in
  deploy)
    cd "$APP"
    [ -d node_modules ] || npm ci --cache "$NPM_CACHE"
    npm run build
    mkdir -p "$HERE/www"
    rsync -a --delete "$APP/dist/" "$HERE/www/"
    up
    ;;
  up) up ;;
  status) compose ps; check ;;
  down) compose down ;;
  -h|--help) sed -n '2,9p' "$0" ;;
  *) echo "⛔ lệnh lạ: $1" >&2; exit 2 ;;
esac
