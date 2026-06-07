#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=8000
FRONTEND_PORT=5173

port_in_use() {
  lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_port() {
  local port=$1
  local label=$2
  local i
  for i in {1..30}; do
    if port_in_use "$port"; then
      echo "✓ $label hazır (port $port)"
      return 0
    fi
    sleep 0.5
  done
  echo "✗ $label port $port üzerinde başlatılamadı. Logları kontrol edin."
  return 1
}

cleanup() {
  echo ""
  echo "Durduruluyor..."
  if [[ -f "$ROOT/backend/.backend.pid" ]]; then
    kill "$(cat "$ROOT/backend/.backend.pid")" 2>/dev/null || true
    rm -f "$ROOT/backend/.backend.pid"
  fi
  if [[ -f "$ROOT/frontend/.frontend.pid" ]]; then
    kill "$(cat "$ROOT/frontend/.frontend.pid")" 2>/dev/null || true
    rm -f "$ROOT/frontend/.frontend.pid"
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "--------------------------------------------------"
echo "Bidolu POS Başlatılıyor..."
echo "--------------------------------------------------"

if port_in_use "$BACKEND_PORT"; then
  echo "Backend zaten çalışıyor (port $BACKEND_PORT)"
else
  echo "Backend (Django) başlatılıyor..."
  cd "$ROOT/backend"
  source venv/bin/activate
  export DJANGO_DEBUG=True
  export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-django-insecure-dev-only-key}"
  python manage.py migrate --noinput
  nohup python manage.py runserver "127.0.0.1:$BACKEND_PORT" >> django.log 2>&1 &
  echo $! > .backend.pid
  wait_for_port "$BACKEND_PORT" "Backend"
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "Frontend zaten çalışıyor (port $FRONTEND_PORT)"
else
  echo "Önyüz (React + Vite) başlatılıyor..."
  cd "$ROOT/frontend"
  nohup npm run dev -- --port "$FRONTEND_PORT" >> frontend.log 2>&1 &
  echo $! > .frontend.pid
  wait_for_port "$FRONTEND_PORT" "Frontend"
fi

echo "--------------------------------------------------"
echo "Bidolu POS başarıyla çalıştırıldı!"
echo "👉 Önyüz (Uygulama): http://localhost:$FRONTEND_PORT"
echo "👉 Backend API:      http://localhost:$BACKEND_PORT/api/"
echo "👉 Yönetici Paneli:   http://localhost:$BACKEND_PORT/admin/"
echo "--------------------------------------------------"
echo "Durdurmak için Ctrl+C tuşlarına basın."
echo "--------------------------------------------------"

# Keep script alive so trap cleanup works when started interactively
while true; do
  sleep 3600
done
