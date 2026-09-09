# -*- coding: utf-8 -*-
"""
agent_daemon.py - Autonomous Background Watcher & CLI Daemon for MediaMogul.

Capabilities:
1. CLI Goal Runner: Execute natural language goals from the command line autonomously.
2. Background Folder Watcher: Continuously monitor media folders for incoming takes.
3. Quality Gate Integration: Validates output with computer vision checks and self-corrects.
4. Shotcut Contained Integration: Launches projects in the desktop Shotcut environment.
"""

import os
import sys
import time
import signal
import argparse
import threading
from pathlib import Path
from typing import Optional, Set, Callable

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure companion root is in sys.path
_cur = Path(__file__).resolve().parent
_companion = _cur.parent
_root = _companion.parent
for p in [str(_root), str(_companion), str(_cur)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from companion.core.autonomous_agent import AutonomousVideoAgent, LocalIntentParser
from companion.core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe


class AgentDaemon:
    """Autonomous background watcher and goal execution daemon."""
    def __init__(
        self,
        watch_folder: Optional[str] = None,
        poll_interval: float = 5.0,
        open_in_shotcut: bool = True,
        normalize_audio: bool = True,
        target_mode: str = "narrated_cut",
        log_callback: Optional[Callable[[str], None]] = None
    ):
        self.watch_folder = watch_folder
        self.poll_interval = poll_interval
        self.open_in_shotcut = open_in_shotcut
        self.normalize_audio = normalize_audio
        self.target_mode = target_mode
        self.log_callback = log_callback or self._default_log
        self.agent = AutonomousVideoAgent()
        self._stop_event = threading.Event()
        self._known_files: Set[str] = set()
        self._thread: Optional[threading.Thread] = None
        self.is_running = False

    def _default_log(self, msg: str):
        print(f"[AgentDaemon] {msg}", flush=True)

    def log(self, msg: str):
        if self.log_callback:
            self.log_callback(msg)

    def execute_goal(self, goal_prompt: str, media_folder: Optional[str] = None) -> dict:
        """Executes a single autonomous video creation/editing goal."""
        folder = media_folder or self.watch_folder
        if not folder:
            parsed = LocalIntentParser.parse_intent(goal_prompt)
            folder = parsed.get("parameters", {}).get("folder_path")

        if not folder or not os.path.exists(folder):
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if os.path.exists(default_test):
                folder = default_test
            else:
                raise FileNotFoundError(f"Media folder could not be resolved: '{folder}'")

        self.log(f"Starting Goal Execution: '{goal_prompt}'")
        self.log(f"Resolved Media Folder: {folder}")

        res = self.agent.execute_goal(
            goal_description=goal_prompt,
            media_folder=folder,
            log_callback=self.log
        )
        return res

    def start_watch(self, blocking: bool = False):
        """Starts monitoring the watch folder in background."""
        if not self.watch_folder or not os.path.exists(self.watch_folder):
            raise ValueError(f"Valid watch folder required, got: {self.watch_folder}")

        self._snapshot_existing_files()
        self._stop_event.clear()
        self.is_running = True
        self.log(f"👁️ Monitoring folder: {self.watch_folder} (interval: {self.poll_interval}s)")

        if blocking:
            self._watch_loop()
        else:
            self._thread = threading.Thread(target=self._watch_loop, daemon=True)
            self._thread.start()

    def stop_watch(self):
        """Stops the background monitoring loop."""
        self._stop_event.set()
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        self.log("Daemon monitoring stopped.")

    def _snapshot_existing_files(self):
        if not self.watch_folder or not os.path.exists(self.watch_folder):
            return
        files = os.listdir(self.watch_folder)
        self._known_files = set(files)

    def _watch_loop(self):
        while not self._stop_event.is_set():
            try:
                if os.path.exists(self.watch_folder):
                    current_files = set(os.listdir(self.watch_folder))
                    new_media = [
                        f for f in (current_files - self._known_files)
                        if f.lower().endswith((".mov", ".mp4", ".mkv", ".m4a", ".wav"))
                        and not f.endswith("_Master.mp4")
                        and not f.startswith("MediaMogul_")
                    ]
                    if new_media:
                        self.log(f"✨ Detected {len(new_media)} new media take(s): {new_media}")
                        self._known_files = current_files
                        self.execute_goal(
                            f"Auto-produce video with new takes: {', '.join(new_media[:3])}",
                            media_folder=self.watch_folder
                        )
                time.sleep(self.poll_interval)
            except Exception as e:
                self.log(f"Watcher loop exception: {e}")
                time.sleep(self.poll_interval)


def main():
    parser = argparse.ArgumentParser(description="MediaMogul Autonomous Agent Daemon & CLI Runner")
    parser.add_argument("--goal", type=str, help="Natural language video creation or editing goal")
    parser.add_argument("--watch", "--folder", dest="watch_folder", type=str,
                        default=r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001",
                        help="Media folder path to process or watch")
    parser.add_argument("--daemon", action="store_true", help="Run continuously in background watcher daemon mode")
    parser.add_argument("--interval", type=float, default=5.0, help="Polling interval in seconds (default: 5.0)")
    parser.add_argument("--no-shotcut", action="store_true", help="Do not open Shotcut GUI after rendering")
    parser.add_argument("--mode", type=str, default="narrated_cut", choices=["narrated_cut", "full_sequence"],
                        help="Production sequencing mode")

    args = parser.parse_args()

    daemon = AgentDaemon(
        watch_folder=args.watch_folder,
        poll_interval=args.interval,
        open_in_shotcut=not args.no_shotcut,
        target_mode=args.mode
    )

    def sig_handler(sig, frame):
        print("\nStopping MediaMogul Daemon...", flush=True)
        daemon.stop_watch()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)

    if args.goal:
        res = daemon.execute_goal(args.goal, media_folder=args.watch_folder)
        if res.get("status") == "SUCCESS":
            print(f"\n[SUCCESS] Master Output: {res.get('output_video')}")
            sys.exit(0)
        else:
            print(f"\n[FAILED] Goal Error: {res.get('error')}")
            sys.exit(1)

    if args.daemon:
        print(f"Starting MediaMogul Daemon on '{args.watch_folder}' (Press Ctrl+C to exit)...")
        daemon.start_watch(blocking=True)
    else:
        print(f"Executing default autonomous goal on '{args.watch_folder}'...")
        default_goal = "Auto-produce video with Shotcut, broadcast -14 LUFS audio, and 100% Fingerprint-Free authenticity."
        res = daemon.execute_goal(default_goal, media_folder=args.watch_folder)
        if res.get("status") == "SUCCESS":
            print(f"\n[SUCCESS] Master Output: {res.get('output_video')}")
            sys.exit(0)
        else:
            print(f"\n[FAILED] Goal Error: {res.get('error')}")
            sys.exit(1)


if __name__ == "__main__":
    main()
