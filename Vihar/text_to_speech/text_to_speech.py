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

def save_speech_to_file(text, filename="tts_output.wav"):
    """
    Save the spoken text to an audio file instead of playing it.
    """
    engine = get_tts_engine()
    if not engine:
        return False
        
    try:
        engine.save_to_file(text, filename)
        engine.runAndWait()
        print(f"Saved speech to {filename}")
        return True
    except Exception as e:
        print(f"Error saving speech to file: {e}")
        return False

def show_available_voices():
    """Prints a list of available voices on the local system."""
    engine = get_tts_engine()
    if not engine:
        return

    voices = engine.getProperty('voices')
    print(f"Found {len(voices)} available voices on this device:")
    for i, voice in enumerate(voices):
        print(f"Voice {i + 1}: {voice.name}")

def main():
    print("====================================")
    print("Welcome to the Text-to-Speech Module")
    print("====================================")
    print("This module uses native OS synthesis and is fully compatible with Snapdragon X Elite.\n")
    
    test_phrase = "Hello! I am the new text to speech feature. I am ready to be used in your game."
    
    print(f"Speaking: '{test_phrase}'")
    speak_text(test_phrase, async_mode=False)
    
    print("\nDemonstrating background 'async' speech...")
    speak_text("This text is spoken in the background and does not block the application.", async_mode=True)
    
    print("As you can see, the application continues to run while background audio plays!")
    
    print("\nSaving a sample phrase to a file...")
    save_speech_to_file("This phrase was generated and saved safely.", "sample_output.wav")
    
    # Wait for the async speaking thread to finish demo
    import time
    time.sleep(3)
    
    print("\nText-to-Speech test completed successfully.")

if __name__ == "__main__":
    main()
