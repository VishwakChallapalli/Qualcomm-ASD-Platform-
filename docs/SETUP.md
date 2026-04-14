# Setup checklist

Use this page as a **fast onboarding** path. Full explanations, architecture, and troubleshooting are in the root **[README.md](../README.md)**.

## Before you start

- [ ] Node.js 18+ and npm 9+
- [ ] Python 3.10+
- [ ] MongoDB URI (Atlas or local)
- [ ] (Optional) ffmpeg for Whisper — `ffmpeg -version`
- [ ] (Optional) Webcam for full emotion model

## One-time install

```bash
# 1. Dependencies
npm install
cd server && npm install && cd ..

# 2. API environment
cp server/.env.example server/.env
# Edit server/.env — set at least MONGO_URI, JWT_SECRET, AUTH_BYPASS=false

# 3. Emotion server venv
cd emotion-server && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && deactivate && cd ..

# 4. Whisper server venv
cd whisper-server && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && deactivate && cd ..
```

On **Windows**, replace `source venv/bin/activate` with `venv\Scripts\activate`.

## Run everything

```bash
npm run dev:all
```

Open **http://localhost:3000** → you should land on **`/page1`**.

| Port | Service |
|------|---------|
| 3000 | Next.js |
| 5001 | Express API |
| 5050 | Emotion (optional) |
| 5051 | Whisper (optional) |

**Without Python:** `SKIP_PYTHON_SERVERS=1 npm run dev:all`

## Smoke tests

- [ ] `http://localhost:3000/page1` loads
- [ ] Sign up / log in works (Mongo + `JWT_SECRET` set)
- [ ] `http://127.0.0.1:5050/status` returns JSON (if Python not skipped)
- [ ] `http://localhost:5001` responds (health or API route you use)

## Next steps

- Configure **LM Studio** for `/quiz-ai` — see README *Optional services*.
- Production: `npm run build` + host Next and Express — see README *Production build*.
