"""
agent_tab.py - Agent Console tab with quick prompts, commander swarm toggle,
Antigravity-style Prepared Plan approval card, and memory gauge.
"""

import tkinter as tk


def setup_agent_tab(parent_frame, app):
    frame = tk.Frame(parent_frame, bg="#0f172a", padx=10, pady=10)
    frame.pack(fill=tk.BOTH, expand=True)

    # 1. Quick action prompt buttons (Top)
    quick_frame = tk.Frame(frame, bg="#0f172a")
    quick_frame.pack(side=tk.TOP, fill=tk.X, pady=(0, 6))

    tk.Label(quick_frame, text="Quick Agent Prompts:", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#0f172a").pack(side=tk.LEFT, padx=(0, 6))

    one_click_btn = tk.Button(
        quick_frame, text="⚡ 1-Click Auto Video", font=("Segoe UI", 8, "bold"),
        bg="#f59e0b", fg="#000000", activebackground="#d97706", activeforeground="#ffffff",
        relief=tk.FLAT, padx=8, pady=2, cursor="hand2",
        command=app.one_click_produce_video
    )
    one_click_btn.pack(side=tk.LEFT, padx=(0, 8))

    prompts = [
        ("Transcribe Subtitles", "Transcribe speech from my video clip and create .srt subtitles"),
        ("Create Lower Third", "Format a professional 2-line lower third graphic for: Jane Doe, Lead Engineer"),
        ("Generate Viral Hook", "Write a 3-second opening hook for a YouTube video about artificial intelligence"),
        ("Render 16:9 B-Roll", "Generate a cinematic 16:9 widescreen B-roll image of a futuristic workspace")
    ]
    for label, p_text in prompts:
        btn = tk.Button(quick_frame, text=label, font=("Segoe UI", 8), bg="#1e293b", fg="#e2e8f0", relief=tk.FLAT,
                        command=lambda t=p_text: app.send_agent_prompt(t))
        btn.pack(side=tk.LEFT, padx=3)

    # 2. Controls Bar (Top: Commander Multi-Agent Swarm + Auto-Proceed Toggle)
    controls_bar = tk.Frame(frame, bg="#1e1b4b", padx=8, pady=4)
    controls_bar.pack(side=tk.TOP, fill=tk.X, pady=(0, 6))

    app.commander_mode_var = tk.BooleanVar(value=True)
    tk.Checkbutton(
        controls_bar,
        text="🎖️ Commander Multi-Agent Swarm",
        variable=app.commander_mode_var,
        font=("Segoe UI", 9, "bold"),
        fg="#a5b4fc",
        bg="#1e1b4b",
        selectcolor="#0f172a",
        activebackground="#1e1b4b",
        activeforeground="#ffffff"
    ).pack(side=tk.LEFT)

    # Auto-Proceed vs Request to Proceed toggle
    app.agent_auto_proceed_var = tk.BooleanVar(value=app.settings.get("auto_proceed_plan", False))
    tk.Checkbutton(
        controls_bar,
        text="⚡ Auto-Proceed with Plans (Skip Approval)",
        variable=app.agent_auto_proceed_var,
        font=("Segoe UI", 9),
        fg="#cbd5e1",
        bg="#1e1b4b",
        selectcolor="#0f172a",
        activebackground="#1e1b4b",
        activeforeground="#ffffff",
        command=lambda: app.on_toggle_auto_proceed()
    ).pack(side=tk.RIGHT)

    # 3. Input Area (PINNED TO BOTTOM FIRST so it is ALWAYS visible without vertical expanding!)
    input_frame = tk.Frame(frame, bg="#0f172a")
    input_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(6, 0))

    app.agent_input = tk.Entry(input_frame, font=("Segoe UI", 11), bg="#1e293b", fg="#ffffff", insertbackground="#ffffff")
    app.agent_input.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8), ipady=6)
    app.agent_input.bind("<Return>", lambda e: app.on_agent_submit())

    send_btn = tk.Button(input_frame, text="Send to Agent 🚀", font=("Segoe UI", 10, "bold"), bg="#6366f1", fg="#ffffff", relief=tk.FLAT, padx=14, pady=4,
                         command=app.on_agent_submit)
    send_btn.pack(side=tk.RIGHT)

    # 4. Memory & Token Status Bar (PINNED TO BOTTOM, directly above input area)
    mem_bar = tk.Frame(frame, bg="#1e1b4b", padx=8, pady=4)
    mem_bar.pack(side=tk.BOTTOM, fill=tk.X, pady=(4, 0))

    app.agent_token_label = tk.Label(
        mem_bar,
        text="🧠 Memory: 0 tokens (0 msgs)",
        font=("Segoe UI", 9, "bold"),
        fg="#c7d2fe",
        bg="#1e1b4b"
    )
    app.agent_token_label.pack(side=tk.LEFT)

    tk.Button(
        mem_bar,
        text="🗑️ Clear Memory",
        font=("Segoe UI", 8),
        bg="#312e81",
        fg="#e0e7ff",
        relief=tk.FLAT,
        command=app.clear_agent_memory
    ).pack(side=tk.RIGHT)

    # 5. Interactive Prepared Plan Card (PINNED TO BOTTOM, directly above memory bar)
    # Hidden until a Prepared Plan requires interactive review & proceed approval
    app.plan_card_frame = tk.Frame(frame, bg="#1e1b4b", padx=10, pady=8, highlightbackground="#6366f1", highlightthickness=1)

    plan_hdr_row = tk.Frame(app.plan_card_frame, bg="#1e1b4b")
    plan_hdr_row.pack(fill=tk.X)

    app.plan_card_title = tk.Label(
        plan_hdr_row,
        text="📋 Prepared Plan Awaiting Approval",
        font=("Segoe UI", 10, "bold"),
        fg="#ffffff",
        bg="#1e1b4b"
    )
    app.plan_card_title.pack(side=tk.LEFT)

    app.plan_card_badge = tk.Label(
        plan_hdr_row,
        text="🟢 Fingerprint-Free",
        font=("Segoe UI", 8, "bold"),
        fg="#10b981",
        bg="#064e3b",
        padx=6,
        pady=2
    )
    app.plan_card_badge.pack(side=tk.RIGHT)

    app.plan_card_details = tk.Label(
        app.plan_card_frame,
        text="Estimated Cost: $0.0000 | 1 Step planned.",
        font=("Segoe UI", 9),
        fg="#cbd5e1",
        bg="#1e1b4b"
    )
    app.plan_card_details.pack(anchor=tk.W, pady=(2, 6))

    plan_btn_row = tk.Frame(app.plan_card_frame, bg="#1e1b4b")
    plan_btn_row.pack(fill=tk.X)

    app.plan_proceed_btn = tk.Button(
        plan_btn_row,
        text="🚀 Proceed / Execute Plan",
        font=("Segoe UI", 9, "bold"),
        bg="#10b981",
        fg="#ffffff",
        activebackground="#059669",
        activeforeground="#ffffff",
        relief=tk.FLAT,
        padx=14,
        pady=4,
        cursor="hand2",
        command=lambda: app.execute_pending_plan()
    )
    app.plan_proceed_btn.pack(side=tk.LEFT, padx=(0, 8))

    app.plan_decline_btn = tk.Button(
        plan_btn_row,
        text="❌ Decline / Cancel",
        font=("Segoe UI", 9),
        bg="#334155",
        fg="#f1f5f9",
        activebackground="#475569",
        activeforeground="#ffffff",
        relief=tk.FLAT,
        padx=12,
        pady=4,
        cursor="hand2",
        command=lambda: app.decline_pending_plan()
    )
    app.plan_decline_btn.pack(side=tk.LEFT)

    # 6. Agent Chat History & Log (Scrollable container filling the remaining middle space)
    chat_container = tk.Frame(frame, bg="#1e293b")
    chat_container.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(0, 4))

    chat_scroll = tk.Scrollbar(chat_container)
    chat_scroll.pack(side=tk.RIGHT, fill=tk.Y)

    app.agent_chat = tk.Text(
        chat_container, bg="#1e293b", fg="#f8fafc", font=("Segoe UI", 10),
        wrap=tk.WORD, relief=tk.FLAT, padx=10, pady=10, height=8,
        yscrollcommand=chat_scroll.set
    )
    app.agent_chat.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    chat_scroll.config(command=app.agent_chat.yview)
    app.agent_chat.insert(tk.END, "🤖 MediaMogul Agent initialized.\nI remember our entire conversation and can execute physical video modifications directly on your files (trimming, 9:16 vertical crop, subtitle burn-in, audio extraction, speed changes, thumbnails, Shotcut .mlt editing, TTS, and DALL-E 3)!\n\n")
