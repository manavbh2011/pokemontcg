#!/bin/sh
set -eu

CONFIG_PATH="/var/www/html/frontend/js/config.js"
API_BASE_VALUE="${API_BASE:-http://localhost:8080/backend/api}"

cat > "$CONFIG_PATH" <<EOF
const API_BASE = "${API_BASE_VALUE}";
EOF

exec "$@"
