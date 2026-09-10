"""
shotcut_remote.py - Direct Win32 transport & hotkey remote controller for Shotcut.
Allows MediaMogul to command Shotcut's timeline (Play/Pause, Split, Ripple Delete, Undo)
without the user having to switch focus manually.
"""

import time
import ctypes
from ctypes import wintypes
try:
    from .ffmpeg_utils import find_shotcut_window
except ImportError:
    from companion.core.ffmpeg_utils import find_shotcut_window

user32 = ctypes.windll.user32

# Virtual key codes
VK_SPACE = 0x20
VK_LEFT = 0x25
VK_UP = 0x26
VK_RIGHT = 0x27
VK_DOWN = 0x28
VK_DELETE = 0x2E
VK_KEY_S = 0x53
VK_KEY_X = 0x58
VK_KEY_Z = 0x5A
VK_KEY_I = 0x49
VK_KEY_O = 0x4F
VK_CONTROL = 0x11

KEYEVENTF_KEYUP = 0x0002


def bring_shotcut_to_front() -> bool:
    """Brings the Shotcut editor window to the foreground."""
    win = find_shotcut_window()
    if not win:
        return False
    hwnd = win[0]
    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.05)
    return True


def send_key(vk_code: int, ctrl: bool = False, shift: bool = False):
    """Sends a simulated keypress directly to the foreground window (Shotcut)."""
    if not bring_shotcut_to_front():
        return False

    if ctrl:
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
    if shift:
        user32.keybd_event(0x10, 0, 0, 0)

    user32.keybd_event(vk_code, 0, 0, 0)
    time.sleep(0.03)
    user32.keybd_event(vk_code, 0, KEYEVENTF_KEYUP, 0)

    if shift:
        user32.keybd_event(0x10, 0, KEYEVENTF_KEYUP, 0)
    if ctrl:
        user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)

    return True


def remote_play_pause() -> bool:
    """Toggles playback in Shotcut (Spacebar)."""
    return send_key(VK_SPACE)


def remote_split_clip() -> bool:
    """Splits the active clip at the playhead position in Shotcut ('S' hotkey)."""
    return send_key(VK_KEY_S)


def remote_ripple_delete() -> bool:
    """Ripple deletes the selected clip/gap in Shotcut ('X' hotkey)."""
    return send_key(VK_KEY_X)


def remote_step_frame_backward() -> bool:
    """Steps playhead back by 1 frame (Left Arrow)."""
    return send_key(VK_LEFT)


def remote_step_frame_forward() -> bool:
    """Steps playhead forward by 1 frame (Right Arrow)."""
    return send_key(VK_RIGHT)


def remote_set_in_point() -> bool:
    """Sets Mark In point in Shotcut ('I' hotkey)."""
    return send_key(VK_KEY_I)


def remote_set_out_point() -> bool:
    """Sets Mark Out point in Shotcut ('O' hotkey)."""
    return send_key(VK_KEY_O)


def remote_undo() -> bool:
    """Sends Undo command to Shotcut (Ctrl+Z)."""
    return send_key(VK_KEY_Z, ctrl=True)
