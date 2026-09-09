"""
settings_tab.py - Settings and Configuration Tab for MediaMogul.
Includes:
- API Keys & AI Model Configuration
- Antigravity-style Execution Mode (Auto-Proceed vs Request to Proceed)
- 3-Tier AI Fingerprint Policy & Authenticity Protection
- Accurate Cost Calculator, Daily & Lifetime Budget Interface, and Custom API Key Gateway Routing
- Shotcut Executable Path & Menu Offsets
- High-Token Dangerous Mode
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
try:
    from companion.mediamogul_tools import find_shotcut_exe
    from companion.core.cost_calculator import get_cost_calculator
    from companion.core.fingerprint_tracker import (
        get_fingerprint_tracker, STATUS_FREE, STATUS_PARTS, STATUS_FULL
    )
except ImportError:
    try:
        from mediamogul_tools import find_shotcut_exe
        from core.cost_calculator import get_cost_calculator
        from core.fingerprint_tracker import (
            get_fingerprint_tracker, STATUS_FREE, STATUS_PARTS, STATUS_FULL
        )
    except ImportError:
        find_shotcut_exe = lambda: ""
        get_cost_calculator = lambda: None
        get_fingerprint_tracker = lambda: None


def setup_settings_tab(parent_frame, app):
    """Sets up the Settings tab in the MediaMogul Command Center with scrollable canvas."""
    canvas = tk.Canvas(parent_frame, bg="#0f172a", highlightthickness=0)
    scrollbar = tk.Scrollbar(parent_frame, orient="vertical", command=canvas.yview)
    scroll_frame = tk.Frame(canvas, bg="#0f172a", padx=16, pady=16)

    scroll_frame.bind(
        "<Configure>",
        lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
    )

    canvas_win = canvas.create_window((0, 0), window=scroll_frame, anchor="nw")

    def _on_canvas_resize(event):
        canvas.itemconfig(canvas_win, width=event.width)
    canvas.bind("<Configure>", _on_canvas_resize)
    canvas.configure(yscrollcommand=scrollbar.set)

    canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    # Mousewheel scrolling
    def _on_mousewheel(event):
        canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    canvas.bind_all("<MouseWheel>", _on_mousewheel)

    cost_calc = get_cost_calculator()
    fp_tracker = get_fingerprint_tracker(app.settings)

    # Header Title
    tk.Label(
        scroll_frame,
        text="⚙️ MediaMogul Configuration & Budget Center",
        font=("Segoe UI", 14, "bold"),
        fg="#ffffff",
        bg="#0f172a"
    ).pack(anchor=tk.W, pady=(0, 10))

    # =========================================================================
    # 1. AI FINGERPRINT POLICY & AUTHENTICITY PROTECTION
    # =========================================================================
    fp_box = tk.LabelFrame(
        scroll_frame,
        text="  🛡️ AI Fingerprint Policy & Authenticity Protection  ",
        font=("Segoe UI", 10, "bold"),
        fg="#38bdf8",
        bg="#0f172a",
        padx=14,
        pady=10
    )
    fp_box.pack(fill=tk.X, pady=(0, 14))

    # Live Status Indicator Row
    fp_status_row = tk.Frame(fp_box, bg="#0f172a")
    fp_status_row.pack(fill=tk.X, pady=(2, 6))

    tk.Label(fp_status_row, text="Current Project Status:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(side=tk.LEFT, padx=(0, 8))

    curr_fp = fp_tracker.evaluate_status() if fp_tracker else {"status": "Fingerprint-Free", "badge_color": "#10b981", "badge_icon": "🟢"}
    app.fp_status_badge = tk.Label(
        fp_status_row,
        text=f"{curr_fp['badge_icon']} {curr_fp['status']}",
        font=("Segoe UI", 9, "bold"),
        fg="#ffffff",
        bg=curr_fp["badge_color"],
        padx=8,
        pady=2
    )
    app.fp_status_badge.pack(side=tk.LEFT)

    # 3 Status Definitions Explanatory Card
    fp_info_text = (
        "• Fingerprint-Free: Zero AI frames or synthetic voices used. Authentic human/camera footage with\n"
        "  deterministic cuts, audio ducking, loudness normalization, and Shotcut filters for maximum reach on TikTok, YouTube & Reels.\n"
        "• Fingerprint-Parts: 1 or more frames of AI assets used (e.g. DALL-E 3 B-roll, TTS voiceover).\n"
        "• Fingerprint-Full: 50% or more of the video is AI-generated (automatically marked as AI by platforms)."
    )
    tk.Label(
        fp_box,
        text=fp_info_text,
        font=("Segoe UI", 8),
        fg="#94a3b8",
        bg="#0f172a",
        justify=tk.LEFT
    ).pack(anchor=tk.W, pady=(4, 8))

    # Strict Fingerprint-Free Mode Checkbox
    app.disable_ai_fingerprint_var = tk.BooleanVar(value=app.settings.get("disable_ai_fingerprint_features", False))
    tk.Checkbutton(
        fp_box,
        text="🛡️ Disable all features that would add an AI fingerprint to video, audio, or image",
        variable=app.disable_ai_fingerprint_var,
        font=("Segoe UI", 9, "bold"),
        fg="#34d399",
        bg="#0f172a",
        selectcolor="#1e293b",
        activebackground="#0f172a",
        activeforeground="#34d399",
        command=lambda: app.on_toggle_fingerprint_setting()
    ).pack(anchor=tk.W, pady=(2, 6))

    # Re-run Onboarding Selection Button
    tk.Button(
        fp_box,
        text="🔄 Re-run Initial Setup Selection Screen",
        font=("Segoe UI", 8),
        bg="#1e293b",
        fg="#cbd5e1",
        relief=tk.FLAT,
        padx=10,
        pady=3,
        command=lambda: app.show_onboarding_modal(force=True)
    ).pack(anchor=tk.W, pady=(2, 2))

    # =========================================================================
    # 2. ANTIGRAVITY PREPARED PLAN & EXECUTION MODE
    # =========================================================================
    plan_box = tk.LabelFrame(
        scroll_frame,
        text="  📋 Prepared Plan & Execution Policy (Google Antigravity Style)  ",
        font=("Segoe UI", 10, "bold"),
        fg="#a78bfa",
        bg="#0f172a",
        padx=14,
        pady=10
    )
    plan_box.pack(fill=tk.X, pady=(0, 14))

    plan_desc = (
        "Modeled after Google Antigravity implementation plans: Before executing physical video modifications,\n"
        "the agent generates an itemized Prepared Plan displaying step costs, budget status, and AI fingerprint impact."
    )
    tk.Label(plan_box, text=plan_desc, font=("Segoe UI", 8), fg="#94a3b8", bg="#0f172a", justify=tk.LEFT).pack(anchor=tk.W, pady=(0, 6))

    app.auto_proceed_var = tk.BooleanVar(value=app.settings.get("auto_proceed_plan", False))
    tk.Radiobutton(
        plan_box,
        text="Request to Proceed (Recommended - interactive Antigravity review & approval button before running)",
        variable=app.auto_proceed_var,
        value=False,
        font=("Segoe UI", 9, "bold"),
        fg="#e0e7ff",
        bg="#0f172a",
        selectcolor="#1e293b",
        activebackground="#0f172a",
        activeforeground="#ffffff"
    ).pack(anchor=tk.W, pady=2)

    tk.Radiobutton(
        plan_box,
        text="Auto-Proceed (Immediately executes prepared plans autonomously without interactive approval)",
        variable=app.auto_proceed_var,
        value=True,
        font=("Segoe UI", 9),
        fg="#cbd5e1",
        bg="#0f172a",
        selectcolor="#1e293b",
        activebackground="#0f172a",
        activeforeground="#ffffff"
    ).pack(anchor=tk.W, pady=2)

    # =========================================================================
    # 3. ACCURATE COST CALCULATOR & BUDGET INTERFACE (GATEWAY PREPARATION)
    # =========================================================================
    budget_box = tk.LabelFrame(
        scroll_frame,
        text="  💰 Accurate Cost Calculator & Budget Management (API Gateway Ready)  ",
        font=("Segoe UI", 10, "bold"),
        fg="#fbbf24",
        bg="#0f172a",
        padx=14,
        pady=10
    )
    budget_box.pack(fill=tk.X, pady=(0, 14))

    # Live Spend Gauges
    spend_meters_frame = tk.Frame(budget_box, bg="#1e293b", padx=12, pady=10)
    spend_meters_frame.pack(fill=tk.X, pady=(0, 10))

    # Daily Spend Card
    d_card = tk.Frame(spend_meters_frame, bg="#1e293b")
    d_card.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))

    tk.Label(d_card, text="📅 Daily Spend", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#1e293b").pack(anchor=tk.W)
    app.daily_spend_lbl = tk.Label(
        d_card,
        text="$0.0000 / $5.00",
        font=("Consolas", 12, "bold"),
        fg="#34d399",
        bg="#1e293b"
    )
    app.daily_spend_lbl.pack(anchor=tk.W, pady=2)

    app.daily_progress = ttk.Progressbar(d_card, orient="horizontal", length=180, mode="determinate")
    app.daily_progress.pack(fill=tk.X, pady=(2, 0))

    # Lifetime Spend Card
    l_card = tk.Frame(spend_meters_frame, bg="#1e293b")
    l_card.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(10, 0))

    tk.Label(l_card, text="🏦 Lifetime Spend", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#1e293b").pack(anchor=tk.W)
    app.lifetime_spend_lbl = tk.Label(
        l_card,
        text="$0.0000 / $50.00",
        font=("Consolas", 12, "bold"),
        fg="#38bdf8",
        bg="#1e293b"
    )
    app.lifetime_spend_lbl.pack(anchor=tk.W, pady=2)

    app.lifetime_progress = ttk.Progressbar(l_card, orient="horizontal", length=180, mode="determinate")
    app.lifetime_progress.pack(fill=tk.X, pady=(2, 0))

    # Budget Limits Entry Row
    limits_row = tk.Frame(budget_box, bg="#0f172a")
    limits_row.pack(fill=tk.X, pady=(4, 10))

    tk.Label(limits_row, text="Daily Budget Limit ($):", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(side=tk.LEFT, padx=(0, 4))
    app.daily_limit_entry = tk.Entry(limits_row, width=8, font=("Consolas", 9), bg="#1e293b", fg="#ffffff")
    app.daily_limit_entry.pack(side=tk.LEFT, padx=(0, 16))
    if cost_calc:
        app.daily_limit_entry.insert(0, f"{cost_calc.get_daily_budget_limit():.2f}")

    tk.Label(limits_row, text="Lifetime Budget Limit ($):", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(side=tk.LEFT, padx=(0, 4))
    app.lifetime_limit_entry = tk.Entry(limits_row, width=8, font=("Consolas", 9), bg="#1e293b", fg="#ffffff")
    app.lifetime_limit_entry.pack(side=tk.LEFT, padx=(0, 16))
    if cost_calc:
        app.lifetime_limit_entry.insert(0, f"{cost_calc.get_lifetime_budget_limit():.2f}")

    # Accurate Unit Pricing Info Card
    pricing_info = (
        "Accurate Pricing Rates:\n"
        "• GPT-5.6 / GPT-4o: $2.50 / 1M prompt tokens  |  $10.00 / 1M completion tokens\n"
        "• GPT-4o-mini: $0.15 / 1M prompt tokens  |  $0.60 / 1M completion tokens\n"
        "• Whisper STT: $0.006 / minute ($0.0001 / second)\n"
        "• OpenAI TTS: $0.015 / 1,000 characters\n"
        "• DALL-E 3: $0.040 standard (1024x1024)  |  $0.080 HD (1024x1792)\n"
        "• Local FFmpeg & Shotcut operations: $0.00 (100% Free local computation)"
    )
    tk.Label(
        budget_box,
        text=pricing_info,
        font=("Consolas", 8),
        fg="#a5b4fc",
        bg="#1e1b4b",
        padx=10,
        pady=8,
        justify=tk.LEFT
    ).pack(fill=tk.X, pady=(0, 10))

    # Custom API Key Gateway Configuration (In preparation for custom gateway)
    gw_frame = tk.Frame(budget_box, bg="#18181b", padx=10, pady=8)
    gw_frame.pack(fill=tk.X, pady=(0, 8))

    gw_cfg = cost_calc.get_gateway_config() if cost_calc else {}
    app.gw_enabled_var = tk.BooleanVar(value=gw_cfg.get("enabled", False))

    tk.Checkbutton(
        gw_frame,
        text="🌐 Route via Custom API Key Gateway (Billing & Proxy Gateway)",
        variable=app.gw_enabled_var,
        font=("Segoe UI", 9, "bold"),
        fg="#67e8f9",
        bg="#18181b",
        selectcolor="#09090b",
        activebackground="#18181b",
        activeforeground="#67e8f9"
    ).pack(anchor=tk.W, pady=(0, 4))

    gw_grid = tk.Frame(gw_frame, bg="#18181b")
    gw_grid.pack(fill=tk.X)

    tk.Label(gw_grid, text="Gateway URL:", font=("Segoe UI", 8), fg="#a1a1aa", bg="#18181b").grid(row=0, column=0, sticky="w", pady=2)
    app.gw_url_entry = tk.Entry(gw_grid, font=("Consolas", 8), bg="#27272a", fg="#ffffff", width=36)
    app.gw_url_entry.grid(row=0, column=1, sticky="w", padx=6, pady=2)
    app.gw_url_entry.insert(0, gw_cfg.get("url", ""))

    tk.Label(gw_grid, text="Gateway Key:", font=("Segoe UI", 8), fg="#a1a1aa", bg="#18181b").grid(row=0, column=2, sticky="w", pady=2)
    app.gw_key_entry = tk.Entry(gw_grid, font=("Consolas", 8), bg="#27272a", fg="#ffffff", width=24, show="*")
    app.gw_key_entry.grid(row=0, column=3, sticky="w", padx=6, pady=2)
    app.gw_key_entry.insert(0, gw_cfg.get("key", ""))

    tk.Label(gw_grid, text="Billing Account ID:", font=("Segoe UI", 8), fg="#a1a1aa", bg="#18181b").grid(row=1, column=0, sticky="w", pady=2)
    app.gw_billing_entry = tk.Entry(gw_grid, font=("Consolas", 8), bg="#27272a", fg="#ffffff", width=36)
    app.gw_billing_entry.grid(row=1, column=1, sticky="w", padx=6, pady=2)
    app.gw_billing_entry.insert(0, gw_cfg.get("billing_account_id", ""))

    # Budget Actions Row
    act_row = tk.Frame(budget_box, bg="#0f172a")
    act_row.pack(fill=tk.X, pady=(6, 2))

    tk.Button(
        act_row,
        text="🔄 Refresh Budget Gauges",
        font=("Segoe UI", 8),
        bg="#1e293b",
        fg="#cbd5e1",
        relief=tk.FLAT,
        padx=10,
        pady=3,
        command=lambda: app.refresh_budget_ui()
    ).pack(side=tk.LEFT, padx=(0, 8))

    tk.Button(
        act_row,
        text="🗑️ Reset Spend History",
        font=("Segoe UI", 8),
        bg="#450a0a",
        fg="#fca5a5",
        relief=tk.FLAT,
        padx=10,
        pady=3,
        command=lambda: app.reset_budget_history()
    ).pack(side=tk.LEFT)

    # =========================================================================
    # 4. GENERAL API & MODEL CONFIGURATION
    # =========================================================================
    gen_box = tk.LabelFrame(
        scroll_frame,
        text="  🤖 OpenAI API & Shotcut Settings  ",
        font=("Segoe UI", 10, "bold"),
        fg="#ffffff",
        bg="#0f172a",
        padx=14,
        pady=10
    )
    gen_box.pack(fill=tk.X, pady=(0, 14))

    tk.Label(gen_box, text="OpenAI API Key:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(anchor=tk.W, pady=(2, 2))
    app.key_entry = tk.Entry(gen_box, font=("Consolas", 9), bg="#1e293b", fg="#ffffff", width=55, show="*")
    app.key_entry.pack(anchor=tk.W, fill=tk.X, pady=(0, 8), ipady=3)
    app.key_entry.insert(0, app.settings.get("api_key", ""))

    tk.Label(
        gen_box,
        text="Pexels API Key (Optional - for keyword searches & 4K stock video):",
        font=("Segoe UI", 9, "bold"),
        fg="#38bdf8",
        bg="#0f172a"
    ).pack(anchor=tk.W, pady=(2, 2))
    app.pexels_key_entry = tk.Entry(gen_box, font=("Consolas", 9), bg="#1e293b", fg="#ffffff", width=55, show="*")
    app.pexels_key_entry.pack(anchor=tk.W, fill=tk.X, pady=(0, 8), ipady=3)
    app.pexels_key_entry.insert(0, app.settings.get("pexels_api_key", ""))

    tk.Label(gen_box, text="Default AI Model:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(anchor=tk.W, pady=(2, 2))
    app.model_combo = ttk.Combobox(gen_box, values=["gpt-5.6-luna", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"], state="readonly", width=25)
    app.model_combo.set(app.settings.get("model", "gpt-5.6-luna"))
    app.model_combo.pack(anchor=tk.W, pady=(0, 8))

    tk.Label(gen_box, text="Shotcut Executable Path:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(anchor=tk.W, pady=(2, 2))
    sc_frame = tk.Frame(gen_box, bg="#0f172a")
    sc_frame.pack(fill=tk.X, pady=(0, 8))
    app.shotcut_path_entry = tk.Entry(sc_frame, font=("Segoe UI", 9), bg="#1e293b", fg="#ffffff")
    app.shotcut_path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8), ipady=3)
    app.shotcut_path_entry.insert(0, app.settings.get("shotcut_exe_path", find_shotcut_exe() or ""))

    def browse_shotcut_path():
        fn = filedialog.askopenfilename(
            title="Select Shotcut Executable",
            filetypes=[("Shotcut Executable", "shotcut.exe"), ("Executable Files", "*.exe"), ("All Files", "*.*")]
        )
        if fn:
            app.shotcut_path_entry.delete(0, tk.END)
            app.shotcut_path_entry.insert(0, fn)

    app.browse_shotcut_path = browse_shotcut_path
    tk.Button(sc_frame, text="Browse...", font=("Segoe UI", 8), bg="#334155", fg="#ffffff", relief=tk.FLAT, padx=10, command=browse_shotcut_path).pack(side=tk.LEFT)

    tk.Label(gen_box, text="Top Bar Menu Item Alignment (pixels from menu bar start):", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#0f172a").pack(anchor=tk.W, pady=(2, 2))
    pos_frame = tk.Frame(gen_box, bg="#0f172a")
    pos_frame.pack(anchor=tk.W, pady=(2, 6))

    tk.Label(pos_frame, text="X Offset (0 = Auto ~218px):", fg="#ffffff", bg="#0f172a", font=("Segoe UI", 8)).pack(side=tk.LEFT, padx=(0, 4))
    app.offset_x_entry = tk.Entry(pos_frame, width=8, font=("Segoe UI", 8))
    app.offset_x_entry.insert(0, str(app.settings.get("menu_x_offset", 0)))
    app.offset_x_entry.pack(side=tk.LEFT, padx=(0, 16))

    tk.Label(pos_frame, text="Y Offset (0 = Auto ~2px):", fg="#ffffff", bg="#0f172a", font=("Segoe UI", 8)).pack(side=tk.LEFT, padx=(0, 4))
    app.offset_y_entry = tk.Entry(pos_frame, width=8, font=("Segoe UI", 8))
    app.offset_y_entry.insert(0, str(app.settings.get("menu_y_offset", 0)))
    app.offset_y_entry.pack(side=tk.LEFT)

    # DANGEROUS HIGH-TOKEN MODE
    danger_box = tk.Frame(gen_box, bg="#350c0c", padx=10, pady=8, relief=tk.GROOVE, bd=1)
    danger_box.pack(fill=tk.X, pady=(6, 4))

    app.dangerous_var = tk.BooleanVar(value=app.settings.get("dangerous_mode", False))
    tk.Checkbutton(
        danger_box,
        text="⚠️ Unlock High-Token Dangerous Mode (up to 128,000 context tokens)",
        variable=app.dangerous_var,
        font=("Segoe UI", 9, "bold"),
        fg="#fca5a5",
        bg="#350c0c",
        selectcolor="#1e1b4b",
        activebackground="#350c0c",
        activeforeground="#fca5a5"
    ).pack(anchor=tk.W)

    tokens_row = tk.Frame(danger_box, bg="#350c0c")
    tokens_row.pack(fill=tk.X, pady=(4, 0))

    tk.Label(tokens_row, text="Max Context Tokens:", font=("Segoe UI", 8), fg="#ffffff", bg="#350c0c").pack(side=tk.LEFT, padx=(0, 4))
    app.ctx_tokens_entry = tk.Entry(tokens_row, width=8, font=("Segoe UI", 8))
    app.ctx_tokens_entry.insert(0, str(app.settings.get("max_context_tokens", 65536 if app.settings.get("dangerous_mode") else 8192)))
    app.ctx_tokens_entry.pack(side=tk.LEFT, padx=(0, 16))

    tk.Label(tokens_row, text="Max Output Tokens:", font=("Segoe UI", 8), fg="#ffffff", bg="#350c0c").pack(side=tk.LEFT, padx=(0, 4))
    app.out_tokens_entry = tk.Entry(tokens_row, width=8, font=("Segoe UI", 8))
    app.out_tokens_entry.insert(0, str(app.settings.get("max_output_tokens", 4096 if app.settings.get("dangerous_mode") else 800)))
    app.out_tokens_entry.pack(side=tk.LEFT)

    # Save Settings Button
    tk.Button(
        scroll_frame,
        text="💾 Save All Settings & Budget Configuration",
        font=("Segoe UI", 11, "bold"),
        bg="#10b981",
        fg="#ffffff",
        relief=tk.FLAT,
        padx=20,
        pady=8,
        cursor="hand2",
        command=app.save_settings
    ).pack(anchor=tk.W, pady=(8, 16))

    # Initialize budget meters
    app.refresh_budget_ui()
