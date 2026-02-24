# Admin/Test Console

This is the admin testing panel for the Emotion-Regulation Mini-Games prototype.

## Running the Admin Console

### Option 1: Python HTTP Server (Recommended)

```bash
cd web
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open: http://127.0.0.1:8000

### Option 2: Node.js HTTP Server

```bash
cd web
npx http-server -p 8000 -a 127.0.0.1
```

Then open: http://127.0.0.1:8000

## Features

### Providers
- **Manual**: Choose emotion and confidence manually for testing
- **Mock**: Random emotions with configurable interval
- **Python + OpenCV**: Connects to local Python server at `http://127.0.0.1:5055/infer`

### Games
- **Identify**: Label the emotion shown (baseline recognition game)
- **Mirror**: Match the target emotion for a sustained period
- **Calm-down**: Guided breathing exercise with emotion check-in

### Admin Tools
- **Kids Mode**: Link to kids interface (create `./kids/` directory)
- **Download last session**: Export session data as JSON
- **Clear saved sessions**: Remove all stored session data from localStorage

## Python Server Setup

To use the Python + OpenCV provider, you need a local server running:

1. The server should accept POST requests at `/infer`
2. Request body: `{ "imageB64": "...", "sessionId": "..." }`
3. Response: `{ "label": "happy", "confidence": 0.85 }`
4. Health check endpoint: `/health` (GET)

## File Structure

```
web/
├── index.html          # Main admin page
├── styles.css          # Styling
├── app.js              # Main application logic
├── lib/                # Utility libraries
│   ├── dom.js
│   ├── emotions.js
│   ├── log.js
│   └── session_store.js
├── providers/          # Emotion detection providers
│   ├── base.js
│   ├── manual.js
│   ├── mock.js
│   └── python.js
├── games/              # Mini-game implementations
│   ├── base.js
│   ├── identify.js
│   ├── mirror.js
│   └── calm.js
└── assets/
    └── emotions/       # Optional emotion images
```

## Notes

- This is a static site with no build step required
- Uses ES modules (modern browsers only)
- Session data is stored in browser localStorage
- Camera access requires HTTPS (or localhost)
