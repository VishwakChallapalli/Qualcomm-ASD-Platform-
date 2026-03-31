## Qualcomm ASD Platform

Next.js frontend + Express backend + MongoDB progress tracking, with a local on-device “What Would You Do?” AI quiz powered by LM Studio.

### Prerequisites
- **Node.js**: v18+
- **MongoDB**: Atlas or local (used for user accounts + game progress)
- **LM Studio**: for the “What Would You Do?” AI quiz (OpenAI-compatible local server)
- **Windows PowerShell note**: if `npm` scripts fail due to execution policy, use `cmd /c "..."` as shown below.

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
```powershell
cd "C:\Users\katha\Documents\ASDTool-Qualcom\Qualcomm-ASD-Platform-\server"
cmd /c "npm install"
cmd /c "node index.js"
```
Backend runs at `http://localhost:5001`.

### Setup + Run Frontend (Next.js)
```powershell
cd "C:\Users\katha\Documents\ASDTool-Qualcom\Qualcomm-ASD-Platform-"
cmd /c "npm install"
cmd /c "npm run dev"
```
Frontend runs at `http://localhost:3000`.

### LM Studio setup (What Would You Do? AI Quiz)
1. Install **LM Studio**
2. Download a model (recommended):
   - **Fast / best for on-device**: *Llama 3.2 1B Instruct* (GGUF, Q4/Q5 quant)
   - **Higher quality (slower)**: *Llama 3.2 3B Instruct* (GGUF, Q4 quant)
3. Start LM Studio’s **Local Server (OpenAI-compatible)**:
   - Base URL should match `LLM_BASE_URL` (default: `http://localhost:1234/v1`)
4. In the app:
   - Go to Dashboard → **What Would You Do?** (opens `/quiz-ai`)

### Progress + points storage (per user / per session)
- If you are logged in, progress is stored under your MongoDB `User.gameProgress`.
- If `AUTH_BYPASS=true`, the app creates a **guest user per browser session** and still persists progress to MongoDB (so “Not played yet” becomes “Played” and session history is tracked).

### Optional (Emotion + Whisper services)
Some games reference local Python services:
- **Emotion server**: `http://127.0.0.1:5050`
- **Whisper server**: `http://127.0.0.1:5051`

See:
- `emotion-server/server.py` + `emotion-server/requirements.txt`
- `whisper-server/server.py` + `whisper-server/requirements.txt`

### Ports used
- **3000**: Frontend (Next.js)
- **5001**: Backend (Express)
- **1234**: LM Studio local server (OpenAI-compatible)
- **5050**: Emotion server (optional)
- **5051**: Whisper server (optional)
