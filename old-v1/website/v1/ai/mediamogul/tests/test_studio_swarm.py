# -*- coding: utf-8 -*-
"""
test_studio_swarm.py - Unit tests for the Actor-Critic Studio Swarm architecture.
"""

import os
import unittest
from pathlib import Path
from companion.core.studio_swarm import CritiqueScorecard, StudioSwarmOrchestrator

class TestStudioSwarm(unittest.TestCase):
    def test_critique_scorecard_computation(self):
        # 100 on everything -> 100 A+
        sc_perfect = CritiqueScorecard(100, 100, 100, 100, 100)
        self.assertEqual(sc_perfect.overall_score, 100.0)
        self.assertEqual(sc_perfect.overall_grade, "A+")

        # Baseline weights check:
        # framing: 80 * 0.25 = 20
        # lighting: 80 * 0.20 = 16
        # safe_zone: 80 * 0.15 = 12
        # audio: 80 * 0.20 = 16
        # pacing: 80 * 0.20 = 16
        # total = 80.0 -> Grade B
        sc_80 = CritiqueScorecard(80, 80, 80, 80, 80)
        self.assertEqual(sc_80.overall_score, 80.0)
        self.assertEqual(sc_80.overall_grade, "B")

        # Clamp check
        sc_overflow = CritiqueScorecard(150, -20, 95, 90, 85)
        self.assertEqual(sc_overflow.framing_score, 100)
        self.assertEqual(sc_overflow.lighting_score, 0)
        
        d = sc_perfect.to_dict()
        self.assertIn("overall_score", d)
        self.assertIn("overall_grade", d)
        self.assertIn("scores", d)

    def test_studio_swarm_debate_logging(self):
        orchestrator = StudioSwarmOrchestrator()
        orchestrator.log_debate("DirectorAgent", "🎬", "Director", "Structuring the sequence")
        orchestrator.log_debate("CriticAgent", "👁️", "Critic", "Frame analysis complete")

        self.assertEqual(len(orchestrator.debate_transcript), 2)
        self.assertEqual(orchestrator.debate_transcript[0]["agent"], "DirectorAgent")
        self.assertEqual(orchestrator.debate_transcript[1]["agent"], "CriticAgent")

    def test_evaluate_commercial_mock(self):
        orchestrator = StudioSwarmOrchestrator()
        # Test default candidate evaluation logic
        sc_initial, _ = orchestrator._evaluate_commercial("dummy.mp4", "dummy_dir", is_polished=False)
        self.assertTrue(len(sc_initial.actionable_fixes) > 0)
        self.assertTrue(sc_initial.overall_score < 95)

        # Test polished evaluation logic
        sc_polished, _ = orchestrator._evaluate_commercial("dummy.mp4", "dummy_dir", is_polished=True)
        self.assertEqual(len(sc_polished.actionable_fixes), 0)
        self.assertTrue(sc_polished.overall_score >= 90)

if __name__ == "__main__":
    unittest.main()
