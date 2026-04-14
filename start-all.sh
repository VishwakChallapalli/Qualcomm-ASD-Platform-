#!/bin/bash
# Start Next.js + Express + Emotion + Whisper in one terminal (see README).
cd "$(dirname "$0")" || exit 1
exec npm run dev:all
