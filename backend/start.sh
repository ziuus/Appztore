#!/bin/bash
# Appztore Backend Launcher

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Virtual environment ──────────────────────────────────────────────────────
if [ ! -f ".venv/bin/python" ]; then
  echo "🐍 Creating Python virtual environment..."
  python3 -m venv .venv
fi

echo "🐍 Activating virtual environment..."
source .venv/bin/activate

# Install/upgrade dependencies
echo "📦 Installing backend dependencies..."
pip install -q -r requirements.txt

# ── Load environment variables ───────────────────────────────────────────────
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

export DEVELOPMENT=${DEVELOPMENT:-false}
export MOCK=${MOCK:-false}

# ── Start server ─────────────────────────────────────────────────────────────
if [ "$ENVIRONMENT" = "production" ]; then
  echo "🚀 Starting Gunicorn (Production) on 0.0.0.0:8000..."
  exec .venv/bin/gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    app.main:app
else
  echo "🛠  Starting Development Server on 0.0.0.0:8000..."
  exec .venv/bin/python app/main.py
fi
