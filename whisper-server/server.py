#!/usr/bin/env python3
"""
Whisper Speech Recognition Server — http://127.0.0.1:5051

Setup (first time only):
  cd whisper-server
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  brew install ffmpeg   # required by whisper (macOS)

Run:
  source venv/bin/activate
  python server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import subprocess
import sys

app = Flask(__name__)
CORS(app)

# ── Check ffmpeg ───────────────────────────────────────────────────────────────
def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except Exception:
        return False

FFMPEG_OK = check_ffmpeg()
if not FFMPEG_OK:
    print("⚠  ffmpeg not found — install with: brew install ffmpeg")
    print("   Whisper needs ffmpeg to decode browser audio (webm/opus).")

# ── Load Whisper model ─────────────────────────────────────────────────────────
try:
    import whisper
    print("Loading Whisper tiny.en model (downloads ~75 MB on first run)...")
    model = whisper.load_model("tiny.en")
    WHISPER_OK = True
    print("✓ Whisper ready")
except ImportError:
    WHISPER_OK = False
    model = None
    print("✗ openai-whisper not installed — run: pip install openai-whisper")

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def root():
    """Browser-friendly landing — there is no web UI; the app calls /status and POST /transcribe."""
    ok = WHISPER_OK and FFMPEG_OK
    status_badge = "✓ ready" if ok else "⚠ not ready (check terminal / ffmpeg)"
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Whisper server</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 2rem; line-height: 1.5;">
  <h1>Whisper STT API</h1>
  <p><strong>Status:</strong> {status_badge}</p>
  <p>This address (<code>http://127.0.0.1:5051</code>) is a <strong>backend API</strong> for the
  <em>Story Reader</em> game in the Next.js app. Opening it in a browser used to show 404 on <code>/</code>
  because there was no HTML page — only JSON endpoints below.</p>
  <ul>
    <li><a href="/status"><code>GET /status</code></a> — JSON (whisper + ffmpeg ok?)</li>
    <li><code>POST /transcribe</code> — multipart form field <code>audio</code> (used by the game only)</li>
  </ul>
  <p><strong>Use the app:</strong> <a href="http://localhost:3000/games/story-reader">http://localhost:3000/games/story-reader</a></p>
</body></html>"""
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/status")
def status():
    return jsonify({
        "ok": WHISPER_OK and FFMPEG_OK,
        "whisper": WHISPER_OK,
        "ffmpeg": FFMPEG_OK,
        "model": "whisper-tiny.en",
    })


@app.route("/transcribe", methods=["POST"])
def transcribe():
    if not WHISPER_OK:
        return jsonify({"ok": False, "error": "whisper not loaded"}), 503
    if not FFMPEG_OK:
        return jsonify({"ok": False, "error": "ffmpeg not available"}), 503
    if "audio" not in request.files:
        return jsonify({"ok": False, "error": "no audio field in request"}), 400

    audio_file = request.files["audio"]
    suffix = ".webm"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = model.transcribe(
            tmp_path,
            language="en",
            fp16=False,          # CPU-safe
            temperature=0.0,     # Deterministic
            best_of=1,
            beam_size=1,         # Faster
        )
        text = result["text"].strip()
        print(f"  → Transcribed: {repr(text)}")
        return jsonify({"ok": True, "text": text})
    except Exception as e:
        print(f"  ✗ Transcription error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  Whisper Server  —  http://127.0.0.1:5051")
    print("=" * 55)
    app.run(host="127.0.0.1", port=5051, debug=False, use_reloader=False)
