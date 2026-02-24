# How to Run the Application

## Prerequisites
- Node.js installed (v18+ recommended)
- MongoDB running (either local or Atlas connection configured)

## Terminal Setup

You'll need **3 separate terminal windows/tabs**:

---

## Terminal 1: Frontend (Next.js)

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-
npm run dev
```

**Expected output:**
```
▲ Next.js 16.0.0
- Local:        http://localhost:3000
```

**Access at:** http://localhost:3000

---

## Terminal 2: Backend (Express Server)

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/server
node index.js
```

**Expected output:**
```
Connected to MongoDB
Server running on port 5001
```

**Server runs on:** http://localhost:5001

---

## Terminal 3: Admin Console (Optional - for testing)

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web
python3 -m http.server 8000 --bind 127.0.0.1
```

**Expected output:**
```
Serving HTTP on 127.0.0.1 port 8000 (http://127.0.0.1:8000/) ...
```

**Access at:** http://127.0.0.1:8000

---

## MongoDB Setup

### If using MongoDB Atlas (Cloud):
- No local setup needed
- Just ensure your `.env` file in `server/` has the correct connection string
- The backend will connect automatically when you start it

### If using Local MongoDB:

**Start MongoDB:**
```bash
# macOS (if installed via Homebrew)
brew services start mongodb-community

# Or run directly
mongod --config /usr/local/etc/mongod.conf
```

**Verify MongoDB is running:**
```bash
mongosh
# Should connect to MongoDB shell
```

---

## Quick Start (All at Once)

### Option 1: Manual (3 terminals)

**Terminal 1 - Frontend:**
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform- && npm run dev
```

**Terminal 2 - Backend:**
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/server && node index.js
```

**Terminal 3 - Admin Console (optional):**
```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web && python3 -m http.server 8000 --bind 127.0.0.1
```

### Option 2: Using a Process Manager (Advanced)

Create a `start.sh` script:
```bash
#!/bin/bash
# Terminal 1
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform- && npm run dev &
# Terminal 2  
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/server && node index.js &
# Terminal 3
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web && python3 -m http.server 8000 --bind 127.0.0.1 &
wait
```

---

## Verification Checklist

✅ **Frontend running:** http://localhost:3000 loads
✅ **Backend running:** See "Connected to MongoDB" and "Server running on port 5001"
✅ **MongoDB connected:** No connection errors in backend terminal
✅ **Admin console (optional):** http://127.0.0.1:8000 loads

---

## Troubleshooting

**Backend won't connect to MongoDB:**
- Check `server/.env` file has correct `MONGO_URI`
- Verify MongoDB is running (if local)
- Check network connection (if Atlas)

**Port already in use:**
- Frontend (3000): Kill process or change port in `package.json`
- Backend (5001): Change `PORT` in `server/.env` or `server/index.js`
- Admin (8000): Use different port: `python3 -m http.server 8001 --bind 127.0.0.1`

**Frontend can't reach backend:**
- Ensure backend is running on port 5001
- Check CORS settings in `server/index.js`
