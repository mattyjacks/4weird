# -*- coding: utf-8 -*-
"""
run_ab_test_production.py - 1-Click Multi-Video A/B Testing Video Production.

Run this script to:
1. Generate multiple video variants at once for A/B testing with the audience.
2. Assign a unique 8-digit alphanumeric ID to each variant (e.g. 9B3F7Q1Z).
3. Assemble multitrack Shotcut .mlt timeline XML files.
4. Render 1080p MP4 master videos with Shotcut melt engine.
5. Generate A/B Testing Audience Performance Matrix & Report.
6. Launch Shotcut Desktop with the master variant in front of you.
"""

import os
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

root_dir = Path(__file__).resolve().parent
companion_dir = root_dir / "companion"
for p in [str(root_dir), str(companion_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from companion.tools.ab_test_producer import produce_ab_test_suite, generate_ab_test_id


import argparse

def main():
    parser = argparse.ArgumentParser(description="MediaMogul 1-Click Multi-Video A/B Testing Studio")
    parser.add_argument("folder", nargs="?", default=None, help="Target media folder containing video takes")
    parser.add_argument("--variants", "-v", type=int, default=3, help="Number of variants to produce (default: 3)")
    parser.add_argument("--output-dir", "-o", default=None, help="Custom output directory")
    parser.add_argument("--no-render", action="store_true", help="Generate MLT projects without rendering MP4s")
    parser.add_argument("--no-launch", action="store_true", help="Do not open Shotcut desktop after production")

    args = parser.parse_args()

    target = args.folder
    if not target or not os.path.exists(target):
        default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
        if os.path.exists(default_test):
            target = default_test
        else:
            try:
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                target = filedialog.askdirectory(title="Select Media Folder for Multi-Video A/B Test")
                root.destroy()
            except Exception:
                target = None

    if not target or not os.path.exists(target):
        print(f"[ERROR] Valid media folder required. Given: '{target}'")
        return {"status": "FAILED", "error": "Folder not found"}

    res = produce_ab_test_suite(
        media_folder=target,
        output_dir=args.output_dir,
        variant_count=args.variants,
        render_videos=not args.no_render,
        open_in_shotcut=not args.no_launch,
    )
    return res


if __name__ == "__main__":
    main()
