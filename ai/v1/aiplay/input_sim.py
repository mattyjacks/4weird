import sys
import time

def install_pyautogui():
    import subprocess
    print("PyAutoGUI not found. Attempting to install...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyautogui"])
        print("PyAutoGUI installed successfully!")
    except Exception as e:
        print(f"Failed to install PyAutoGUI: {e}", file=sys.stderr)
        print("Please install pyautogui manually using: pip install pyautogui", file=sys.stderr)
        sys.exit(1)

try:
    import pyautogui
except ImportError:
    install_pyautogui()
    import pyautogui

# PyAutoGUI fail-safe is ENABLED: move mouse to upper-left corner to abort.
pyautogui.FAILSAFE = True

def print_help():
    print("Usage:")
    print("  python input_sim.py click <x> <y>")
    print("  python input_sim.py press <key>")
    print("  python input_sim.py type <text>")
    print("  python input_sim.py hold <key> <duration_ms>")
    print("  python input_sim.py drag <x1> <y1> <x2> <y2> <duration_ms>")

def main():
    if len(sys.argv) < 2:
        print_help()
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    
    try:
        if cmd == "click":
            if len(sys.argv) < 4:
                print("Error: click command requires x and y coordinates")
                sys.exit(1)
            x, y = int(sys.argv[2]), int(sys.argv[3])
            pyautogui.click(x, y)
            print(f"Successfully clicked at ({x}, {y})")
            
        elif cmd == "press":
            if len(sys.argv) < 3:
                print("Error: press command requires a key name")
                sys.exit(1)
            key = sys.argv[2]
            pyautogui.press(key)
            print(f"Successfully pressed key: {key}")
            
        elif cmd == "type":
            if len(sys.argv) < 3:
                print("Error: type command requires text")
                sys.exit(1)
            text = " ".join(sys.argv[2:])
            pyautogui.write(text, interval=0.05)
            print(f"Successfully typed: {text}")
            
        elif cmd == "hold":
            if len(sys.argv) < 4:
                print("Error: hold command requires a key and duration in ms")
                sys.exit(1)
            key = sys.argv[2]
            duration = float(sys.argv[3]) / 1000.0
            pyautogui.keyDown(key)
            time.sleep(duration)
            pyautogui.keyUp(key)
            print(f"Successfully held key: {key} for {sys.argv[3]}ms")
            
        elif cmd == "drag":
            if len(sys.argv) < 7:
                print("Error: drag command requires x1 y1 x2 y2 duration_ms")
                sys.exit(1)
            x1, y1 = int(sys.argv[2]), int(sys.argv[3])
            x2, y2 = int(sys.argv[4]), int(sys.argv[5])
            duration = float(sys.argv[6]) / 1000.0
            
            pyautogui.moveTo(x1, y1)
            pyautogui.dragTo(x2, y2, duration=duration)
            print(f"Successfully dragged from ({x1}, {y1}) to ({x2}, {y2}) over {sys.argv[6]}ms")
            
        else:
            print(f"Unknown command: {cmd}")
            print_help()
            sys.exit(1)
            
    except Exception as e:
        print(f"Error executing command '{cmd}': {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
