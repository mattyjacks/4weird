import os
import threading
import tkinter as tk
from tkinter import filedialog, messagebox
try:
    from companion.mediamogul_tools import (
        find_ffmpeg,
        tool_extract_frame_jpeg,
        tool_capture_shotcut_preview_jpeg,
        tool_analyze_frame_vision
    )
except ImportError:
    from mediamogul_tools import (
        find_ffmpeg,
        tool_extract_frame_jpeg,
        tool_capture_shotcut_preview_jpeg,
        tool_analyze_frame_vision
    )

def setup_vision_tab(parent_frame, app):
    """Sets up the Frame Vision & Composition Studio tab."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=14, pady=12)
    frame.pack(fill=tk.BOTH, expand=True)

    # Header
    tk.Label(frame, text="🖼️ AI Video Frame & Composition Analyzer", font=("Segoe UI", 13, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Extract individual frames from raw video or Shotcut .mlt timeline as optimized JPEGs for Vision AI composition critique.", font=("Segoe UI", 8), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(1, 8))

    # Input Selection Bar
    sel_box = tk.Frame(frame, bg="#1e293b", padx=10, pady=8, relief=tk.GROOVE, bd=1)
    sel_box.pack(fill=tk.X, pady=(0, 8))

    mode_row = tk.Frame(sel_box, bg="#1e293b")
    mode_row.pack(fill=tk.X, pady=(0, 4))

    app.vision_source_mode = tk.StringVar(value="raw")
    tk.Radiobutton(mode_row, text="📹 Raw Video Clip", variable=app.vision_source_mode, value="raw", bg="#1e293b", fg="#ffffff", selectcolor="#0f172a", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 10))
    tk.Radiobutton(mode_row, text="📁 Shotcut Timeline Project (.mlt)", variable=app.vision_source_mode, value="mlt", bg="#1e293b", fg="#ffffff", selectcolor="#0f172a", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=10)
    tk.Radiobutton(mode_row, text="🖥️ Live Shotcut Viewport Preview", variable=app.vision_source_mode, value="live", bg="#1e293b", fg="#ffffff", selectcolor="#0f172a", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=10)

    path_row = tk.Frame(sel_box, bg="#1e293b")
    path_row.pack(fill=tk.X, pady=4)
    tk.Label(path_row, text="Source Path:", font=("Segoe UI", 9, "bold"), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.vision_path_entry = tk.Entry(path_row, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.vision_path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)

    def browse_vision_source():
        mode = app.vision_source_mode.get()
        if mode == "mlt":
            fn = filedialog.askopenfilename(title="Select Shotcut Project (.mlt)", filetypes=[("Shotcut MLT", "*.mlt"), ("All Files", "*.*")])
        else:
            fn = filedialog.askopenfilename(title="Select Video File", filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm *.flv"), ("Image Files", "*.jpg *.jpeg *.png *.webp"), ("All Files", "*.*")])
        if fn:
            app.vision_path_entry.delete(0, tk.END)
            app.vision_path_entry.insert(0, fn)

    app.browse_vision_source = browse_vision_source
    tk.Button(path_row, text="Browse...", font=("Segoe UI", 8, "bold"), command=browse_vision_source).pack(side=tk.LEFT, padx=(0, 12))

    tk.Label(path_row, text="Timecode:", font=("Segoe UI", 9, "bold"), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.vision_time_entry = tk.Entry(path_row, width=12, font=("Consolas", 9), bg="#0f172a", fg="#ffffff")
    app.vision_time_entry.insert(0, "00:00:01.000")
    app.vision_time_entry.pack(side=tk.LEFT)

    # Custom Prompt Query Row
    query_row = tk.Frame(sel_box, bg="#1e293b")
    query_row.pack(fill=tk.X, pady=(4, 0))
    tk.Label(query_row, text="Critique Focus:", font=("Segoe UI", 9, "bold"), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.vision_prompt_entry = tk.Entry(query_row, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.vision_prompt_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)
    app.vision_prompt_entry.insert(0, "Analyze rule of thirds, subject framing, headroom, safe title areas, lighting contrast, and recommended Shotcut filters.")

    # Action Buttons Row
    act_row = tk.Frame(frame, bg="#0f172a")
    act_row.pack(fill=tk.X, pady=(0, 8))

    def _display_vision_preview(jpeg_path: str):
        try:
            from PIL import Image, ImageTk
            im = Image.open(jpeg_path)
            orig_w, orig_h = im.size
            max_w, max_h = 320, 180
            im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
            app.vision_photo_ref = ImageTk.PhotoImage(im)
            app.vision_img_lbl.config(image=app.vision_photo_ref, text="")
            sz_kb = os.path.getsize(jpeg_path) / 1024
            app.vision_img_info.config(text=f"{os.path.basename(jpeg_path)} | {orig_w}x{orig_h} | {sz_kb:.1f} KB")
        except Exception as e:
            app.vision_img_lbl.config(text=f"Preview error:\n{e}", image="")

    app._display_vision_preview = _display_vision_preview

    def run_extract_vision_frame():
        mode = app.vision_source_mode.get()
        ts = app.vision_time_entry.get().strip() or "00:00:01"
        src = app.vision_path_entry.get().strip()
        ffmpeg = app.ffmpeg_path or find_ffmpeg()

        app.vision_status_lbl.config(text="Extracting frame JPEG...")
        app.status_var.set("Extracting video frame...")

        def _do():
            try:
                if mode == "live":
                    out_jpg = tool_capture_shotcut_preview_jpeg()
                else:
                    if not src or not os.path.exists(src):
                        messagebox.showerror("Error", "Please select a valid video or .mlt file.")
                        return
                    out_jpg = tool_extract_frame_jpeg(ffmpeg, src, ts)

                app.last_extracted_jpeg = out_jpg
                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(out_jpg, role="frame_snapshot")

                app.root.after(0, lambda: _display_vision_preview(out_jpg))
                app.root.after(0, lambda: app.vision_status_lbl.config(text=f"✓ Captured: {os.path.basename(out_jpg)}"))
                app.status_var.set(f"Frame extracted: {os.path.basename(out_jpg)}")
            except Exception as e:
                app.root.after(0, lambda: app.vision_status_lbl.config(text=f"✗ Error: {e}"))
                messagebox.showerror("Extraction Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    app.run_extract_vision_frame = run_extract_vision_frame

    def _do_analyze_vision_frame():
        key = app.settings.get("api_key", "").strip()
        user_pmt = app.vision_prompt_entry.get().strip()
        jpg = getattr(app, "last_extracted_jpeg", None)

        if not jpg or not os.path.exists(jpg):
            return

        app.vision_status_lbl.config(text="Sending frame to Vision AI...")
        app.status_var.set("Vision AI evaluating frame composition...")
        app.vision_report_text.delete(1.0, tk.END)
        app.vision_report_text.insert(tk.END, f"Analyzing {os.path.basename(jpg)} with OpenAI Vision AI...\n\n")

        def _do():
            try:
                res = tool_analyze_frame_vision(key, jpg, user_pmt)
                analysis = res.get("analysis", "")
                toks = res.get("tokens_used", 0)

                app.root.after(0, lambda: app.vision_report_text.delete(1.0, tk.END))
                app.root.after(0, lambda: app.vision_report_text.insert(tk.END, f"📸 Analysis of: {os.path.basename(jpg)}\n{'='*55}\n\n{analysis}\n\n[Tokens Used: ~{toks}]"))
                app.root.after(0, lambda: app.vision_status_lbl.config(text="✓ Composition analysis ready!"))
                app.status_var.set("Frame composition analysis completed.")
            except Exception as e:
                app.root.after(0, lambda: app.vision_report_text.insert(tk.END, f"\nVision Analysis Error: {e}\n"))
                app.root.after(0, lambda: app.vision_status_lbl.config(text="✗ Vision AI failed."))
                messagebox.showerror("Vision Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    def run_analyze_vision_frame():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            app.notebook.select(app.tab_settings)
            return

        if not getattr(app, "last_extracted_jpeg", None) or not os.path.exists(app.last_extracted_jpeg):
            run_extract_vision_frame()
            app.root.after(1500, _do_analyze_vision_frame)
            return

        _do_analyze_vision_frame()

    app.run_analyze_vision_frame = run_analyze_vision_frame

    tk.Button(
        act_row,
        text="📸 1. Extract / Capture JPEG Frame",
        font=("Segoe UI", 9, "bold"),
        bg="#0284c7",
        fg="#ffffff",
        relief=tk.FLAT,
        padx=10,
        pady=4,
        command=run_extract_vision_frame
    ).pack(side=tk.LEFT, padx=(0, 6))

    tk.Button(
        act_row,
        text="🧠 2. Analyze Frame with Vision AI",
        font=("Segoe UI", 9, "bold"),
        bg="#10b981",
        fg="#ffffff",
        relief=tk.FLAT,
        padx=12,
        pady=4,
        command=run_analyze_vision_frame
    ).pack(side=tk.LEFT, padx=6)

    app.vision_status_lbl = tk.Label(act_row, text="", font=("Segoe UI", 8), fg="#34d399", bg="#0f172a")
    app.vision_status_lbl.pack(side=tk.LEFT, padx=10)

    # Split Content Area
    content_box = tk.Frame(frame, bg="#0f172a")
    content_box.pack(fill=tk.BOTH, expand=True)

    # Left Panel: Frame JPEG Preview
    left_p = tk.Frame(content_box, bg="#1e293b", width=340, padx=8, pady=8, relief=tk.GROOVE, bd=1)
    left_p.pack(side=tk.LEFT, fill=tk.BOTH, padx=(0, 6))
    left_p.pack_propagate(False)

    tk.Label(left_p, text="🖼️ Frame JPEG Preview", font=("Segoe UI", 9, "bold"), fg="#38bdf8", bg="#1e293b").pack(anchor=tk.W)
    app.vision_img_lbl = tk.Label(left_p, text="[No Frame Captured Yet]\nClick 'Extract Frame' or browse a video clip.", font=("Segoe UI", 8), fg="#94a3b8", bg="#0f172a")
    app.vision_img_lbl.pack(fill=tk.BOTH, expand=True, pady=6)
    app.vision_img_info = tk.Label(left_p, text="Ready", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b")
    app.vision_img_info.pack(anchor=tk.W)

    # Right Panel: Composition Analysis Text
    right_p = tk.Frame(content_box, bg="#1e293b", padx=8, pady=8, relief=tk.GROOVE, bd=1)
    right_p.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    tk.Label(right_p, text="📋 AI Cinematographic & Composition Critique", font=("Segoe UI", 9, "bold"), fg="#34d399", bg="#1e293b").pack(anchor=tk.W)
    app.vision_report_text = tk.Text(right_p, bg="#0f172a", fg="#f8fafc", font=("Segoe UI", 9), wrap=tk.WORD, relief=tk.FLAT, padx=8, pady=8)
    app.vision_report_text.pack(fill=tk.BOTH, expand=True, pady=(4, 0))
    app.vision_report_text.insert(tk.END, "Vision AI Ready.\nExtract a frame or capture the live timeline preview to get instant composition feedback, rule-of-thirds analysis, safe zones critique, and actionable timeline edits.\n")

    app.last_extracted_jpeg = None
    app.vision_photo_ref = None
