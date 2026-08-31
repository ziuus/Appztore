#!/bin/bash
# Appztore Production Launcher

set -e

# Load nvm if present
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── 1. Start Backend ────────────────────────────────────────────────────────
echo "🚀 Starting Appztore Backend..."
cd "$SCRIPT_DIR/backend"
bash ./start.sh &
BACKEND_PID=$!

# Wait until the backend is accepting connections (up to 30 s)
echo "⏳ Waiting for backend on port 8000..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/api/categories >/dev/null 2>&1; then
    echo "✅ Backend ready."
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "❌ Backend process died. Check backend/start.sh logs."
    exit 1
  fi
  sleep 1
done

# ── 2. Start Desktop Frontend (Tauri) ───────────────────────────────────────
echo "📦 Starting Appztore Desktop..."
cd "$SCRIPT_DIR/desktop-app"

# Install frontend dependencies if node_modules is missing or stale
if [ ! -d "node_modules" ]; then
  echo "📥 Installing frontend dependencies..."
  pnpm install
fi

pnpm tauri dev

# ── 3. Cleanup on exit ──────────────────────────────────────────────────────
cleanup() {
  echo "🛑 Shutting down backend (PID $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
