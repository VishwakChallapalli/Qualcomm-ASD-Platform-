# Server Scripts Guide

## Quick Start

You need **3 separate terminal windows** to run all servers.

---

## Terminal 1: Frontend (Next.js)

```bash
./start-frontend.sh
```

**Or manually:**
```bash
npm run dev
```

**Access at:** http://localhost:3000

---

## Terminal 2: Backend (Express + MongoDB)

```bash
./start-backend.sh
```

**Or manually:**
```bash
cd server
node index.js
```

**Access at:** http://localhost:5001

**Expected output:**
```
Connected to MongoDB
Server running on port 5001
```

---

## Terminal 3: Admin Console

```bash
./start-admin.sh
```

**Or manually:**
```bash
cd web
python3 -m http.server 8001 --bind 127.0.0.1
```

**Access at:** http://127.0.0.1:8001

**Expected output:**
```
Serving HTTP on 127.0.0.1 port 8001 (http://127.0.0.1:8001/) ...
```

---

## All-in-One Guide

Run this to see all instructions:
```bash
./start-all.sh
```

---

## Script Files

- `start-frontend.sh` - Starts Next.js frontend
- `start-backend.sh` - Starts Express backend
- `start-admin.sh` - Starts admin console server
- `start-all.sh` - Shows instructions for all servers

---

## Prerequisites

Before running:

1. **Frontend:** Dependencies installed (`npm install`)
2. **Backend:** Dependencies installed (`cd server && npm install`)
3. **Backend:** MongoDB configured (`server/.env` file with `MONGO_URI`)
4. **Admin:** Python 3 installed

---

## Stopping Servers

Press `Ctrl + C` in each terminal to stop the respective server.

---

## Troubleshooting

**Scripts not executable?**
```bash
chmod +x start-*.sh
```

**Port already in use?**
- Frontend (3000): Change in `package.json` scripts
- Backend (5001): Change `PORT` in `server/.env` or `server/index.js`
- Admin (8001): Change port in `start-admin.sh`

**MongoDB connection error?**
- Check `server/.env` file has correct `MONGO_URI`
- Verify MongoDB is running (if local) or accessible (if Atlas)
