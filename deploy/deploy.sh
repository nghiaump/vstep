#!/usr/bin/env bash
# Build app → deploy/www → nginx container vstep-web (127.0.0.1:6698) → tunnel `vstep` → https://vstep.pentium.ink
#
#   bash deploy/deploy.sh          # build + đồng bộ + (re)start + kiểm tra
#   bash deploy/deploy.sh up       # chỉ khởi động lại container (vd. sau reboot)
#   bash deploy/deploy.sh status   # trạng thái + kiểm tra HTTP (cục bộ và public)
#   bash deploy/deploy.sh down     # dừng và gỡ container
#
# ⛔ Không đổi cổng nginx sang 0.0.0.0 hay IP LAN/tailnet: chỉ 127.0.0.1, public đi qua tunnel.
# ⛔ Không dùng chung tunnel `homelab` (có ssh.pentium.ink): app dùng tunnel `vstep` riêng.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$HERE")"
APP="$ROOT/app"
PORT=6698
LOCAL_URL="http://127.0.0.1:$PORT/"
PUBLIC_URL="https://vstep.pentium.ink/"
NPM_CACHE="${NPM_CACHE:-${TMPDIR:-/tmp}/vstep-npm-cache}"   # npm cache hệ thống thuộc root

compose() { docker compose -f "$HERE/docker-compose.yml" -p vstep "$@"; }

check() {
  local code i
  for i in 1 2 3 4 5; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$LOCAL_URL" || true)"
    [ "$code" = 200 ] && break
    sleep 1
  done
  if [ "$code" != 200 ]; then echo "✗ $LOCAL_URL trả $code" >&2; return 1; fi
  echo "✓ $LOCAL_URL → 200"
  if ss -ltnH | awk '{print $4}' | grep -qE "^(0\.0\.0\.0|\*|\[::\]):$PORT$"; then
    echo "⛔ Cổng $PORT đang mở trên mọi interface!" >&2; return 1
  fi
  echo "✓ Chỉ lắng nghe trên 127.0.0.1:$PORT"

  # Tunnel cần vài giây để nối lại sau khi container khởi động.
  for i in $(seq 1 20); do
    code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$PUBLIC_URL" || true)"
    [ "$code" = 200 ] && break
    sleep 3
  done
  if [ "$code" != 200 ]; then echo "✗ $PUBLIC_URL trả $code (tunnel vstep chưa nối? xem: docker logs vstep-tunnel)" >&2; return 1; fi
  echo "✓ $PUBLIC_URL → 200"
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
  -h|--help) sed -n '2,8p' "$0" ;;
  *) echo "⛔ lệnh lạ: $1" >&2; exit 2 ;;
esac
