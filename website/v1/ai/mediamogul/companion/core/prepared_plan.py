"""
prepared_plan.py - Implementation Plan & Auto-Proceed Engine for MediaMogul.

Modeled after Google Antigravity's structured implementation plans:
- Defines clear task goals and proposed tool execution steps.
- Accurately estimates API costs and tests against Daily and Lifetime budgets.
- Analyzes AI Fingerprint impact (Fingerprint-Free vs Fingerprint-Parts vs Fingerprint-Full).
- Supports dual execution modes:
  1. 'Request to Proceed': Requires explicit user approval via interactive UI button before running.
  2. 'Auto-Proceed': Proceeds autonomously based on user configuration in settings.
"""

import time
import uuid
from typing import List, Dict, Any, Optional
from companion.core.cost_calculator import get_cost_calculator
from companion.core.fingerprint_tracker import (
    get_fingerprint_tracker,
    AI_FINGERPRINT_TOOLS,
    STATUS_FREE,
    STATUS_PARTS,
    STATUS_FULL
)


class PreparedPlan:
    """
    Represents an Antigravity-style structured implementation plan before video modification tools run.
    """

    def __init__(
        self,
        goal: str,
        steps: List[Dict[str, Any]],
        user_prompt: str = "",
        auto_proceed: bool = False,
        settings_ref: dict = None
    ):
        self.plan_id = str(uuid.uuid4())[:8]
        self.goal = goal
        self.steps = steps or []
        self.user_prompt = user_prompt
        self.auto_proceed = auto_proceed
        self.settings = settings_ref or {}
        self.status = "pending"  # "pending", "approved", "declined", "executing", "completed"
        self.created_at = time.strftime("%Y-%m-%d %H:%M:%S")

        self.cost_calc = get_cost_calculator()
        self.fp_tracker = get_fingerprint_tracker(self.settings)

        # Estimate costs and fingerprint impact
        self.estimated_cost = 0.0
        self.cost_breakdown = []
        self.will_add_ai_fingerprint = False
        self.fingerprint_status = STATUS_FREE
        self.fingerprint_warnings = []
        self._analyze_plan()

    def _analyze_plan(self):
        """Analyzes proposed steps for financial cost and AI fingerprint impact."""
        total_cost = 0.0

        for idx, step in enumerate(self.steps, 1):
            tool = step.get("tool", "")
            params = step.get("params", {})
            t_key = tool.lower().strip().replace("-", "_")

            step_cost = 0.0
            cost_desc = "Local FFmpeg / MLT ($0.00)"

            # Cost estimation per tool
            if t_key == "generate_broll":
                step_cost = self.cost_calc.calculate_dalle_cost()
                cost_desc = f"DALL-E 3 Image (${step_cost:.3f})"
                self.will_add_ai_fingerprint = True
                self.fingerprint_warnings.append(f"Step {idx} ({tool}): Introduces synthetic AI image asset.")
            elif t_key == "generate_voiceover":
                text = params.get("text", "")
                step_cost = self.cost_calc.calculate_tts_cost(len(text))
                cost_desc = f"TTS Audio (${step_cost:.4f} for {len(text)} chars)"
                self.will_add_ai_fingerprint = True
                self.fingerprint_warnings.append(f"Step {idx} ({tool}): Introduces synthetic AI voice track.")
            elif t_key in ("burn_subtitles", "generate_subtitles"):
                # Whisper audio estimation (approx 60s default if unknown)
                est_duration = float(params.get("duration", 60.0))
                step_cost = self.cost_calc.calculate_whisper_cost(est_duration)
                cost_desc = f"Whisper STT (~${step_cost:.4f} for {est_duration:.0f}s)"
            elif t_key in AI_FINGERPRINT_TOOLS:
                self.will_add_ai_fingerprint = True
                self.fingerprint_warnings.append(f"Step {idx} ({tool}): AI fingerprinting tool.")

            total_cost += step_cost
            self.cost_breakdown.append({
                "step_num": idx,
                "tool": tool,
                "description": params.get("description", tool),
                "cost": step_cost,
                "cost_note": cost_desc
            })

        self.estimated_cost = round(total_cost, 4)

        # Evaluate resulting fingerprint status
        curr_status = self.fp_tracker.evaluate_status()
        if not self.will_add_ai_fingerprint and curr_status["status"] == STATUS_FREE:
            self.fingerprint_status = STATUS_FREE
        else:
            if curr_status["status"] == STATUS_FULL or len(self.fingerprint_warnings) >= 2:
                self.fingerprint_status = STATUS_FULL
            else:
                self.fingerprint_status = STATUS_PARTS

    def to_markdown(self) -> str:
        """Renders the Prepared Plan into Google Antigravity markdown format."""
        budget_info = self.cost_calc.check_budget_status()
        rem_daily = max(0.0, budget_info["daily_limit"] - budget_info["daily_spend"])
        rem_life = max(0.0, budget_info["lifetime_limit"] - budget_info["lifetime_spend"])

        if self.fingerprint_status == STATUS_FREE:
            fp_badge = "🟢 Fingerprint-Free (100% Authentic / Max Reach)"
        elif self.fingerprint_status == STATUS_PARTS:
            fp_badge = "🟡 Fingerprint-Parts (1+ AI Frames / Partial AI)"
        else:
            fp_badge = "🟣 Fingerprint-Full (>=50% AI / Social Media AI Tagged)"

        lines = [
            f"### 📋 Prepared Plan: {self.goal}",
            f"**Plan ID**: `mediamogul-plan-{self.plan_id}` | **Mode**: `{'Auto-Proceed' if self.auto_proceed else 'Interactive Approval Required'}`",
            "",
            "#### 💰 Cost & Budget Analysis",
            f"- **Estimated Step Cost**: **${self.estimated_cost:.4f} USD**",
            f"- **Daily Budget**: Spent ${budget_info['daily_spend']:.4f} / ${budget_info['daily_limit']:.2f} (Remaining: **${rem_daily:.4f}**)",
            f"- **Lifetime Budget**: Spent ${budget_info['lifetime_spend']:.4f} / ${budget_info['lifetime_limit']:.2f} (Remaining: **${rem_life:.4f}**)",
            "",
            "#### 🛡️ AI Fingerprint Assessment",
            f"- **Target Status**: **{fp_badge}**",
        ]

        if self.fingerprint_warnings:
            lines.append("- **AI Footprint Warnings**:")
            for w in self.fingerprint_warnings:
                lines.append(f"  - ⚠️ {w}")
        else:
            lines.append("- **Clean Integrity**: Guaranteed zero AI frames or synthetic voices used. Algorithm safe.")

        lines.extend([
            "",
            "#### 🛠️ Proposed Execution Steps",
        ])

        for step in self.cost_breakdown:
            lines.append(
                f"{step['step_num']}. **`{step['tool']}`** — {step['description']} "
                f"*(Cost: {step['cost_note']})*"
            )

        if not self.auto_proceed:
            lines.extend([
                "",
                "> **User Review Required**: Review the planned modifications above. "
                "Click **[ 🚀 Proceed / Execute Plan ]** below or say **'proceed'** to execute."
            ])

        return "\n".join(lines)
