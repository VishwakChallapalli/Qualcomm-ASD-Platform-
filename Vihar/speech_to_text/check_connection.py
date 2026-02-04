import qai_hub as hub

def check_connection():
    print("Checking Qualcomm AI Hub connection...")
    try:
        # Check API status
        devices = hub.get_devices()
        print(f"Success! Found {len(devices)} devices.")
        for d in devices[:5]: # List first 5
            print(f"- {d.name}")
            
        # Check if we can access a model
        print("\nChecking model access...")
        # List available models
        print("\nSearching for face models...")
        models = hub.get_models()
        face_models = [m for m in models if "face" in m.name.lower()]
        print(f"Found {len(face_models)} face models.")
        for m in face_models:
            print(f"- {m.name} (ID: {m.model_id})")
            
    except Exception as e:
        print(f"\nConnection failed: {e}")
        print("\nPlease run 'qai-hub configure' in your terminal if you haven't set up your API token.")

if __name__ == "__main__":
    check_connection()
