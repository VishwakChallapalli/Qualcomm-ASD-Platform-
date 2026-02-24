# Admin Console Setup & Troubleshooting Guide

## Quick Start

### Step 1: Start the Admin Console Server

Open a **new terminal** and run:

```bash
cd /Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web
python3 -m http.server 8000 --bind 127.0.0.1
```

**Expected output:**
```
Serving HTTP on 127.0.0.1 port 8000 (http://127.0.0.1:8000/) ...
```

### Step 2: Access the Admin Console

Open your browser and go to:
```
http://127.0.0.1:8000
```

**Important:** Use `127.0.0.1` not `localhost` - this ensures camera permissions work correctly.

### Step 3: Enable Camera

1. Click the **"Start camera"** button in the top right
2. When your browser asks for camera permission, click **"Allow"**
3. The camera preview should appear in the right panel

---

## Troubleshooting

### ❌ "Admin Console Not Running"

**Problem:** The admin page shows "Admin Console Not Running"

**Solution:**
1. Make sure you started the Python server (Step 1 above)
2. Check the terminal for any error messages
3. Verify you're in the correct directory: `/Users/vishwakchallapalli/Qualcomm/Qualcomm-ASD-Platform-/web`
4. Try refreshing the admin page

---

### ❌ Camera Won't Turn On

**Problem:** Clicking "Start camera" does nothing or shows an error

**Solutions:**

1. **Check Browser Permissions:**
   - Look for a camera icon in your browser's address bar
   - Click it and make sure camera access is "Allow"
   - Or go to browser settings → Privacy → Camera → Allow for `127.0.0.1`

2. **Check if Camera is in Use:**
   - Close any other apps using the camera (Zoom, Teams, etc.)
   - On Mac: Check Activity Monitor for apps using the camera

3. **Try a Different Browser:**
   - Chrome/Edge usually work best
   - Firefox sometimes has stricter permissions
   - Safari may require additional settings

4. **Check Browser Console:**
   - Press `F12` to open developer tools
   - Look for red error messages
   - Common errors:
     - `NotAllowedError` = Permission denied
     - `NotFoundError` = No camera found
     - `NotReadableError` = Camera in use by another app

5. **Verify URL:**
   - Must be `http://127.0.0.1:8000` (not `localhost`)
   - Must be `http://` not `https://` (unless you set up SSL)

---

### ❌ Port 8000 Already in Use

**Problem:** Error: `Address already in use`

**Solution:** Use a different port:

```bash
python3 -m http.server 8001 --bind 127.0.0.1
```

Then access: `http://127.0.0.1:8001`

---

### ❌ Python Command Not Found

**Problem:** `python3: command not found`

**Solutions:**

1. Try `python` instead:
   ```bash
   python -m http.server 8000 --bind 127.0.0.1
   ```

2. Install Python:
   ```bash
   # macOS
   brew install python3
   ```

---

### ❌ Nothing Happens When Clicking Buttons

**Problem:** Buttons don't respond, no errors

**Solutions:**

1. **Check Browser Console (F12):**
   - Look for JavaScript errors
   - Make sure all files are loading (Network tab)

2. **Hard Refresh:**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

3. **Clear Browser Cache:**
   - Browser settings → Clear browsing data → Cached images and files

4. **Check File Structure:**
   - Make sure all files exist in `/web/` directory:
     - `index.html`
     - `app.js`
     - `styles.css`
     - `lib/` folder
     - `providers/` folder
     - `games/` folder

---

### ❌ Provider/Games Not Loading

**Problem:** Dropdowns are empty or show errors

**Solution:**
1. Check browser console (F12) for import errors
2. Make sure you're accessing via `http://127.0.0.1:8000` (not file://)
3. Verify all files in `lib/`, `providers/`, and `games/` folders exist

---

## Common Issues & Fixes

### Issue: "getUserMedia is not defined"

**Fix:** You're accessing via `file://` instead of `http://`. Use the Python server.

### Issue: Camera works but Python provider doesn't

**Fix:** 
1. Make sure your Python server is running on port 5055
2. Check the endpoint in the Python provider settings
3. Click "Ping server" to test connection

### Issue: CORS errors in console

**Fix:** This is normal when checking server status. The admin console itself should work fine.

---

## Testing Checklist

✅ Server is running (see "Serving HTTP on..." message)
✅ Can access `http://127.0.0.1:8000` in browser
✅ Page loads without errors
✅ "Start camera" button is visible
✅ Clicking "Start camera" shows permission prompt
✅ Camera preview appears after allowing permission
✅ Provider dropdown has options (Manual, Mock, Python)
✅ Game dropdown has options (Identify, Mirror, Calm-down)

---

## Still Having Issues?

1. **Check the terminal** where the server is running for errors
2. **Check browser console** (F12) for JavaScript errors
3. **Try a different browser** (Chrome recommended)
4. **Restart the server** (Ctrl+C, then run the command again)
5. **Restart your browser** completely

---

## Direct Access

If the Next.js admin page isn't working, you can always access the admin console directly:

```
http://127.0.0.1:8000
```

Bookmark this URL for quick access!
