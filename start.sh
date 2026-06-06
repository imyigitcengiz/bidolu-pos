#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Durduruluyor..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "--------------------------------------------------"
echo "Bidolu POS Başlatılıyor..."
echo "--------------------------------------------------"

# Start Backend
echo "Backend (Django) başlatılıyor..."
cd backend
source venv/bin/activate
python manage.py runserver 127.0.0.1:8000 > django.log 2>&1 &
BACKEND_PID=$!

# Go to Frontend
cd ../frontend
echo "Önyüz (React + Vite) başlatılıyor..."
npm run dev -- --port 5173 > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "--------------------------------------------------"
echo "Bidolu POS başarıyla çalıştırıldı!"
echo "👉 Önyüz (Uygulama): http://localhost:5173"
echo "👉 Backend API:      http://localhost:8000/api/"
echo "👉 Yönetici Paneli:   http://localhost:8000/admin/"
echo "--------------------------------------------------"
echo "Durdurmak için Ctrl+C tuşlarına basın."
echo "--------------------------------------------------"

# Wait for background processes
wait
