#!/usr/bin/env bash
# Token Buster — Quick Start Script
# Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon
#
# Usage: bash start.sh [--port 5000] [--skip-frontend] [--debug]

set -e

PORT=5000
BUILD_FRONTEND=true
DEBUG_MODE=false

for arg in "$@"; do
  case $arg in
    --port=*)   PORT="${arg#*=}" ;;
    --port)     shift; PORT="$1" ;;
    --skip-frontend) BUILD_FRONTEND=false ;;
    --debug)    DEBUG_MODE=true ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ⚡  TOKEN BUSTER  — Setup & Launch             ║"
echo "║   by Muhammad Faizan | github.com/faizzyhon      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Python deps ────────────────────────────────────────────────────────────
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt --quiet

# ── 2. Frontend build ─────────────────────────────────────────────────────────
if [ "$BUILD_FRONTEND" = true ]; then
  FRONTEND_DIR="token_buster/frontend"
  BUILD_DIR="$FRONTEND_DIR/build"

  if [ -d "$FRONTEND_DIR/node_modules" ]; then
    echo "✅ Node modules already installed"
  else
    echo "📦 Installing frontend dependencies..."
    cd "$FRONTEND_DIR" && npm install --silent && cd ../..
  fi

  echo "🔨 Building React frontend..."
  cd "$FRONTEND_DIR" && npm run build --silent && cd ../..
  echo "✅ Frontend built at $BUILD_DIR"
else
  echo "⏭  Skipping frontend build"
fi

# ── 3. Launch ─────────────────────────────────────────────────────────────────
echo ""
echo "🚀 Starting Token Buster on port $PORT..."
echo ""

if [ "$DEBUG_MODE" = true ]; then
  python main.py --port "$PORT" --debug
else
  python main.py --port "$PORT"
fi
