"""
remote_bar.py - Quick Transport & Timeline Remote Controller Bar for Shotcut.
Renders compact timeline controls (Play/Pause, Split, Ripple Delete, Step Frame, Undo)
that send commands directly to Shotcut.
"""

import tkinter as tk
from tkinter import messagebox
try:
    from companion.core.shotcut_remote import (
        remote_play_pause, remote_split_clip, remote_ripple_delete,
        remote_step_frame_backward, remote_step_frame_forward, remote_undo,
        bring_shotcut_to_front
    )
except ImportError:
    from core.shotcut_remote import (
        remote_play_pause, remote_split_clip, remote_ripple_delete,
        remote_step_frame_backward, remote_step_frame_forward, remote_undo,
        bring_shotcut_to_front
    )


def setup_remote_bar(parent_frame, app):
    """Embeds the interactive Shotcut Timeline Remote Controller."""
    bar = tk.Frame(parent_frame, bg="#111827", padx=8, pady=4, relief=tk.RIDGE, bd=1)
    bar.pack(fill=tk.X, padx=12, pady=(0, 4))

    tk.Label(bar, text="🎛️ Shotcut Remote:", font=("Segoe UI", 8, "bold"), fg="#93c5fd", bg="#111827").pack(side=tk.LEFT, padx=(0, 6))

    btn_style = {"font": ("Segoe UI", 8, "bold"), "relief": tk.FLAT, "padx": 6, "pady": 2, "cursor": "hand2"}

    tk.Button(bar, text="⚡ 1-Click Video", bg="#f59e0b", fg="#000000", activebackground="#d97706", activeforeground="#ffffff",
              command=lambda: app.one_click_produce_video(), **btn_style).pack(side=tk.LEFT, padx=(0, 8))

    def _safe_call(fn, desc):
        ok = fn()
        if ok:
            app.status_var.set(f"Shotcut Remote: {desc}")
        else:
            app.status_var.set("Shotcut editor window not detected.")

    btn_style = {"font": ("Segoe UI", 8, "bold"), "relief": tk.FLAT, "padx": 6, "pady": 2, "cursor": "hand2"}

    tk.Button(bar, text="⏮️ Step", bg="#1f2937", fg="#f3f4f6", command=lambda: _safe_call(remote_step_frame_backward, "Step 1 Frame Back"), **btn_style).pack(side=tk.LEFT, padx=2)
    tk.Button(bar, text="⏯️ Play/Pause", bg="#3b82f6", fg="#ffffff", command=lambda: _safe_call(remote_play_pause, "Toggle Playback"), **btn_style).pack(side=tk.LEFT, padx=2)
    tk.Button(bar, text="⏭️ Step", bg="#1f2937", fg="#f3f4f6", command=lambda: _safe_call(remote_step_frame_forward, "Step 1 Frame Forward"), **btn_style).pack(side=tk.LEFT, padx=2)

    tk.Frame(bar, width=1, bg="#374151", height=18).pack(side=tk.LEFT, padx=4)

    tk.Button(bar, text="✂️ Split Clip (S)", bg="#059669", fg="#ffffff", command=lambda: _safe_call(remote_split_clip, "Split at Playhead"), **btn_style).pack(side=tk.LEFT, padx=2)
    tk.Button(bar, text="🗑️ Ripple Del (X)", bg="#dc2626", fg="#ffffff", command=lambda: _safe_call(remote_ripple_delete, "Ripple Delete Clip/Gap"), **btn_style).pack(side=tk.LEFT, padx=2)
    tk.Button(bar, text="⏪ Undo (Ctrl+Z)", bg="#4b5563", fg="#f9fafb", command=lambda: _safe_call(remote_undo, "Undo Last Action"), **btn_style).pack(side=tk.LEFT, padx=2)

    tk.Button(bar, text="🎯 Bring to Front", bg="#6366f1", fg="#ffffff", font=("Segoe UI", 7, "bold"), relief=tk.FLAT, padx=6, pady=2,
              command=lambda: _safe_call(bring_shotcut_to_front, "Brought Shotcut to Foreground")).pack(side=tk.RIGHT, padx=2)

    tk.Button(bar, text="🔄 Re-Evaluate", bg="#0284c7", fg="#ffffff", font=("Segoe UI", 7, "bold"), relief=tk.FLAT, padx=6, pady=2,
              command=lambda: app.manual_reevaluate_timeline()).pack(side=tk.RIGHT, padx=2)
