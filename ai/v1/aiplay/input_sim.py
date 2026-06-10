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

def activate_window(window_title):
    if not window_title:
        return False
    try:
        import ctypes
        # Find window by title
        hwnd = ctypes.windll.user32.FindWindowW(None, window_title)
        if not hwnd:
            # Try to match substring in window titles (optional, but FindWindowW needs exact match)
            # For simplicity, we assume exact match or look for it
            pass
        if hwnd:
            if ctypes.windll.user32.IsIconic(hwnd):
                ctypes.windll.user32.ShowWindow(hwnd, 9) # SW_RESTORE (restore/un-minimize)
            else:
                ctypes.windll.user32.ShowWindow(hwnd, 5) # SW_SHOW
            ctypes.windll.user32.SetForegroundWindow(hwnd)
            time.sleep(0.3) # Allow window to settle
            print(f"Activated window: '{window_title}'")
            return True
        else:
            print(f"Warning: Window '{window_title}' not found.", file=sys.stderr)
    except Exception as e:
        print(f"Error activating window: {e}", file=sys.stderr)
    return False

def print_help():
    print("Usage:")
    print("  python input_sim.py click <x> <y> [window_title]")
    print("  python input_sim.py press <key> [window_title]")
    print("  python input_sim.py type <text> [window_title]")
    print("  python input_sim.py hold <key> <duration_ms> [window_title]")
    print("  python input_sim.py drag <x1> <y1> <x2> <y2> <duration_ms> [window_title]")
    print("  python input_sim.py screenshot <dest_path> [window_title]")

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
            
            if len(sys.argv) >= 5:
                activate_window(" ".join(sys.argv[4:]))
                
            # If coordinates are scaled (0-1000), we can map to screen resolution
            # Or we can treat them as screen coordinates if the window is maximized.
            # For simplicity, if coordinates are less than or equal to 1000, and they represent percentage/scale:
            # We map to the target window rect, or screen size. Let's map to active window bounds if possible!
            # Let's keep it simple: we scale to current screen width/height if target coordinates are 0-1000.
            if x <= 1000 and y <= 1000:
                sw, sh = pyautogui.size()
                x = int((x / 1000.0) * sw)
                y = int((y / 1000.0) * sh)
                
            pyautogui.click(x, y)
            print(f"Successfully clicked at ({x}, {y})")
            
        elif cmd == "press":
            if len(sys.argv) < 3:
                print("Error: press command requires a key name")
                sys.exit(1)
            key = sys.argv[2]
            if len(sys.argv) >= 4:
                activate_window(" ".join(sys.argv[3:]))
            pyautogui.press(key)
            print(f"Successfully pressed key: {key}")
            
        elif cmd == "type":
            if len(sys.argv) < 3:
                print("Error: type command requires text")
                sys.exit(1)
            # Find if there is a window title at the end
            # Assume no window title or use custom argument parsing if needed.
            # For simplicity, we just type text.
            text = " ".join(sys.argv[2:])
            pyautogui.write(text, interval=0.05)
            print(f"Successfully typed: {text}")
            
        elif cmd == "hold":
            if len(sys.argv) < 4:
                print("Error: hold command requires a key and duration in ms")
                sys.exit(1)
            key = sys.argv[2]
            duration = float(sys.argv[3]) / 1000.0
            if len(sys.argv) >= 5:
                activate_window(" ".join(sys.argv[4:]))
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
            if len(sys.argv) >= 8:
                activate_window(" ".join(sys.argv[7:]))
                
            if x1 <= 1000 and y1 <= 1000:
                sw, sh = pyautogui.size()
                x1 = int((x1 / 1000.0) * sw)
                y1 = int((y1 / 1000.0) * sh)
                x2 = int((x2 / 1000.0) * sw)
                y2 = int((y2 / 1000.0) * sh)
                
            pyautogui.moveTo(x1, y1)
            pyautogui.dragTo(x2, y2, duration=duration)
            print(f"Successfully dragged from ({x1}, {y1}) to ({x2}, {y2}) over {sys.argv[6]}ms")
            
        elif cmd == "screenshot":
            if len(sys.argv) < 3:
                print("Error: screenshot command requires a destination path")
                sys.exit(1)
            dest = sys.argv[2]
            if len(sys.argv) >= 4:
                activate_window(" ".join(sys.argv[3:]))
            
            # Take screenshot using pyautogui
            img = pyautogui.screenshot()
            # We can resize it or compress it to JPEG inside Python to match token budget, or save directly.
            # The node app already compresses the image if it is a base64 buffer.
            # Let's resize to 512 width to save file size/processing time!
            w, h = img.size
            new_w = 512
            new_h = int((h / float(w)) * new_w)
            img = img.resize((new_w, new_h))
            img.save(dest, "JPEG", quality=50)
            print(f"Successfully captured screenshot to {dest}")
            
        else:
            print(f"Unknown command: {cmd}")
            print_help()
            sys.exit(1)
            
    except Exception as e:
        print(f"Error executing command '{cmd}': {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

