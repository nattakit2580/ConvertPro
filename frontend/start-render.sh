#!/bin/sh
set -eu

: "${PORT:=10000}"
: "${BACKEND_PORT:=8000}"
: "${API_PROXY_TARGET:=http://127.0.0.1:${BACKEND_PORT}}"
: "${DATABASE_URL:=sqlite:////app/data/convertpro.db}"
: "${QUEUE_MODE:=inline}"
: "${STORAGE_DIR:=/app/storage}"
: "${PUBLIC_BASE_URL:=}"
: "${FRONTEND_ORIGIN:=https://convertpro-e505.onrender.com}"

export API_PROXY_TARGET DATABASE_URL QUEUE_MODE STORAGE_DIR PUBLIC_BASE_URL FRONTEND_ORIGIN

cd /app/backend
/opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" &
api_pid=$!

cd /app/frontend
npm run start -- -p "$PORT" &
web_pid=$!

trap 'kill "$api_pid" "$web_pid" 2>/dev/null || true' INT TERM EXIT

while true; do
  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid"
    exit $?
  fi

  if ! kill -0 "$web_pid" 2>/dev/null; then
    wait "$web_pid"
    exit $?
  fi

  sleep 2
done
