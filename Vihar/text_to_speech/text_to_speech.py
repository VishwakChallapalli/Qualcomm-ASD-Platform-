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
