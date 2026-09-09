# -*- coding: utf-8 -*-
"""
test_mlt_interchange.py - Unit Tests for Shotcut MLT Project XML Interchange,
SRT Subtitle parsing, and Collaboration Manifest Validation.
"""

import os
import sys
import json
import zipfile
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

# Setup sys.path
_test_dir = Path(__file__).resolve().parent
_root_dir = _test_dir.parent
_companion_dir = _root_dir / "companion"
for p in [str(_root_dir), str(_companion_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from companion.tools.mlt_tools import parse_mlt_project, tool_evaluate_timeline
from companion.core.media_tracker import MediaLibraryTracker
from companion.core.studio_swarm import CritiqueScorecard, StudioSwarmOrchestrator


class TestMltInterchange(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_mlt_interchange_")

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except Exception:
                pass

    def test_01_mlt_xml_schema_validity(self):
        """Verify standard Shotcut MLT XML structure with profile, producers, playlists, and tractor."""
        mlt_xml = """<?xml version="1.0" encoding="utf-8"?>
<mlt LC_NUMERIC="C" version="7.15.0" title="MediaMogul_Interchange_Test">
  <profile description="HD 1920x1080 30 fps" width="1920" height="1080" progressive="1" sample_aspect_num="1" sample_aspect_den="1" display_aspect_num="16" display_aspect_den="9" frame_rate_num="30" frame_rate_den="1" />
  <producer id="producer_v1_0" in="0" out="149">
    <property name="length">150</property>
    <property name="mlt_service">avformat</property>
    <property name="resource">C:/Videos/Interview_Take1.mp4</property>
  </producer>
  <producer id="producer_v1_1" in="0" out="299">
    <property name="length">300</property>
    <property name="mlt_service">avformat</property>
    <property name="resource">C:/Videos/Interview_Take2.mp4</property>
  </producer>
  <playlist id="playlist_v1">
    <entry producer="producer_v1_0" in="0" out="149" />
    <blank length="30" />
    <entry producer="producer_v1_1" in="0" out="299" />
  </playlist>
  <tractor id="tractor_master" title="MediaMogul Master Output">
    <multitrack>
      <track producer="playlist_v1" />
    </multitrack>
    <transition id="tr_composite_0">
      <property name="a_track">0</property>
      <property name="b_track">1</property>
      <property name="mlt_service">qtblend</property>
      <property name="always_active">1</property>
    </transition>
  </tractor>
</mlt>
"""
        mlt_file = os.path.join(self.temp_dir, "project.mlt")
        with open(mlt_file, "w", encoding="utf-8") as f:
            f.write(mlt_xml)

        parsed = parse_mlt_project(mlt_file)
        self.assertEqual(parsed["title"], "MediaMogul_Interchange_Test")
        self.assertEqual(parsed["producers_count"], 2)
        self.assertEqual(parsed["tracks_count"], 1)
        self.assertEqual(parsed["transitions_count"], 1)

        tree = ET.parse(mlt_file)
        profile = tree.find(".//profile")
        self.assertIsNotNone(profile)
        self.assertEqual(profile.attrib.get("width"), "1920")
        self.assertEqual(profile.attrib.get("height"), "1080")

    def test_02_collab_pack_archive_verification(self):
        """Verify lightweight collaboration ZIP structure matches MediaMogul spec."""
        tracker = MediaLibraryTracker()
        sample_video = os.path.join(self.temp_dir, "A-Roll_Interview.mp4")
        with open(sample_video, "wb") as f:
            f.write(b"\x00" * 1024) # 1 KB stub

        sample_srt = os.path.join(self.temp_dir, "captions.srt")
        with open(sample_srt, "w", encoding="utf-8") as f:
            f.write("1\n00:00:00,000 --> 00:00:03,000\nHello and welcome to MediaMogul.\n")

        tracker.track_file(sample_video, role="a_roll")
        tracker.track_file(sample_srt, role="subtitles")
        tracker.record_action("Editor", "Added title and burned captions", {"frame": 0})

        out_zip = os.path.join(self.temp_dir, "Test_CollabPack.zip")
        tracker.export_lightweight_pack(out_zip, project_files=[sample_srt])

        self.assertTrue(os.path.exists(out_zip))
        with zipfile.ZipFile(out_zip, "r") as zf:
            namelist = zf.namelist()
            self.assertIn("media_manifest.json", namelist)
            self.assertIn("session_action_history.json", namelist)
            self.assertIn("README_COLLAB.txt", namelist)

            manifest_raw = zf.read("media_manifest.json").decode("utf-8")
            manifest = json.loads(manifest_raw)
            self.assertIn("media_files", manifest)
            self.assertEqual(manifest["heavy_media_count"], 1)

    def test_03_actor_critic_swarm_scorecard_and_directives(self):
        """Verify Actor-Critic Swarm grading calculations and actionable directive generation."""
        orchestrator = StudioSwarmOrchestrator()
        scorecard = CritiqueScorecard(
            framing_score=92,
            lighting_score=88,
            safe_zone_score=96,
            audio_score=94,
            pacing_score=90,
            actionable_fixes=["Calibrate saturation to 1.15", "Apply -14 LUFS loudness filter"]
        )

        self.assertGreaterEqual(scorecard.overall_score, 90.0)
        self.assertIn(scorecard.overall_grade, ["A", "A+"])
        self.assertEqual(len(scorecard.actionable_fixes), 2)

        data = scorecard.to_dict()
        self.assertIn("scores", data)
        self.assertEqual(data["scores"]["title_safe_clearance"], 96)


if __name__ == "__main__":
    unittest.main()
