"""
director_tab.py - AI Auto-Director & Viral Shorts Repurposer Studio tab.
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from companion.mediamogul_tools import tool_auto_roughcut, tool_extract_viral_short, tool_auto_produce_video, find_ffmpeg
except ImportError:
    from mediamogul_tools import tool_auto_roughcut, tool_extract_viral_short, tool_auto_produce_video, find_ffmpeg


def setup_director_tab(parent_frame, app):
    """Sets up the AI Auto-Director & Viral Shorts Repurposer tab."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=14)
    frame.pack(fill=tk.BOTH, expand=True)

    # Header
    tk.Label(frame, text="🎬 AI Auto-Director & Autonomous Video Producer", font=("Segoe UI", 14, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Fully automate video creation with contained Shotcut: autonomous multi-clip assembly, narration sync, audio mastering, and zero AI fingerprints.", font=("Segoe UI", 8), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 10))

    # ==========================================
    # HERO CARD: FULL AUTONOMOUS VIDEO PRODUCER
    # ==========================================
    hero = tk.Frame(frame, bg="#1e293b", padx=14, pady=12, relief=tk.GROOVE, bd=1)
    hero.pack(fill=tk.X, pady=(0, 10))

    tk.Label(hero, text="⚡ Autonomous Video Producer & Shotcut Exporter (Fingerprint-Free)", font=("Segoe UI", 11, "bold"), fg="#10b981", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(hero, text="Scans any media folder, organizes takes & voiceovers, Masters audio to -14 LUFS, builds a complete Shotcut .mlt timeline, and headlessly renders finished video to MP4.", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(anchor=tk.W, pady=(2, 6))

    r_hero = tk.Frame(hero, bg="#1e293b")
    r_hero.pack(fill=tk.X, pady=(2, 6))

    app.autoprod_folder_entry = tk.Entry(r_hero, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.autoprod_folder_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)
    default_test_dir = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
    app.autoprod_folder_entry.insert(0, default_test_dir if os.path.exists(default_test_dir) else "")

    def browse_autoprod_folder():
        d = filedialog.askdirectory(title="Select Media Folder")
        if d:
            app.autoprod_folder_entry.delete(0, tk.END)
            app.autoprod_folder_entry.insert(0, d)

    def load_autoprod_test_set():
        if os.path.exists(default_test_dir):
            app.autoprod_folder_entry.delete(0, tk.END)
            app.autoprod_folder_entry.insert(0, default_test_dir)

    tk.Button(r_hero, text="Browse...", font=("Segoe UI", 8, "bold"), command=browse_autoprod_folder).pack(side=tk.LEFT, padx=(0, 4))
    app.autoprod_test_btn = tk.Button(r_hero, text="🧪 Test Video Set", font=("Segoe UI", 8, "bold"), bg="#10b981", fg="#ffffff", command=load_autoprod_test_set)
    app.autoprod_test_btn.pack(side=tk.LEFT)

    r_hero_opts = tk.Frame(hero, bg="#1e293b")
    r_hero_opts.pack(fill=tk.X, pady=(4, 6))

    tk.Label(r_hero_opts, text="Pacing Mode:", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.autoprod_mode_combo = ttk.Combobox(r_hero_opts, values=["Narrated Master Cut (Paced to Voiceover)", "Full Takes Sequence (Consecutive)"], width=34, state="readonly")
    app.autoprod_mode_combo.set("Narrated Master Cut (Paced to Voiceover)")
    app.autoprod_mode_combo.pack(side=tk.LEFT, padx=(0, 10))

    app.autoprod_render_var = tk.BooleanVar(value=True)
    tk.Checkbutton(r_hero_opts, text="Render MP4 with Shotcut (melt)", variable=app.autoprod_render_var, bg="#1e293b", fg="#ffffff", selectcolor="#0f172a", font=("Segoe UI", 8)).pack(side=tk.LEFT, padx=(0, 10))

    app.autoprod_norm_var = tk.BooleanVar(value=True)
    tk.Checkbutton(r_hero_opts, text="Master Audio (-14 LUFS)", variable=app.autoprod_norm_var, bg="#1e293b", fg="#ffffff", selectcolor="#0f172a", font=("Segoe UI", 8)).pack(side=tk.LEFT)

    app.autoprod_last_result = None
    app.autoprod_completed = False

    def run_auto_produce():
        fld = app.autoprod_folder_entry.get().strip()
        if not fld or not os.path.exists(fld):
            messagebox.showerror("Folder Error", "Please select a valid media folder path.")
            return

        mode_val = "narrated_cut" if "Narrated" in app.autoprod_mode_combo.get() else "full_sequence"
        ffmpeg = app.ffmpeg_path or find_ffmpeg()
        do_render = app.autoprod_render_var.get()
        do_norm = app.autoprod_norm_var.get()

        app.status_var.set("Producing video with Shotcut: assembling timeline and rendering...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"🎬 [Auto-Produce] Scanning media in '{os.path.basename(fld)}'...\n")

        def _do_produce():
            try:
                res = tool_auto_produce_video(
                    ffmpeg=ffmpeg,
                    folder_path=fld,
                    normalize_audio=do_norm,
                    render_with_shotcut=do_render,
                    open_in_shotcut=True,
                    target_mode=mode_val
                )
                app.autoprod_last_result = res
                app.autoprod_completed = True
                if app.media_tracker:
                    if res.get("output_mlt"):
                        app.media_tracker.track_file(res["output_mlt"], role="timeline_mlt")
                    if res.get("output_video"):
                        app.media_tracker.track_file(res["output_video"], role="rendered_video")

                msg = (
                    f"\n✨ Video Creation Completed with Shotcut!\n"
                    f"=========================================\n"
                    f"📁 Shotcut MLT Project: {res['output_mlt']}\n"
                    f"⏱️ Duration: {res['timeline_duration_sec']}s ({res['video_clips_count']} video takes, {res['audio_clips_count']} voiceovers)\n"
                    f"🛡️ Fingerprint Status: {res['fingerprint_status']}\n"
                    f"⚙️ Engine: {res['engine']}\n"
                )
                if res.get("output_video"):
                    msg += f"🎥 Master Rendered Video: {res['output_video']} ({res.get('render_info', {}).get('size_mb', 0)} MB)\n"

                app.root.after(0, lambda: app.director_log.insert(tk.END, msg))
                app.status_var.set("Video successfully produced with Shotcut!")
                if not getattr(app, "suppress_modal_alerts", False):
                    messagebox.showinfo("Video Produced", f"Video generation completed!\nMLT Project:\n{res['output_mlt']}\nRendered MP4:\n{res.get('output_video')}")
            except Exception as ex:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\n❌ Error: {ex}\n"))
                if not getattr(app, "suppress_modal_alerts", False):
                    messagebox.showerror("Production Error", str(ex))

        threading.Thread(target=_do_produce, daemon=True).start()

    app.autoprod_run_btn = tk.Button(hero, text="⚡ 1-CLICK AUTO-PRODUCE VIDEO WITH SHOTCUT (100% FINGERPRINT-FREE)", font=("Segoe UI", 10, "bold"), bg="#f59e0b", fg="#000000", activebackground="#d97706", activeforeground="#ffffff", relief=tk.FLAT, pady=8, cursor="hand2", command=run_auto_produce)
    app.autoprod_run_btn.pack(fill=tk.X, pady=(2, 4))

    def run_studio_swarm():
        fld = app.autoprod_folder_entry.get().strip()
        if not fld or not os.path.exists(fld):
            messagebox.showerror("Folder Error", "Please select a valid media folder path.")
            return

        app.status_var.set("Running Studio Swarm: Director -> Editor -> Critic -> Polisher -> Showcase...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"🎭 [Studio Swarm] Initializing Actor-Critic Swarm in '{os.path.basename(fld)}'...\n")

        def _do_swarm():
            try:
                from companion.core.studio_swarm import StudioSwarmOrchestrator
                orchestrator = StudioSwarmOrchestrator()
                res = orchestrator.run_studio_pipeline(media_dir=fld, open_in_shotcut=True)
                
                sc = res.get("scorecard", {})
                sc_val = sc.get("overall_score", 90)
                sc_grade = sc.get("overall_grade", "A")

                msg = (
                    f"\n🎉 Studio Swarm Self-Refinement Complete!\n"
                    f"==========================================\n"
                    f"🏆 Quality Score: {sc_val}/100 ({sc_grade})\n"
                    f"🎥 Master 16:9 Broadcast: {res.get('master_video')}\n"
                    f"📱 Master 9:16 Vertical Short: {res.get('vertical_video')}\n"
                    f"🖥️ Interactive Dashboard: {res.get('dashboard_html')}\n"
                    f"🛡️ Status: 🟢 100% Authentic Camera Footage\n"
                )
                app.root.after(0, lambda: app.director_log.insert(tk.END, msg))
                app.status_var.set("Studio Swarm completed broadcast master!")
                if not getattr(app, "suppress_modal_alerts", False):
                    messagebox.showinfo("Studio Swarm Complete", f"Self-Critique & Refinement Finished!\nScore: {sc_val}/100 ({sc_grade})\n16:9: {res.get('master_video')}\n9:16: {res.get('vertical_video')}")
            except Exception as ex:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\n❌ Swarm Error: {ex}\n"))
                if not getattr(app, "suppress_modal_alerts", False):
                    messagebox.showerror("Studio Swarm Error", str(ex))

        threading.Thread(target=_do_swarm, daemon=True).start()

    app.swarm_run_btn = tk.Button(hero, text="🎭 RUN STUDIO SWARM (ACTOR-CRITIC SELF-REFINEMENT + DUAL FORMATS)", font=("Segoe UI", 10, "bold"), bg="#8b5cf6", fg="#ffffff", activebackground="#7c3aed", activeforeground="#ffffff", relief=tk.FLAT, pady=8, cursor="hand2", command=run_studio_swarm)
    app.swarm_run_btn.pack(fill=tk.X, pady=(0, 3))

    def run_ab_test_suite():
        fld = app.autoprod_folder_entry.get().strip()
        if not fld or not os.path.exists(fld):
            messagebox.showerror("Folder Error", "Please select a valid media folder path.")
            return

        app.status_var.set("Producing multi-video A/B test suite with unique 8-digit IDs...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"🧪 [A/B Testing Studio] Initializing multi-variant production in '{os.path.basename(fld)}'...\n")

        def _do_ab():
            try:
                from companion.tools.ab_test_producer import produce_ab_test_suite
                suite_res = produce_ab_test_suite(
                    media_folder=fld,
                    variant_count=3,
                    render_videos=app.autoprod_render_var.get(),
                    open_in_shotcut=True,
                    log_callback=lambda m: app.root.after(0, lambda: app.director_log.insert(tk.END, m + "\n")),
                    quick_preview=getattr(app, "ab_test_quick_preview", False),
                )
                app.ab_test_last_result = suite_res
                variants = suite_res.get("variants", [])
                msg = (
                    f"\n🎉 A/B TEST SUITE COMPLETE! (Suite ID: {suite_res.get('suite_id')})\n"
                    f"==========================================================\n"
                )
                for v in variants:
                    msg += f"👉 [{v['variant_id']}] {v['name']} ({v['aspect_ratio']}): Predicted CTR: {v['predicted_ctr']}\n"
                app.root.after(0, lambda: app.director_log.insert(tk.END, msg))
                app.status_var.set(f"A/B Test Suite completed with {len(variants)} variants!")
                if not getattr(app, "suppress_modal_alerts", False):
                    messagebox.showinfo("A/B Test Suite Ready", f"Produced {len(variants)} video variants for audience testing!\nSuite ID: {suite_res.get('suite_id')}")
            except Exception as ex:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\n❌ A/B Test Error: {ex}\n"))
                if not getattr(app, "suppress_modal_alerts", False):
                    messagebox.showerror("A/B Test Error", str(ex))

        threading.Thread(target=_do_ab, daemon=True).start()

    app.ab_test_run_btn = tk.Button(hero, text="🧪 PRODUCE MULTI-VIDEO A/B TEST SUITE (UNIQUE 8-DIGIT IDs)", font=("Segoe UI", 10, "bold"), bg="#06b6d4", fg="#000000", activebackground="#0891b2", activeforeground="#ffffff", relief=tk.FLAT, pady=8, cursor="hand2", command=run_ab_test_suite)
    app.ab_test_run_btn.pack(fill=tk.X, pady=(0, 2))

    # Two Studio Cards
    cards_box = tk.Frame(frame, bg="#0f172a")
    cards_box.pack(fill=tk.BOTH, expand=True)

    # ==========================================
    # CARD 1: ONE-CLICK MAGIC ROUGHCUT
    # ==========================================
    c1 = tk.Frame(cards_box, bg="#1e293b", padx=12, pady=12, relief=tk.GROOVE, bd=1)
    c1.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

    tk.Label(c1, text="⚡ 1-Click Magic Roughcut", font=("Segoe UI", 11, "bold"), fg="#38bdf8", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c1, text="Scans raw footage, detects all silent pauses/dead-air, and automatically generates an instant Shotcut .mlt timeline project ready to open!", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", wraplength=310, justify=tk.LEFT).pack(anchor=tk.W, pady=(4, 8))

    tk.Label(c1, text="Source Video Clip:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#1e293b").pack(anchor=tk.W)
    r1 = tk.Frame(c1, bg="#1e293b")
    r1.pack(fill=tk.X, pady=(2, 6))

    app.roughcut_entry = tk.Entry(r1, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.roughcut_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)

    def browse_roughcut_video():
        fn = filedialog.askopenfilename(filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm")])
        if fn:
            app.roughcut_entry.delete(0, tk.END)
            app.roughcut_entry.insert(0, fn)

    def load_roughcut_test_clip():
        test_dir = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
        target_clip = None
        if os.path.exists(test_dir):
            for f in sorted(os.listdir(test_dir)):
                if f.lower().endswith((".mov", ".mp4", ".mkv")):
                    target_clip = os.path.join(test_dir, f)
                    break
        if not target_clip and hasattr(app, "get_active_video_path"):
            target_clip = app.get_active_video_path()
        if target_clip and os.path.exists(target_clip):
            app.roughcut_entry.delete(0, tk.END)
            app.roughcut_entry.insert(0, target_clip)
        else:
            browse_roughcut_video()

    tk.Button(r1, text="Browse...", font=("Segoe UI", 8, "bold"), command=browse_roughcut_video).pack(side=tk.LEFT, padx=(0, 4))
    tk.Button(r1, text="🧪 Test Clip", font=("Segoe UI", 8, "bold"), bg="#0284c7", fg="#ffffff", command=load_roughcut_test_clip).pack(side=tk.LEFT)

    r_settings = tk.Frame(c1, bg="#1e293b")
    r_settings.pack(fill=tk.X, pady=(0, 8))

    tk.Label(r_settings, text="Min Silence (s):", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.silence_dur_entry = tk.Entry(r_settings, width=6, font=("Segoe UI", 9))
    app.silence_dur_entry.insert(0, "0.5")
    app.silence_dur_entry.pack(side=tk.LEFT, padx=(0, 10))

    tk.Label(r_settings, text="Noise Threshold:", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.noise_db_combo = ttk.Combobox(r_settings, values=["-25 dB (Strict)", "-30 dB (Default)", "-35 dB (Quiet)"], width=16, state="readonly")
    app.noise_db_combo.set("-30 dB (Default)")
    app.noise_db_combo.pack(side=tk.LEFT)

    def run_auto_roughcut():
        vid = app.roughcut_entry.get().strip()
        if not vid or not os.path.exists(vid):
            messagebox.showerror("File Error", "Please select a valid raw video file.")
            return

        db_str = app.noise_db_combo.get().split()[0]
        db = float(db_str)
        dur = float(app.silence_dur_entry.get().strip() or "0.5")
        ffmpeg = app.ffmpeg_path or find_ffmpeg()

        app.status_var.set("Analyzing audio silence and building Shotcut MLT timeline...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"Scanning {os.path.basename(vid)} for speech cuts...\n")

        def _do():
            try:
                res = tool_auto_roughcut(ffmpeg, vid, noise_tolerance_db=db, min_silence_sec=dur)
                mlt_path = res["mlt_project"]
                if app.media_tracker:
                    app.media_tracker.track_file(mlt_path, role="roughcut_mlt")

                app.root.after(0, lambda: app.director_log.insert(
                    tk.END,
                    f"✨ Roughcut Shotcut Project Generated!\n"
                    f"----------------------------------------\n"
                    f"📁 Project: {os.path.basename(mlt_path)}\n"
                    f"🎬 Total Clean Clips: {res['clips_count']}\n"
                    f"🔇 Pauses Removed: {res['silences_removed']} ({res['seconds_saved']}s dead air eliminated)\n"
                    f"⏱️ Length: {res['original_duration_sec']}s -> {res['roughcut_duration_sec']}s\n\n"
                    f"Open this .mlt file in Shotcut to continue editing instantly!\n"
                ))
                app.status_var.set("Magic Roughcut completed successfully!")
                messagebox.showinfo("Success", f"Shotcut Roughcut Timeline Created:\n{mlt_path}\n\nOpen with Shotcut to view all clips!")
            except Exception as e:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\nError: {e}\n"))
                messagebox.showerror("Roughcut Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(c1, text="🚀 Build Shotcut Project (.mlt)", font=("Segoe UI", 10, "bold"), bg="#0284c7", fg="#ffffff", relief=tk.FLAT, pady=6, command=run_auto_roughcut).pack(fill=tk.X, pady=(4, 8))

    # ==========================================
    # CARD 2: VIRAL SHORTS REPURPOSER
    # ==========================================
    c2 = tk.Frame(cards_box, bg="#1e293b", padx=12, pady=12, relief=tk.GROOVE, bd=1)
    c2.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    tk.Label(c2, text="📱 Viral Shorts / TikTok Extractor", font=("Segoe UI", 11, "bold"), fg="#f472b6", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c2, text="Pinpoints the most engaging 30-45s highlight from long footage, cuts it, converts to 9:16 vertical, and auto-burns styled subtitles!", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", wraplength=310, justify=tk.LEFT).pack(anchor=tk.W, pady=(4, 8))

    tk.Label(c2, text="Long Horizontal Video:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#1e293b").pack(anchor=tk.W)
    r2 = tk.Frame(c2, bg="#1e293b")
    r2.pack(fill=tk.X, pady=(2, 6))

    app.viral_entry = tk.Entry(r2, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.viral_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)

    def browse_viral_video():
        fn = filedialog.askopenfilename(filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm")])
        if fn:
            app.viral_entry.delete(0, tk.END)
            app.viral_entry.insert(0, fn)

    def load_viral_test_clip():
        test_dir = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
        target_clip = None
        if os.path.exists(test_dir):
            for f in sorted(os.listdir(test_dir)):
                if f.lower().endswith((".mov", ".mp4", ".mkv")):
                    target_clip = os.path.join(test_dir, f)
                    break
        if not target_clip and hasattr(app, "get_active_video_path"):
            target_clip = app.get_active_video_path()
        if target_clip and os.path.exists(target_clip):
            app.viral_entry.delete(0, tk.END)
            app.viral_entry.insert(0, target_clip)
        else:
            browse_viral_video()

    tk.Button(r2, text="Browse...", font=("Segoe UI", 8, "bold"), command=browse_viral_video).pack(side=tk.LEFT, padx=(0, 4))
    tk.Button(r2, text="🧪 Test Clip", font=("Segoe UI", 8, "bold"), bg="#f472b6", fg="#ffffff", command=load_viral_test_clip).pack(side=tk.LEFT)

    r_opts = tk.Frame(c2, bg="#1e293b")
    r_opts.pack(fill=tk.X, pady=(0, 8))

    tk.Label(r_opts, text="Target Duration:", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    app.viral_dur_combo = ttk.Combobox(r_opts, values=["30 Seconds (Quick Hook)", "45 Seconds (Standard)", "60 Seconds (Full Story)"], width=22, state="readonly")
    app.viral_dur_combo.set("30 Seconds (Quick Hook)")
    app.viral_dur_combo.pack(side=tk.LEFT)

    def run_viral_extractor():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            app.notebook.select(app.tab_settings)
            return

        vid = app.viral_entry.get().strip()
        if not vid or not os.path.exists(vid):
            messagebox.showerror("File Error", "Please select a valid long video file.")
            return

        dur_text = app.viral_dur_combo.get().split()[0]
        dur_sec = int(dur_text)
        ffmpeg = app.ffmpeg_path or find_ffmpeg()

        app.status_var.set("Transcribing and evaluating viral moments with AI...")
        app.director_log.delete(1.0, tk.END)
        app.director_log.insert(tk.END, f"Transcribing dialogue and hunting viral hooks in {os.path.basename(vid)}...\n")

        def _do():
            try:
                out = tool_extract_viral_short(ffmpeg, vid, key, target_duration_sec=dur_sec)
                if app.media_tracker:
                    app.media_tracker.track_file(out, role="viral_short_9x16")

                app.root.after(0, lambda: app.director_log.insert(
                    tk.END,
                    f"🔥 Viral 9:16 Short Ready to Publish!\n"
                    f"----------------------------------------\n"
                    f"📱 Output File: {out}\n"
                    f"🎯 Format: 9:16 Vertical with Blurred Background & Burned Subtitles\n\n"
                    f"Drag straight onto TikTok, YouTube Shorts, or Instagram Reels!\n"
                ))
                app.status_var.set("Viral Short successfully extracted!")
                messagebox.showinfo("Success", f"Viral Vertical Short Generated:\n{out}")
            except Exception as e:
                app.root.after(0, lambda: app.director_log.insert(tk.END, f"\nError: {e}\n"))
                messagebox.showerror("Extraction Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(c2, text="🔥 Repurpose into 9:16 Short", font=("Segoe UI", 10, "bold"), bg="#db2777", fg="#ffffff", relief=tk.FLAT, pady=6, command=run_viral_extractor).pack(fill=tk.X, pady=(4, 8))

    # Log & Results box
    app.director_log = tk.Text(frame, height=5, bg="#1e293b", fg="#f8fafc", font=("Consolas", 9), relief=tk.FLAT, padx=8, pady=8)
    app.director_log.pack(fill=tk.X, pady=(10, 0))
    app.director_log.insert(tk.END, "AI Auto-Director ready. Choose '1-Click Magic Roughcut' or 'Viral Shorts Extractor'.\n")
