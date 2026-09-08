import sys
import time
import ctypes
from ctypes import wintypes

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

def find_window(window_title):
    """Return a visible top-level window whose title exactly or partially matches."""
    if not window_title:
        return None
    user32 = ctypes.windll.user32
    exact = user32.FindWindowW(None, window_title)
    if exact:
        return exact

    match = None
    def enum_callback(hwnd, _):
        nonlocal match
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if not length:
            return True
        title = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, title, length + 1)
        if window_title.lower() in title.value.lower():
            match = hwnd
            return False
        return True

    callback = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)(enum_callback)
    user32.EnumWindows(callback, 0)
    return match

def activate_window(window_title):
    if not window_title:
        return False
    try:
        hwnd = find_window(window_title)
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

def target_window_rect(window_title):
    """Return the selected window's screen rect, or None when unavailable."""
    if not window_title:
        return None
    hwnd = find_window(window_title)
    if not hwnd:
        return None
    rect = wintypes.RECT()
    if not ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        return None
    return rect.left, rect.top, rect.right, rect.bottom

def normalized_to_window(x, y, window_title):
    if x > 1000 or y > 1000:
        return x, y
    rect = target_window_rect(window_title)
    if rect:
        left, top, right, bottom = rect
        return left + int((x / 1000.0) * (right - left)), top + int((y / 1000.0) * (bottom - top))
    sw, sh = pyautogui.size()
    return int((x / 1000.0) * sw), int((y / 1000.0) * sh)

def normalized_key(key):
    aliases = {
        'Space': 'space', ' ': 'space', 'Enter': 'enter', 'Escape': 'esc', 'Esc': 'esc',
        'Shift': 'shift', 'Control': 'ctrl', 'Ctrl': 'ctrl', 'Alt': 'alt', 'Tab': 'tab',
        # HL2 / Source FPS bindings
        'Crowbar': '1', 'Pistol': '2', 'SMG': '3', 'Shotgun': '4',
    }
    if key in aliases:
        return aliases[key]
    low = str(key).lower()
    if low in ('space', 'enter', 'esc', 'escape', 'shift', 'ctrl', 'control', 'alt', 'tab',
               'up', 'down', 'left', 'right', 'backspace', 'delete', 'insert', 'home', 'end',
               'pageup', 'pagedown', 'capslock', 'numlock', 'scrolllock'):
        return low
    if len(key) == 1:
        return key.lower()
    if key.upper().startswith('F') and key[1:].isdigit():
        return 'f' + key[1:]
    return low

def print_help():
    print("Usage:")
    print("  python input_sim.py click <x> <y> [window_title]")
    print("  python input_sim.py press <key> [window_title]")
    print("  python input_sim.py type <text> [window_title]")
    print("  python input_sim.py hold <key> <duration_ms> [window_title]")
    print("  python input_sim.py hold_keys <k1,k2> <duration_ms> [window_title]")
    print("  python input_sim.py move <x> <y> [window_title]")
    print("  python input_sim.py look <dx> <dy> [window_title]   (FPS mouse-look, relative px)")
    print("  python input_sim.py wheel <clicks> [window_title]   (weapon switch / zoom)")
    print("  python input_sim.py drag <x1> <y1> <x2> <y2> <duration_ms> [window_title]")
    print("  python input_sim.py screenshot <dest_path> [window_title]")
    print("  python input_sim.py overlay <window_title>")

def report_window_bounds(window_title):
    hwnd = find_window(window_title)
    if not hwnd:
        raise RuntimeError(f"Window not found: {window_title}")
    user32 = ctypes.windll.user32
    rect = wintypes.RECT()
    if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        raise RuntimeError('Unable to read target window bounds')
    # Never resize a live game here. Fullscreen, borderless, and partial
    # windowed modes are owned by the game; the worker only follows its bounds.
    print(f"Overlay bounds: {rect.left},{rect.top},{rect.right-rect.left},{rect.bottom-rect.top}")

def main():
    if len(sys.argv) < 2:
        print_help()
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    
    try:
        if cmd == "overlay":
            if len(sys.argv) < 3:
                print("Error: overlay command requires a window title")
                sys.exit(1)
            report_window_bounds(" ".join(sys.argv[2:]))

        elif cmd == "click":
            if len(sys.argv) < 4:
                print("Error: click command requires x and y coordinates")
                sys.exit(1)
            x, y = int(sys.argv[2]), int(sys.argv[3])
            
            window_title = " ".join(sys.argv[4:]) if len(sys.argv) >= 5 else ''
            if window_title:
                activate_window(window_title)
                
            # If coordinates are scaled (0-1000), we can map to screen resolution
            # Or we can treat them as screen coordinates if the window is maximized.
            # For simplicity, if coordinates are less than or equal to 1000, and they represent percentage/scale:
            # We map to the target window rect, or screen size. Let's map to active window bounds if possible!
            # Let's keep it simple: we scale to current screen width/height if target coordinates are 0-1000.
            x, y = normalized_to_window(x, y, window_title)
                
            pyautogui.click(x, y)
            print(f"Successfully clicked at ({x}, {y})")

        elif cmd == "move":
            if len(sys.argv) < 4:
                print("Error: move command requires x and y coordinates")
                sys.exit(1)
            x, y = int(sys.argv[2]), int(sys.argv[3])
            window_title = " ".join(sys.argv[4:]) if len(sys.argv) >= 5 else ''
            if window_title:
                activate_window(window_title)
            x, y = normalized_to_window(x, y, window_title)
            pyautogui.moveTo(x, y, duration=0.10)
            print(f"Successfully moved pointer to ({x}, {y})")
            
        elif cmd == "press":
            if len(sys.argv) < 3:
                print("Error: press command requires a key name")
                sys.exit(1)
            key = normalized_key(sys.argv[2])
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
            key = normalized_key(sys.argv[2])
            duration = float(sys.argv[3]) / 1000.0
            if len(sys.argv) >= 5:
                activate_window(" ".join(sys.argv[4:]))
            pyautogui.keyDown(key)
            time.sleep(duration)
            pyautogui.keyUp(key)
            print(f"Successfully held key: {key} for {sys.argv[3]}ms")

        elif cmd == "hold_keys":
            if len(sys.argv) < 4:
                print("Error: hold_keys command requires comma-separated keys and duration")
                sys.exit(1)
            keys = [normalized_key(k.strip()) for k in sys.argv[2].split(',') if k.strip()]
            duration = float(sys.argv[3]) / 1000.0
            if len(sys.argv) >= 5:
                activate_window(" ".join(sys.argv[4:]))
            for key in keys: pyautogui.keyDown(key)
            time.sleep(duration)
            for key in reversed(keys): pyautogui.keyUp(key)
            print(f"Successfully held keys: {','.join(keys)} for {sys.argv[3]}ms")
            
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
            
        elif cmd == "look":
            # FPS mouse-look: relative pointer nudge so Source-engine yaw/pitch turns.
            # Usage: look <dx> <dy> [window_title]  (dx/dy in raw pixels, clamped)
            if len(sys.argv) < 4:
                print("Error: look command requires dx and dy")
                sys.exit(1)
            try:
                dx = max(-500, min(500, int(sys.argv[2])))
                dy = max(-500, min(500, int(sys.argv[3])))
            except ValueError:
                print("Error: look dx/dy must be integers")
                sys.exit(1)
            window_title = " ".join(sys.argv[4:]) if len(sys.argv) >= 5 else ''
            if window_title:
                activate_window(window_title)
            pyautogui.moveRel(dx, dy, duration=0.08)
            print(f"Successfully looked by ({dx}, {dy})")

        elif cmd == "wheel":
            # Weapon switch (HL2 1-6 alternative) / zoom: positive = up, negative = down.
            if len(sys.argv) < 3:
                print("Error: wheel command requires click count")
                sys.exit(1)
            try:
                clicks = max(-5, min(5, int(sys.argv[2])))
            except ValueError:
                print("Error: wheel clicks must be an integer")
                sys.exit(1)
            window_title = " ".join(sys.argv[3:]) if len(sys.argv) >= 4 else ''
            if window_title:
                activate_window(window_title)
            if clicks != 0:
                pyautogui.scroll(clicks)
            print(f"Successfully scrolled wheel by {clicks}")

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
