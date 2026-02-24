# How to Start the Admin Console Server

## Quick Steps

### Step 1: Open Terminal
Open a new terminal window.

### Step 2: Navigate to Web Directory
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web
```

### Step 3: Start the Server
```bash
python3 -m http.server 8001 --bind 127.0.0.1
```

### Step 4: Access the Admin Console
Open your browser and go to:
```
http://127.0.0.1:8001
```

---

## Expected Output

When you run the command, you should see:
```
Serving HTTP on 127.0.0.1 port 8001 (http://127.0.0.1:8001/) ...
```

**Keep this terminal open** - the server runs until you stop it.

---

## Stop the Server

Press `Ctrl + C` in the terminal where the server is running.

---

## Troubleshooting

**Port 8001 already in use?**
- Use a different port: `python3 -m http.server 8002 --bind 127.0.0.1`
- Then access: `http://127.0.0.1:8002`

**Python not found?**
- Try: `python -m http.server 8001 --bind 127.0.0.1`

**Permission denied?**
- Make sure you're in the correct directory: `/Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web`

---

## What You'll See

Once the server is running and you open `http://127.0.0.1:8001`, you should see:
- **Header:** "Emotion-Regulation Mini-Games" with camera controls
- **Left Panel:** Game selection (Identify, Mirror, Calm-down)
- **Right Panel:** Provider selection with:
  - Manual (you choose)
  - Mock (random)
  - Python + OpenCV (local server)
  - **Vihar model** ← New provider added!

---

## Full Command (Copy-Paste)

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web && python3 -m http.server 8001 --bind 127.0.0.1
```
