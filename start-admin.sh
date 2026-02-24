#!/bin/bash

# Start Admin Console (Python HTTP Server)
echo "🚀 Starting Admin Console Server..."
echo "📍 Location: http://127.0.0.1:8001"
echo ""
cd "$(dirname "$0")/web"
python3 -m http.server 8001 --bind 127.0.0.1
