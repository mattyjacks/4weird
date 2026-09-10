"""
setup_contained_shotcut.py - Verifies or sets up contained Shotcut inside MediaMogul.
Checks if /v2/MediaMogul/shotcut contains shotcut.exe and melt.exe.
If not, links from standard system installation or downloads portable Shotcut.
"""

import os
import sys
import subprocess
import shutil

MEDIAMOGUL_DIR = os.path.dirname(os.path.abspath(__file__))
SHOTCUT_DIR = os.path.join(MEDIAMOGUL_DIR, "shotcut")

SYSTEM_SHOTCUT_PATHS = [
    r"C:\Program Files\Shotcut",
    r"C:\Program Files (x86)\Shotcut",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Shotcut"),
    os.path.expandvars(r"%LOCALAPPDATA%\Shotcut"),
]


def is_valid_shotcut_dir(d: str) -> bool:
    if not d or not os.path.isdir(d):
        return False
    shotcut_exe = os.path.join(d, "shotcut.exe")
    melt_exe = os.path.join(d, "melt.exe")
    return os.path.isfile(shotcut_exe) and os.path.isfile(melt_exe)


def setup_contained_shotcut():
    print(f"Checking contained Shotcut in: {SHOTCUT_DIR}")
    if is_valid_shotcut_dir(SHOTCUT_DIR):
        print(f"Contained Shotcut is already present and valid at: {SHOTCUT_DIR}")
        return True

    source_dir = None
    for cand in SYSTEM_SHOTCUT_PATHS:
        if is_valid_shotcut_dir(cand):
            source_dir = cand
            break

    if not source_dir:
        which_shotcut = shutil.which("shotcut.exe") or shutil.which("shotcut")
        if which_shotcut:
            p_dir = os.path.dirname(which_shotcut)
            if is_valid_shotcut_dir(p_dir):
                source_dir = p_dir

    if source_dir:
        print(f"Found system Shotcut at: {source_dir}")
        print(f"Creating junction at: {SHOTCUT_DIR} -> {source_dir}")
        try:
            if sys.platform == "win32":
                subprocess.run(
                    ["powershell", "-NoProfile", "-Command", f'New-Item -ItemType Junction -Path "{SHOTCUT_DIR}" -Target "{source_dir}"'],
                    check=True
                )
            else:
                os.symlink(source_dir, SHOTCUT_DIR)
            print("Successfully linked contained Shotcut!")
            return True
        except Exception as e:
            print(f"Failed to create junction: {e}")
            try:
                shutil.copytree(source_dir, SHOTCUT_DIR)
                print("Successfully copied Shotcut into contained folder!")
                return True
            except Exception as e2:
                print(f"Failed to copy Shotcut: {e2}")
                return False

    print("Could not find an existing Shotcut installation on this machine.")
    return False


if __name__ == "__main__":
    success = setup_contained_shotcut()
    sys.exit(0 if success else 1)
