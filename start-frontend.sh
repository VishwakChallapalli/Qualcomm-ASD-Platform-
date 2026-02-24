#!/bin/bash

# Start Frontend (Next.js)
echo "🚀 Starting Frontend Server..."
echo "📍 Location: http://localhost:3000"
echo ""
cd "$(dirname "$0")"
npm run dev
