#!/bin/bash
# ── Emotion Monitoring Server ─────────────────────────────────────────────────
cd "$(dirname "$0")/emotion-server" || exit 1

echo "=============================================="
echo "  Emotion Monitor  →  http://127.0.0.1:5050  "
echo "=============================================="

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install deps if flask is missing
if ! python3 -c "import flask" 2>/dev/null; then
  echo "Installing dependencies..."
  pip install -r requirements.txt
fi

echo "Starting emotion server..."
python3 server.py
