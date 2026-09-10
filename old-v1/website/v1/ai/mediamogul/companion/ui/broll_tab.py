# -*- coding: utf-8 -*-
"""
broll_tab.py - B-Roll Studio: Automated Pexels Stock Video Downloader & DALL-E 3 Generation.
"""

import os
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

try:
    from companion.tools.pexels_tools import (
        search_pexels_videos, download_pexels_video, extract_pexels_video_id
    )
    from companion.mediamogul_tools import generate_dalle_image, bring_shotcut_to_front
except ImportError:
    from tools.pexels_tools import (
        search_pexels_videos, download_pexels_video, extract_pexels_video_id
    )
    from mediamogul_tools import generate_dalle_image, bring_shotcut_to_front


def setup_broll_tab(parent_frame, app):
    # Scrollable Canvas container so all features fit nicely
    canvas = tk.Canvas(parent_frame, bg="#0f172a", highlightthickness=0)
    scrollbar = ttk.Scrollbar(parent_frame, orient="vertical", command=canvas.yview)
    scroll_frame = tk.Frame(canvas, bg="#0f172a", padx=16, pady=12)

    scroll_frame.bind(
        "<Configure>",
        lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
    )
    canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
    canvas.configure(yscrollcommand=scrollbar.set)

    canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    # Mousewheel scrolling
    def _on_mousewheel(event):
        canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    canvas.bind_all("<MouseWheel>", _on_mousewheel)

    # =========================================================================
    # SECTION 1: PEXELS AUTOMATIC STOCK VIDEO DOWNLOADER (100% FINGERPRINT-FREE)
    # =========================================================================
    card_pexels = tk.Frame(scroll_frame, bg="#1e293b", padx=14, pady=12, relief=tk.GROOVE, bd=1)
    card_pexels.pack(fill=tk.X, pady=(0, 14))

    hdr_row = tk.Frame(card_pexels, bg="#1e293b")
    hdr_row.pack(fill=tk.X)
    tk.Label(hdr_row, text="🎥 Pexels Stock Video Downloader", font=("Segoe UI", 12, "bold"), fg="#38bdf8", bg="#1e293b").pack(side=tk.LEFT)
    tk.Label(hdr_row, text="🟢 100% Fingerprint-Free (Authentic Camera Footage)", font=("Segoe UI", 8, "bold"), fg="#10b981", bg="#064e3b", padx=8, pady=2).pack(side=tk.RIGHT)

    tk.Label(card_pexels, text="Automatically search and download copyright-free 1080p and 4K real camera stock videos directly from Pexels into your active project.", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(anchor=tk.W, pady=(2, 8))

    # Search Row
    tk.Label(card_pexels, text="Search Keywords or Paste Pexels URL / Video ID:", font=("Segoe UI", 9, "bold"), fg="#ffffff", bg="#1e293b").pack(anchor=tk.W)
    srch_row = tk.Frame(card_pexels, bg="#1e293b")
    srch_row.pack(fill=tk.X, pady=(2, 6))

    app.pexels_search_entry = tk.Entry(srch_row, font=("Segoe UI", 10), bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
    app.pexels_search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=3)
    app.pexels_search_entry.insert(0, "nature ocean waves cinematic")

    orient_lbl = tk.Label(srch_row, text="Format:", font=("Segoe UI", 8), fg="#94a3b8", bg="#1e293b")
    orient_lbl.pack(side=tk.LEFT, padx=(4, 2))
    app.pexels_orient_combo = ttk.Combobox(srch_row, values=["All", "landscape (16:9)", "portrait (9:16)"], width=16, state="readonly")
    app.pexels_orient_combo.set("landscape (16:9)")
    app.pexels_orient_combo.pack(side=tk.LEFT, padx=(0, 6))

    # Target Folder Selection
    dest_row = tk.Frame(card_pexels, bg="#1e293b")
    dest_row.pack(fill=tk.X, pady=(2, 8))

    tk.Label(dest_row, text="Save To Folder:", font=("Segoe UI", 8, "bold"), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 6))
    default_dest = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
    app.pexels_dest_entry = tk.Entry(dest_row, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.pexels_dest_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), ipady=2)
    app.pexels_dest_entry.insert(0, default_dest)

    def browse_pexels_folder():
        f = filedialog.askdirectory(title="Select Destination Folder for Pexels Videos", initialdir=app.pexels_dest_entry.get())
        if f:
            app.pexels_dest_entry.delete(0, tk.END)
            app.pexels_dest_entry.insert(0, f)

    tk.Button(dest_row, text="Browse...", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", command=browse_pexels_folder).pack(side=tk.RIGHT)

    # Action Buttons Row
    btn_bar = tk.Frame(card_pexels, bg="#1e293b")
    btn_bar.pack(fill=tk.X, pady=(0, 8))

    # Results Treeview
    cols = ("ID", "Title", "Duration", "Resolution", "Ratio", "Photographer")
    tree = ttk.Treeview(card_pexels, columns=cols, show="headings", height=5)
    tree.heading("ID", text="Video ID")
    tree.heading("Title", text="Title / Scene")
    tree.heading("Duration", text="Duration")
    tree.heading("Resolution", text="Resolution")
    tree.heading("Ratio", text="Ratio")
    tree.heading("Photographer", text="Creator")

    tree.column("ID", width=80, anchor="center")
    tree.column("Title", width=220, anchor="w")
    tree.column("Duration", width=70, anchor="center")
    tree.column("Resolution", width=90, anchor="center")
    tree.column("Ratio", width=60, anchor="center")
    tree.column("Photographer", width=130, anchor="w")
    tree.pack(fill=tk.X, pady=(0, 8))

    app.pexels_results_cache = []

    def do_search():
        query = app.pexels_search_entry.get().strip()
        orient_raw = app.pexels_orient_combo.get().split()[0].lower()
        orient_val = None if orient_raw == "all" else orient_raw
        key = app.settings.get("pexels_api_key", "").strip()

        app.pexels_status_lbl.config(text="🔍 Searching Pexels stock videos...", fg="#38bdf8")

        def _worker():
            try:
                # Check if user passed direct URL or ID
                vid_id = extract_pexels_video_id(query)
                if vid_id:
                    # Direct ID detected
                    results = [{
                        "id": vid_id,
                        "title": f"Pexels Video {vid_id}",
                        "duration": 20,
                        "width": 1920,
                        "height": 1080,
                        "aspect_ratio": "16:9",
                        "photographer": "Pexels Creator",
                        "url": f"https://www.pexels.com/video/{vid_id}/"
                    }]
                else:
                    results = search_pexels_videos(query=query, api_key=key, per_page=12, orientation=orient_val)

                def _update_ui():
                    tree.delete(*tree.get_children())
                    app.pexels_results_cache = results
                    if not results:
                        app.pexels_status_lbl.config(text=f"No videos found for '{query}'. Showing popular videos.", fg="#fbbf24")
                    else:
                        for item in results:
                            tree.insert("", tk.END, values=(
                                item["id"],
                                item["title"][:36],
                                f"{item['duration']}s",
                                f"{item.get('width', 1920)}x{item.get('height', 1080)}",
                                item.get("aspect_ratio", "16:9"),
                                item.get("photographer", "Creator")[:20]
                            ))
                        app.pexels_status_lbl.config(text=f"✓ Found {len(results)} stock video(s) ready to download.", fg="#34d399")

                scroll_frame.after(0, _update_ui)
            except Exception as ex:
                scroll_frame.after(0, lambda e=ex: app.pexels_status_lbl.config(text=f"Search Error: {e}", fg="#f87171"))

        threading.Thread(target=_worker, daemon=True).start()

    def do_download_selected():
        selected = tree.selection()
        target_item = None
        if selected:
            sel_id = tree.item(selected[0])["values"][0]
            target_item = next((x for x in app.pexels_results_cache if str(x["id"]) == str(sel_id)), None)

        if not target_item:
            # Check entry box directly
            query = app.pexels_search_entry.get().strip()
            vid_id = extract_pexels_video_id(query)
            if vid_id:
                target_item = {"id": vid_id, "title": f"Video_{vid_id}"}
            elif app.pexels_results_cache:
                target_item = app.pexels_results_cache[0]

        if not target_item:
            messagebox.showinfo("Select Video", "Please search and select a video from the list first.")
            return

        dest_folder = app.pexels_dest_entry.get().strip()
        if not dest_folder or not os.path.exists(dest_folder):
            messagebox.showerror("Folder Error", "Please provide a valid destination folder.")
            return

        vid_id = target_item["id"]
        clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(target_item.get("title", f"video_{vid_id}"))[:30])
        out_file = os.path.join(dest_folder, f"Pexels_{vid_id}_{clean_title}.mp4")

        app.pexels_status_lbl.config(text=f"⬇️ Downloading Pexels video {vid_id}...", fg="#38bdf8")

        def _dl_worker():
            try:
                def prog(dl, total, pct):
                    scroll_frame.after(0, lambda p=pct, d=dl: app.pexels_status_lbl.config(
                        text=f"⬇️ Downloading: {round(d/(1024*1024), 1)} MB ({p}%)...", fg="#38bdf8"
                    ))

                res = download_pexels_video(
                    video_id_or_url=vid_id,
                    output_path=out_file,
                    progress_callback=prog
                )
                app.last_downloaded_pexels = res["file_path"]

                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(res["file_path"], role="broll_video")

                def _done():
                    app.pexels_status_lbl.config(
                        text=f"🎉 Successfully downloaded: {os.path.basename(res['file_path'])} ({res['size_mb']} MB, {res['resolution']})",
                        fg="#34d399"
                    )
                    app.status_var.set(f"Pexels stock video downloaded to: {res['file_path']}")
                    if hasattr(app, "refresh_media_table"):
                        app.refresh_media_table()

                scroll_frame.after(0, _done)
            except Exception as ex:
                scroll_frame.after(0, lambda e=ex: app.pexels_status_lbl.config(text=f"Download Error: {e}", fg="#f87171"))

        threading.Thread(target=_dl_worker, daemon=True).start()

    def do_instant_top_download():
        query = app.pexels_search_entry.get().strip() or "cinematic"
        app.pexels_status_lbl.config(text=f"⚡ 1-Click Downloading top Pexels video for '{query}'...", fg="#f59e0b")
        dest_folder = app.pexels_dest_entry.get().strip()

        def _quick_worker():
            try:
                from companion.tools.pexels_tools import tool_download_pexels_video
                msg = tool_download_pexels_video(
                    query_or_url=query,
                    destination_dir=dest_folder,
                    media_tracker=getattr(app, "media_tracker", None)
                )
                scroll_frame.after(0, lambda m=msg: app.pexels_status_lbl.config(text=m.split('\n')[0], fg="#34d399"))
                if hasattr(app, "refresh_media_table"):
                    scroll_frame.after(0, app.refresh_media_table)
            except Exception as ex:
                scroll_frame.after(0, lambda e=ex: app.pexels_status_lbl.config(text=f"Error: {e}", fg="#f87171"))

        threading.Thread(target=_quick_worker, daemon=True).start()

    def do_open_shotcut_with_download():
        last = getattr(app, "last_downloaded_pexels", None)
        if last and os.path.exists(last):
            from companion.tools.mlt_tools import tool_add_to_timeline
            ffmpeg = app.ffmpeg_path
            res = tool_add_to_timeline(ffmpeg, last, open_in_shotcut=True)
            messagebox.showinfo("Shotcut", f"Stock video loaded onto Shotcut timeline:\n{last}")
        else:
            messagebox.showinfo("No Video", "Download a Pexels video first.")

    tk.Button(btn_bar, text="🔍 Search Pexels", font=("Segoe UI", 9, "bold"), bg="#0284c7", fg="#ffffff", relief=tk.FLAT, padx=12, pady=4, cursor="hand2", command=do_search).pack(side=tk.LEFT, padx=3)
    tk.Button(btn_bar, text="🔥 Popular Videos", font=("Segoe UI", 9), bg="#334155", fg="#ffffff", relief=tk.FLAT, padx=10, pady=4, cursor="hand2", command=lambda: [app.pexels_search_entry.delete(0, tk.END), do_search()]).pack(side=tk.LEFT, padx=3)
    tk.Button(btn_bar, text="📥 Download Selected", font=("Segoe UI", 9, "bold"), bg="#10b981", fg="#ffffff", relief=tk.FLAT, padx=12, pady=4, cursor="hand2", command=do_download_selected).pack(side=tk.LEFT, padx=3)
    tk.Button(btn_bar, text="⚡ Instant Top Video", font=("Segoe UI", 9, "bold"), bg="#f59e0b", fg="#000000", relief=tk.FLAT, padx=10, pady=4, cursor="hand2", command=do_instant_top_download).pack(side=tk.LEFT, padx=3)
    tk.Button(btn_bar, text="🎬 Add to Shotcut", font=("Segoe UI", 8, "bold"), bg="#6366f1", fg="#ffffff", relief=tk.FLAT, padx=8, pady=4, cursor="hand2", command=do_open_shotcut_with_download).pack(side=tk.RIGHT, padx=3)

    app.pexels_status_lbl = tk.Label(card_pexels, text="Ready. Click 'Search Pexels' or 'Popular Videos' to discover stock clips.", font=("Segoe UI", 9), fg="#94a3b8", bg="#1e293b", anchor=tk.W)
    app.pexels_status_lbl.pack(fill=tk.X, pady=(4, 0))

    # =========================================================================
    # SECTION 2: DALL-E 3 AI VISUAL STUDIO (OPTIONAL GENERATIVE AI)
    # =========================================================================
    card_dalle = tk.Frame(scroll_frame, bg="#1e1b4b", padx=14, pady=12, relief=tk.GROOVE, bd=1)
    card_dalle.pack(fill=tk.X)

    tk.Label(card_dalle, text="🎨 DALL-E 3 AI Visual Studio (Generative Imagery)", font=("Segoe UI", 11, "bold"), fg="#c084fc", bg="#1e1b4b").pack(anchor=tk.W)
    tk.Label(card_dalle, text="Synthesize custom AI visuals with OpenAI DALL-E 3 (Requires OpenAI API Key; Introduces synthetic markers).", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e1b4b").pack(anchor=tk.W, pady=(2, 6))

    tk.Label(card_dalle, text="Image Prompt:", font=("Segoe UI", 8, "bold"), fg="#ffffff", bg="#1e1b4b").pack(anchor=tk.W)
    app.broll_prompt = tk.Entry(card_dalle, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    app.broll_prompt.pack(fill=tk.X, pady=(2, 4), ipady=3)
    app.broll_prompt.insert(0, "Cinematic 35mm anamorphic shot of futuristic workspace, photorealistic 8k")

    ctrl = tk.Frame(card_dalle, bg="#1e1b4b")
    ctrl.pack(fill=tk.X, pady=4)

    tk.Label(ctrl, text="Ratio:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e1b4b").pack(side=tk.LEFT, padx=4)
    app.broll_ratio = ttk.Combobox(ctrl, values=["1792x1024 (16:9 Video)", "1024x1024 (1:1 Square)", "1024x1792 (9:16 Shorts)"], state="readonly", width=22)
    app.broll_ratio.set("1792x1024 (16:9 Video)")
    app.broll_ratio.pack(side=tk.LEFT, padx=6)

    def run_broll_tab():
        key = app.settings.get("api_key", "").strip()
        if not key:
            messagebox.showerror("Key Required", "Enter your OpenAI API key in Settings.")
            return
        prompt = app.broll_prompt.get().strip()
        if not prompt:
            messagebox.showerror("Empty Prompt", "Please enter an image prompt.")
            return

        out_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG Image", "*.png")], initialfile="mediamogul_broll.png")
        if not out_path:
            return

        raw_ratio = app.broll_ratio.get().split()[0]
        app.status_var.set("Generating DALL-E 3 visual (~20s)...")
        app.broll_status.config(text="Generating image with DALL-E 3... please wait.")

        def _do():
            try:
                img_url = generate_dalle_image(prompt, out_path, key, raw_ratio)
                app.broll_status.config(text=f"✓ Saved image: {os.path.basename(out_path)}")
                app.status_var.set(f"Image saved to: {out_path}")
                if hasattr(app, "media_tracker") and app.media_tracker:
                    app.media_tracker.track_file(out_path, role="broll_image")
                messagebox.showinfo("Success", f"DALL-E 3 image saved:\n{out_path}\n\nYou can now drag this image straight onto the Shotcut timeline!")
            except Exception as e:
                app.broll_status.config(text=f"✗ Error: {e}")
                app.status_var.set("DALL-E generation failed.")
                messagebox.showerror("DALL-E Error", str(e))

        threading.Thread(target=_do, daemon=True).start()

    tk.Button(ctrl, text="🎨 Generate DALL-E 3 Image", font=("Segoe UI", 9, "bold"), bg="#a855f7", fg="#ffffff", relief=tk.FLAT, padx=10, pady=3,
              command=run_broll_tab).pack(side=tk.RIGHT, padx=4)

    app.broll_status = tk.Label(card_dalle, text="", font=("Segoe UI", 8), fg="#34d399", bg="#1e1b4b")
    app.broll_status.pack(anchor=tk.W, pady=(2, 0))
