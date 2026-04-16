#!/bin/bash
cd /home/zius/Projects/Appztore/backend

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export DEVELOPMENT=${DEVELOPMENT:-false}
export MOCK=${MOCK:-false}

if [ "$ENVIRONMENT" == "production" ]; then
    echo "Starting Gunicorn (Production)..."
    exec .venv/bin/gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 120 app.main:app
else
    echo "Starting Development Server..."
    exec .venv/bin/python app/main.py
fi
