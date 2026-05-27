#!/bin/sh
set -eu

for dir in /var/lib/munin /var/cache/munin/www /var/log/munin /var/run/munin; do
  mkdir -p "$dir"
done

mkdir -p /var/cache/munin/www/static
cp /usr/local/share/healthsync-munin/custom.css /var/cache/munin/www/static/custom.css

chown -R munin:munin /var/lib/munin /var/cache/munin /var/log/munin /var/run/munin

munin-node --foreground &
NODE_PID=$!

su -s /bin/sh munin -c "munin-cron" || true

( while true; do
    su -s /bin/sh munin -c "munin-cron" || true
    sleep 300
  done ) &
CRON_PID=$!

# Background writer that generates a JSON summary for the frontend (every 5s)
( while true; do
    if command -v python3 >/dev/null 2>&1; then
      python3 /usr/lib/cgi-bin/munin-summary.py > /var/cache/munin/www/munin-summary.json 2>/dev/null || true
    fi
    sleep 5
  done ) &
SUMMARY_PID=$!

trap 'kill $NODE_PID $CRON_PID $SUMMARY_PID 2>/dev/null || true' INT TERM EXIT

exec apache2ctl -D FOREGROUND