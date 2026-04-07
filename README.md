## Qualcomm ASD Platform

Next.js frontend + Express backend + MongoDB progress tracking, with a local on-device “What Would You Do?” AI quiz powered by LM Studio.

### Prerequisites
- **Node.js**: v18+
- **MongoDB**: Atlas or local (used for user accounts + game progress)
- **LM Studio**: for the “What Would You Do?” AI quiz (OpenAI-compatible local server)
- **Windows PowerShell note**: if `npm` scripts fail due to execution policy, use `cmd /c "..."` as shown below.

### Quick start (2 terminals)
1. **Backend**
2. **Frontend**

Details below.

### Setup (Backend)
1. Create your backend env file:
   - Copy `server/.env.example` → `server/.env`
2. Edit `server/.env`:
   - **MongoDB**
     - `MONGO_URI=...`
   - **JWT (only required if you want real login/signup)**
     - `JWT_SECRET=...`
   - **Login bypass for demos**
     - `AUTH_BYPASS=true` (recommended for demo/presentations)
   - **LM Studio (AI Quiz)**
     - `LLM_BASE_URL=http://localhost:1234/v1`
     - `LLM_MODEL=llama-3.2-1b-instruct` (see model notes below)

### Run Backend (Express)
From the repo root:

```powershell
cd server
cmd /c "npm install"
cmd /c "node index.js"
```

If you are not using PowerShell execution-policy workarounds, you can run:

```bash
cd server
npm install
node index.js
```

Backend runs at `http://localhost:5001`.

### Setup + Run Frontend (Next.js)
From the repo root:

```powershell
cmd /c "npm install"
cmd /c "npm run dev"
```

Or:

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### LM Studio setup (What Would You Do? AI Quiz)
1. Install **LM Studio**
2. Download a model (recommended):
   - **Fast / best for on-device**: *Llama 3.2 1B Instruct* (GGUF, Q4/Q5 quant)
   - **Higher quality (slower)**: *Llama 3.2 3B Instruct* (GGUF, Q4 quant)
3. Start LM Studio’s **Local Server (OpenAI-compatible)**:
   - Base URL should match `LLM_BASE_URL` (default: `http://localhost:1234/v1`)
   - Choose the same model name you set in `LLM_MODEL`
4. In the app:
   - Go to Dashboard → **What Would You Do?** (opens `/quiz-ai`)

### Progress + points storage (per user / per session)
- If you are logged in, progress is stored under your MongoDB `User.gameProgress`.
- If `AUTH_BYPASS=true`, the app creates a **guest user per browser session** and still persists progress to MongoDB (so “Not played yet” becomes “Played” and session history is tracked).

### Optional (Emotion + Whisper services)
These are optional Python services that use your microphone/camera for extra features.

#### Emotion (camera) server (optional)
Used by some games for emotion-adaptive behavior.

- **Service**: `http://127.0.0.1:5050`
- **Code**: `emotion-server/server.py`
- **Endpoints**: `GET /status`, `GET /emotion`
- **Notes**:
  - Uses your **webcam** (`cv2.VideoCapture(0)`), so you must allow camera access.
  - Installs heavier ML deps (DeepFace / MediaPipe / Transformers / Torch). If deps are missing it runs in a “lite” simulated mode.

Setup + run:

```bash
cd emotion-server
python -m venv venv
```

Activate the venv:

```bash
# macOS / Linux
source venv/bin/activate

# Windows PowerShell
.\venv\Scripts\Activate.ps1
```

Install + start:

```bash
pip install -r requirements.txt
python server.py
```

#### Whisper (speech) server (optional)
Used by the Story Reader game for speech-to-text.

- **Service**: `http://127.0.0.1:5051`
- **Code**: `whisper-server/server.py`
- **Endpoints**: `GET /status`, `POST /transcribe`
- **Model**: `whisper-tiny.en`
- **Requirement**: `ffmpeg` must be installed and on PATH (used to decode browser audio).

Setup + run:

```bash
cd whisper-server
python -m venv venv
```

Activate the venv:

```bash
# macOS / Linux
source venv/bin/activate

# Windows PowerShell
.\venv\Scripts\Activate.ps1
```

Install + start:

```bash
pip install -r requirements.txt
python server.py
```

#### Face detection / eye tracking (research prototype)
There is a separate prototype under `Vihar/face_detection/` with its own README. It is not required to run the web app.

### Ports used
- **3000**: Frontend (Next.js)
- **5001**: Backend (Express)
- **1234**: LM Studio local server (OpenAI-compatible)
- **5050**: Emotion server (optional)
- **5051**: Whisper server (optional)
