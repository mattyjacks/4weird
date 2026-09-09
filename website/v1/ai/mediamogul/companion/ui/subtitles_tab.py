"""
subtitles_tab.py - Subtitle Studio tab for Whisper speech-to-text generation and animated subtitle burning.
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from companion.mediamogul_tools import (
        extract_audio_for_whisper, transcribe_whisper,
        convert_whisper_to_srt, convert_whisper_to_ass, convert_srt_to_ass,
        tool_burn_subtitles
    )
except ImportError:
    from mediamogul_tools import (
        extract_audio_for_whisper, transcribe_whisper,
        convert_whisper_to_srt, convert_whisper_to_ass, convert_srt_to_ass,
        tool_burn_subtitles
    )


def setup_subtitles_tab(parent_frame, app):
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=14)
    frame.pack(fill=tk.BOTH, expand=True)

    tk.Label(frame, text="🎙️ Whisper AI & Fancy Animated Subtitles Studio", font=("Segoe UI", 13, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Generate synced captions and burn animated, styled text with custom color outlines onto your video.", font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 8))

    # Media File Selection
    row1 = tk.Frame(frame, bg="#0f172a")
    row1.pack(fill=tk.X, pady=4)
    app.sub_file_entry = tk.Entry(row1, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff")
    app.sub_file_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8), ipady=3)

    def browse_sub_file():
        fn = filedialog.askopenfilename(filetypes=[("Media Files", "*.mp4 *.mov *.mkv *.mp3 *.wav *.m4a *.aac *.flac *.srt *.ass")])
        if fn:
            app.sub_file_entry.delete(0, tk.END)
            app.sub_file_entry.insert(0, fn)

    tk.Button(row1, text="Browse Media...", font=("Segoe UI", 9, "bold"), command=browse_sub_file).pack(side=tk.LEFT)

    # Style Controls Panel
    style_panel = tk.LabelFrame(frame, text=" ✨ Subtitle Animation & Outline Styling ", font=("Segoe UI", 9, "bold"), fg="#38bdf8", bg="#1e293b", padx=10, pady=8)
    style_panel.pack(fill=tk.X, pady=8)

    # Grid 1: Animation Preset & Font
    grid1 = tk.Frame(style_panel, bg="#1e293b")
    grid1.pack(fill=tk.X, pady=3)

    tk.Label(grid1, text="Animation:", font=("Segoe UI", 9, "bold"), fg="#f8fafc", bg="#1e293b", width=12, anchor=tk.W).pack(side=tk.LEFT)
    app.sub_anim_var = tk.StringVar(value="bounce")
    anim_combo = ttk.Combobox(grid1, textvariable=app.sub_anim_var, values=["bounce", "pop", "typewriter", "fade", "slide", "neon", "wiggle", "karaoke", "classic"], state="readonly", width=14)
    anim_combo.pack(side=tk.LEFT, padx=(0, 16))

    tk.Label(grid1, text="Font Family:", font=("Segoe UI", 9, "bold"), fg="#f8fafc", bg="#1e293b", width=11, anchor=tk.W).pack(side=tk.LEFT)
    app.sub_font_var = tk.StringVar(value="Baloo")
    font_combo = ttk.Combobox(grid1, textvariable=app.sub_font_var, values=["Baloo", "Impact", "Montserrat", "Arial Black", "Trebuchet MS", "Comic Sans MS", "Verdana"], width=14)
    font_combo.pack(side=tk.LEFT)

    # Grid 2: Text Color & Outline Color
    grid2 = tk.Frame(style_panel, bg="#1e293b")
    grid2.pack(fill=tk.X, pady=3)

    tk.Label(grid2, text="Text Color:", font=("Segoe UI", 9, "bold"), fg="#f8fafc", bg="#1e293b", width=12, anchor=tk.W).pack(side=tk.LEFT)
    app.sub_text_col_var = tk.StringVar(value="white")
    text_col_combo = ttk.Combobox(grid2, textvariable=app.sub_text_col_var, values=["white", "yellow", "cyan", "neon_green", "hot_pink", "#FFE500", "#00FFEA"], width=14)
    text_col_combo.pack(side=tk.LEFT, padx=(0, 16))

    tk.Label(grid2, text="Outline Color:", font=("Segoe UI", 9, "bold"), fg="#f8fafc", bg="#1e293b", width=11, anchor=tk.W).pack(side=tk.LEFT)
    app.sub_out_col_var = tk.StringVar(value="black")
    out_col_combo = ttk.Combobox(grid2, textvariable=app.sub_out_col_var, values=["black", "red", "hot_pink", "electric_blue", "neon_green", "gold", "purple", "#FF0055"], width=14)
    out_col_combo.pack(side=tk.LEFT)

    # Grid 3: Outline Width & Font Size
    grid3 = tk.Frame(style_panel, bg="#1e293b")
    grid3.pack(fill=tk.X, pady=3)

    tk.Label(grid3, text="Outline Width:", font=("Segoe UI", 9, "bold"), fg="#f8fafc", bg="#1e293b", width=12, anchor=tk.W).pack(side=tk.LEFT)
    app.sub_out_w_var = tk.IntVar(value=4)
    out_w_spin = tk.Spinbox(grid3, from_=1, to=10, textvariable=app.sub_out_w_var, width=15, bg="#0f172a", fg="#ffffff")
    out_w_spin.pack(side=tk.LEFT, padx=(0, 16))

    tk.Label(grid3, text="Font Size:", font=("Segoe UI", 9, "bold"), fg="#f8fafc", bg="#1e293b", width=11, anchor=tk.W).pack(side=tk.LEFT)
    app.sub_size_var = tk.IntVar(value=52)
    size_spin = tk.Spinbox(grid3, from_=24, to=96, textvariable=app.sub_size_var, width=15, bg="#0f172a", fg="#ffffff")
    size_spin.pack(side=tk.LEFT)

    # Action Buttons
    btn_row = tk.Frame(frame, bg="#0f172a")
    btn_row.pack(fill=tk.X, pady=6)

    def run_whisper_tab():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        media = app.sub_file_entry.get().strip()
        if not media or not os.path.exists(media):
            messagebox.showerror("File Error", "Please choose a valid media file.")
            return

        font = app.sub_font_var.get().strip() or "Baloo"
        anim = app.sub_anim_var.get().strip() or "bounce"
        out_col = app.sub_out_col_var.get().strip() or "black"
        txt_col = app.sub_text_col_var.get().strip() or "white"
        out_w = int(app.sub_out_w_var.get())
        font_sz = int(app.sub_size_var.get())

        app.sub_log.delete(1.0, tk.END)
        app.sub_log.insert(tk.END, f"Extracting audio from {os.path.basename(media)}...\n")
        app.status_var.set("Extracting audio and calling Whisper API...")

        def _do():
            base, _ = os.path.splitext(media)
            temp_mp3 = base + "_mediamogul_tmp.mp3"
            out_srt = base + ".srt"
            out_ass = base + ".ass"
            try:
                extract_audio_for_whisper(media, temp_mp3, app.ffmpeg_path)
                app.sub_log.insert(tk.END, "Transcribing speech via OpenAI Whisper API...\n")
                res = transcribe_whisper(temp_mp3, key)
                convert_whisper_to_srt(res, out_srt)
                convert_whisper_to_ass(
                    res, out_ass, font=font, font_size=font_sz,
                    text_color=txt_col, outline_color=out_col, outline_width=out_w,
                    animation=anim
                )
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)

                app.sub_log.insert(tk.END, f"✨ Done! Created subtitles:\n- SRT: {out_srt}\n- Animated ASS: {out_ass}\n\n")
                with open(out_srt, "r", encoding="utf-8") as f:
                    app.sub_log.insert(tk.END, "".join(f.readlines()[:12]) + "...\n")
                app.status_var.set(f"Subtitles ready ({anim}, {out_col} outline): {os.path.basename(out_srt)}")
                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(out_srt, role="subtitles")
                    app.media_tracker.track_file(out_ass, role="animated_subtitles")
                messagebox.showinfo("Success", f"Subtitles generated!\n\nStandard: {out_srt}\nAnimated: {out_ass}\n\nStyle: {font} font, {out_col} outline, {anim} animation.")
            except Exception as e:
                if os.path.exists(temp_mp3):
                    os.remove(temp_mp3)
                app.sub_log.insert(tk.END, f"\nError: {e}\n")
                app.status_var.set("Subtitle transcription failed.")

        threading.Thread(target=_do, daemon=True).start()

    def run_burn_tab():
        media = app.sub_file_entry.get().strip()
        if not media or not os.path.exists(media):
            messagebox.showerror("File Error", "Please select a valid video file.")
            return

        font = app.sub_font_var.get().strip() or "Baloo"
        anim = app.sub_anim_var.get().strip() or "bounce"
        out_col = app.sub_out_col_var.get().strip() or "black"
        txt_col = app.sub_text_col_var.get().strip() or "white"
        out_w = int(app.sub_out_w_var.get())
        font_sz = int(app.sub_size_var.get())

        app.sub_log.delete(1.0, tk.END)
        app.sub_log.insert(tk.END, f"Burning animated subtitles into {os.path.basename(media)}...\nStyle: Font={font}, Outline={out_col} ({out_w}px), Text={txt_col}, Animation={anim}\n")
        app.status_var.set("Burning fancy animated subtitles onto video...")

        def _do_burn():
            try:
                out_vid = tool_burn_subtitles(
                    app.ffmpeg_path, media,
                    font=font, text_color=txt_col, outline_color=out_col,
                    outline_width=out_w, animation=anim, font_size=font_sz
                )
                app.sub_log.insert(tk.END, f"🔥 Subtitles burned successfully:\n{out_vid}\n")
                app.status_var.set(f"Burned video ready: {os.path.basename(out_vid)}")
                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(out_vid, role="subtitled_video")
                messagebox.showinfo("Burn Complete", f"Fancy animated video created:\n{out_vid}")
            except Exception as e:
                app.sub_log.insert(tk.END, f"\nBurn Error: {e}\n")
                app.status_var.set("Burning subtitles failed.")

        threading.Thread(target=_do_burn, daemon=True).start()

    tk.Button(btn_row, text="🚀 Transcribe & Create Captions (.SRT + .ASS)", font=("Segoe UI", 10, "bold"), bg="#10b981", fg="#ffffff", relief=tk.FLAT, pady=6, command=run_whisper_tab).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
    tk.Button(btn_row, text="🔥 Burn Animated Subtitles into Video", font=("Segoe UI", 10, "bold"), bg="#8b5cf6", fg="#ffffff", relief=tk.FLAT, pady=6, command=run_burn_tab).pack(side=tk.LEFT, fill=tk.X, expand=True)

    app.sub_log = tk.Text(frame, height=8, bg="#1e293b", fg="#f1f5f9", font=("Consolas", 9), relief=tk.FLAT, padx=8, pady=8)
    app.sub_log.pack(fill=tk.BOTH, expand=True, pady=(6, 0))

