# -*- coding: utf-8 -*-
"""
one_click_video.py - Instant One-Click Video Production for MediaMogul Shotcut.

Click one button or run this script to:
1. Ingest camera takes & voiceovers (100% Fingerprint-Free)
2. Master audio to broadcast -14 LUFS standard
3. Assemble multitrack Shotcut .mlt timeline XML
4. Render 1080p master MP4 with melt.exe
5. Run Computer Vision Quality Gate frame audit
6. Launch Shotcut with master video loaded on desktop
"""

import os
import sys
import time
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add companion and root to sys.path
root_dir = Path(__file__).resolve().parent
companion_dir = root_dir / "companion"
for p in [str(root_dir), str(companion_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from companion.core.autonomous_agent import AutonomousVideoAgent
from companion.tools.ab_test_producer import produce_ab_test_suite


def produce_one_click_video(folder_path: str = None) -> dict:
    is_ab_test = "--ab-test" in sys.argv or "-ab" in sys.argv
    variants = 3
    for arg in sys.argv:
        if arg.startswith("--variants="):
            variants = int(arg.split("=")[1])

    target = folder_path
    if not target:
        # Find argument that is not an option flag
        non_flag_args = [a for a in sys.argv[1:] if not a.startswith("-")]
        if non_flag_args and os.path.exists(non_flag_args[0]):
            target = non_flag_args[0]
        else:
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if os.path.exists(default_test):
                target = default_test
            else:
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                target = filedialog.askdirectory(title="Select Media Folder for Video Production")
                root.destroy()

    if not target or not os.path.exists(target):
        print(f"[ERROR] Valid media folder required. Given: '{target}'")
        return {"status": "FAILED", "error": "Folder not found"}

    if is_ab_test:
        print("═" * 70)
        print("⚡ MEDIAMOGUL: MULTI-VIDEO A/B TESTING STUDIO (8-DIGIT ALPHANUMERIC IDs)")
        print(f"📁 Target Media: {target}")
        print("═" * 70)
        return produce_ab_test_suite(
            media_folder=target,
            variant_count=variants,
            render_videos=True,
            open_in_shotcut=True
        )

    print("═" * 70)
    print("⚡ MEDIAMOGUL: ONE-CLICK AUTONOMOUS VIDEO PRODUCTION")
    print(f"📁 Target Media: {target}")
    print("🛡️ Authenticity: 🟢 100% Fingerprint-Free")
    print("═" * 70)

    agent = AutonomousVideoAgent()
    goal = "One-Click Video Production: Ingest, Master -14 LUFS, Build MLT, Melt Render, Vision QC, and Open in Shotcut."
    res = agent.execute_goal(goal, target)

    if res.get("status") == "SUCCESS":
        print("\n" + "═" * 70)
        print("🎉 SUCCESS! Video Ready:")
        print(f"🎥 Master Video: {res.get('output_video')}")
        print(f"📁 MLT Timeline: {res.get('output_mlt')}")
        print("═" * 70)
    else:
        print(f"\n❌ Production Failed: {res.get('error')}")

    return res


if __name__ == "__main__":
    produce_one_click_video()
