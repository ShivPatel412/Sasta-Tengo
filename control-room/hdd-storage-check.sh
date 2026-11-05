#!/bin/sh
# Recover this cloud stack when its verified USB drive becomes available.
set -eu
COMPOSE=/opt/shiv-control/compose.yml
ROOT=/srv/shivcloud-hdd
MARKER=shiv-cloud-passport-4tb-20261104
if ! mountpoint -q "$ROOT"; then
    mount "$ROOT" || true
fi
if ! mountpoint -q "$ROOT" || [ "$(cat "$ROOT/.shivcloud-drive-id" 2>/dev/null || true)" != "$MARKER" ]; then
    docker compose -f "$COMPOSE" stop nextcloud cron
    echo 'Verified cloud HDD unavailable; file services stopped.'
    exit 0
fi
docker compose -f "$COMPOSE" up -d --no-deps nextcloud cron
