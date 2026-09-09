"""
onboarding_dialog.py - Initial Setup Modal for AI Fingerprint & Feature Selection.

Displays:
- Heading / Prompt:
  "Do you want full features but potentially marked as AI Generated Video by platforms,
   or do you want it Fingerprint-Free but with a limited feature set?"
- Two distinct choice buttons with "or" between them:
  [ Fully Featured ]   or   [ Fingerprint-Free ]
- Checkbox: "Remember this choice" (unchecked by default).
"""

import tkinter as tk
from tkinter import ttk


class OnboardingDialog(tk.Toplevel):
    def __init__(self, parent, on_choice_callback, current_settings=None):
        super().__init__(parent)
        self.title("MediaMogul Setup - Feature & Fingerprint Selection")
        self.geometry("640x380")
        self.minsize(580, 340)
        self.configure(bg="#0f172a")
        self.transient(parent)
        self.grab_set()

        self.on_choice_callback = on_choice_callback
        self.settings = current_settings or {}
        self.remember_var = tk.BooleanVar(value=False)

        # Center on parent or screen
        self.update_idletasks()
        try:
            px = parent.winfo_rootx()
            py = parent.winfo_rooty()
            pw = parent.winfo_width()
            ph = parent.winfo_height()
            w = 640
            h = 380
            x = px + max(0, (pw - w) // 2)
            y = py + max(0, (ph - h) // 2)
            self.geometry(f"{w}x{h}+{x}+{y}")
        except Exception:
            pass

        self._build_ui()

    def _build_ui(self):
        main_pad = tk.Frame(self, bg="#0f172a", padx=28, pady=24)
        main_pad.pack(fill=tk.BOTH, expand=True)

        # Header Title
        hdr_frame = tk.Frame(main_pad, bg="#0f172a")
        hdr_frame.pack(fill=tk.X, pady=(0, 12))

        tk.Label(
            hdr_frame,
            text="✨ Welcome to MediaMogul",
            font=("Segoe UI", 16, "bold"),
            fg="#ffffff",
            bg="#0f172a"
        ).pack(anchor=tk.W)

        tk.Label(
            hdr_frame,
            text="Autonomous AI Video Editor Copilot for Shotcut",
            font=("Segoe UI", 10),
            fg="#94a3b8",
            bg="#0f172a"
        ).pack(anchor=tk.W)

        # Question / Prompt Box
        q_box = tk.Frame(main_pad, bg="#1e293b", padx=18, pady=16, relief=tk.FLAT)
        q_box.pack(fill=tk.X, pady=(8, 18))

        prompt_text = (
            "Do you want full features but potentially marked as AI Generated Video by platforms, "
            "or do you want it Fingerprint-Free but with a limited feature set?"
        )
        tk.Label(
            q_box,
            text=prompt_text,
            font=("Segoe UI", 11, "bold"),
            fg="#f8fafc",
            bg="#1e293b",
            wraplength=540,
            justify=tk.LEFT
        ).pack(anchor=tk.W)

        details_text = (
            "• Fully Featured: Unlocks DALL-E 3 visual B-roll, AI TTS voiceovers, and generative creative media.\n"
            "• Fingerprint-Free: 100% human/camera authentic. Uses only deterministic cuts, audio ducking, "
            "loudness normalization & local filters so your videos are never flagged or de-boosted on TikTok, YouTube & Reels."
        )
        tk.Label(
            q_box,
            text=details_text,
            font=("Segoe UI", 8),
            fg="#94a3b8",
            bg="#1e293b",
            justify=tk.LEFT
        ).pack(anchor=tk.W, pady=(8, 0))

        # Two Buttons with "or" between them
        btn_row = tk.Frame(main_pad, bg="#0f172a")
        btn_row.pack(fill=tk.X, pady=(6, 14))

        # Fully Featured Button
        btn_full = tk.Button(
            btn_row,
            text="🚀 Fully Featured",
            font=("Segoe UI", 11, "bold"),
            bg="#6366f1",
            fg="#ffffff",
            activebackground="#4f46e5",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            padx=20,
            pady=10,
            cursor="hand2",
            command=lambda: self._select_mode("fully_featured")
        )
        btn_full.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 10))

        # "or" separator label
        tk.Label(
            btn_row,
            text="or",
            font=("Segoe UI", 11, "bold", "italic"),
            fg="#64748b",
            bg="#0f172a"
        ).pack(side=tk.LEFT, padx=8)

        # Fingerprint-Free Button
        btn_free = tk.Button(
            btn_row,
            text="🛡️ Fingerprint-Free",
            font=("Segoe UI", 11, "bold"),
            bg="#10b981",
            fg="#ffffff",
            activebackground="#059669",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            padx=20,
            pady=10,
            cursor="hand2",
            command=lambda: self._select_mode("fingerprint_free")
        )
        btn_free.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(10, 0))

        # Checkbox: Remember this choice (unchecked by default)
        cb_frame = tk.Frame(main_pad, bg="#0f172a")
        cb_frame.pack(fill=tk.X, pady=(8, 0))

        tk.Checkbutton(
            cb_frame,
            text="Remember this choice",
            variable=self.remember_var,
            font=("Segoe UI", 9),
            fg="#cbd5e1",
            bg="#0f172a",
            selectcolor="#1e293b",
            activebackground="#0f172a",
            activeforeground="#ffffff"
        ).pack(anchor=tk.CENTER)

    def _select_mode(self, mode: str):
        remember = self.remember_var.get()
        if self.on_choice_callback:
            self.on_choice_callback(mode, remember)
        self.destroy()
