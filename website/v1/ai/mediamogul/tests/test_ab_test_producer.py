import os
import unittest
import tempfile
import shutil
import json
import re

from companion.tools.ab_test_producer import generate_ab_test_id, produce_ab_test_suite

class TestABTestProducer(unittest.TestCase):
    def test_generate_ab_test_id_format(self):
        # Must be 8 characters uppercase alphanumeric, no ambiguous chars
        id1 = generate_ab_test_id()
        self.assertEqual(len(id1), 8)
        self.assertTrue(re.match(r'^[2-9A-Z]{8}$', id1), f"ID '{id1}' does not match expected format")
        # Ensure forbidden chars not in ID
        for bad_char in ['0', 'O', '1', 'I', 'L']:
            self.assertNotIn(bad_char, id1)

    def test_generate_ab_test_id_uniqueness(self):
        # Generate 1000 IDs and verify zero collisions
        ids = {generate_ab_test_id() for _ in range(1000)}
        self.assertEqual(len(ids), 1000)

    def test_produce_ab_test_suite_dry(self):
        # Create temp dir with dummy video files
        temp_dir = tempfile.mkdtemp()
        try:
            sample_file1 = os.path.join(temp_dir, "clip1.mp4")
            sample_file2 = os.path.join(temp_dir, "clip2.mp4")
            with open(sample_file1, "wb") as f:
                f.write(b"dummy video data 1")
            with open(sample_file2, "wb") as f:
                f.write(b"dummy video data 2")

            out_dir = os.path.join(temp_dir, "output_suite")
            result = produce_ab_test_suite(
                media_folder=temp_dir,
                output_dir=out_dir,
                variant_count=3,
                render_videos=False,
                open_in_shotcut=False
            )

            self.assertIn("suite_id", result)
            self.assertEqual(len(result["suite_id"]), 8)
            self.assertIn("variants", result)
            self.assertEqual(len(result["variants"]), 3)

            variant_ids = set()
            for v in result["variants"]:
                vid = v["variant_id"]
                self.assertEqual(len(vid), 8)
                self.assertTrue(re.match(r'^[2-9A-Z]{8}$', vid))
                self.assertNotIn(vid, variant_ids)
                variant_ids.add(vid)

                # MLT file should exist
                self.assertTrue(os.path.exists(v["mlt_path"]))
                with open(v["mlt_path"], "r", encoding="utf-8") as mf:
                    mlt_content = mf.read()
                    self.assertIn("<mlt", mlt_content)
                    self.assertIn("profile", mlt_content)

            # Check manifest JSON
            manifest_path = os.path.join(out_dir, f"ab_test_manifest_{result['suite_id']}.json")
            self.assertTrue(os.path.exists(manifest_path))
            with open(manifest_path, "r", encoding="utf-8") as mf:
                manifest_data = json.load(mf)
                self.assertEqual(manifest_data["suite_id"], result["suite_id"])
                self.assertEqual(len(manifest_data["variants"]), 3)

            # Check report MD
            report_path = os.path.join(out_dir, f"ab_test_report_{result['suite_id']}.md")
            self.assertTrue(os.path.exists(report_path))
            with open(report_path, "r", encoding="utf-8") as rf:
                report_content = rf.read()
                self.assertIn("MediaMogul A/B Testing Audience Suite Report", report_content)
                for v in result["variants"]:
                    self.assertIn(v["variant_id"], report_content)

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    unittest.main()
