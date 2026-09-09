# -*- coding: utf-8 -*-
"""
test_fully_agentic.py - Comprehensive Unit Tests for Fully Autonomous Video Agent,
Local Intent Parser, Quality Gates, and Offline Commander Swarm.
"""

import os
import sys
import unittest
import tempfile
from pathlib import Path
from PIL import Image

# Ensure companion and root are in sys.path
root_dir = Path(__file__).resolve().parent.parent
companion_dir = root_dir / "companion"
for p in [str(root_dir), str(companion_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from companion.core.autonomous_agent import AutonomousVideoAgent, LocalIntentParser, GoalStage
from companion.core.commander import MediaMogulCommander
from companion.core.agent_daemon import AgentDaemon


class TestFullyAgentic(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="agentic_test_")
        self.test_media_folder = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except Exception:
                pass

    def test_01_local_intent_parser_production_goals(self):
        """Verify LocalIntentParser parses various natural language goals into auto_produce_video."""
        test_prompts = [
            "make the video editor with Shotcut able to fully automate videos with shotcut",
            "make it fully agentic",
            "auto edit the test video set",
            "produce video from camera takes with zero ai fingerprints"
        ]
        for p in test_prompts:
            parsed = LocalIntentParser.parse_intent(p, session_context={"media_folder": self.test_media_folder})
            self.assertEqual(parsed.get("tool"), "auto_produce_video", f"Failed on prompt: {p}")
            self.assertIn("folder_path", parsed.get("parameters", {}))
            self.assertTrue(parsed.get("parameters", {}).get("normalize_audio"))
            self.assertTrue(parsed.get("parameters", {}).get("render_with_shotcut"))
            self.assertGreaterEqual(parsed.get("confidence", 0), 0.7)

    def test_02_local_intent_parser_specialized_tools(self):
        """Verify LocalIntentParser accurately maps subtitles, audio, and vision tools."""
        p_sub = "transcribe subtitles and captions from speech"
        res_sub = LocalIntentParser.parse_intent(p_sub)
        self.assertEqual(res_sub.get("tool"), "generate_subtitles")

        p_lufs = "normalize loudness to -14 LUFS broadcast standard"
        res_lufs = LocalIntentParser.parse_intent(p_lufs)
        self.assertEqual(res_lufs.get("tool"), "normalize_loudness")
        self.assertEqual(res_lufs.get("parameters", {}).get("target_lufs"), -14.0)

        p_vis = "critique frame composition and inspect rule of thirds safe zone"
        res_vis = LocalIntentParser.parse_intent(p_vis)
        self.assertEqual(res_vis.get("tool"), "analyze_frame")

    def test_03_commander_local_swarm_offline(self):
        """Verify MediaMogulCommander runs local multi-agent swarm when api_key is empty."""
        commander = MediaMogulCommander(api_key="")
        status_logs = []
        res = commander.orchestrate(
            "Auto produce video from camera footage with Shotcut",
            status_callback=lambda m: status_logs.append(m)
        )

        self.assertIn("synthesis", res)
        self.assertIn("sub_agent_reports", res)
        reports = res["sub_agent_reports"]

        expected_agents = ["ScriptAgent", "TimelineAgent", "StylistAgent", "AudioAgent", "ReviewerAgent"]
        for ag in expected_agents:
            self.assertIn(ag, reports, f"Missing sub-agent report for {ag}")
            self.assertGreater(len(reports[ag]), 20, f"Report for {ag} is too short")

        tool_call = res.get("suggested_tool")
        self.assertIsNotNone(tool_call, "Suggested tool must not be None")
        self.assertEqual(tool_call.get("tool"), "auto_produce_video")
        self.assertIn("parameters", tool_call)

    def test_04_quality_gate_frame_audit(self):
        """Verify Vision Quality Gate detects normal, black, and flat frames."""
        agent = AutonomousVideoAgent()

        # 1. Normal color frame (gradient)
        normal_path = os.path.join(self.temp_dir, "normal_frame.jpg")
        im_normal = Image.new("RGB", (640, 360), color=(128, 140, 150))
        # Add some variation so it's not flat
        for x in range(0, 320):
            for y in range(0, 180):
                im_normal.putpixel((x, y), (200, 210, 220))
        im_normal.save(normal_path, "JPEG")

        res_norm = agent.audit_frame_quality(normal_path)
        self.assertTrue(res_norm["passed"], f"Normal frame should pass: {res_norm}")
        self.assertEqual(res_norm["defect"], "None")
        self.assertEqual(res_norm["resolution"], "640x360")

        # 2. Black frame defect
        black_path = os.path.join(self.temp_dir, "black_frame.jpg")
        im_black = Image.new("RGB", (640, 360), color=(0, 0, 0))
        im_black.save(black_path, "JPEG")

        res_black = agent.audit_frame_quality(black_path)
        self.assertFalse(res_black["passed"], "Black frame must fail quality gate")
        self.assertIn("Black", res_black["defect"])

        # 3. Flat / uniform frame defect
        flat_path = os.path.join(self.temp_dir, "flat_frame.jpg")
        im_flat = Image.new("RGB", (640, 360), color=(100, 100, 100))
        im_flat.save(flat_path, "JPEG")

        res_flat = agent.audit_frame_quality(flat_path)
        self.assertFalse(res_flat["passed"], "Uniform flat frame must fail quality gate")
        self.assertIn("Flat", res_flat["defect"])

    def test_05_autonomous_agent_pipeline_construction(self):
        """Verify AutonomousVideoAgent creates all 6 stages."""
        agent = AutonomousVideoAgent()
        stages = agent.build_goal_pipeline("Automate video edit", self.test_media_folder)

        self.assertEqual(len(stages), 6, "Expected 6 stages in autonomous pipeline")
        stage_names = [s.name for s in stages]
        self.assertIn("Ingest and Authenticity", stage_names)
        self.assertIn("Audio Mastering", stage_names)
        self.assertIn("Timeline Assembly", stage_names)
        self.assertIn("Shotcut Headless Render", stage_names)
        self.assertIn("Vision Quality Gate", stage_names)
        self.assertIn("Shotcut Workspace Integration", stage_names)

        for st in stages:
            self.assertEqual(st.status, "PENDING")
            self.assertEqual(st.duration_sec, 0.0)

    def test_06_agent_daemon_instantiation(self):
        """Verify AgentDaemon initializes and parses goal folders."""
        daemon = AgentDaemon(
            watch_folder=self.test_media_folder,
            poll_interval=2.0,
            open_in_shotcut=False
        )
        self.assertEqual(daemon.watch_folder, self.test_media_folder)
        self.assertEqual(daemon.poll_interval, 2.0)
        self.assertFalse(daemon.open_in_shotcut)
        self.assertFalse(daemon.is_running)

    def test_07_one_click_produce_video_dispatch(self):
        """Verify one_click_video.produce_one_click_video produces a valid master video."""
        from one_click_video import produce_one_click_video
        res = produce_one_click_video(folder_path=self.test_media_folder)
        self.assertEqual(res.get("status"), "SUCCESS")
        self.assertIsNotNone(res.get("output_video"))
        self.assertTrue(os.path.exists(res.get("output_video")))
        self.assertIsNotNone(res.get("output_mlt"))
        self.assertTrue(os.path.exists(res.get("output_mlt")))
        self.assertEqual(len(res.get("stages", [])), 6)


if __name__ == "__main__":
    unittest.main()
