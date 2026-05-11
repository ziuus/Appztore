import requests
import json
import time
import subprocess
import os

API_BASE = "http://localhost:8000"

def test_endpoint(name, method, path, data=None):
    print(f"\n--- Testing {name} ({path}) ---")
    try:
        if method == "GET":
            response = requests.get(f"{API_BASE}{path}")
        else:
            response = requests.post(f"{API_BASE}{path}", json=data)
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            try:
                result = response.json()
                items = result.get('results', result.get('apps', []))
                print(f"Success! Found {len(items)} items.")
                if isinstance(items, list) and len(items) > 0:
                    print("Sample items:", [i.get('name') for i in items[:3]])
                
                if "intent" in result:
                    print(f"Intent detected: {result['intent']}")
            except:
                print("Success! (Non-JSON or empty results)")
        else:
            print(f"Failed: {response.text}")
        return response
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        return None

def main():
    # 1. Test Search (General)
    test_endpoint("Search (vlc)", "POST", "/api/v1/search", {"query": "vlc", "os": "linux"})
    
    # 2. Test Search (Intent based)
    test_endpoint("Search (video editor)", "POST", "/api/v1/search", {"query": "video editor", "os": "linux"})
    
    # 3. Test Search (Windows)
    test_endpoint("Search Windows (gimp)", "POST", "/api/v1/search", {"query": "gimp", "os": "windows"})
    
    # 4. Test Featured
    test_endpoint("Featured", "GET", "/api/v1/featured?os=linux")
    
    # 5. Test System Info
    test_endpoint("System Info", "GET", "/api/v1/system/info")

    # 6. Test Install Insight
    test_endpoint("Install Insight", "POST", "/api/v1/install/insight", {"app_id": "org.videolan.VLC"})

if __name__ == "__main__":
    # Start backend in background if not running
    print("Checking if backend is running...")
    backend_started = False
    try:
        requests.get(API_BASE + "/api/v1/featured", timeout=1)
        print("Backend is already running.")
    except:
        print("Starting backend with venv...")
        env = os.environ.copy()
        env["PYTHONPATH"] = os.getcwd()
        # Use the venv python
        python_path = os.path.join(os.getcwd(), ".venv", "bin", "python3")
        backend_proc = subprocess.Popen([python_path, "app/main.py"], env=env)
        backend_started = True
        time.sleep(5) # Wait for start
    
    try:
        main()
    finally:
        if backend_started:
            print("\nStopping background backend...")
            backend_proc.terminate()
