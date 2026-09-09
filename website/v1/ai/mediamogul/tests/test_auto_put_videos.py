"""
test_auto_put_videos.py - Automated test suite verifying automatic test video ingestion
from C:\\Users\\ventu\\Videos\\drive-download-20260906T004623Z-1-001 into MediaMogul and Shotcut MLT.
"""

import os
import sys
import unittest
import tempfile
import xml.etree.ElementTree as ET

# Ensure companion is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
companion_dir = os.path.join(root_dir, "companion")
if companion_dir not in sys.path:
    sys.path.insert(0, companion_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from companion.core.ffmpeg_utils import find_ffmpeg
from companion.core.media_tracker import MediaLibraryTracker
from companion.core.agent_engine import execute_video_tool
from companion.tools.mlt_tools import tool_import_media_folder, tool_add_to_timeline, parse_mlt_project


class TestAutoPutVideos(unittest.TestCase):
    def setUp(self):
        self.test_dir = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
        self.ffmpeg = find_ffmpeg()
        self.temp_dir = tempfile.mkdtemp(prefix="mediamogul_test_")

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except Exception:
                pass

    def test_01_test_directory_exists_and_contains_media(self):
        """Verify that the test media directory exists and contains expected files."""
        self.assertTrue(os.path.exists(self.test_dir), f"Test folder not found: {self.test_dir}")
        files = os.listdir(self.test_dir)
        mov_files = [f for f in files if f.lower().endswith(".mov")]
        m4a_files = [f for f in files if f.lower().endswith(".m4a")]

        self.assertGreaterEqual(len(mov_files), 7, f"Expected 7 MOV files, found {len(mov_files)}")
        self.assertGreaterEqual(len(m4a_files), 4, f"Expected 4 M4A files, found {len(m4a_files)}")

    def test_02_tool_import_media_folder_creates_mlt(self):
        """Verify that tool_import_media_folder sequences all videos and audios into a valid MLT project."""
        out_mlt = os.path.join(self.temp_dir, "test_imported_timeline.mlt")
        res = tool_import_media_folder(self.ffmpeg, self.test_dir, output_path=out_mlt, open_in_shotcut=False)

        self.assertTrue(os.path.exists(out_mlt), f"Generated MLT does not exist: {out_mlt}")
        self.assertGreaterEqual(len(res["video_clips"]), 7, "At least 7 video clips must be imported")
        self.assertEqual(len(res["audio_clips"]), 4, "All 4 audio voiceovers must be imported")
        self.assertGreater(res["total_video_duration_sec"], 90.0, "Total video duration should exceed 90 seconds")

        # Verify natural sorting order: IMG_0147, IMG_0150, IMG_0157, etc.
        video_names = [c["filename"] for c in res["video_clips"]]
        expected_subset = [
            "IMG_0147.MOV", "IMG_0150.MOV", "IMG_0157.MOV", "IMG_0158.MOV",
            "IMG_0169.MOV", "IMG_0171.MOV", "IMG_0174.MOV"
        ]
        for v in expected_subset:
            self.assertIn(v, video_names)

    def test_03_mlt_xml_structure_validation(self):
        """Verify the generated XML contains valid producers, multitrack, and playlists."""
        out_mlt = os.path.join(self.temp_dir, "test_structure.mlt")
        tool_import_media_folder(self.ffmpeg, self.test_dir, output_path=out_mlt, open_in_shotcut=False)

        tree = ET.parse(out_mlt)
        root = tree.getroot()

        self.assertEqual(root.tag, "mlt")
        producers = root.findall(".//producer")
        self.assertGreaterEqual(len(producers), 11, "Should have at least 11 producers")

        playlists = root.findall(".//playlist")
        pl_ids = [p.attrib.get("id") for p in playlists]
        self.assertIn("playlist_v1", pl_ids)
        self.assertIn("playlist_a1", pl_ids)

        # Verify tractor multitrack
        tractor = root.find(".//tractor")
        self.assertIsNotNone(tractor)
        tracks = tractor.findall(".//multitrack/track")
        self.assertEqual(len(tracks), 2, "Should have 2 tracks (V1 and A1)")

    def test_04_parse_mlt_project_compatibility(self):
        """Verify parse_mlt_project can read back the generated project accurately."""
        out_mlt = os.path.join(self.temp_dir, "test_parse.mlt")
        tool_import_media_folder(self.ffmpeg, self.test_dir, output_path=out_mlt, open_in_shotcut=False)

        info = parse_mlt_project(out_mlt)
        self.assertGreaterEqual(info["producers_count"], 11)
        self.assertGreaterEqual(len(info["producers"]), 11)

    def test_05_execute_video_tool_agent_integration(self):
        """Verify the AI agent engine executes import_media_folder and tracks all assets in MediaLibraryTracker."""
        tracker = MediaLibraryTracker()
        out_mlt = os.path.join(self.temp_dir, "test_agent_import.mlt")

        result_msg = execute_video_tool(
            "import_media_folder",
            {"folder_path": self.test_dir, "output_path": out_mlt, "open_in_shotcut": False},
            ffmpeg=self.ffmpeg,
            media_tracker=tracker
        )

        self.assertIn("Imported", result_msg)
        self.assertIn("video clips", result_msg)
        self.assertTrue(os.path.exists(out_mlt))

        # Check media library tracker tracked the 7 videos + 4 audios + output MLT
        tracked = tracker.get_all_tracked()
        tracked_filenames = [t["filename"] for t in tracked]
        self.assertIn("IMG_0147.MOV", tracked_filenames)
        self.assertIn("IMG_0174.MOV", tracked_filenames)
        self.assertIn("Video Voiceover(1).m4a", tracked_filenames)
        self.assertIn("test_agent_import.mlt", tracked_filenames)
        self.assertGreaterEqual(len(tracked), 12)

    def test_06_add_to_timeline_directory_dispatch(self):
        """Verify tool_add_to_timeline seamlessly delegates directory paths to tool_import_media_folder."""
        out_mlt = os.path.join(self.temp_dir, "test_dispatch.mlt")
        res_path = tool_add_to_timeline(self.ffmpeg, self.test_dir, output_path=out_mlt, open_in_shotcut=False)
        self.assertEqual(res_path, out_mlt)
        self.assertTrue(os.path.exists(out_mlt))

    def test_07_contained_shotcut_detection(self):
        """Verify that find_shotcut_exe and find_melt find the contained Shotcut binaries in /v2/MediaMogul/shotcut/."""
        from companion.core.ffmpeg_utils import find_shotcut_exe, find_melt, get_contained_shotcut_dir
        contained = get_contained_shotcut_dir()
        self.assertIsNotNone(contained, "Contained Shotcut directory should exist")
        self.assertTrue(os.path.isdir(contained), f"Contained path must be a directory: {contained}")

        sc_exe = find_shotcut_exe()
        melt_exe = find_melt()
        self.assertIsNotNone(sc_exe, "Shotcut executable must be found")
        self.assertIsNotNone(melt_exe, "Melt executable must be found")
        self.assertTrue(os.path.isfile(sc_exe), f"Shotcut binary must exist: {sc_exe}")
        self.assertTrue(os.path.isfile(melt_exe), f"Melt binary must exist: {melt_exe}")

        # Contained directory should be prioritized
        self.assertTrue("shotcut" in sc_exe.lower())
        self.assertTrue("melt" in melt_exe.lower())

    def test_08_auto_produce_video_with_shotcut(self):
        """Verify tool_auto_produce_video builds a complete Shotcut MLT timeline and renders it."""
        from companion.tools.auto_director_tools import tool_auto_produce_video
        out_mlt = os.path.join(self.temp_dir, "test_auto_prod.mlt")
        out_mp4 = os.path.join(self.temp_dir, "test_auto_prod.mp4")

        res = tool_auto_produce_video(
            ffmpeg=self.ffmpeg,
            folder_path=self.test_dir,
            output_video_path=out_mp4,
            output_mlt_path=out_mlt,
            normalize_audio=True,
            render_with_shotcut=True,
            open_in_shotcut=False,
            target_mode="narrated_cut"
        )

        self.assertEqual(res["status"], "success")
        self.assertTrue(os.path.exists(out_mlt), f"MLT not found: {out_mlt}")
        self.assertTrue(os.path.exists(out_mp4), f"Rendered MP4 not found: {out_mp4}")
        self.assertGreater(os.path.getsize(out_mp4), 1000000, "Rendered video must exceed 1 MB")
        self.assertGreaterEqual(res["timeline_duration_sec"], 20.0, "Timeline duration should match narration (~28s)")
        self.assertIn("Fingerprint-Free", res["fingerprint_status"])

    def test_09_fingerprint_free_guarantee(self):
        """Verify the fingerprint tracker strictly confirms 100% Fingerprint-Free status."""
        from companion.core.fingerprint_tracker import get_fingerprint_tracker, STATUS_FREE
        fp = get_fingerprint_tracker()
        fp.reset()

        # Ingest authentic camera files and human audio
        files = os.listdir(self.test_dir)
        for f in files:
            fp.record_media_asset(os.path.join(self.test_dir, f), is_ai_generated=False, duration_sec=5.0)

        ev = fp.evaluate_status()
        self.assertEqual(ev["status"], STATUS_FREE)
        self.assertEqual(ev["ai_assets_count"], 0)
        self.assertIn("100% Authentic", ev["description"])

    def test_10_agent_auto_produce_dispatch(self):
        """Verify the agent engine dispatches 'auto_produce_video' seamlessly."""
        tracker = MediaLibraryTracker()
        out_mlt = os.path.join(self.temp_dir, "test_agent_autoprod.mlt")

        msg = execute_video_tool(
            "auto_produce_video",
            {
                "folder_path": self.test_dir,
                "output_mlt_path": out_mlt,
                "render_with_shotcut": False,
                "open_in_shotcut": False,
                "target_mode": "narrated_cut"
            },
            ffmpeg=self.ffmpeg,
            media_tracker=tracker
        )

        self.assertIn("Autonomous Video Production Completed Successfully", msg)
        self.assertTrue(os.path.exists(out_mlt))
        self.assertIn("test_agent_autoprod.mlt", [t["filename"] for t in tracker.get_all_tracked()])


if __name__ == "__main__":
    unittest.main()
