#!/bin/bash
# Appztore Production Launcher

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Start Backend in background
echo "🚀 Starting Appztore Backend..."
cd backend
./start.sh &
BACKEND_PID=$!

# Start Frontend (Tauri)
echo "📦 Starting Appztore Desktop..."
cd ../desktop-app
pnpm install
pnpm tauri dev

# Cleanup on exit
kill $BACKEND_PID
