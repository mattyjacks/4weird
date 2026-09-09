"""
voiceover_tab.py - Voiceover Studio tab for OpenAI Text-to-Speech synthesis.
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from companion.mediamogul_tools import generate_tts_audio
except ImportError:
    from mediamogul_tools import generate_tts_audio


def setup_voiceover_tab(parent_frame, app):
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=16)
    frame.pack(fill=tk.BOTH, expand=True)

    tk.Label(frame, text="🗣️ OpenAI Text-to-Speech Voiceover Studio", font=("Segoe UI", 13, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Convert any narration script into studio-grade AI speech audio for Shotcut.", font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 8))

    app.tts_text = tk.Text(frame, height=7, bg="#1e293b", fg="#ffffff", font=("Segoe UI", 10), padx=8, pady=8)
    app.tts_text.pack(fill=tk.BOTH, expand=True, pady=6)
    app.tts_text.insert(tk.END, "Welcome to this video! Today, we're taking a look at how AI revolutionizes creative video editing right inside Shotcut.")

    ctrl = tk.Frame(frame, bg="#0f172a")
    ctrl.pack(fill=tk.X, pady=6)

    tk.Label(ctrl, text="Voice:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#0f172a").pack(side=tk.LEFT, padx=4)
    app.tts_voice = ttk.Combobox(ctrl, values=["alloy", "echo", "fable", "onyx", "nova", "shimmer"], state="readonly", width=10)
    app.tts_voice.set("alloy")
    app.tts_voice.pack(side=tk.LEFT, padx=6)

    tk.Label(ctrl, text="Quality:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#0f172a").pack(side=tk.LEFT, padx=4)
    app.tts_quality = ttk.Combobox(ctrl, values=["tts-1 (Standard)", "tts-1-hd (High Definition)"], state="readonly", width=18)
    app.tts_quality.set("tts-1 (Standard)")
    app.tts_quality.pack(side=tk.LEFT, padx=6)

    def run_tts_tab():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        text = app.tts_text.get(1.0, tk.END).strip()
        if not text:
            messagebox.showerror("Empty Text", "Please enter script text to narrate.")
            return

        out_path = filedialog.asksaveasfilename(defaultextension=".mp3", filetypes=[("MP3 Audio", "*.mp3")], initialfile="mediamogul_voiceover.mp3")
        if not out_path:
            return

        voice = app.tts_voice.get()
        model = "tts-1-hd" if "hd" in app.tts_quality.get().lower() else "tts-1"
        app.status_var.set("Synthesizing voiceover audio with OpenAI TTS...")

        def _do():
            try:
                generate_tts_audio(text, out_path, voice, key, model)
                app.status_var.set(f"Voiceover saved: {os.path.basename(out_path)}")
                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(out_path, role="voiceover")
                messagebox.showinfo("Saved", f"Voiceover generated successfully!\n\nSaved to:\n{out_path}\n\nYou can now drop this audio onto your Shotcut audio track!")
            except Exception as e:
                messagebox.showerror("TTS Error", str(e))
                app.status_var.set("Voiceover generation failed.")

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(frame, text="🎙️ Render & Save Voiceover (.mp3)", font=("Segoe UI", 10, "bold"), bg="#6366f1", fg="#ffffff", relief=tk.FLAT, pady=8,
              command=run_tts_tab).pack(fill=tk.X, pady=10)
