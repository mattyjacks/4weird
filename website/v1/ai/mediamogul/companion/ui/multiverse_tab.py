"""
multiverse_tab.py - Multiverse Timelines Hub GUI
Visual command center for managing, spawning, and switching parallel timeline universes
(Director's Cut, Viral Fast Cut, Elements Overlays, Split-Screen Matrix, and Multi-Track Omega Stack).
"""

import os
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

try:
    from companion.mediamogul_tools import (
        tool_create_multiverse_timelines, tool_branch_timeline_universe,
        find_ffmpeg, find_shotcut_exe
    )
except ImportError:
    from mediamogul_tools import (
        tool_create_multiverse_timelines, tool_branch_timeline_universe,
        find_ffmpeg, find_shotcut_exe
    )


def setup_multiverse_tab(parent_frame, app):
    """Sets up the Multiverse Timelines Hub tab in the MediaMogul Command Center."""
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=14, pady=12)
    frame.pack(fill=tk.BOTH, expand=True)

    # 1. Header
    header_box = tk.Frame(frame, bg="#0f172a")
    header_box.pack(fill=tk.X, pady=(0, 8))

    tk.Label(
        header_box,
        text="🌌 Multiverse Timelines Hub (Parallel Cuts Engine)",
        font=("Segoe UI", 13, "bold"),
        fg="#ffffff",
        bg="#0f172a"
    ).pack(anchor=tk.W)

    tk.Label(
        header_box,
        text="Orchestrate multiple parallel timeline universes simultaneously • Switch cuts instantly or stack all-in-one in Shotcut.",
        font=("Segoe UI", 8),
        fg="#94a3b8",
        bg="#0f172a"
    ).pack(anchor=tk.W, pady=(1, 4))

    # 2. Target Media Row
    target_box = tk.LabelFrame(
        frame,
        text=" 📁 Source Video for Multiverse Spawning ",
        font=("Segoe UI", 9, "bold"),
        fg="#38bdf8",
        bg="#1e293b",
        padx=10,
        pady=6
    )
    target_box.pack(fill=tk.X, pady=(0, 8))

    target_entry = tk.Entry(target_box, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff")
    target_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8), ipady=3)

    default_vid = r"C:\Users\ventu\Videos\4weird programming tutorial 10 minutes 1 2026-06-13 19-55-31.mp4"
    if os.path.exists(default_vid):
        target_entry.insert(0, default_vid)

    def browse_target():
        fn = filedialog.askopenfilename(
            title="Select Source Video",
            filetypes=[("Video Files", "*.mp4 *.mov *.mkv *.avi *.webm"), ("All Files", "*.*")]
        )
        if fn:
            target_entry.delete(0, tk.END)
            target_entry.insert(0, fn)

    tk.Button(target_box, text="Browse...", font=("Segoe UI", 9), bg="#334155", fg="#ffffff", command=browse_target).pack(side=tk.RIGHT)

    # 3. Main Universe Grid (5 Universe Cards)
    cards_frame = tk.Frame(frame, bg="#0f172a")
    cards_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

    active_universe_files = {}

    universe_definitions = [
        ("alpha", "🌌 Universe Alpha: Director's Cut", "Paced narrative, warm cinematic grading, full coverage", "#0284c7"),
        ("beta", "⚡ Universe Beta: Viral Fast Cut", "Dead-air silences jump-cut, high retention pacing", "#e11d48"),
        ("gamma", "✨ Universe Gamma: Elements & Overlays", "Multi-track V1+V2 with Shotcut library animated stickers & SFX", "#a855f7"),
        ("delta", "🔀 Universe Delta: Split Matrix (A/B)", "Synchronized side-by-side A/B comparison playing at once", "#10b981"),
        ("omega", "👑 Universe Omega: Multi-Track Master", "All parallel universes stacked on toggleable tracks (V1, V2)", "#f59e0b"),
    ]

    card_status_labels = {}

    for idx, (u_key, u_title, u_desc, u_color) in enumerate(universe_definitions):
        card = tk.Frame(cards_frame, bg="#1e293b", padx=8, pady=6, relief=tk.GROOVE, bd=1)
        card.pack(fill=tk.X, pady=2)

        info_box = tk.Frame(card, bg="#1e293b")
        info_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        tk.Label(info_box, text=u_title, font=("Segoe UI", 9, "bold"), fg=u_color, bg="#1e293b").pack(anchor=tk.W)
        tk.Label(info_box, text=u_desc, font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(anchor=tk.W)

        status_lbl = tk.Label(info_box, text="Status: Ready to spawn", font=("Consolas", 7), fg="#64748b", bg="#1e293b")
        status_lbl.pack(anchor=tk.W, pady=(2, 0))
        card_status_labels[u_key] = status_lbl

        def make_opener(key=u_key):
            def _open():
                fn = active_universe_files.get(key)
                if not fn or not os.path.exists(fn):
                    messagebox.showwarning("Universe Not Spawned", "Please click 'Spawn All 5 Parallel Universes' first.")
                    return
                sc_exe = find_shotcut_exe()
                if sc_exe and os.path.exists(sc_exe):
                    subprocess.Popen([sc_exe, fn], creationflags=0x00000008 | 0x00000200)
                    app.status_var.set(f"Loaded {key} into Shotcut.")
                else:
                    messagebox.showinfo("Shotcut Project", f"Project file ready:\n{fn}")
            return _open

        btn = tk.Button(card, text="Open in Shotcut", font=("Segoe UI", 8, "bold"), bg="#334155", fg="#ffffff", command=make_opener(u_key))
        btn.pack(side=tk.RIGHT, padx=4)

    # 4. Action Bar
    action_box = tk.Frame(frame, bg="#0f172a")
    action_box.pack(fill=tk.X, pady=(0, 6))

    def run_spawn_multiverse():
        tgt = target_entry.get().strip()
        if not tgt or not os.path.exists(tgt):
            messagebox.showerror("File Error", "Please select a valid source video.")
            return

        app.status_var.set("Spawning 5 parallel multiverse timelines...")
        log_text.insert(tk.END, "🚀 Initializing Multi-Versal Timelines Engine (Spawning 5 Parallel Cuts)...\n")
        log_text.see(tk.END)

        def _worker():
            try:
                ffmpeg = find_ffmpeg()
                res = tool_create_multiverse_timelines(ffmpeg, tgt, open_in_shotcut=True, primary_universe="omega")
                nonlocal active_universe_files
                for k, v in res["universes"].items():
                    short_k = k.split("_")[0]
                    active_universe_files[short_k] = v["file"]
                    if short_k in card_status_labels:
                        frame.after(0, lambda sk=short_k, fn=v["file"]: card_status_labels[sk].config(
                            text=f"● Ready: {os.path.basename(fn)}", fg="#34d399"
                        ))

                frame.after(0, lambda: log_text.insert(
                    tk.END,
                    f"✅ Successfully created {res['universes_count']} Parallel Universes at once!\n"
                    f"👑 Active loaded into Shotcut: {os.path.basename(res['active_file'])}\n\n"
                ))
                frame.after(0, lambda: app.status_var.set("Multiverse timelines spawned & Shotcut loaded."))
            except Exception as e:
                frame.after(0, lambda: log_text.insert(tk.END, f"❌ Multiverse error: {e}\n\n"))
                frame.after(0, lambda: messagebox.showerror("Multiverse Error", str(e)))

        threading.Thread(target=_worker, daemon=True).start()

    tk.Button(
        action_box,
        text="🚀 Spawn All 5 Parallel Universe Timelines",
        font=("Segoe UI", 9, "bold"),
        bg="#0284c7",
        fg="#ffffff",
        relief=tk.FLAT,
        pady=5,
        command=run_spawn_multiverse
    ).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 4))

    # Branch Universe Sub-panel
    branch_box = tk.LabelFrame(
        frame,
        text=" 🌿 Branch New Parallel Universe ",
        font=("Segoe UI", 8, "bold"),
        fg="#34d399",
        bg="#1e293b",
        padx=8,
        pady=4
    )
    branch_box.pack(fill=tk.X, pady=(0, 6))

    branch_row = tk.Frame(branch_box, bg="#1e293b")
    branch_row.pack(fill=tk.X, pady=2)

    tk.Label(branch_row, text="Branch Name:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    branch_entry = tk.Entry(branch_row, font=("Segoe UI", 8), bg="#0f172a", fg="#ffffff", width=14)
    branch_entry.pack(side=tk.LEFT, padx=(0, 6))
    branch_entry.insert(0, "meme_cut")

    tk.Label(branch_row, text="Style Preset:", font=("Segoe UI", 8), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 4))
    style_var = tk.StringVar(value="cinematic")
    style_dropdown = ttk.Combobox(
        branch_row,
        textvariable=style_var,
        values=["cinematic", "noir_bw", "custom"],
        state="readonly",
        width=11,
        font=("Segoe UI", 8)
    )
    style_dropdown.pack(side=tk.LEFT, padx=(0, 8))

    def run_branch():
        parent_file = active_universe_files.get("omega") or active_universe_files.get("alpha")
        if not parent_file or not os.path.exists(parent_file):
            tgt = target_entry.get().strip()
            if tgt.endswith(".mlt"):
                parent_file = tgt
            else:
                messagebox.showwarning("Parent Missing", "Please spawn universes first or select an .mlt project to branch.")
                return

        bname = branch_entry.get().strip() or "new_universe"
        style = style_var.get()
        try:
            out = tool_branch_timeline_universe(parent_file, bname, modification_type=style, open_in_shotcut=True)
            log_text.insert(tk.END, f"🌿 Successfully branched new universe '{bname}' -> {out}\n\n")
            log_text.see(tk.END)
            messagebox.showinfo("Universe Branched", f"New universe branch ready:\n{out}")
        except Exception as e:
            messagebox.showerror("Branch Error", str(e))

    tk.Button(
        branch_row,
        text="🌿 Branch Universe",
        font=("Segoe UI", 8, "bold"),
        bg="#059669",
        fg="#ffffff",
        command=run_branch
    ).pack(side=tk.RIGHT)

    # 5. Activity Console
    log_text = tk.Text(frame, height=4, bg="#0f172a", fg="#f8fafc", font=("Consolas", 8), relief=tk.FLAT, padx=8, pady=4)
    log_text.pack(fill=tk.X)
    log_text.insert(tk.END, "Ready. Spawn all 5 parallel universes or branch existing timelines.\n")
