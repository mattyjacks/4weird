import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

def setup_collab_tab(parent_frame, app):
    """Sets up the Video Editor Collaboration & Export Hub tab."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=16, pady=16)
    frame.pack(fill=tk.BOTH, expand=True)

    # Header
    tk.Label(frame, text="🤝 Video Editor Collaboration & Export Hub", font=("Segoe UI", 14, "bold"), fg="#ffffff", bg="#0f172a").pack(anchor=tk.W)
    tk.Label(frame, text="Share projects with other editors instantly. Choose between ultra-lightweight manifest packs or turnkey master bundles.", font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a").pack(anchor=tk.W, pady=(2, 10))

    # 3 Export Action Cards
    card_box = tk.Frame(frame, bg="#0f172a")
    card_box.pack(fill=tk.X, pady=(0, 12))

    def export_single_log():
        if not app.media_tracker:
            messagebox.showerror("Error", "Media tracker not initialized.")
            return
        out = filedialog.asksaveasfilename(
            title="Export Full Action History",
            defaultextension=".txt",
            filetypes=[("Text Log", "*.txt"), ("Markdown", "*.md"), ("All Files", "*.*")],
            initialfile="mediamogul_full_action_history.txt"
        )
        if out:
            res = app.media_tracker.export_single_action_log(out)
            messagebox.showinfo("Export Complete", f"Full action history exported:\n{res}")
            app.collab_log.insert(tk.END, f"Exported Single Action Log: {res}\n")

    def export_lightweight_pack():
        if not app.media_tracker:
            messagebox.showerror("Error", "Media tracker not initialized.")
            return
        out = filedialog.asksaveasfilename(
            title="Export Lightweight Collaboration Pack",
            defaultextension=".zip",
            filetypes=[("Zip Archive", "*.zip")],
            initialfile="mediamogul_lightweight_collab_pack.zip"
        )
        if out:
            res = app.media_tracker.export_lightweight_pack(out)
            messagebox.showinfo(
                "Lightweight Pack Exported",
                f"Lightweight Collaboration Pack successfully created!\n\nLocation:\n{res}\n\n"
                f"Contains: .mlt project files, .srt subtitles, transcripts, and manifest with system links (file:///).\n"
                f"NO heavy media was included, keeping this zip ultra-lightweight for fast sharing!"
            )
            app.collab_log.insert(tk.END, f"Exported Lightweight Pack (.zip): {res}\n")

    def export_master_bundle():
        if not app.media_tracker:
            messagebox.showerror("Error", "Media tracker not initialized.")
            return
        out = filedialog.asksaveasfilename(
            title="Export Master Turnkey Archive (Includes Big Media)",
            defaultextension=".zip",
            filetypes=[("Zip Archive", "*.zip")],
            initialfile="mediamogul_master_turnkey_project.zip"
        )
        if out:
            app.status_var.set("Bundling master archive with all media assets...")
            res = app.media_tracker.export_master_bundle(out)
            app.status_var.set("Master archive export finished.")
            messagebox.showinfo(
                "Master Bundle Exported",
                f"Master Turnkey Archive created!\n\nLocation:\n{res}\n\n"
                f"Includes ALL heavy videos, audio, images, project files, and action manifests. Turnkey ready for another editor!"
            )
            app.collab_log.insert(tk.END, f"Exported Master Turnkey Bundle (.zip): {res}\n")

    def refresh_media_table():
        for item in app.media_tree.get_children():
            app.media_tree.delete(item)
        if not hasattr(app, "media_tracker") or not app.media_tracker:
            return
        for path, meta in app.media_tracker.tracked_media.items():
            name = os.path.basename(path)
            cat = "Heavy (Video/Image)" if meta.get("is_heavy") else "Lightweight (Text/Data)"
            sz = meta.get("size_bytes", 0)
            sz_str = f"{sz / 1048576:.2f} MB" if sz > 1048576 else f"{sz / 1024:.1f} KB"
            uri = meta.get("system_link", "")
            exists = "✓ On Disk" if meta.get("exists") else "✗ Missing"
            app.media_tree.insert("", tk.END, values=(name, cat, sz_str, uri, exists))

    def add_media_to_tracker():
        files = filedialog.askopenfilenames(title="Select Media or Project Files to Track")
        if files and app.media_tracker:
            for f in files:
                app.media_tracker.track_file(f)
            refresh_media_table()
            app.collab_log.insert(tk.END, f"Added {len(files)} files to library manifest.\n")
            app.collab_log.see(tk.END)

    def clear_media_tracker():
        if app.media_tracker:
            app.media_tracker.tracked_media.clear()
            refresh_media_table()
            app.collab_log.insert(tk.END, "Media library manifest cleared.\n")

    app.export_single_log = export_single_log
    app.export_lightweight_pack = export_lightweight_pack
    app.export_master_bundle = export_master_bundle
    app.refresh_media_table = refresh_media_table
    app.add_media_to_tracker = add_media_to_tracker
    app.clear_media_tracker = clear_media_tracker

    # Card 1: Single Action Log
    c1 = tk.Frame(card_box, bg="#1e293b", padx=10, pady=10, relief=tk.GROOVE, bd=1)
    c1.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 6))

    tk.Label(c1, text="📄 Single Action Log", font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c1, text="Export complete session timeline, prompt history, and system media links into one long file.", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", justify=tk.LEFT, wraplength=180).pack(anchor=tk.W, pady=(4, 8))
    tk.Button(c1, text="Export Single Log", font=("Segoe UI", 9, "bold"), bg="#0284c7", fg="#ffffff", relief=tk.FLAT, command=export_single_log).pack(fill=tk.X)

    # Card 2: Lightweight Collaboration Pack
    c2 = tk.Frame(card_box, bg="#1e293b", padx=10, pady=10, relief=tk.GROOVE, bd=1)
    c2.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=3)

    tk.Label(c2, text="📦 Lightweight Collab (.zip)", font=("Segoe UI", 10, "bold"), fg="#34d399", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c2, text="Packs .mlt projects, .srt, transcripts & system links (file:///). ZERO heavy videos/images. Instant Discord/Slack share!", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", justify=tk.LEFT, wraplength=180).pack(anchor=tk.W, pady=(4, 8))
    tk.Button(c2, text="Export Lightweight Pack", font=("Segoe UI", 9, "bold"), bg="#059669", fg="#ffffff", relief=tk.FLAT, command=export_lightweight_pack).pack(fill=tk.X)

    # Card 3: Master Turnkey Archive
    c3 = tk.Frame(card_box, bg="#1e293b", padx=10, pady=10, relief=tk.GROOVE, bd=1)
    c3.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(6, 0))

    tk.Label(c3, text="🗄️ Master Turnkey (.zip)", font=("Segoe UI", 10, "bold"), fg="#f472b6", bg="#1e293b").pack(anchor=tk.W)
    tk.Label(c3, text="Copies ALL big media assets (MP4, PNG, WAV) into one master archive. 100% turnkey offline handoff.", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b", justify=tk.LEFT, wraplength=180).pack(anchor=tk.W, pady=(4, 8))
    tk.Button(c3, text="Export Master Bundle", font=("Segoe UI", 9, "bold"), bg="#db2777", fg="#ffffff", relief=tk.FLAT, command=export_master_bundle).pack(fill=tk.X)

    # Media Library Tracker & Table
    tracker_header = tk.Frame(frame, bg="#0f172a")
    tracker_header.pack(fill=tk.X, pady=(6, 4))
    tk.Label(tracker_header, text="Tracked Project Media & System Links:", font=("Segoe UI", 10, "bold"), fg="#e2e8f0", bg="#0f172a").pack(side=tk.LEFT)

    tk.Button(tracker_header, text="➕ Add Media File", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief=tk.FLAT, command=add_media_to_tracker).pack(side=tk.RIGHT, padx=2)
    tk.Button(tracker_header, text="🔄 Refresh", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief=tk.FLAT, command=refresh_media_table).pack(side=tk.RIGHT, padx=2)
    tk.Button(tracker_header, text="🧹 Clear", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief=tk.FLAT, command=clear_media_tracker).pack(side=tk.RIGHT, padx=2)

    # Treeview for media assets
    tree_frame = tk.Frame(frame, bg="#1e293b")
    tree_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

    columns = ("name", "type", "size", "uri", "status")
    app.media_tree = ttk.Treeview(tree_frame, columns=columns, show="headings", height=6)
    app.media_tree.heading("name", text="File Name")
    app.media_tree.heading("type", text="Category")
    app.media_tree.heading("size", text="Size")
    app.media_tree.heading("uri", text="System Link (file:///)")
    app.media_tree.heading("status", text="Disk Status")

    app.media_tree.column("name", width=140)
    app.media_tree.column("type", width=100)
    app.media_tree.column("size", width=70)
    app.media_tree.column("uri", width=260)
    app.media_tree.column("status", width=80)

    tree_scroll = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=app.media_tree.yview)
    app.media_tree.configure(yscrollcommand=tree_scroll.set)

    app.media_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)

    # Log & Action Summary
    app.collab_log = tk.Text(frame, height=4, bg="#1e293b", fg="#94a3b8", font=("Consolas", 8), relief=tk.FLAT, padx=6, pady=6)
    app.collab_log.pack(fill=tk.X)
    app.collab_log.insert(tk.END, "Ready to collaborate. Media files used by the AI Agent are tracked automatically.\n")
