"""
ffmpeg_utils.py - Core utility functions for media path discovery, token estimation, and window inspection.
"""

import os
import shutil
import subprocess
import ctypes
from ctypes import wintypes
try:
    import winreg
except ImportError:
    winreg = None

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32


def get_contained_shotcut_dir() -> str:
    """Returns the path to the contained shotcut directory inside MediaMogul."""
    # core -> companion -> MediaMogul
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    shotcut_dir = os.path.join(base_dir, "shotcut")
    return shotcut_dir if os.path.isdir(shotcut_dir) else None


def find_ffmpeg() -> str:
    """Locate the ffmpeg binary on the system, prioritizing contained MediaMogul Shotcut."""
    contained = get_contained_shotcut_dir()
    paths = []
    if contained:
        paths.append(os.path.join(contained, "ffmpeg.exe"))
    paths.extend([
        r"C:\Program Files\Shotcut\ffmpeg.exe",
        r"C:\Program Files (x86)\Shotcut\ffmpeg.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Shotcut\ffmpeg.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Shotcut\ffmpeg.exe"),
    ])
    for p in paths:
        if os.path.exists(p):
            return p
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            return "ffmpeg"
    except Exception:
        pass
    return None


def find_melt() -> str:
    """Find the MLT Melt engine binary, prioritizing contained MediaMogul Shotcut."""
    contained = get_contained_shotcut_dir()
    paths = []
    if contained:
        paths.append(os.path.join(contained, "melt.exe"))
    paths.extend([
        r"C:\Program Files\Shotcut\melt.exe",
        r"C:\Program Files (x86)\Shotcut\melt.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Shotcut\melt.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Shotcut\melt.exe"),
    ])
    for p in paths:
        if os.path.exists(p):
            return p
    try:
        res = subprocess.run(["melt", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            return "melt"
    except Exception:
        pass
    return None


def find_shotcut_exe() -> str:
    """Find the path to Shotcut executable, prioritizing contained MediaMogul Shotcut."""
    contained = get_contained_shotcut_dir()
    candidates = []
    if contained:
        candidates.append(os.path.join(contained, "shotcut.exe"))
    candidates.extend([
        r"C:\Program Files\Shotcut\shotcut.exe",
        r"C:\Program Files (x86)\Shotcut\shotcut.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Shotcut\shotcut.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Shotcut\shotcut.exe"),
    ])
    for c in candidates:
        if os.path.exists(c):
            return c

    if winreg:
        for root_key in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(root_key, r"Software\Microsoft\Windows\CurrentVersion\App Paths\shotcut.exe") as k:
                    val, _ = winreg.QueryValueEx(k, "")
                    if val and os.path.exists(val):
                        return val
            except Exception:
                pass

    p = shutil.which("shotcut.exe") or shutil.which("shotcut")
    if p and os.path.exists(p):
        return p

    return None


def find_shotcut_window():
    """Find Shotcut main window HWND and title."""
    found = None
    def enum_cb(hwnd, _):
        nonlocal found
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value
                if "shotcut" in title.lower():
                    rect = wintypes.RECT()
                    user32.GetWindowRect(hwnd, ctypes.byref(rect))
                    if (rect.right - rect.left > 400) and (rect.bottom - rect.top > 300):
                        found = (hwnd, title, rect)
                        return False
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    return found


def format_timestamp(seconds: float) -> str:
    """Format seconds into HH:MM:SS,mmm timestamp for subtitles."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def get_media_duration_seconds(ffmpeg: str, media_path: str) -> float:
    """Probes media duration in seconds via FFprobe or FFmpeg."""
    if not ffmpeg:
        ffmpeg = find_ffmpeg()
    ffprobe = ffmpeg.replace("ffmpeg.exe", "ffprobe.exe") if ffmpeg and ffmpeg.endswith(".exe") else "ffprobe"
    try:
        cmd = [
            ffprobe, "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", media_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0 and res.stdout.strip():
            return float(res.stdout.strip())
    except Exception:
        pass
    try:
        res = subprocess.run([ffmpeg or "ffmpeg", "-i", media_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        for line in res.stderr.splitlines():
            if "Duration:" in line:
                dur_str = line.split("Duration:")[1].split(",")[0].strip()
                parts = dur_str.split(":")
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    except Exception:
        pass
    return 60.0


def extract_audio(input_media: str, output_audio: str, ffmpeg_path: str = None) -> bool:
    """Extract lightweight audio from video for speech recognition."""
    if not ffmpeg_path:
        ffmpeg_path = find_ffmpeg()
    if not ffmpeg_path:
        raise RuntimeError("FFmpeg not found! Please ensure Shotcut is installed.")
    cmd = [
        ffmpeg_path, "-y", "-i", input_media,
        "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k",
        output_audio
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0


def estimate_tokens(text: str) -> int:
    """Approximates token count for string."""
    if not text:
        return 0
    return max(1, int(len(text) / 3.8))


def count_conversation_tokens(messages: list) -> int:
    """Estimates total tokens across message stack."""
    total = 0
    for m in messages:
        total += 4 + estimate_tokens(m.get("content", ""))
    return total + 3


def prune_sliding_context(messages: list, max_tokens: int) -> list:
    """Sliding context window: drops oldest user/assistant turns while preserving system prompt."""
    if len(messages) <= 1:
        return messages[:]
    limit = max(1000, max_tokens)
    pruned = messages[:]
    curr = count_conversation_tokens(pruned)
    while curr > limit and len(pruned) > 2:
        pruned.pop(1)
        curr = count_conversation_tokens(pruned)
    return pruned
