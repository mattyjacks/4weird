"""
MediaMogul Agentic AI Command Center for Shotcut
- Pinned "Open MediaMogul" option at the top of the screen right next to "Help"
- Agentic AI Assistant window with 50+ tool capabilities (Whisper, TTS, DALL-E 3, MLT inspection, Vision AI)
- Multi-Agent Commander Swarm & Collaborative Pack Exporter
- Modular architecture with clean subcomponents in core, tools, and ui
"""

import os
import sys
import json
import re
import shutil
import subprocess
import threading
import urllib.request
import urllib.error
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# Support running directly or as a package
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from companion.mediamogul_tools import (
        MediaLibraryTracker, MediaMogulCommander, SYSTEM_PROMPT, execute_video_tool,
        find_ffmpeg, find_shotcut_exe, find_shotcut_window,
        count_conversation_tokens, prune_sliding_context,
        extract_audio, transcribe_whisper, convert_whisper_to_srt,
        generate_tts_audio, generate_dalle_image,
        parse_mlt_project, tool_evaluate_timeline, bring_shotcut_to_front,
        safe_parse_tool_call, CostCalculator, get_cost_calculator,
        FingerprintTracker, get_fingerprint_tracker, PreparedPlan,
        STATUS_FREE, STATUS_PARTS, STATUS_FULL,
        AutonomousVideoAgent, LocalIntentParser, GoalStage
    )
    from companion.ui import (
        MediaMogulTopBarButton, setup_remote_bar,
        setup_agent_tab, setup_subtitles_tab, setup_voiceover_tab, setup_broll_tab,
        setup_inspector_tab, setup_vision_tab, setup_collab_tab, setup_settings_tab,
        setup_director_tab, setup_sfx_tab, setup_elements_tab, setup_multiverse_tab
    )
    from companion.ui.onboarding_dialog import OnboardingDialog
except ImportError:
    from mediamogul_tools import (
        MediaLibraryTracker, MediaMogulCommander, SYSTEM_PROMPT, execute_video_tool,
        find_ffmpeg, find_shotcut_exe, find_shotcut_window,
        count_conversation_tokens, prune_sliding_context,
        extract_audio, transcribe_whisper, convert_whisper_to_srt,
        generate_tts_audio, generate_dalle_image,
        parse_mlt_project, tool_evaluate_timeline, bring_shotcut_to_front,
        safe_parse_tool_call, CostCalculator, get_cost_calculator,
        FingerprintTracker, get_fingerprint_tracker, PreparedPlan,
        STATUS_FREE, STATUS_PARTS, STATUS_FULL,
        AutonomousVideoAgent, LocalIntentParser, GoalStage
    )
    from ui import (
        MediaMogulTopBarButton, setup_remote_bar,
        setup_agent_tab, setup_subtitles_tab, setup_voiceover_tab, setup_broll_tab,
        setup_inspector_tab, setup_vision_tab, setup_collab_tab, setup_settings_tab,
        setup_director_tab, setup_sfx_tab, setup_elements_tab, setup_multiverse_tab
    )
    from ui.onboarding_dialog import OnboardingDialog


class MediaMogulAgenticCenter:
    """Main application controller coordinating UI tabs, agent workflows, and Shotcut integration."""
    def __init__(self, root):
        self.root = root
        self.root.title("MediaMogul - Agentic AI Command Center")
        
        # Center window on user's primary display
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        w = min(900, max(780, sw - 100))
        h = min(760, max(580, sh - 100))
        x = max(0, (sw - w) // 2)
        y = max(0, (sh - h) // 2)
        self.root.geometry(f"{w}x{h}+{x}+{y}")
        self.root.minsize(780, 580)
        self.root.configure(bg="#0f172a")

        self.style = ttk.Style()
        self.style.theme_use("clam")

        try:
            ico_path = os.path.join(current_dir, "mediamogul_icon.ico")
            if os.path.exists(ico_path):
                self.root.iconbitmap(ico_path)
        except Exception:
            pass

        self.ffmpeg_path = find_ffmpeg()
        self.cost_calc = get_cost_calculator()
        self.load_settings()
        self.fp_tracker = get_fingerprint_tracker(self.settings)
        self.conversation_history = []
        self.media_tracker = MediaLibraryTracker() if MediaLibraryTracker else None
        self.pending_plan = None
        self.last_user_prompt = ""

        self._active_mlt_path = None
        self.last_mlt_mtime = 0
        self.last_mlt_producers_count = 0
        self.auto_reevaluate_var = tk.BooleanVar(value=True)

        self.setup_ui()

        # Initialize active timeline path from tracker or disk
        initial_mlt = self.get_active_mlt_path()
        if initial_mlt and os.path.exists(initial_mlt):
            self.set_active_mlt_path(initial_mlt)

        # Initialize top-bar docked overlay button
        self.top_bar_btn = MediaMogulTopBarButton(self)

        # Start dynamic Shotcut status checking loop
        self.update_shotcut_status()

        # Update Live Fingerprint badge & budget interface
        self.update_fingerprint_badge()
        self.refresh_budget_ui()

        # Show initial onboarding modal if not remembered
        if not self.settings.get("onboarding_completed", False):
            self.root.after(300, self.show_onboarding_modal)

        # Ensure window is visible, brought to front, and focused
        self.root.after(100, self.show_window)

    def load_settings(self):
        self.settings_file = os.path.join(os.path.expanduser("~"), ".mediamogul_companion.json")
        self.settings = {
            "api_key": "",
            "pexels_api_key": "",
            "model": "gpt-5.6-luna",
            "menu_x_offset": 0,
            "menu_y_offset": 0,
            "shotcut_exe_path": find_shotcut_exe() or "",
            "dangerous_mode": False,
            "max_context_tokens": 8192,
            "max_output_tokens": 800,
            "disable_ai_fingerprint_features": False,
            "onboarding_completed": False,
            "auto_proceed_plan": False,
            "daily_budget_limit": 5.00,
            "lifetime_budget_limit": 50.00
        }

        # Load environment variables from .env
        try:
            from companion.core.env_utils import load_dotenv
            load_dotenv()
        except Exception:
            try:
                from core.env_utils import load_dotenv
                load_dotenv()
            except Exception:
                pass

        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.settings.update(data)
                    if self.settings.get("menu_x_offset") == 245:
                        self.settings["menu_x_offset"] = 0
                    if self.settings.get("menu_y_offset") == 32:
                        self.settings["menu_y_offset"] = 0
            except Exception:
                pass

        # Populate from environment if not yet configured in UI settings
        if not self.settings.get("api_key") and os.environ.get("OPENAI_API_KEY"):
            self.settings["api_key"] = os.environ.get("OPENAI_API_KEY", "").strip()
        if not self.settings.get("pexels_api_key") and os.environ.get("PEXELS_API_KEY"):
            self.settings["pexels_api_key"] = os.environ.get("PEXELS_API_KEY", "").strip()

    def show_window(self):
        """Restores, deiconifies and brings MediaMogul Command Center to front."""
        try:
            self.root.deiconify()
            self.root.lift()
            self.root.attributes("-topmost", True)
            self.root.after(1000, lambda: self.root.attributes("-topmost", False))
            self.root.focus_force()
            try:
                import ctypes
                hwnd = self.root.winfo_id()
                ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                ctypes.windll.user32.SetForegroundWindow(hwnd)
            except Exception:
                pass
        except Exception:
            pass

    def show_onboarding_modal(self):
        """Displays the onboarding selection dialog."""
        try:
            def _on_choice(mode, remember):
                if mode == "fingerprint_free":
                    self.settings["disable_ai_fingerprint_features"] = True
                    if hasattr(self, "disable_ai_fingerprint_var"):
                        self.disable_ai_fingerprint_var.set(True)
                else:
                    self.settings["disable_ai_fingerprint_features"] = False
                    if hasattr(self, "disable_ai_fingerprint_var"):
                        self.disable_ai_fingerprint_var.set(False)
                if remember:
                    self.settings["onboarding_completed"] = True
                self.save_settings(silent=True)
                self.update_fingerprint_badge()

            OnboardingDialog(self.root, _on_choice, self.settings)
        except Exception as e:
            print(f"Error opening onboarding modal: {e}")

    def save_settings(self, silent=False):
        try:
            self.settings["api_key"] = self.key_entry.get().strip()
            if hasattr(self, "pexels_key_entry"):
                self.settings["pexels_api_key"] = self.pexels_key_entry.get().strip()
            self.settings["model"] = self.model_combo.get()
            raw_x = self.offset_x_entry.get().strip()
            self.settings["menu_x_offset"] = int(raw_x) if (raw_x.isdigit() and int(raw_x) != 245) else 0
            raw_y = self.offset_y_entry.get().strip()
            self.settings["menu_y_offset"] = int(raw_y) if (raw_y.isdigit() and int(raw_y) != 32) else 0
            if hasattr(self, "shotcut_path_entry"):
                self.settings["shotcut_exe_path"] = self.shotcut_path_entry.get().strip()
            if hasattr(self, "dangerous_var"):
                self.settings["dangerous_mode"] = self.dangerous_var.get()
            if hasattr(self, "ctx_tokens_entry"):
                self.settings["max_context_tokens"] = int(self.ctx_tokens_entry.get().strip() or "8192")
            if hasattr(self, "out_tokens_entry"):
                self.settings["max_output_tokens"] = int(self.out_tokens_entry.get().strip() or "800")
            if hasattr(self, "disable_ai_fingerprint_var"):
                self.settings["disable_ai_fingerprint_features"] = bool(self.disable_ai_fingerprint_var.get())
            if hasattr(self, "auto_proceed_var"):
                self.settings["auto_proceed_plan"] = bool(self.auto_proceed_var.get())
            if hasattr(self, "agent_auto_proceed_var"):
                self.settings["auto_proceed_plan"] = bool(self.agent_auto_proceed_var.get())
            if hasattr(self, "daily_limit_entry") and hasattr(self, "lifetime_limit_entry"):
                try:
                    d_lim = float(self.daily_limit_entry.get().strip() or "5.0")
                    l_lim = float(self.lifetime_limit_entry.get().strip() or "50.0")
                    if self.cost_calc:
                        self.cost_calc.set_budget_limits(d_lim, l_lim)
                    self.settings["daily_budget_limit"] = d_lim
                    self.settings["lifetime_budget_limit"] = l_lim
                except Exception:
                    pass
            if hasattr(self, "gw_enabled_var") and self.cost_calc:
                self.cost_calc.set_gateway_config(
                    enabled=self.gw_enabled_var.get(),
                    url=self.gw_url_entry.get().strip(),
                    key=self.gw_key_entry.get().strip(),
                    billing_id=self.gw_billing_entry.get().strip()
                )
            if self.fp_tracker:
                self.fp_tracker.settings = self.settings

            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump(self.settings, f, indent=2)

            self.update_fingerprint_badge()
            self.refresh_budget_ui()
            if not silent:
                messagebox.showinfo("Saved", "Settings updated successfully!")
        except Exception as e:
            if not silent:
                messagebox.showerror("Error", f"Failed to save settings: {e}")

    def get_shotcut_status(self):
        """
        Determines Shotcut's operational state:
        - 'gui_linked': Visible Shotcut window is active on screen.
        - 'headless': Shotcut or Melt process is running in background without a visible GUI window.
        - 'not_running': Neither process nor window is active.
        """
        win = find_shotcut_window()
        if win:
            return "gui_linked"
        try:
            res = subprocess.run(["tasklist", "/FO", "CSV", "/NH"],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, creationflags=0x08000000)
            out_lower = res.stdout.lower()
            if "shotcut.exe" in out_lower:
                return "headless"
            if "melt.exe" in out_lower:
                return "headless"
        except Exception:
            pass
        return "not_running"

    def is_shotcut_running(self):
        return self.get_shotcut_status() in ("gui_linked", "headless")

    def update_shotcut_status(self):
        state = self.get_shotcut_status()
        if state == "gui_linked":
            self.badge.config(text="● Shotcut Linked", fg="#34d399", bg="#064e3b")
            self.launch_shotcut_btn.pack_forget()
            if hasattr(self, "view_in_shotcut_btn"):
                self.view_in_shotcut_btn.pack_forget()
            if hasattr(self, "status_view_shotcut_btn"):
                self.status_view_shotcut_btn.pack_forget()
        elif state == "headless":
            self.badge.config(text="● Shotcut Headless", fg="#fbbf24", bg="#451a03")
            self.launch_shotcut_btn.pack_forget()
            if hasattr(self, "view_in_shotcut_btn"):
                self.view_in_shotcut_btn.pack(side=tk.RIGHT, padx=(0, 6))
            if hasattr(self, "status_view_shotcut_btn"):
                self.status_view_shotcut_btn.pack(side=tk.RIGHT, padx=(6, 0))
            cur_status = self.status_var.get()
            if "headless" not in cur_status.lower() and "launching" not in cur_status.lower() and "re-evaluat" not in cur_status.lower():
                self.status_var.set("⚠️ Shotcut running headless. Click 'View in Shotcut' to open GUI window.")
        else:
            self.badge.config(text="● Shotcut Not Running", fg="#f87171", bg="#450a0a")
            if hasattr(self, "view_in_shotcut_btn"):
                self.view_in_shotcut_btn.pack_forget()
            self.launch_shotcut_btn.pack(side=tk.RIGHT, padx=(0, 6))
            if hasattr(self, "status_view_shotcut_btn"):
                self.status_view_shotcut_btn.pack_forget()

        # Check for external Shotcut timeline (.mlt) modifications
        self.check_timeline_changes()

        self.root.after(1500, self.update_shotcut_status)

    def launch_shotcut(self):
        exe_path = self.settings.get("shotcut_exe_path", "") or find_shotcut_exe()
        if not exe_path or not os.path.exists(exe_path):
            exe_path = filedialog.askopenfilename(
                title="Locate Shotcut Executable (shotcut.exe)",
                filetypes=[("Shotcut Executable", "shotcut.exe"), ("All Executables", "*.exe"), ("All Files", "*.*")]
            )
            if exe_path and os.path.exists(exe_path):
                self.settings["shotcut_exe_path"] = exe_path
                self.save_settings(silent=True)

        if exe_path and os.path.exists(exe_path):
            try:
                subprocess.Popen([exe_path], creationflags=0x00000008 | 0x00000200)
                self.status_var.set("Launching Shotcut...")
                self.badge.config(text="● Launching Shotcut...", fg="#fbbf24", bg="#451a03")
                self.root.after(1200, self.update_shotcut_status)
            except Exception as e:
                messagebox.showerror("Launch Error", f"Failed to launch Shotcut:\n{e}")
        else:
            messagebox.showwarning("Not Found", "Could not locate shotcut.exe. Set its path in Settings.")

    def view_in_shotcut(self):
        """Brings Shotcut GUI to front or launches the GUI with the active timeline project."""
        # 1. Attempt to bring existing window to front
        if bring_shotcut_to_front():
            self.status_var.set("Brought Shotcut window to front.")
            self.update_shotcut_status()
            return

        # 2. Launch Shotcut GUI executable with the active project MLT
        exe_path = self.settings.get("shotcut_exe_path", "") or find_shotcut_exe()
        if not exe_path or not os.path.exists(exe_path):
            exe_path = filedialog.askopenfilename(
                title="Locate Shotcut Executable (shotcut.exe)",
                filetypes=[("Shotcut Executable", "shotcut.exe"), ("All Executables", "*.exe"), ("All Files", "*.*")]
            )
            if exe_path and os.path.exists(exe_path):
                self.settings["shotcut_exe_path"] = exe_path
                self.save_settings(silent=True)

        if exe_path and os.path.exists(exe_path):
            active_mlt = self.get_active_mlt_path()
            cmd = [exe_path]
            if active_mlt and os.path.exists(active_mlt):
                cmd.append(active_mlt)
                proj_name = os.path.basename(active_mlt)
            else:
                proj_name = "Shotcut"

            try:
                subprocess.Popen(cmd, creationflags=0x00000008 | 0x00000200)
                self.status_var.set(f"Opening '{proj_name}' in Shotcut GUI window...")
                self.badge.config(text="● Opening GUI...", fg="#38bdf8", bg="#082f49")
                self.root.after(1500, self.update_shotcut_status)
            except Exception as e:
                messagebox.showerror("View in Shotcut Error", f"Failed to open Shotcut GUI:\n{e}")
        else:
            messagebox.showwarning("Not Found", "Could not locate shotcut.exe. Set its path in Settings.")

    # ---------------------------------------------------------------------
    # TIMELINE WATCHER & AI RE-EVALUATION
    # ---------------------------------------------------------------------
    def get_active_mlt_path(self):
        """Returns the currently active Shotcut .mlt timeline project path."""
        if hasattr(self, "_active_mlt_path") and self._active_mlt_path and os.path.exists(self._active_mlt_path):
            return self._active_mlt_path
        if hasattr(self, "mlt_entry"):
            p = self.mlt_entry.get().strip()
            if p and os.path.exists(p):
                self._active_mlt_path = os.path.abspath(p)
                return self._active_mlt_path
        if self.media_tracker:
            for item in reversed(self.media_tracker.get_all_tracked()):
                fp = item.get("path", "")
                if fp.lower().endswith(".mlt") and os.path.exists(fp):
                    self._active_mlt_path = os.path.abspath(fp)
                    return self._active_mlt_path
        # Search user Videos folder and subdirectories for newest MLT
        videos_dir = os.path.expanduser("~/Videos")
        if os.path.exists(videos_dir):
            try:
                mlt_files = []
                for root, dirs, files in os.walk(videos_dir):
                    depth = root[len(videos_dir):].count(os.sep)
                    if depth > 2:
                        continue
                    for f in files:
                        if f.lower().endswith(".mlt"):
                            mlt_files.append(os.path.join(root, f))
                if mlt_files:
                    mlt_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                    self._active_mlt_path = os.path.abspath(mlt_files[0])
                    return self._active_mlt_path
            except Exception:
                pass
        return None

    def load_media_folder_to_timeline(self, folder_path: str = None, open_in_shotcut: bool = True) -> str:
        """
        Loads a directory of videos/audio (defaults to C:\\Users\\ventu\\Videos\\drive-download-20260906T004623Z-1-001 if available)
        into a new multi-clip Shotcut project, tracks the assets, and sets active timeline.
        """
        if not folder_path:
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if os.path.exists(default_test):
                folder_path = default_test
            else:
                videos_dir = os.path.expanduser("~/Videos")
                if os.path.exists(videos_dir):
                    for item in os.listdir(videos_dir):
                        sub = os.path.join(videos_dir, item)
                        if os.path.isdir(sub) and "drive-download" in item.lower():
                            folder_path = sub
                            break
        if not folder_path or not os.path.exists(folder_path):
            raise FileNotFoundError(f"Media folder not found: {folder_path}")

        try:
            from companion.tools.mlt_tools import tool_import_media_folder
        except ImportError:
            from tools.mlt_tools import tool_import_media_folder

        ffmpeg = self.ffmpeg_path or find_ffmpeg()
        res = tool_import_media_folder(ffmpeg, folder_path, open_in_shotcut=open_in_shotcut)
        mlt_path = res["mlt_project"]

        # Track assets
        if self.media_tracker:
            for c in res.get("video_clips", []):
                self.media_tracker.track_file(c["path"], role="source_video")
            for a in res.get("audio_clips", []):
                self.media_tracker.track_file(a["path"], role="voiceover_audio")
            self.media_tracker.track_file(mlt_path, role="timeline_mlt")

        self.set_active_mlt_path(mlt_path)
        if res.get("video_clips"):
            self._active_video_path = os.path.abspath(res["video_clips"][0]["path"])

        # Update inspector if available
        if hasattr(self, "mlt_entry"):
            self.mlt_entry.delete(0, tk.END)
            self.mlt_entry.insert(0, mlt_path)
        if hasattr(self, "analyze_mlt"):
            self.analyze_mlt()

        return mlt_path

    def extract_video_from_mlt(self, mlt_path: str) -> str:
        """Extracts the first valid video source file from a Shotcut .mlt project."""
        if not mlt_path or not os.path.exists(mlt_path):
            return None
        try:
            info = parse_mlt_project(mlt_path)
            for p in info.get("producers", []):
                src = p.get("source", "").replace("/", "\\")
                if src and os.path.exists(src) and src.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".mp3", ".wav", ".aac", ".flac")):
                    return os.path.abspath(src)
        except Exception:
            pass
        return None

    def get_active_video_path(self) -> str:
        """Returns the real filesystem path of the currently active video."""
        if hasattr(self, "_active_video_path") and self._active_video_path and os.path.exists(self._active_video_path):
            return self._active_video_path

        # 1. Check active MLT project and extract its underlying video media
        active_mlt = self.get_active_mlt_path()
        if active_mlt and os.path.exists(active_mlt):
            vid = self.extract_video_from_mlt(active_mlt)
            if vid and os.path.exists(vid):
                self._active_video_path = os.path.abspath(vid)
                return self._active_video_path

        # 2. Check media tracker for tracked video files
        if self.media_tracker:
            for item in reversed(self.media_tracker.get_all_tracked()):
                fp = item.get("path", "")
                if fp and os.path.exists(fp) and fp.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v")):
                    self._active_video_path = os.path.abspath(fp)
                    return self._active_video_path

        # 3. Search ~/Videos and subdirectories for video footage
        videos_dir = os.path.expanduser("~/Videos")
        if os.path.exists(videos_dir):
            try:
                cand = []
                for root, dirs, files in os.walk(videos_dir):
                    depth = root[len(videos_dir):].count(os.sep)
                    if depth > 2:
                        continue
                    for f in files:
                        if f.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v")):
                            cand.append(os.path.join(root, f))
                if cand:
                    cand.sort(key=lambda x: os.path.getmtime(x), reverse=True)
                    self._active_video_path = os.path.abspath(cand[0])
                    return self._active_video_path
            except Exception:
                pass
        return None

    def resolve_tool_parameters(self, tool_name: str, params: dict) -> dict:
        """
        Intelligently resolves placeholder paths (such as 'active_project_video_path',
        'active_video', 'active', or blank paths) to actual system media file paths.
        """
        resolved = dict(params or {})
        active_video = self.get_active_video_path()
        active_mlt = self.get_active_mlt_path()

        path_keys = (
            "media_path", "input_path", "video_path", "input_video", "video", "input_file",
            "voice_audio", "voice_path", "background_audio", "music_path"
        )
        for k in path_keys:
            if k in resolved:
                val = str(resolved[k]).strip()
                # Check if it's a placeholder or missing file containing 'active'
                is_placeholder = (
                    val in ("active_project_video_path", "active_video", "active", "current_video", "current", "") or
                    (not os.path.exists(val) and any(w in val.lower() for w in ("active", "placeholder", "project_video")))
                )
                if is_placeholder:
                    if active_video and os.path.exists(active_video):
                        resolved[k] = active_video
                    elif active_mlt and os.path.exists(active_mlt):
                        resolved[k] = active_mlt

                # If the tool specifically needs raw video/audio but was given an MLT file
                cur_val = str(resolved[k]).strip()
                if cur_val.lower().endswith(".mlt") and tool_name in ("generate_subtitles", "burn_subtitles", "auto_roughcut", "extract_viral_short", "detect_silence", "trim_video", "convert_vertical", "audio_ducking"):
                    extracted = self.extract_video_from_mlt(cur_val)
                    if extracted and os.path.exists(extracted):
                        resolved[k] = extracted

        # If actions list is present (e.g. Shotcut action pipeline), resolve parameters in each action
        if "actions" in resolved and isinstance(resolved["actions"], list):
            for act in resolved["actions"]:
                if isinstance(act, dict):
                    act_det = act.get("details") or act.get("parameters") or act.get("params") or {}
                    if isinstance(act_det, dict):
                        for pk in path_keys:
                            if pk in act_det:
                                v_str = str(act_det[pk]).strip()
                                if not os.path.exists(v_str) and (v_str in ("active", "current", "") or "active" in v_str.lower()):
                                    if active_video and os.path.exists(active_video):
                                        act_det[pk] = active_video
                        if not any(pk in act_det and act_det[pk] for pk in path_keys):
                            if active_video and os.path.exists(active_video):
                                act_det["input_path"] = active_video

        # If no media_path or input_path was provided at all, inject active_video
        if not any(k in resolved and resolved[k] for k in path_keys):
            if active_video and os.path.exists(active_video):
                resolved["media_path"] = active_video
                resolved["input_path"] = active_video
                if tool_name == "audio_ducking":
                    resolved["voice_audio"] = active_video

        return resolved

    def set_active_mlt_path(self, path: str):
        """Sets the active timeline MLT path, initializes mtime, and updates UI."""
        if path and os.path.exists(path):
            self._active_mlt_path = os.path.abspath(path)
            self.last_mlt_mtime = os.path.getmtime(self._active_mlt_path)
            try:
                info = parse_mlt_project(self._active_mlt_path)
                self.last_mlt_producers_count = info.get("producers_count", 0)
            except Exception:
                self.last_mlt_producers_count = 0

            fn = os.path.basename(self._active_mlt_path)
            short_fn = fn if len(fn) <= 26 else fn[:23] + "..."
            if hasattr(self, "status_timeline_lbl"):
                self.status_timeline_lbl.config(
                    text=f"⏱️ Watching: {short_fn}",
                    fg="#93c5fd", bg="#1e293b"
                )
            if hasattr(self, "mlt_entry"):
                self.mlt_entry.delete(0, tk.END)
                self.mlt_entry.insert(0, self._active_mlt_path)

    def check_timeline_changes(self):
        """Checks if the active Shotcut timeline (.mlt) was modified on disk."""
        active_mlt = self.get_active_mlt_path()
        if not active_mlt or not os.path.exists(active_mlt):
            if hasattr(self, "status_timeline_lbl"):
                self.status_timeline_lbl.config(text="⏱️ No Timeline Active", fg="#64748b", bg="#1e293b")
            return

        try:
            mtime = os.path.getmtime(active_mlt)
        except Exception:
            return

        if not hasattr(self, "last_mlt_mtime") or self.last_mlt_mtime == 0:
            self.set_active_mlt_path(active_mlt)
            return

        # If file was modified by Shotcut
        if mtime > self.last_mlt_mtime:
            self.last_mlt_mtime = mtime
            self.on_timeline_changed(active_mlt)

    def on_timeline_changed(self, mlt_path: str):
        """Triggered whenever the Shotcut timeline project file changes on disk."""
        fn = os.path.basename(mlt_path)
        short_fn = fn if len(fn) <= 26 else fn[:23] + "..."
        if hasattr(self, "status_timeline_lbl"):
            self.status_timeline_lbl.config(text=f"⚡ Updated: {short_fn}", fg="#fbbf24", bg="#451a03")
        self.status_var.set(f"⚡ Timeline modification detected in '{fn}'! AI re-evaluating...")

        try:
            info = parse_mlt_project(mlt_path)
            cur_count = info.get("producers_count", 0)
            prev_count = getattr(self, "last_mlt_producers_count", cur_count)
            delta = cur_count - prev_count
            self.last_mlt_producers_count = cur_count
            tracks = info.get("tracks_count", 1)
            filters = len(info.get("filters", []))
        except Exception as e:
            cur_count = 0
            delta = 0
            tracks = 1
            filters = 0

        delta_str = f" ({delta:+d} clips)" if delta != 0 else ""
        notice = (
            f"\n⚡ [Shotcut Timeline Change Detected]\n"
            f"📁 Project: {fn}\n"
            f"📊 Structure: {cur_count} clips{delta_str}, {tracks} tracks, {filters} filters.\n"
            f"🤖 MediaMogul AI: Re-evaluating timeline pacing, cuts, and composition...\n"
        )
        self.agent_chat.insert(tk.END, notice)
        self.agent_chat.see(tk.END)

        # Trigger background re-evaluation
        threading.Thread(target=self._run_timeline_reevaluation_thread, args=(mlt_path, cur_count, delta), daemon=True).start()

    def manual_reevaluate_timeline(self):
        """Manually triggered timeline re-evaluation."""
        active_mlt = self.get_active_mlt_path()
        if not active_mlt or not os.path.exists(active_mlt):
            messagebox.showinfo("Timeline", "No active Shotcut .mlt timeline detected.\nPlease load or create a timeline project first.")
            return
        self.on_timeline_changed(active_mlt)

    def _run_timeline_reevaluation_thread(self, mlt_path: str, cur_count: int, delta: int):
        """Runs timeline re-evaluation either via OpenAI LLM or local rule-based expert engine."""
        api_key = self.settings.get("api_key", "").strip()
        model = self.settings.get("model", "gpt-5.6-luna")

        try:
            eval_res = tool_evaluate_timeline(mlt_path, previous_clip_count=cur_count - delta if delta else None)
        except Exception as e:
            eval_res = {"report": f"Evaluation error: {e}", "recommendations": []}

        report = eval_res.get("report", "")

        if api_key:
            prompt = (
                f"A change was detected in the active Shotcut timeline project '{os.path.basename(mlt_path)}'.\n"
                f"Current timeline status:\n{report}\n\n"
                f"Please re-evaluate this timeline from the perspective of an expert video editor.\n"
                f"Provide:\n"
                f"1. Pacing & flow assessment based on the updated clips.\n"
                f"2. Audio & visual composition recommendations (e.g. ducking, transitions, subtitles, Shotcut elements).\n"
                f"3. Concrete next tool suggestion (e.g. auto_add_elements, audio_ducking, burn_subtitles) with a ready-to-run JSON tool block if appropriate."
            )
            try:
                url = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.6,
                    "max_tokens": 700
                }
                req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                })
                with urllib.request.urlopen(req, timeout=45) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    ai_reply = data["choices"][0]["message"]["content"].strip()
                    full_output = f"🤖 MediaMogul AI (Timeline Re-Evaluation):\n{ai_reply}\n\n"
                    self.root.after(0, lambda: self._append_ai_reevaluation(full_output, ai_reply))
                    return
            except Exception:
                pass

        # Fallback / offline intelligent evaluation output
        full_output = f"🤖 MediaMogul AI (Timeline Re-Evaluation):\n{report}\n\n"
        self.root.after(0, lambda: self._append_ai_reevaluation(full_output, None))

    def _append_ai_reevaluation(self, full_text: str, ai_reply: str = None):
        self.agent_chat.insert(tk.END, full_text)
        self.agent_chat.see(tk.END)
        self.status_var.set("Timeline re-evaluation complete.")
        if hasattr(self, "status_timeline_lbl") and hasattr(self, "_active_mlt_path") and self._active_mlt_path:
            fn = os.path.basename(self._active_mlt_path)
            short_fn = fn if len(fn) <= 26 else fn[:23] + "..."
            self.status_timeline_lbl.config(text=f"⏱️ Watching: {short_fn}", fg="#34d399", bg="#064e3b")

        if ai_reply:
            tool_call = safe_parse_tool_call(ai_reply)
            if tool_call and isinstance(tool_call, dict):
                t_name = tool_call.get("tool")
                t_params = tool_call.get("parameters") or {}
                if not isinstance(t_params, dict):
                    t_params = {}
                if "actions" in tool_call and "actions" not in t_params:
                    t_params["actions"] = tool_call["actions"]
                if self.settings.get("dangerous_mode", False) and t_name:
                    self.agent_chat.insert(tk.END, f"⚙️ Auto-Executing recommended tool: {t_name}...\n")
                    res = self._execute_video_tool(t_name, t_params)
                    self.agent_chat.insert(tk.END, f"{res}\n\n")
                    self.agent_chat.see(tk.END)

    def show_window(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def setup_ui(self):
        # 1. Header Bar
        header = tk.Frame(self.root, bg="#1e1b4b", height=70, padx=16, pady=10)
        header.pack(fill=tk.X)

        title_box = tk.Frame(header, bg="#1e1b4b")
        title_box.pack(side=tk.LEFT)

        self.logo_img = None
        try:
            from PIL import Image, ImageTk
            icon_png = os.path.join(current_dir, "mediamogul_logo_icon.png")
            if os.path.exists(icon_png):
                pim = Image.open(icon_png).resize((40, 40), Image.Resampling.LANCZOS)
                self.logo_img = ImageTk.PhotoImage(pim)
                logo_lbl = tk.Label(title_box, image=self.logo_img, bg="#1e1b4b")
                logo_lbl.pack(side=tk.LEFT, padx=(0, 10))
        except Exception:
            pass

        text_sub_box = tk.Frame(title_box, bg="#1e1b4b")
        text_sub_box.pack(side=tk.LEFT)

        title = tk.Label(text_sub_box, text="MediaMogul AI Command Center", font=("Segoe UI", 16, "bold"), fg="#ffffff", bg="#1e1b4b")
        title.pack(anchor=tk.W)

        sub = tk.Label(text_sub_box, text="Agentic AI Copilot for Shotcut Video Editor (GPT-5.6 Luna, Whisper, DALL-E 3)", font=("Segoe UI", 9), fg="#a5b4fc", bg="#1e1b4b")
        sub.pack(anchor=tk.W)

        self.header_actions = tk.Frame(header, bg="#1e1b4b")
        self.header_actions.pack(side=tk.RIGHT)

        self.one_click_btn = tk.Button(
            self.header_actions, text="⚡ 1-Click Video", font=("Segoe UI", 10, "bold"),
            bg="#f59e0b", fg="#000000", activebackground="#d97706", activeforeground="#ffffff",
            relief=tk.FLAT, padx=12, pady=4, cursor="hand2", command=self.one_click_produce_video
        )
        self.one_click_btn.pack(side=tk.LEFT, padx=(0, 8))

        self.launch_shotcut_btn = tk.Button(
            self.header_actions, text="🚀 Launch Shotcut", font=("Segoe UI", 10, "bold"),
            bg="#10b981", fg="#ffffff", activebackground="#059669", activeforeground="#ffffff",
            relief=tk.FLAT, padx=12, pady=4, cursor="hand2", command=self.launch_shotcut
        )

        self.view_in_shotcut_btn = tk.Button(
            self.header_actions, text="🖥️ View in Shotcut", font=("Segoe UI", 10, "bold"),
            bg="#0284c7", fg="#ffffff", activebackground="#0369a1", activeforeground="#ffffff",
            relief=tk.FLAT, padx=12, pady=4, cursor="hand2", command=self.view_in_shotcut
        )

        self.badge = tk.Label(self.header_actions, text="● Checking Shotcut...", font=("Segoe UI", 9, "bold"), fg="#fbbf24", bg="#451a03", padx=10, pady=4)
        self.badge.pack(side=tk.RIGHT, padx=(6, 0))

        self.fp_header_badge = tk.Label(
            self.header_actions, text="🟢 Fingerprint-Free", font=("Segoe UI", 9, "bold"),
            fg="#ffffff", bg="#10b981", padx=10, pady=4, cursor="hand2"
        )
        self.fp_header_badge.pack(side=tk.RIGHT, padx=(6, 0))
        self.fp_header_badge.bind("<Button-1>", lambda e: self.notebook.select(self.tab_settings))

        # Interactive Timeline Remote Controller Bar
        setup_remote_bar(self.root, self)

        # 2. Main Notebook Tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=(4, 10))

        # Tab 1: Agent Console
        self.tab_agent = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_agent, text="🤖 AI Agent Console")
        setup_agent_tab(self.tab_agent, self)

        # Tab 2: 🎬 Auto-Director & Shorts
        self.tab_director = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_director, text="🎬 Auto-Director & Shorts")
        setup_director_tab(self.tab_director, self)

        # Tab 3: 🔊 SFX & Sound Designer
        self.tab_sfx = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_sfx, text="🔊 SFX & Sound Design")
        setup_sfx_tab(self.tab_sfx, self)

        # Tab: ✨ Shotcut Elements Library Studio
        self.tab_elements = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_elements, text="✨ Elements Library")
        setup_elements_tab(self.tab_elements, self)

        # Tab: 🌌 Multiverse Timelines Hub
        self.tab_multiverse = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_multiverse, text="🌌 Multiverse Timelines")
        setup_multiverse_tab(self.tab_multiverse, self)

        # Tab 4: Subtitles Studio
        self.tab_subtitles = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_subtitles, text="🎙️ Subtitle Studio (.srt)")
        setup_subtitles_tab(self.tab_subtitles, self)

        # Tab 5: Voiceover Studio
        self.tab_voiceover = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_voiceover, text="🗣️ Voiceover Studio (TTS)")
        setup_voiceover_tab(self.tab_voiceover, self)

        # Tab 6: B-Roll & Pexels Studio
        self.tab_broll = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_broll, text="🎥 Pexels & B-Roll")
        setup_broll_tab(self.tab_broll, self)

        # Tab 7: Shotcut Project Inspector
        self.tab_inspector = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_inspector, text="📁 Shotcut Projects")
        setup_inspector_tab(self.tab_inspector, self)

        # Tab 8: Frame Vision & Composition
        self.tab_vision = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_vision, text="🖼️ Vision & Composition")
        setup_vision_tab(self.tab_vision, self)

        # Tab 9: Video Editor Collaboration & Export Packs
        self.tab_collab = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_collab, text="🤝 Collaboration & Packs")
        setup_collab_tab(self.tab_collab, self)

        # Tab 10: Settings
        self.tab_settings = tk.Frame(self.notebook, bg="#0f172a")
        self.notebook.add(self.tab_settings, text="⚙️ Settings & Dock")
        setup_settings_tab(self.tab_settings, self)

        # Footer Status Bar
        self.status_bar_frame = tk.Frame(self.root, bg="#0f172a", padx=14, pady=5)
        self.status_bar_frame.pack(fill=tk.X, side=tk.BOTTOM)

        self.status_var = tk.StringVar(value="Agent ready. Click 'Open MediaMogul' next to Help anytime to activate.")
        self.status_lbl = tk.Label(self.status_bar_frame, textvariable=self.status_var, font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a", anchor=tk.W)
        self.status_lbl.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.status_actions_frame = tk.Frame(self.status_bar_frame, bg="#0f172a")
        self.status_actions_frame.pack(side=tk.RIGHT)

        self.status_timeline_lbl = tk.Label(
            self.status_actions_frame, text="⏱️ No Timeline Active",
            font=("Segoe UI", 8), fg="#64748b", bg="#1e293b", padx=8, pady=2
        )
        self.status_timeline_lbl.pack(side=tk.RIGHT, padx=(6, 0))

        self.status_view_shotcut_btn = tk.Button(
            self.status_actions_frame, text="🖥️ View in Shotcut",
            font=("Segoe UI", 8, "bold"), bg="#0284c7", fg="#ffffff",
            activebackground="#0369a1", activeforeground="#ffffff",
            relief=tk.FLAT, padx=10, pady=2, cursor="hand2", command=self.view_in_shotcut
        )

    # ---------------------------------------------------------------------
    # AGENT CONSOLE METHODS
    # ---------------------------------------------------------------------
    def clear_agent_memory(self):
        self.conversation_history = []
        self._update_agent_token_label(0)
        self.agent_chat.insert(tk.END, "🧹 Conversation memory cleared.\n\n")
        self.agent_chat.see(tk.END)
        self.status_var.set("Conversation memory reset.")

    def _update_agent_token_label(self, token_count: int):
        dangerous = self.settings.get("dangerous_mode", False)
        limit = self.settings.get("max_context_tokens", 65536 if dangerous else 8192)
        turns = max(0, len(self.conversation_history) - 1) if self.conversation_history else 0
        if dangerous:
            self.agent_token_label.config(
                text=f"⚠️ Unlocked: ~{token_count} / {limit} tokens ({turns} msgs)",
                fg="#fca5a5", bg="#350c0c"
            )
        else:
            self.agent_token_label.config(
                text=f"🧠 Memory: ~{token_count} / {limit} tokens ({turns} msgs)",
                fg="#c7d2fe", bg="#1e1b4b"
            )

    def on_agent_submit(self):
        text = self.agent_input.get().strip()
        if not text:
            return
        self.agent_input.delete(0, tk.END)

        # Check if user is confirming or declining a pending Prepared Plan
        if hasattr(self, "pending_plan") and self.pending_plan:
            norm = text.lower().strip()
            if norm in ("proceed", "go", "go!", "yes", "confirm", "execute", "run", "do it", "ok"):
                self.agent_chat.insert(tk.END, f"\n👤 You: {text}\n")
                self.execute_pending_plan()
                return
            elif norm in ("cancel", "decline", "stop", "no", "abort"):
                self.agent_chat.insert(tk.END, f"\n👤 You: {text}\n")
                self.decline_pending_plan()
                return

    def one_click_produce_video(self, media_folder: str = None):
        """One-Click Autonomous Video Production: Ingest -> Mastering -> MLT -> Melt Render -> Quality Gate -> Shotcut Desktop."""
        folder = media_folder
        if not folder:
            if hasattr(self, "autoprod_folder_entry") and self.autoprod_folder_entry.get().strip():
                candidate = self.autoprod_folder_entry.get().strip()
                if os.path.exists(candidate) and os.path.isdir(candidate):
                    folder = candidate
        if not folder:
            act_v = self.get_active_video_path()
            if act_v and os.path.exists(act_v):
                folder = os.path.dirname(act_v)
        if not folder:
            candidate = self.settings.get("media_folder", "")
            if candidate and os.path.exists(candidate) and os.path.isdir(candidate):
                folder = candidate
        if not folder:
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if os.path.exists(default_test):
                folder = default_test
            else:
                folder = filedialog.askdirectory(title="Select Media Folder for 1-Click Video Production")
                if not folder:
                    return

        if hasattr(self, "notebook") and hasattr(self, "tab_agent"):
            self.notebook.select(self.tab_agent)

        self.status_var.set("⚡ 1-Click Video Production in progress...")
        self.agent_chat.insert(tk.END, "\n" + "═"*60 + "\n")
        self.agent_chat.insert(tk.END, "⚡ [ONE-CLICK AUTO VIDEO] Initiating 100% Autonomous Video Production!\n")
        self.agent_chat.insert(tk.END, f"📁 Media Source: {folder}\n")
        self.agent_chat.insert(tk.END, "🛡️ Authenticity: 🟢 100% Fingerprint-Free (Authentic Camera Footage)\n")
        self.agent_chat.insert(tk.END, "═"*60 + "\n\n")
        self.agent_chat.see(tk.END)

        def _worker():
            agent = AutonomousVideoAgent(settings=self.settings)

            def log_cb(msg):
                self.root.after(0, lambda m=msg: self.agent_chat.insert(tk.END, f"{m}\n"))
                self.root.after(0, self.agent_chat.see, tk.END)

            def prog_cb(step, name):
                self.root.after(0, lambda s=step, n=name: self.status_var.set(f"⚡ [1-Click Video {s}/6]: {n}..."))

            goal_desc = "One-Click Video Production with Shotcut, broadcast -14 LUFS audio, and 100% Fingerprint-Free authenticity."
            res = agent.execute_goal(goal_desc, folder, log_callback=log_cb, progress_callback=prog_cb)

            if res.get("status") == "SUCCESS":
                out_mlt = res.get("output_mlt")
                out_vid = res.get("output_video")
                if out_mlt and os.path.exists(out_mlt):
                    self.root.after(0, lambda p=out_mlt: self.set_active_mlt_path(p))
                if self.media_tracker:
                    if out_mlt:
                        self.media_tracker.track_file(out_mlt, role="timeline_mlt")
                    if out_vid:
                        self.media_tracker.track_file(out_vid, role="rendered_video")

                def _show_success():
                    self.status_var.set("⚡ [1-Click Video Complete!] Master video rendered and opened in Shotcut.")
                    self.agent_chat.insert(tk.END, "\n🎉 SUCCESS! Your 1-Click Master Video is Ready:\n")
                    self.agent_chat.insert(tk.END, f"🎥 Master Video: {out_vid}\n")
                    self.agent_chat.insert(tk.END, f"📁 Shotcut Timeline: {out_mlt}\n\n")
                    self.agent_chat.see(tk.END)
                    self._show_one_click_completion_modal(out_vid, out_mlt)

                self.root.after(0, _show_success)
            else:
                err = res.get("error", "Unknown error")
                self.root.after(0, lambda e=err: self.status_var.set(f"❌ 1-Click Video Failed: {e}"))
                self.root.after(0, lambda e=err: messagebox.showerror("1-Click Video Error", f"Production failed:\n{e}"))

        threading.Thread(target=_worker, daemon=True).start()

    def _show_one_click_completion_modal(self, out_vid, out_mlt):
        """Displays a clean modal dialog when 1-click video generation finishes with quick action buttons."""
        dialog = tk.Toplevel(self.root)
        dialog.title("🎉 1-Click Video Ready!")
        dialog.geometry("520x300")
        dialog.configure(bg="#0f172a")
        dialog.transient(self.root)
        dialog.grab_set()

        hdr = tk.Frame(dialog, bg="#1e1b4b", padx=16, pady=12)
        hdr.pack(fill=tk.X)
        tk.Label(hdr, text="⚡ 1-Click Video Production Complete!", font=("Segoe UI", 13, "bold"), fg="#34d399", bg="#1e1b4b").pack(anchor=tk.W)
        tk.Label(hdr, text="Shotcut MLT assembled, audio mastered to -14 LUFS, and 1080p MP4 master rendered.", font=("Segoe UI", 9), fg="#94a3b8", bg="#1e1b4b").pack(anchor=tk.W)

        body = tk.Frame(dialog, bg="#0f172a", padx=16, pady=14)
        body.pack(fill=tk.BOTH, expand=True)

        vid_name = os.path.basename(out_vid) if out_vid else "Master Video"
        tk.Label(body, text=f"🎥 Master Video: {vid_name}", font=("Segoe UI", 10, "bold"), fg="#ffffff", bg="#0f172a", anchor=tk.W).pack(fill=tk.X, pady=(0, 4))
        if out_vid:
            tk.Label(body, text=out_vid, font=("Consolas", 8), fg="#64748b", bg="#0f172a", anchor=tk.W, wraplength=480).pack(fill=tk.X, pady=(0, 10))

        btn_row = tk.Frame(body, bg="#0f172a")
        btn_row.pack(fill=tk.X, pady=10)

        def _play_video():
            if out_vid and os.path.exists(out_vid):
                try:
                    os.startfile(out_vid)
                except Exception:
                    messagebox.showinfo("Video Path", f"Video rendered at:\n{out_vid}")

        def _view_shotcut():
            bring_shotcut_to_front()
            dialog.destroy()

        def _open_folder():
            if out_vid and os.path.exists(out_vid):
                try:
                    subprocess.Popen(f'explorer /select,"{out_vid}"')
                except Exception:
                    os.startfile(os.path.dirname(out_vid))

        tk.Button(btn_row, text="▶️ Play Video", font=("Segoe UI", 10, "bold"), bg="#10b981", fg="#ffffff", relief=tk.FLAT, padx=12, pady=6, cursor="hand2", command=_play_video).pack(side=tk.LEFT, padx=4)
        tk.Button(btn_row, text="🎬 View in Shotcut", font=("Segoe UI", 10, "bold"), bg="#6366f1", fg="#ffffff", relief=tk.FLAT, padx=12, pady=6, cursor="hand2", command=_view_shotcut).pack(side=tk.LEFT, padx=4)
        tk.Button(btn_row, text="📁 Open Folder", font=("Segoe UI", 9), bg="#334155", fg="#ffffff", relief=tk.FLAT, padx=10, pady=6, cursor="hand2", command=_open_folder).pack(side=tk.LEFT, padx=4)
        tk.Button(btn_row, text="Close", font=("Segoe UI", 9), bg="#1e293b", fg="#94a3b8", relief=tk.FLAT, padx=10, pady=6, cursor="hand2", command=dialog.destroy).pack(side=tk.RIGHT, padx=4)

    def send_agent_prompt(self, user_msg):
        api_key = self.settings.get("api_key", "").strip()
        self.agent_chat.insert(tk.END, f"\n👤 You: {user_msg}\n")
        if not api_key:
            self.agent_chat.insert(tk.END, "🤖 MediaMogul: Running in Local Autonomous Agent mode (100% offline & Fingerprint-Free)...\n")
        else:
            self.agent_chat.insert(tk.END, "🤖 MediaMogul: Orchestrating video tools and processing...\n")
        self.agent_chat.see(tk.END)
        self.status_var.set("Agent executing prompt...")

        threading.Thread(target=self._run_agent_thread, args=(user_msg, api_key), daemon=True).start()

    def _execute_video_tool(self, tool_name: str, params: dict) -> str:
        ffmpeg = self.ffmpeg_path or find_ffmpeg()
        api_key = self.settings.get("api_key", "").strip()
        # Automatically resolve any placeholders to real active files
        resolved_params = self.resolve_tool_parameters(tool_name, params)
        res = execute_video_tool(tool_name, resolved_params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=self.media_tracker)
        if hasattr(self, "refresh_media_table"):
            self.root.after(0, self.refresh_media_table)

        # Automatically track created/modified MLT timeline
        for candidate in [resolved_params.get("output_path"), resolved_params.get("mlt_path"), res]:
            if isinstance(candidate, str) and ".mlt" in candidate:
                match = re.search(r'([A-Za-z]:\\[^ \r\n\t<>"\'`]+\.mlt)', candidate) or re.search(r'([A-Za-z]:/[^ \r\n\t<>"\'`]+\.mlt)', candidate)
                if match:
                    mlt_p = match.group(1).replace("/", "\\")
                    if os.path.exists(mlt_p):
                        self.root.after(0, lambda p=mlt_p: self.set_active_mlt_path(p))
                        break

        return res

    def handle_tool_execution_plan(self, tool_name: str, tool_params: dict, plan_goal: str = ""):
        """Handles Antigravity-style Prepared Plan generation, cost estimation, and approval/auto-proceed."""
        auto_proceed = self.settings.get("auto_proceed_plan", False)

        # Extract itemized steps
        steps = []
        if "actions" in tool_params and isinstance(tool_params["actions"], list):
            for a in tool_params["actions"]:
                if isinstance(a, dict):
                    act_n = a.get("action") or a.get("tool") or tool_name
                    act_p = a.get("details") or a.get("parameters") or a.get("params") or {}
                    steps.append({"tool": act_n, "params": act_p})
        if not steps:
            steps = [{"tool": tool_name, "params": tool_params}]

        plan = PreparedPlan(
            goal=plan_goal or f"Modify Video via {tool_name}",
            steps=steps,
            user_prompt=self.last_user_prompt,
            auto_proceed=auto_proceed,
            settings_ref=self.settings
        )

        # Print structured Antigravity markdown implementation plan into chat
        self.root.after(0, lambda: self.agent_chat.insert(tk.END, f"\n{plan.to_markdown()}\n\n"))
        self.root.after(0, self.agent_chat.see, tk.END)

        if auto_proceed:
            # Auto-proceed mode: execute immediately
            self.root.after(0, lambda: self.agent_chat.insert(tk.END, f"⚡ [Auto-Proceed] Executing {tool_name}...\n"))
            res = self._execute_video_tool(tool_name, tool_params)
            self.root.after(0, lambda r=res: self.agent_chat.insert(tk.END, f"{r}\n\n"))
            self.root.after(0, self.agent_chat.see, tk.END)
            self.root.after(0, self.update_fingerprint_badge)
            self.root.after(0, self.refresh_budget_ui)
        else:
            # Request to proceed mode: store pending plan and show interactive UI card
            self.pending_plan = {
                "tool": tool_name,
                "params": tool_params,
                "plan": plan
            }
            self.root.after(0, lambda p=plan: self._show_plan_card(p))

    def _show_plan_card(self, plan):
        """Displays interactive Prepared Plan card docked above memory bar with Proceed / Decline buttons."""
        if not hasattr(self, "plan_card_frame"):
            return
        self.plan_card_title.config(text=f"📋 Prepared Plan: {plan.goal[:38]}")
        if plan.fingerprint_status == "Fingerprint-Free":
            self.plan_card_badge.config(text="🟢 Fingerprint-Free", fg="#10b981", bg="#064e3b")
        elif plan.fingerprint_status == "Fingerprint-Parts":
            self.plan_card_badge.config(text="🟡 Fingerprint-Parts", fg="#f59e0b", bg="#451a03")
        else:
            self.plan_card_badge.config(text="🟣 Fingerprint-Full", fg="#c084fc", bg="#3b0764")

        self.plan_card_details.config(
            text=f"Plan ID: mediamogul-plan-{plan.plan_id}  |  Est. API Cost: ${plan.estimated_cost:.4f} USD  |  {len(plan.steps)} step(s)"
        )
        self.plan_card_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(4, 0))
        self.status_var.set(f"📋 Prepared Plan awaiting approval (Plan ID: mediamogul-plan-{plan.plan_id}). Click 'Proceed' or type 'proceed'.")

    def execute_pending_plan(self):
        """User approved the prepared plan: runs the modifications."""
        if not hasattr(self, "pending_plan") or not self.pending_plan:
            return
        item = self.pending_plan
        self.pending_plan = None
        if hasattr(self, "plan_card_frame"):
            self.plan_card_frame.pack_forget()

        tool_name = item["tool"]
        tool_params = item["params"]
        self.agent_chat.insert(tk.END, f"🚀 User Approved: Executing {tool_name}...\n")
        self.status_var.set(f"Executing plan: {tool_name}...")

        def _do():
            res = self._execute_video_tool(tool_name, tool_params)
            self.root.after(0, lambda: self.agent_chat.insert(tk.END, f"{res}\n\n"))
            self.root.after(0, self.agent_chat.see, tk.END)
            self.root.after(0, self.update_fingerprint_badge)
            self.root.after(0, self.refresh_budget_ui)
            self.status_var.set("Plan execution complete.")

        threading.Thread(target=_do, daemon=True).start()

    def decline_pending_plan(self):
        """User declined the prepared plan: cancels execution."""
        if hasattr(self, "plan_card_frame"):
            self.plan_card_frame.pack_forget()
        if hasattr(self, "pending_plan") and self.pending_plan:
            plan_id = self.pending_plan["plan"].plan_id
            self.pending_plan = None
            self.agent_chat.insert(tk.END, f"❌ Plan mediamogul-plan-{plan_id} cancelled by user.\n\n")
            self.agent_chat.see(tk.END)
            self.status_var.set("Plan cancelled.")

    def on_toggle_fingerprint_setting(self):
        """Callback when user toggles strict Fingerprint-Free mode in Settings."""
        is_strict = self.disable_ai_fingerprint_var.get()
        self.settings["disable_ai_fingerprint_features"] = is_strict
        self.save_settings(silent=True)
        self.update_fingerprint_badge()
        msg = "🛡️ AI Fingerprint features DISABLED (Strict Fingerprint-Free Mode)." if is_strict else "🚀 Creative AI features ENABLED (DALL-E 3 & TTS voiceovers allowed)."
        self.status_var.set(msg)

    def on_toggle_auto_proceed(self):
        """Callback when user toggles Auto-Proceed vs Request to Proceed."""
        val = self.agent_auto_proceed_var.get()
        self.settings["auto_proceed_plan"] = val
        if hasattr(self, "auto_proceed_var"):
            self.auto_proceed_var.set(val)
        self.save_settings(silent=True)
        self.status_var.set("⚡ Auto-Proceed ENABLED (Skips interactive approval)." if val else "📋 Request to Proceed ENABLED (Antigravity interactive plan review required).")

    def update_fingerprint_badge(self):
        """Updates header and settings badges with live 3-tier status."""
        fp_tracker = get_fingerprint_tracker(self.settings)
        if not fp_tracker:
            return
        status_info = fp_tracker.evaluate_status()
        text = f"{status_info['badge_icon']} {status_info['status']}"
        color = status_info["badge_color"]

        if hasattr(self, "fp_header_badge"):
            self.fp_header_badge.config(text=text, bg=color, fg="#ffffff")
        if hasattr(self, "fp_status_badge"):
            self.fp_status_badge.config(text=text, bg=color, fg="#ffffff")

    def refresh_budget_ui(self):
        """Refreshes daily and lifetime spend meters and labels."""
        cost_calc = get_cost_calculator()
        if not cost_calc:
            return
        info = cost_calc.check_budget_status()

        if hasattr(self, "daily_spend_lbl"):
            self.daily_spend_lbl.config(
                text=f"${info['daily_spend']:.4f} / ${info['daily_limit']:.2f}",
                fg="#f87171" if info["is_daily_exceeded"] else "#34d399"
            )
        if hasattr(self, "daily_progress"):
            self.daily_progress["value"] = min(100.0, info["daily_percent"])

        if hasattr(self, "lifetime_spend_lbl"):
            self.lifetime_spend_lbl.config(
                text=f"${info['lifetime_spend']:.4f} / ${info['lifetime_limit']:.2f}",
                fg="#f87171" if info["is_lifetime_exceeded"] else "#38bdf8"
            )
        if hasattr(self, "lifetime_progress"):
            self.lifetime_progress["value"] = min(100.0, info["lifetime_percent"])

        if info.get("warning"):
            self.status_var.set(info["warning"])

    def reset_budget_history(self):
        """Resets spend ledger and counters after confirmation."""
        if messagebox.askyesno("Reset Budget", "Are you sure you want to reset your daily and lifetime spend tracking history?"):
            cost_calc = get_cost_calculator()
            if cost_calc:
                cost_calc.reset_history()
            self.refresh_budget_ui()
            self.status_var.set("Budget history reset successfully.")

    def show_onboarding_modal(self, force=False):
        """Displays initial feature and fingerprint selection dialog."""
        if not force and self.settings.get("onboarding_completed", False):
            return
        OnboardingDialog(self.root, self.on_onboarding_choice, current_settings=self.settings)

    def on_onboarding_choice(self, choice: str, remember: bool):
        """Handles onboarding dialog selection."""
        if choice == "fingerprint_free":
            self.settings["disable_ai_fingerprint_features"] = True
            self.status_var.set("🛡️ Configured in Fingerprint-Free Mode (Authentic human footage / Max Reach).")
        else:
            self.settings["disable_ai_fingerprint_features"] = False
            self.status_var.set("🚀 Configured in Fully Featured Mode (DALL-E 3 & TTS enabled).")

        if remember:
            self.settings["onboarding_completed"] = True

        if hasattr(self, "disable_ai_fingerprint_var"):
            self.disable_ai_fingerprint_var.set(self.settings["disable_ai_fingerprint_features"])

        self.save_settings(silent=True)
        self.update_fingerprint_badge()

    def _run_agent_thread(self, user_msg, api_key):
        model = self.settings.get("model", "gpt-5.6-luna")

        # Build dynamic session context so the AI knows the active video and MLT project paths
        active_video = self.get_active_video_path()
        active_mlt = self.get_active_mlt_path()
        context_items = []
        if active_video and os.path.exists(active_video):
            context_items.append(f"- Active Video Footage File: {active_video}")
        if active_mlt and os.path.exists(active_mlt):
            context_items.append(f"- Active Shotcut Timeline (.mlt): {active_mlt}")

        context_prompt_addon = ""
        if context_items:
            context_prompt_addon = (
                "\n\nCURRENT ACTIVE EDITING SESSION CONTEXT:\n"
                + "\n".join(context_items) + "\n"
                + "When the user refers to 'the active video', 'this video', 'the project', or 'the timeline', "
                + "use these exact file paths directly in tool parameters. Do NOT output placeholders or comments like // in JSON."
            )

        current_sys_prompt = SYSTEM_PROMPT + context_prompt_addon

        # Multi-Agent Commander Swarm Architecture
        if hasattr(self, "commander_mode_var") and self.commander_mode_var.get() and MediaMogulCommander:
            self.root.after(0, lambda: self.agent_chat.insert(tk.END, "🎖️ [Commander AI] Initializing Sub-Agent Swarm...\n"))
            self.status_var.set("Commander AI orchestrating sub-agent swarm...")

            def status_cb(msg):
                self.root.after(0, lambda m=msg: self.status_var.set(m))
                self.root.after(0, lambda m=msg: self.agent_chat.insert(tk.END, f"  ⚡ {m}\n"))
                self.root.after(0, self.agent_chat.see, tk.END)

            try:
                commander = MediaMogulCommander(api_key, model=model)
                commander_input = user_msg
                if active_video or active_mlt:
                    commander_input = f"{user_msg}\n(Context: Active Media = {active_video or active_mlt})"
                res = commander.orchestrate(
                    commander_input,
                    chat_history=self.conversation_history,
                    status_callback=status_cb,
                    system_prompt=current_sys_prompt
                )
                synth = res.get("synthesis", "")
                reports = res.get("sub_agent_reports", {})

                self.root.after(0, lambda: self.agent_chat.insert(tk.END, "\n📋 Sub-Agent Consensus Achieved:\n"))
                for agent_name, report in reports.items():
                    first_line = report.strip().split("\n")[0][:90]
                    self.root.after(0, lambda an=agent_name, fl=first_line: self.agent_chat.insert(tk.END, f"  • {an}: {fl}...\n"))

                self.conversation_history.append({"role": "user", "content": user_msg})
                self.conversation_history.append({"role": "assistant", "content": synth})
                tok_count = count_conversation_tokens(self.conversation_history)
                self.root.after(0, self._update_agent_token_label, tok_count)
                self.root.after(0, self._update_agent_reply, synth)

                tool_call = res.get("suggested_tool")
                if not tool_call:
                    tool_call = safe_parse_tool_call(synth)

                if tool_call and isinstance(tool_call, dict):
                    t_name = tool_call.get("tool")
                    t_params = tool_call.get("parameters") or {}
                    if not isinstance(t_params, dict):
                        t_params = {}
                    if "actions" in tool_call and "actions" not in t_params:
                        t_params["actions"] = tool_call["actions"]

                    if t_name:
                        self.handle_tool_execution_plan(t_name, t_params, plan_goal=f"Commander Execution: {t_name}")
                return
            except Exception as ce:
                self.root.after(0, lambda e=ce: self.agent_chat.insert(tk.END, f"⚠️ Commander swarm fallback to single agent: {e}\n"))

        # Single-Agent Local Mode (when api_key is not set)
        if not api_key:
            self.root.after(0, lambda: self.agent_chat.insert(tk.END, "🤖 [Local Agent] Parsing instructions with local offline engine...\n"))
            self.status_var.set("Local agent analyzing instructions...")

            parsed = LocalIntentParser.parse_intent(user_msg, session_context={
                "active_video": active_video,
                "active_mlt": active_mlt,
                "media_folder": self.settings.get("media_folder", "")
            })
            tool_name = parsed.get("tool", "auto_produce_video")
            tool_params = parsed.get("parameters", {})
            reasoning = parsed.get("reasoning", "Matched video editing intent.")
            conf = int(parsed.get("confidence", 0.9) * 100)

            reply = (
                f"### 🤖 MediaMogul Local Autonomous Agent\n\n"
                f"• **Intent Recognized**: `{tool_name}` (Confidence: {conf}%)\n"
                f"• **Reasoning**: {reasoning}\n"
                f"• **Authenticity Policy**: 🟢 100% Fingerprint-Free (Authentic camera takes)\n\n"
                f"```json\n"
                f"{json.dumps({'tool': tool_name, 'parameters': tool_params}, indent=2)}\n"
                f"```"
            )
            self.conversation_history.append({"role": "user", "content": user_msg})
            self.conversation_history.append({"role": "assistant", "content": reply})
            tok_count = count_conversation_tokens(self.conversation_history)
            self.root.after(0, self._update_agent_token_label, tok_count)
            self.root.after(0, self._update_agent_reply, reply)
            self.handle_tool_execution_plan(tool_name, tool_params, plan_goal=f"Local Agent: {tool_name}")
            return

        # Single-Agent fallback mode
        url = "https://api.openai.com/v1/chat/completions"
        if self.cost_calc:
            gw_cfg = self.cost_calc.get_gateway_config()
            if gw_cfg.get("enabled") and gw_cfg.get("url"):
                url = gw_cfg["url"]
                if gw_cfg.get("key"):
                    api_key = gw_cfg["key"]

        if not self.conversation_history:
            self.conversation_history = [{"role": "system", "content": current_sys_prompt}]
        else:
            self.conversation_history[0] = {"role": "system", "content": current_sys_prompt}
        self.conversation_history.append({"role": "user", "content": user_msg})

        dangerous = self.settings.get("dangerous_mode", False)
        ctx_limit = int(self.settings.get("max_context_tokens", 65536 if dangerous else 8192))
        out_limit = int(self.settings.get("max_output_tokens", 4096 if dangerous else 800))

        pruned_msgs = prune_sliding_context(self.conversation_history, ctx_limit)
        payload = {
            "model": model,
            "messages": pruned_msgs,
            "temperature": 0.7,
            "max_tokens": out_limit
        }

        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            })
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                reply = data["choices"][0]["message"]["content"].strip()
                self.conversation_history = pruned_msgs[:]
                self.conversation_history.append({"role": "assistant", "content": reply})

                # Record accurate LLM cost and usage
                usage = data.get("usage", {})
                p_tok = usage.get("prompt_tokens", 0)
                c_tok = usage.get("completion_tokens", 0)
                if self.cost_calc and (p_tok > 0 or c_tok > 0):
                    cost = self.cost_calc.calculate_llm_cost(model, p_tok, c_tok)
                    self.cost_calc.record_transaction(f"Single Agent LLM ({model})", cost, {"tokens": p_tok + c_tok}, f"Prompt: {user_msg[:35]}")
                    self.root.after(0, self.refresh_budget_ui)

                tok_count = usage.get("total_tokens", count_conversation_tokens(self.conversation_history))
                self.root.after(0, self._update_agent_token_label, tok_count)
                self.root.after(0, self._update_agent_reply, reply)

                tool_call = safe_parse_tool_call(reply)
                if tool_call and isinstance(tool_call, dict):
                    try:
                        tool_name = tool_call.get("tool")
                        tool_params = tool_call.get("parameters") or {}
                        if not isinstance(tool_params, dict):
                            tool_params = {}
                        if "actions" in tool_call and "actions" not in tool_params:
                            tool_params["actions"] = tool_call["actions"]
                        if tool_name:
                            self.handle_tool_execution_plan(tool_name, tool_params, plan_goal=f"Agent Execution: {tool_name}")
                    except Exception as te:
                        self.root.after(0, lambda e=te: self.agent_chat.insert(tk.END, f"⚠️ Tool execution error: {e}\n\n"))
        except Exception as e:
            if self.conversation_history and self.conversation_history[-1]["role"] == "user":
                self.conversation_history.pop()
            self.root.after(0, self._update_agent_reply, f"Error: {e}")

    def _update_agent_reply(self, reply):
        self.agent_chat.insert(tk.END, f"🤖 MediaMogul:\n{reply}\n\n")
        self.agent_chat.see(tk.END)
        self.status_var.set("Agent response completed.")

    # ---------------------------------------------------------------------
    # SUBTITLES, VOICEOVER & B-ROLL STUDIOS HANDLERS
    # ---------------------------------------------------------------------
    def browse_sub_file(self):
        fn = filedialog.askopenfilename(filetypes=[("Media Files", "*.mp4 *.mov *.mkv *.mp3 *.wav *.m4a *.aac *.flac")])
        if fn:
            self.sub_file_entry.delete(0, tk.END)
            self.sub_file_entry.insert(0, fn)

    def run_whisper_tab(self):
        key = self.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        media = self.sub_file_entry.get().strip()
        if not media or not os.path.exists(media):
            messagebox.showerror("File Error", "Please choose a valid media file.")
            return

        self.sub_log.delete(1.0, tk.END)
        self.sub_log.insert(tk.END, f"Extracting audio from {os.path.basename(media)}...\n")
        self.status_var.set("Extracting audio and calling Whisper API...")

        def _do():
            base, _ = os.path.splitext(media)
            temp_mp3 = base + "_mediamogul_tmp.mp3"
            out_srt = base + ".srt"
            try:
                extract_audio(media, temp_mp3, self.ffmpeg_path)
                self.sub_log.insert(tk.END, "Transcribing with OpenAI Whisper API...\n")
                res = transcribe_whisper(temp_mp3, key)
                convert_whisper_to_srt(res, out_srt)
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)
                if self.media_tracker:
                    self.media_tracker.track_file(out_srt, role="subtitles")
                self.sub_log.insert(tk.END, f"✨ Done! Created subtitle file:\n{out_srt}\n\n")
                with open(out_srt, "r", encoding="utf-8") as f:
                    self.sub_log.insert(tk.END, "".join(f.readlines()[:15]) + "...\n")
                self.status_var.set(f"Subtitles ready: {os.path.basename(out_srt)}")
                messagebox.showinfo("Success", f"Subtitles generated:\n{out_srt}\n\nDrag this .srt file into Shotcut's subtitle track!")
            except Exception as e:
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)
                self.sub_log.insert(tk.END, f"\nError: {e}\n")
                self.status_var.set("Subtitle transcription failed.")

        threading.Thread(target=_do, daemon=True).start()

    def run_tts_tab(self):
        key = self.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        text = self.tts_text.get(1.0, tk.END).strip()
        if not text:
            messagebox.showerror("Empty Text", "Please enter script text to narrate.")
            return

        out_path = filedialog.asksaveasfilename(defaultextension=".mp3", filetypes=[("MP3 Audio", "*.mp3")], initialfile="mediamogul_voiceover.mp3")
        if not out_path:
            return

        voice = self.tts_voice.get()
        model = "tts-1-hd" if "hd" in self.tts_quality.get().lower() else "tts-1"
        self.status_var.set("Synthesizing voiceover audio with OpenAI TTS...")

        def _do():
            try:
                generate_tts_audio(text, out_path, voice, key, model)
                if self.media_tracker:
                    self.media_tracker.track_file(out_path, role="voiceover")
                self.status_var.set(f"Voiceover saved: {os.path.basename(out_path)}")
                messagebox.showinfo("Saved", f"Voiceover generated successfully!\n\nSaved to:\n{out_path}\n\nYou can now drop this audio onto your Shotcut audio track!")
            except Exception as e:
                messagebox.showerror("TTS Error", str(e))
                self.status_var.set("Voiceover generation failed.")

        threading.Thread(target=_do, daemon=True).start()

    def run_broll_tab(self):
        key = self.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        prompt = self.broll_prompt.get().strip()
        if not prompt:
            messagebox.showerror("Empty Prompt", "Please enter an image prompt.")
            return

        out_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG Image", "*.png")], initialfile="mediamogul_broll.png")
        if not out_path:
            return

        raw_ratio = self.broll_ratio.get().split()[0]
        self.status_var.set("Generating DALL-E 3 visual (~20s)...")
        self.broll_status.config(text="Generating image with DALL-E 3... please wait.")

        def _do():
            try:
                generate_dalle_image(prompt, out_path, key, raw_ratio)
                if self.media_tracker:
                    self.media_tracker.track_file(out_path, role="broll_image")
                self.broll_status.config(text=f"✓ Saved image: {os.path.basename(out_path)}")
                self.status_var.set(f"Image saved to: {out_path}")
                messagebox.showinfo("Success", f"DALL-E 3 image saved:\n{out_path}\n\nYou can now drag this image straight onto the Shotcut timeline!")
            except Exception as e:
                self.broll_status.config(text=f"✗ Error: {e}")
                self.status_var.set("DALL-E generation failed.")
                messagebox.showerror("DALL-E Error", str(e))

        threading.Thread(target=_do, daemon=True).start()


def main():
    root = tk.Tk()
    app = MediaMogulAgenticCenter(root)
    if "--test-media" in sys.argv:
        def _auto_load():
            try:
                target_folder = None
                if "--folder" in sys.argv:
                    idx = sys.argv.index("--folder")
                    if idx + 1 < len(sys.argv):
                        target_folder = sys.argv[idx + 1]
                app.load_media_folder_to_timeline(target_folder)
            except Exception as e:
                print(f"Auto-load test media notice: {e}")
        root.after(400, _auto_load)
    root.mainloop()


if __name__ == "__main__":
    main()
