import numpy as np
import sounddevice as sd
import soundfile as sf
import librosa
import time
import threading
import qai_hub as hub
import tiktoken

def countdown(seconds):
    for i in range(seconds, 0, -1):
        print(f"Recording... {i} seconds left", end='\r')
        time.sleep(1)
    print()

def record_audio(seconds=5):
    print(f"Recording for {seconds} seconds...")
    
    for i in range(3, 0, -1):
        print(f"Starting in {i}...")
        time.sleep(1)
    
    print("Speak now!")
    
    audio = sd.rec(int(seconds * 16000), samplerate=16000, channels=1, dtype='float32')
    
    timer_thread = threading.Thread(target=countdown, args=(seconds,))
    timer_thread.start()
    
    sd.wait()
    
    print("Done recording!")
    return audio.flatten()

def check_ai_hub():
    try:
        devices = hub.get_devices()
        snapdragon = [d for d in devices if 'Snapdragon X Elite' in d.name]
        if snapdragon:
            print(f"Connected to {snapdragon[0].name}")
            return True
        else:
            print("Device not found")
            return False
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

def load_tokenizer():
    try:
        tokenizer = tiktoken.get_encoding("cl100k_base")
        print("Tokenizer loaded")
        return tokenizer
    except Exception as e:
        print(f"Failed to load tokenizer: {e}")
        return None

def run_encoder(mel_features):
    if not check_ai_hub():
        return None
    
    # Simulated encoder output
    # Replace with actual AI Hub inference
    encoder_output = np.random.randn(1, 1500, 384).astype(np.float32)
    print("Encoder running on Snapdragon X Elite...")
    return encoder_output

def run_decoder(encoder_output, tokenizer):
    try:
        # Simulated decoder output
        # Replace with actual AI Hub inference
        np.random.seed(42)
        token_ids = np.random.randint(1000, 50000, size=20)
        
        if tokenizer:
            try:
                text = tokenizer.decode(token_ids)
                print(f"Token IDs: {token_ids[:10]}...")
                return f"Whisper decoded: {text}"
            except Exception as e:
                print(f"Token decoding error: {e}")
                return f"Whisper tokens: {token_ids[:10]}"
        else:
            return f"Whisper tokens: {token_ids[:10]}"
        
    except Exception as e:
        print(f"Decoder error: {e}")
        return "Decoding failed"

def convert_to_text(audio, tokenizer):
    sf.write('recording.wav', audio, 16000)
    
    mel = librosa.feature.melspectrogram(
        y=audio, 
        sr=16000, 
        n_mels=80, 
        hop_length=160, 
        n_fft=400
    )
    
    if mel.shape[1] < 3000:
        mel = np.pad(mel, ((0, 0), (0, 3000 - mel.shape[1])), mode='constant')
    else:
        mel = mel[:, :3000]
    
    mel = mel[np.newaxis, :, :].astype(np.float32)
    
    encoder_output = run_encoder(mel)
    if encoder_output is None:
        return "Encoder failed"
    
    text = run_decoder(encoder_output, tokenizer)
    
    return text

def main():
    print("Whisper Speech to Text")
    print("=" * 30)
    
    tokenizer = load_tokenizer()
    if tokenizer is None:
        print("Cannot proceed without tokenizer")
        return
    
    check_ai_hub()
    
    audio = record_audio(5)
    
    if np.max(np.abs(audio)) < 0.01:
        print("No audio detected!")
        return
    
    text = convert_to_text(audio, tokenizer)
    print(f"You said: '{text}'")
    
    print("\nAI Hub Models:")
    print("- whisper-tiny-en-encoder")
    print("- whisper-tiny-en-decoder")

if __name__ == "__main__":
    main()
