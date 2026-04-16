#!/bin/bash
# Appztore Production Launcher

# Start Backend in background
echo "🚀 Starting Appztore Backend..."
cd backend
./start.sh &
BACKEND_PID=$!

# Start Frontend (Tauri)
echo "📦 Starting Appztore Desktop..."
cd ../desktop-app
npx tauri dev

# Cleanup on exit
kill $BACKEND_PID
