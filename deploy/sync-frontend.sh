#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${1:-/opt/ferg}"
DST_DIR="${2:-/var/www/ferg-design}"

sudo install -d -m 0755 "${DST_DIR}"
sudo install -m 0644 "${SRC_DIR}/index.html" "${DST_DIR}/index.html"
sudo install -m 0644 "${SRC_DIR}/admin.html" "${DST_DIR}/admin.html"
sudo install -m 0644 "${SRC_DIR}/app.js" "${DST_DIR}/app.js"
sudo install -m 0644 "${SRC_DIR}/styles.css" "${DST_DIR}/styles.css"
