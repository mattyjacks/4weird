"""
media_tracker.py - Asset manifest tracker and project collaboration export engine.
"""

import os
import json
import time
import shutil
import zipfile


class MediaLibraryTracker:
    """Remembers all media files added/referenced in the session and builds manifests."""
    def __init__(self):
        self.tracked_media = {} # path -> metadata
        self.action_history = []

    def record_action(self, actor: str, action: str, details: dict = None):
        if details is None and isinstance(action, dict):
            details = action
            action = actor
            actor = "MediaMogul"
        entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "actor": actor,
            "action": action,
            "details": details or {}
        }
        self.action_history.append(entry)

    def track_file(self, filepath: str, role: str = "source_video"):
        if not filepath or not os.path.exists(filepath):
            return
        abs_path = os.path.abspath(filepath)
        try:
            stat = os.stat(abs_path)
            size_bytes = stat.st_size
            mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime))
        except Exception:
            size_bytes = 0
            mtime = time.strftime("%Y-%m-%d %H:%M:%S")

        ext = os.path.splitext(abs_path)[1].lower()
        is_heavy = ext in [".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv", ".mp3", ".wav", ".aac", ".flac", ".png", ".jpg", ".jpeg", ".webp"]

        self.tracked_media[abs_path] = {
            "filename": os.path.basename(abs_path),
            "role": role,
            "path": abs_path,
            "system_uri": f"file:///{abs_path.replace('\\', '/')}",
            "size_bytes": size_bytes,
            "size_mb": round(size_bytes / (1024 * 1024), 2),
            "modified_time": mtime,
            "is_heavy": is_heavy,
            "exists": True
        }

    def get_all_tracked(self) -> list:
        """Returns list of all tracked media item records."""
        return list(self.tracked_media.values())

    def get_manifest(self) -> dict:
        return {
            "exported_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_files": len(self.tracked_media),
            "heavy_media_count": sum(1 for m in self.tracked_media.values() if m.get("is_heavy")),
            "media_files": self.tracked_media,
            "total_actions": len(self.action_history)
        }

    def export_single_action_log(self, output_file: str) -> str:
        """Export full conversation and action history as a unified long-format single file."""
        lines = [
            "# MediaMogul - Unified Session & Action History Log",
            f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total Actions: {len(self.action_history)}",
            f"Total Referenced Media Assets: {len(self.tracked_media)}",
            "\n## 📁 Referenced Media Library & System Links",
        ]
        for p, info in self.tracked_media.items():
            lines.append(f"- **[{info.get('role', 'media').upper()}]** `{info.get('filename', os.path.basename(p))}` ({info.get('size_mb', 0)} MB)")
            lines.append(f"  - Local Path: `{p}`")
            lines.append(f"  - System Link: [{info.get('filename', os.path.basename(p))}]({info.get('system_uri', '')})")

        lines.append("\n## ⚡ Chronological Action History Log\n")
        for idx, act in enumerate(self.action_history, 1):
            lines.append(f"### {idx}. [{act['timestamp']}] {act['actor']} — {act['action']}")
            lines.append("```json")
            lines.append(json.dumps(act.get("details", {}), indent=2))
            lines.append("```\n")

        content = "\n".join(lines)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(content)
        return output_file

    def export_lightweight_pack(self, output_zip: str, project_files: list = None) -> str:
        """Export lightweight ZIP: scripts, MLT, SRTs, logs, with system links to videos (NO heavy videos)."""
        project_files = project_files or []
        manifest = self.get_manifest()

        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("media_manifest.json", json.dumps(manifest, indent=2))
            zf.writestr("session_action_history.json", json.dumps(self.action_history, indent=2))

            summary_text = (
                "MediaMogul Lightweight Collaboration Pack\n"
                "=========================================\n"
                "This pack contains all lightweight project metadata, .mlt timeline files, subtitles, and scripts.\n"
                "Heavy video and audio files are excluded to maintain extreme portability.\n\n"
                "System Links & Local Paths:\n"
            )
            for p, meta in self.tracked_media.items():
                summary_text += f"- {meta.get('filename')}: {meta.get('system_uri')} ({meta.get('size_mb')} MB)\n"
            zf.writestr("README_COLLAB.txt", summary_text)

            # Include project files (.mlt, .srt, .txt, .json)
            added = set()
            for pf in project_files:
                if pf and os.path.exists(pf) and pf not in added:
                    zf.write(pf, arcname=f"project/{os.path.basename(pf)}")
                    added.add(pf)

            for p, meta in self.tracked_media.items():
                if not meta.get("is_heavy", False) and os.path.exists(p) and p not in added:
                    zf.write(p, arcname=f"lightweight_assets/{os.path.basename(p)}")
                    added.add(p)

        return output_zip

    def export_master_bundle(self, output_zip: str, project_files: list = None) -> str:
        """Export master turnkey bundle: copies all heavy media files, projects, and logs into one master archive."""
        project_files = project_files or []
        manifest = self.get_manifest()

        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("media_manifest.json", json.dumps(manifest, indent=2))
            zf.writestr("session_action_history.json", json.dumps(self.action_history, indent=2))

            added = set()
            for pf in project_files:
                if pf and os.path.exists(pf) and pf not in added:
                    zf.write(pf, arcname=f"project/{os.path.basename(pf)}")
                    added.add(pf)

            for p in self.tracked_media.keys():
                if os.path.exists(p) and p not in added:
                    ext = os.path.splitext(p)[1].lower()
                    folder = "media" if ext in [".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv", ".mp3", ".wav", ".png", ".jpg"] else "assets"
                    zf.write(p, arcname=f"{folder}/{os.path.basename(p)}")
                    added.add(p)

        return output_zip
