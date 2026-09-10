"""
sfx_tab.py - Cinematic Sound Effects (SFX) Synthesizer & Sound Designer studio.
"""

import os
import winsound
import tkinter as tk
from tkinter import messagebox, filedialog
try:
    from companion.mediamogul_tools import tool_generate_sfx
except ImportError:
    from mediamogul_tools import tool_generate_sfx


def setup_sfx_tab(parent_frame, app):
    """Sets up the SFX & Sound Designer studio tab."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=14)
    frame.pack(fill=tk.BOTH, expand=True)

    # Header
    tk.Label(frame, text="🔊 Cinematic SFX Synthesizer & Sound Designer", font=("Segoe UI", 14, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Generate broadcast-quality sound effects procedurally with 1-click audition and export straight to Shotcut audio tracks.", font=("Segoe UI", 8), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 10))

    # Grid of 7 SFX Cards
    grid_container = tk.Frame(frame, bg="#0f172a")
    grid_container.pack(fill=tk.BOTH, expand=True)

    sfx_items = [
        ("whoosh", "💨 High-Speed Whoosh Cut", "Quick cinematic airy sweep for fast slide transitions & scene cuts", "#0284c7"),
        ("boom", "💥 Cinematic Sub-Bass Boom", "Deep impact rumble for dramatic intros, punchlines & logos", "#e11d48"),
        ("riser", "⚡ Tension Glitch Riser", "Ascending digital pitch riser that builds intense viewer suspense", "#a855f7"),
        ("pop", "🫧 UI Graphic Bubble Pop", "Crisp organic pop for titles, lower thirds, icons & sticker animations", "#10b981"),
        ("shutter", "📸 DSLR Camera Shutter", "Dual-click mechanical camera shutter for freeze-frames & snapshots", "#f59e0b"),
        ("sub_drop", "📉 808 Sub-Bass Drop", "Resonant low-end sine sweep for musical drops & beat drops", "#6366f1"),
        ("scratch", "📀 Vinyl Record Scratch", "Retro record stop scratch for comedic pauses & sudden plot twists", "#ec4899")
    ]

    temp_sfx_dir = os.path.join(os.path.expanduser("~"), ".mediamogul_sfx_cache")
    os.makedirs(temp_sfx_dir, exist_ok=True)

    def play_sfx(sfx_key):
        try:
            cached_wav = os.path.join(temp_sfx_dir, f"temp_preview_{sfx_key}.wav")
            tool_generate_sfx(sfx_key, cached_wav)
            winsound.PlaySound(cached_wav, winsound.SND_FILENAME | winsound.SND_ASYNC)
            app.status_var.set(f"Auditioning SFX: {sfx_key}")
        except Exception as e:
            messagebox.showerror("Audio Error", f"Failed to play SFX preview:\n{e}")

    def export_sfx(sfx_key, default_name):
        out = filedialog.asksaveasfilename(
            title=f"Export {default_name}",
            defaultextension=".wav",
            filetypes=[("WAV Audio", "*.wav")],
            initialfile=f"mediamogul_{sfx_key}.wav"
        )
        if out:
            tool_generate_sfx(sfx_key, out)
            if app.media_tracker:
                app.media_tracker.track_file(out, role="sfx_audio")
            app.status_var.set(f"SFX exported: {os.path.basename(out)}")
            messagebox.showinfo("SFX Ready", f"Sound effect generated:\n{out}\n\nYou can now drag this audio file directly into Shotcut's timeline audio track!")

    row = 0
    col = 0
    for sfx_key, title, desc, accent_color in sfx_items:
        card = tk.Frame(grid_container, bg="#1e293b", padx=10, pady=8, relief=tk.GROOVE, bd=1)
        card.grid(row=row, column=col, sticky="nsew", padx=4, pady=4)

        tk.Label(card, text=title, font=("Segoe UI", 9, "bold"), fg=accent_color, bg="#1e293b").pack(anchor=tk.W)
        tk.Label(card, text=desc, font=("Segoe UI", 7), fg="#cbd5e1", bg="#1e293b", wraplength=200, justify=tk.LEFT).pack(anchor=tk.W, pady=(2, 6))

        btn_box = tk.Frame(card, bg="#1e293b")
        btn_box.pack(fill=tk.X)

        tk.Button(
            btn_box, text="▶️ Audition", font=("Segoe UI", 8, "bold"), bg="#334155", fg="#ffffff",
            relief=tk.FLAT, padx=6, pady=2, command=lambda k=sfx_key: play_sfx(k)
        ).pack(side=tk.LEFT, padx=(0, 4))

        tk.Button(
            btn_box, text="📥 Export WAV", font=("Segoe UI", 8, "bold"), bg=accent_color, fg="#ffffff",
            relief=tk.FLAT, padx=6, pady=2, command=lambda k=sfx_key, t=title: export_sfx(k, t)
        ).pack(side=tk.LEFT)

        col += 1
        if col >= 3:
            col = 0
            row += 1

    for c in range(3):
        grid_container.grid_columnconfigure(c, weight=1)
