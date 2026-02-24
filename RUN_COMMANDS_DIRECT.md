# Direct Commands to Run Servers

If the scripts aren't working, use these direct commands:

---

## Terminal 1: Frontend (Next.js)

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-
npm run dev
```

**Access:** http://localhost:3000

---

## Terminal 2: Backend (Express + MongoDB)

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/server
node index.js
```

**Access:** http://localhost:5001

**Expected output:**
```
Connected to MongoDB
Server running on port 5001
```

---

## Terminal 3: Admin Console

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web
python3 -m http.server 8001 --bind 127.0.0.1
```

**Access:** http://127.0.0.1:8001

**Expected output:**
```
Serving HTTP on 127.0.0.1 port 8001 (http://127.0.0.1:8001/) ...
```

---

## All Commands (Copy-Paste Ready)

**Terminal 1:**
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform- && npm run dev
```

**Terminal 2:**
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/server && node index.js
```

**Terminal 3:**
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web && python3 -m http.server 8001 --bind 127.0.0.1
```

---

## Troubleshooting Scripts

If `./start-frontend.sh` doesn't work, try:

1. **Make sure you're in the project root:**
   ```bash
   cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-
   ```

2. **Run with bash explicitly:**
   ```bash
   bash start-frontend.sh
   ```

3. **Or use the direct commands above**

---

## URLs Summary

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5001  
- **Admin Console:** http://127.0.0.1:8001
