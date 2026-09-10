"""
test_prepared_plan_budget_fingerprint.py - Unit test suite for MediaMogul:
- Cost Calculator (Daily/Lifetime budgets, accurate pricing, gateway prep)
- 3-Tier Fingerprint Detection & Policy Enforcement
- Antigravity-Style Prepared Plan Engine & Execution Modes
"""

import os
import sys
import unittest
import tempfile
import json

# Setup import paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "companion")))

from companion.core.cost_calculator import CostCalculator
from companion.core.fingerprint_tracker import (
    FingerprintTracker, STATUS_FREE, STATUS_PARTS, STATUS_FULL
)
from companion.core.prepared_plan import PreparedPlan


class TestCostCalculator(unittest.TestCase):
    def setUp(self):
        self.tmp_budget_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json").name
        self.calc = CostCalculator(storage_path=self.tmp_budget_file)

    def tearDown(self):
        if os.path.exists(self.tmp_budget_file):
            try:
                os.remove(self.tmp_budget_file)
            except Exception:
                pass

    def test_accurate_pricing(self):
        # GPT-4o / GPT-5.6: 1,000 prompt tokens = $0.0025, 1,000 completion = $0.0100
        c1 = self.calc.calculate_llm_cost("gpt-4o", 1000, 1000)
        self.assertAlmostEqual(c1, 0.0125, places=5)

        # GPT-4o-mini: 10,000 in = $0.0015, 10,000 out = $0.0060 -> $0.0075
        c2 = self.calc.calculate_llm_cost("gpt-4o-mini", 10000, 10000)
        self.assertAlmostEqual(c2, 0.0075, places=5)

        # Whisper: 120 seconds (2 minutes) at $0.006/min = $0.0120
        w_cost = self.calc.calculate_whisper_cost(120.0)
        self.assertAlmostEqual(w_cost, 0.012, places=4)

        # TTS: 2,000 characters at $0.015/1k = $0.0300
        tts_cost = self.calc.calculate_tts_cost(2000)
        self.assertAlmostEqual(tts_cost, 0.030, places=4)

        # DALL-E 3: Standard = $0.040, HD = $0.080
        d_std = self.calc.calculate_dalle_cost("1024x1024", "standard")
        d_hd = self.calc.calculate_dalle_cost("1024x1792", "hd")
        self.assertEqual(d_std, 0.040)
        self.assertEqual(d_hd, 0.080)

    def test_budget_accounting_and_limits(self):
        self.calc.set_budget_limits(daily=2.00, lifetime=10.00)
        self.assertEqual(self.calc.get_daily_budget_limit(), 2.00)
        self.assertEqual(self.calc.get_lifetime_budget_limit(), 10.00)

        # Record transactions
        self.calc.record_transaction("TTS Audio", 0.50, {"tts_chars": 33333})
        self.assertAlmostEqual(self.calc.get_daily_spend(), 0.50, places=4)
        self.assertAlmostEqual(self.calc.get_lifetime_spend(), 0.50, places=4)

        # Status below warning
        st = self.calc.check_budget_status()
        self.assertFalse(st["is_daily_exceeded"])
        self.assertIsNone(st["warning"])

        # Push above 85% daily warning
        self.calc.record_transaction("DALL-E HD", 1.30)
        st2 = self.calc.check_budget_status()
        self.assertIsNotNone(st2["warning"])
        self.assertIn("Warning", st2["warning"])

        # Push past daily limit
        self.calc.record_transaction("Whisper", 0.50)
        st3 = self.calc.check_budget_status()
        self.assertTrue(st3["is_daily_exceeded"])
        self.assertIn("Exceeded", st3["warning"])

    def test_gateway_config(self):
        self.calc.set_gateway_config(
            enabled=True,
            url="https://gateway.internal/v1/chat/completions",
            key="mediamogul-key-xyz",
            billing_id="acct_99"
        )
        cfg = self.calc.get_gateway_config()
        self.assertTrue(cfg["enabled"])
        self.assertEqual(cfg["url"], "https://gateway.internal/v1/chat/completions")
        self.assertEqual(cfg["key"], "mediamogul-key-xyz")
        self.assertEqual(cfg["billing_account_id"], "acct_99")


class TestFingerprintTracker(unittest.TestCase):
    def test_three_tier_statuses(self):
        tracker = FingerprintTracker(settings_ref={"disable_ai_fingerprint_features": False})
        # Initial state is 100% Fingerprint-Free
        s0 = tracker.evaluate_status()
        self.assertEqual(s0["status"], STATUS_FREE)
        self.assertEqual(s0["badge_icon"], "🟢")

        # Add 1 human footage (60s)
        tracker.record_media_asset("camera_clip.mp4", is_ai_generated=False, duration_sec=60.0)
        # Add 1 DALL-E image asset (1 frame / 5s) -> transitions to Fingerprint-Parts
        tracker.record_media_asset("dalle_broll.png", is_ai_generated=True, duration_sec=5.0)
        s1 = tracker.evaluate_status()
        self.assertEqual(s1["status"], STATUS_PARTS)
        self.assertEqual(s1["badge_icon"], "🟡")

        # Add long synthetic voiceover (70s) so AI duration >= 50%
        tracker.record_media_asset("tts_narration.mp3", is_ai_generated=True, duration_sec=70.0)
        s2 = tracker.evaluate_status()
        self.assertEqual(s2["status"], STATUS_FULL)
        self.assertEqual(s2["badge_icon"], "🟣")

    def test_strict_fingerprint_free_mode(self):
        settings = {"disable_ai_fingerprint_features": True}
        tracker = FingerprintTracker(settings_ref=settings)

        # Deterministic video tools are allowed
        for tool in ["burn_subtitles", "audio_ducking", "normalize_loudness", "auto_roughcut", "convert_vertical"]:
            allowed, _ = tracker.check_tool_permission(tool)
            self.assertTrue(allowed, f"Tool {tool} should be allowed in strict mode")

        # Synthetic generative AI tools MUST be blocked
        for ai_tool in ["generate_broll", "generate_voiceover"]:
            allowed, reason = tracker.check_tool_permission(ai_tool)
            self.assertFalse(allowed, f"Tool {ai_tool} must be blocked in strict mode")
            self.assertIn("blocked", reason.lower())


class TestPreparedPlan(unittest.TestCase):
    def test_prepared_plan_generation(self):
        steps = [
            {"tool": "burn_subtitles", "params": {"duration": 90.0, "description": "Burn fancy animated subtitles"}},
            {"tool": "audio_ducking", "params": {"description": "Duck background music -18dB under voice"}}
        ]
        plan = PreparedPlan(
            goal="Subtitles & Ducking",
            steps=steps,
            auto_proceed=False,
            settings_ref={"disable_ai_fingerprint_features": False}
        )

        md = plan.to_markdown()
        self.assertIn("### 📋 Prepared Plan: Subtitles & Ducking", md)
        self.assertIn("Cost & Budget Analysis", md)
        self.assertIn("AI Fingerprint Assessment", md)
        self.assertIn("Proposed Execution Steps", md)
        self.assertIn("burn_subtitles", md)
        self.assertIn("audio_ducking", md)
        self.assertIn("User Review Required", md)
        self.assertEqual(plan.fingerprint_status, STATUS_FREE)

    def test_auto_proceed_plan(self):
        steps = [{"tool": "normalize_loudness", "params": {"target_lufs": -14.0}}]
        plan = PreparedPlan(
            goal="Normalize Audio",
            steps=steps,
            auto_proceed=True,
            settings_ref={}
        )
        md = plan.to_markdown()
        self.assertIn("Auto-Proceed", md)
        self.assertNotIn("User Review Required", md)


if __name__ == "__main__":
    unittest.main()
