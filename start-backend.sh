#!/bin/bash

# Start Backend (Express + MongoDB)
echo "🚀 Starting Backend Server..."
echo "📍 Location: http://localhost:5001"
echo ""
cd "$(dirname "$0")/server"
node index.js
