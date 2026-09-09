"""
elements_tab.py - Shotcut Elements Studio GUI
Visual browser & auto-placement tool for Shotcut's built-in 1,200+ animated stickers,
emojis, graphics, sound effects, and title templates onto dedicated overlay timeline tracks.
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

try:
    from companion.mediamogul_tools import (
        list_shotcut_elements, resolve_shotcut_element, find_shotcut_elements_dir,
        tool_add_element_to_timeline, tool_auto_add_elements, find_ffmpeg, find_shotcut_exe
    )
except ImportError:
    from mediamogul_tools import (
        list_shotcut_elements, resolve_shotcut_element, find_shotcut_elements_dir,
        tool_add_element_to_timeline, tool_auto_add_elements, find_ffmpeg, find_shotcut_exe
    )


def setup_elements_tab(parent_frame, app):
    """Sets up the Elements Studio tab in MediaMogul Command Center."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=14, pady=12)
    frame.pack(fill=tk.BOTH, expand=True)

    # 1. Header
    header_box = tk.Frame(frame, bg="#0f172a")
    header_box.pack(fill=tk.X, pady=(0, 8))

    tk.Label(
        header_box,
        text="✨ Shotcut Elements Studio (Stickers, Emojis & SFX)",
        font=("Segoe UI", 13, "bold"),
        fg="#ffffff",
        bg="#0f172a"
    ).pack(anchor=tk.W)

    elem_dir = find_shotcut_elements_dir() or "Not found"
    tk.Label(
        header_box,
        text=f"Built-in Shotcut library: {elem_dir} • Dedicated Overlay Timeline Track (V2)",
        font=("Segoe UI", 8),
        fg="#94a3b8",
        bg="#0f172a"
    ).pack(anchor=tk.W, pady=(1, 4))

    # 2. Target Media / Project Row
    target_box = tk.LabelFrame(
        frame,
        text=" 📁 Target Video or Shotcut Project (.mlt) ",
        font=("Segoe UI", 9, "bold"),
        fg="#38bdf8",
        bg="#1e293b",
        padx=10,
        pady=8
    )
    target_box.pack(fill=tk.X, pady=(0, 8))

    target_entry = tk.Entry(target_box, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    target_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8), ipady=3)

    # Default to user's video if available
    default_vid = r"C:\Users\ventu\Videos\4weird programming tutorial 10 minutes 1 2026-06-13 19-55-31.mp4"
    if os.path.exists(default_vid):
        target_entry.insert(0, default_vid)

    def browse_target():
        fn = filedialog.askopenfilename(
            title="Select Video File or Shotcut Project (.mlt)",
            filetypes=[
                ("Video & MLT", "*.mp4 *.mov *.mkv *.avi *.webm *.mlt"),
                ("Shotcut Project", "*.mlt"),
                ("All Files", "*.*")
            ]
        )
        if fn:
            target_entry.delete(0, tk.END)
            target_entry.insert(0, fn)

    tk.Button(
        target_box,
        text="Browse...",
        font=("Segoe UI", 9),
        bg="#334155",
        fg="#ffffff",
        command=browse_target
    ).pack(side=tk.RIGHT)

    # 3. Main Split Container (Left: Elements Explorer | Right: Timeline Controls)
    main_split = tk.Frame(frame, bg="#0f172a")
    main_split.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

    # LEFT PANE: Library Explorer
    left_pane = tk.LabelFrame(
        main_split,
        text=" 🎨 Shotcut Library Explorer ",
        font=("Segoe UI", 9, "bold"),
        fg="#f472b6",
        bg="#1e293b",
        padx=10,
        pady=8
    )
    left_pane.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 6))

    # Category Filter and Search
    filter_row = tk.Frame(left_pane, bg="#1e293b")
    filter_row.pack(fill=tk.X, pady=(0, 6))

    tk.Label(filter_row, text="Category:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    cat_var = tk.StringVar(value="All")
    cat_dropdown = ttk.Combobox(
        filter_row,
        textvariable=cat_var,
        values=[
            "All", "activity", "food", "nature", "object", "person",
            "standard", "symbol", "travel", "graphics", "sounds", "text"
        ],
        state="readonly",
        width=11,
        font=("Segoe UI", 8)
    )
    cat_dropdown.pack(side=tk.LEFT, padx=(0, 8))

    search_var = tk.StringVar()
    search_entry = tk.Entry(filter_row, textvariable=search_var, font=("Segoe UI", 8), bg="#0f172a", fg="#ffffff")
    search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=2)
    search_entry.insert(0, "Search stickers/elements...")

    def on_search_focus_in(e):
        if search_entry.get() == "Search stickers/elements...":
            search_entry.delete(0, tk.END)

    search_entry.bind("<FocusIn>", on_search_focus_in)

    # Elements Listbox with Scrollbar
    list_frame = tk.Frame(left_pane, bg="#1e293b")
    list_frame.pack(fill=tk.BOTH, expand=True)

    scrollbar = tk.Scrollbar(list_frame)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    elem_listbox = tk.Listbox(
        list_frame,
        font=("Consolas", 8),
        bg="#0f172a",
        fg="#38bdf8",
        selectbackground="#0284c7",
        selectforeground="#ffffff",
        yscrollcommand=scrollbar.set,
        relief=tk.FLAT
    )
    elem_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    scrollbar.config(command=elem_listbox.yview)

    cached_elements = []

    def refresh_library():
        nonlocal cached_elements
        cat = cat_var.get()
        q = search_var.get().strip()
        if q == "Search stickers/elements...":
            q = ""
        cached_elements = list_shotcut_elements(category=cat if cat != "All" else None, query=q)
        elem_listbox.delete(0, tk.END)
        for el in cached_elements:
            tag = "[ANIM]" if el["type"] == "sticker_lottie" else ("[SFX]" if el["type"] == "sound_sfx" else "[GFX]")
            elem_listbox.insert(tk.END, f"{tag} {el['clean_name']}  ({el['category']})")

    cat_dropdown.bind("<<ComboboxSelected>>", lambda e: refresh_library())
    search_var.trace_add("write", lambda *_: refresh_library())

    # Initial load safely scheduled on main thread
    app.root.after(100, refresh_library)

    # RIGHT PANE: Dedicated Timeline Controls
    right_pane = tk.LabelFrame(
        main_split,
        text=" ⏱️ Dedicated Timeline Placement (V2) ",
        font=("Segoe UI", 9, "bold"),
        fg="#a78bfa",
        bg="#1e293b",
        padx=10,
        pady=8
    )
    right_pane.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(6, 0))

    # Controls Grid
    grid_cfg = tk.Frame(right_pane, bg="#1e293b")
    grid_cfg.pack(fill=tk.X, pady=(0, 8))

    # Timestamp
    tk.Label(grid_cfg, text="Timestamp:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").grid(row=0, column=0, sticky=tk.W, pady=3)
    ts_entry = tk.Entry(grid_cfg, font=("Segoe UI", 8), bg="#0f172a", fg="#ffffff", width=12)
    ts_entry.grid(row=0, column=1, sticky=tk.W, padx=6, pady=3)
    ts_entry.insert(0, "00:00:05")

    # Duration
    tk.Label(grid_cfg, text="Duration (s):", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").grid(row=1, column=0, sticky=tk.W, pady=3)
    dur_entry = tk.Entry(grid_cfg, font=("Segoe UI", 8), bg="#0f172a", fg="#ffffff", width=12)
    dur_entry.grid(row=1, column=1, sticky=tk.W, padx=6, pady=3)
    dur_entry.insert(0, "3.5")

    # Screen Position
    tk.Label(grid_cfg, text="Screen Position:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").grid(row=2, column=0, sticky=tk.W, pady=3)
    pos_var = tk.StringVar(value="bottom_right")
    pos_dropdown = ttk.Combobox(
        grid_cfg,
        textvariable=pos_var,
        values=["bottom_right", "bottom_left", "top_right", "top_left", "center", "full", "lower_third"],
        state="readonly",
        width=13,
        font=("Segoe UI", 8)
    )
    pos_dropdown.grid(row=2, column=1, sticky=tk.W, padx=6, pady=3)

    # Sound Sync Checkbox
    sound_sync_var = tk.BooleanVar(value=True)
    sound_check = tk.Checkbutton(
        grid_cfg,
        text="Pair with Synchronized SFX (Ding/Whoosh)",
        variable=sound_sync_var,
        font=("Segoe UI", 8),
        fg="#34d399",
        bg="#1e293b",
        selectcolor="#0f172a"
    )
    sound_check.grid(row=3, column=0, columnspan=2, sticky=tk.W, pady=(4, 6))

    # Action 1: Add Selected Element to Timeline
    def add_single_element():
        tgt = target_entry.get().strip()
        if not tgt or not os.path.exists(tgt):
            messagebox.showerror("File Error", "Please select a valid target video or .mlt project.")
            return

        sel = elem_listbox.curselection()
        if not sel:
            messagebox.showwarning("Selection", "Please select an element from the library list on the left.")
            return

        chosen = cached_elements[sel[0]]
        elem_name = chosen["name"]
        ts = ts_entry.get().strip() or "00:00:05"
        dur = float(dur_entry.get().strip() or 3.5)
        pos = pos_var.get()
        sfx = "Ding" if sound_sync_var.get() else None

        app.status_var.set(f"Adding '{elem_name}' to dedicated timeline track...")
        log_text.insert(tk.END, f"🚀 Injecting '{elem_name}' ({pos}) at {ts} on dedicated track V2...\n")
        log_text.see(tk.END)

        def _worker():
            try:
                ffmpeg = find_ffmpeg()
                out = tool_add_element_to_timeline(
                    ffmpeg=ffmpeg,
                    input_video_or_mlt=tgt,
                    element_name=elem_name,
                    timestamp=ts,
                    duration_sec=dur,
                    position=pos,
                    sound_effect=sfx,
                    open_in_shotcut=True
                )
                if app.media_tracker:
                    app.media_tracker.track_file(out, role="mlt_project")
                frame.after(0, lambda: log_text.insert(tk.END, f"✅ Success! Shotcut project updated & launched -> {out}\n\n"))
                frame.after(0, lambda: app.status_var.set("Element added to timeline."))
            except Exception as e:
                frame.after(0, lambda: log_text.insert(tk.END, f"❌ Failed: {e}\n\n"))
                frame.after(0, lambda: messagebox.showerror("Placement Error", str(e)))

        threading.Thread(target=_worker, daemon=True).start()

    tk.Button(
        right_pane,
        text="🚀 Add Selected Element to Timeline (V2)",
        font=("Segoe UI", 9, "bold"),
        bg="#0284c7",
        fg="#ffffff",
        relief=tk.FLAT,
        pady=5,
        command=add_single_element
    ).pack(fill=tk.X, pady=(2, 8))

    # Action 2: 1-Click Auto-Decorate Video
    auto_box = tk.LabelFrame(
        right_pane,
        text=" ✨ 1-Click Auto-Decorate with Themes ",
        font=("Segoe UI", 8, "bold"),
        fg="#34d399",
        bg="#1e293b",
        padx=8,
        pady=6
    )
    auto_box.pack(fill=tk.X, pady=(0, 6))

    theme_row = tk.Frame(auto_box, bg="#1e293b")
    theme_row.pack(fill=tk.X, pady=2)

    tk.Label(theme_row, text="Theme:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    theme_var = tk.StringVar(value="celebration")
    theme_dropdown = ttk.Combobox(
        theme_row,
        textvariable=theme_var,
        values=["celebration", "party", "halloween", "youtube", "coding", "gaming", "tutorial"],
        state="readonly",
        width=13,
        font=("Segoe UI", 8)
    )
    theme_dropdown.pack(side=tk.LEFT, padx=(0, 8))

    def run_auto_decorate():
        tgt = target_entry.get().strip()
        if not tgt or not os.path.exists(tgt):
            messagebox.showerror("File Error", "Please select a valid target video or .mlt project.")
            return

        theme = theme_var.get()
        pos = pos_var.get()
        sfx = sound_sync_var.get()

        app.status_var.set(f"Auto-decorating with '{theme}' Shotcut elements...")
        log_text.insert(tk.END, f"✨ Auto-decorating video with '{theme}' themed Shotcut elements...\n")
        log_text.see(tk.END)

        def _worker():
            try:
                ffmpeg = find_ffmpeg()
                res = tool_auto_add_elements(
                    ffmpeg=ffmpeg,
                    input_video_or_mlt=tgt,
                    theme=theme,
                    count=4,
                    position=pos,
                    sound_sync=sfx,
                    open_in_shotcut=True
                )
                if app.media_tracker:
                    app.media_tracker.track_file(res["mlt_project"], role="mlt_project")
                frame.after(0, lambda: log_text.insert(
                    tk.END,
                    f"✅ Placed {res['count']} elements ({', '.join(e['element'] for e in res['elements_placed'])}) on dedicated track V2!\nProject: {res['mlt_project']}\n\n"
                ))
                frame.after(0, lambda: app.status_var.set("Auto-decoration completed."))
            except Exception as e:
                frame.after(0, lambda: log_text.insert(tk.END, f"❌ Failed: {e}\n\n"))
                frame.after(0, lambda: messagebox.showerror("Auto-Decorate Error", str(e)))

        threading.Thread(target=_worker, daemon=True).start()

    tk.Button(
        auto_box,
        text="✨ Auto-Decorate Video Timeline",
        font=("Segoe UI", 8, "bold"),
        bg="#059669",
        fg="#ffffff",
        relief=tk.FLAT,
        pady=4,
        command=run_auto_decorate
    ).pack(fill=tk.X, pady=(4, 2))

    # 4. Activity Log Console
    log_text = tk.Text(frame, height=5, bg="#0f172a", fg="#f8fafc", font=("Consolas", 8), relief=tk.FLAT, padx=8, pady=6)
    log_text.pack(fill=tk.X)
    log_text.insert(tk.END, "Ready. Select an element or 1-click auto-decorate to place Shotcut library assets onto dedicated overlay track V2.\n")
