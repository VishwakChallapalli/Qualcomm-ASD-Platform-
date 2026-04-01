import pyttsx3
import threading

def get_tts_engine():
    """
    Initialize and configure the pyttsx3 Text-to-Speech engine.
    This uses native OS APIs (SAPI5 on Windows ARM / NSSpeechSynthesizer on macOS), 
    """
    try:
        engine = pyttsx3.init()
        # Set default properties
        engine.setProperty('rate', 160)    # Speed of speech (words per minute)
        engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)
        return engine
    except Exception as e:
        print(f"Error initializing TTS engine: {e}")
        return None

def speak_text(text, async_mode=False):
    """
    Synthesize and play the text provided.
    
    Args:
        text (str): The text to be spoken.
        async_mode (bool): If True, plays speech in a background thread 
                           so it doesn't block the game or application loop.
    """
    if not text:
        return

    def _speak():
        # Initialize locally per-thread to avoid COM / core-foundation errors
        local_engine = pyttsx3.init()
        local_engine.setProperty('rate', 160)
        local_engine.say(text)
        local_engine.runAndWait()

    if async_mode:
        t = threading.Thread(target=_speak, daemon=True)
        t.start()
        return t
    else:
        # Run synchronously
        engine = get_tts_engine()
        if engine:
            engine.say(text)
            engine.runAndWait()
