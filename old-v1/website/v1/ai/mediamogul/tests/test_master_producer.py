import os
import sys
import unittest
import tempfile
import xml.etree.ElementTree as ET

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
companion_dir = os.path.join(root_dir, 'companion')
if companion_dir not in sys.path:
    sys.path.insert(0, companion_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from companion.core.ffmpeg_utils import find_ffmpeg, find_melt
from companion.tools.master_producer import build_well_produced_commercial
from companion.tools.auto_director_tools import tool_auto_produce_video


class TestMasterProducer(unittest.TestCase):
    def setUp(self):
        self.media_dir = r'C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001'
        self.temp_dir = tempfile.mkdtemp(prefix='test_master_prod_')
        self.ffmpeg = find_ffmpeg()
        self.melt = find_melt()

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except Exception:
                pass

    def test_01_media_assets_and_broll_exist(self):
        self.assertTrue(os.path.exists(self.media_dir), f'Media folder {self.media_dir} missing')
        expected_takes = ['IMG_0147.MOV', 'IMG_0150.MOV', 'IMG_0157.MOV', 'IMG_0169.MOV', 'IMG_0174.MOV']
        for take in expected_takes:
            take_path = os.path.join(self.media_dir, take)
            self.assertTrue(os.path.exists(take_path), f'Take {take} missing from test folder')

        broll_dir = os.path.join(root_dir, 'broll')
        self.assertTrue(os.path.exists(os.path.join(broll_dir, 'Pexels_Stock_2278095.mp4')))
        self.assertTrue(os.path.exists(os.path.join(broll_dir, 'Pexels_Stock_3969423.mp4')))
        self.assertTrue(os.path.exists(os.path.join(broll_dir, 'ambient_tech_groove_mastered.mp3')))
        self.assertTrue(os.path.exists(os.path.join(broll_dir, 'graphics', 'lt_renisa.png')))
        self.assertTrue(os.path.exists(os.path.join(broll_dir, 'graphics', 'lt_cta.png')))

    def test_02_build_well_produced_commercial_mlt_structure(self):
        out_mlt = os.path.join(self.temp_dir, 'Test_Master.mlt')
        out_mp4 = os.path.join(self.temp_dir, 'Test_Master.mp4')
        res = build_well_produced_commercial(
            media_dir=self.media_dir,
            output_mlt=out_mlt,
            output_mp4=out_mp4,
            open_in_shotcut=False
        )
        self.assertEqual(res['status'], 'success')
        self.assertTrue(os.path.exists(out_mlt))
        self.assertGreaterEqual(res['timeline_duration_sec'], 55.0)

        tree = ET.parse(out_mlt)
        root = tree.getroot()
        self.assertEqual(root.tag, 'mlt')

        tractor = root.find(".//tractor[@id='tractor_master']")
        self.assertIsNotNone(tractor, "tractor_master not found")
        tracks = tractor.findall(".//multitrack/track")
        self.assertGreaterEqual(len(tracks), 2, "Expected at least V1 and V2 tracks")

        tr_comp = tractor.find(".//transition[@id='tr_composite']")
        self.assertIsNotNone(tr_comp, "Composite transition tr_composite not found")
        service_prop = tr_comp.find("./property[@name='mlt_service']")
        self.assertIsNotNone(service_prop)
        self.assertEqual(service_prop.text, "qtblend")

        tr_mix = tractor.find(".//transition[@id='tr_audio_mix']")
        self.assertIsNotNone(tr_mix, "Audio mix transition tr_audio_mix not found")

        pl_v1 = root.find(".//playlist[@id='playlist_v1']")
        pl_v2 = root.find(".//playlist[@id='playlist_v2']")
        self.assertIsNotNone(pl_v1)
        self.assertIsNotNone(pl_v2)
        self.assertEqual(len(pl_v1.findall("./entry")), 5)

    def test_03_tool_auto_produce_video_delegates_to_master(self):
        out_mlt = os.path.join(self.temp_dir, "Auto_Timeline.mlt")
        out_mp4 = os.path.join(self.temp_dir, "Auto_Master.mp4")
        res = tool_auto_produce_video(
            ffmpeg=self.ffmpeg,
            folder_path=self.media_dir,
            output_video_path=out_mp4,
            output_mlt_path=out_mlt,
            open_in_shotcut=False
        )
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["mode"], "master_commercial")
        self.assertIn("Fingerprint-Free", res["fingerprint_status"])
        self.assertTrue(os.path.exists(out_mlt))


if __name__ == '__main__':
    unittest.main()
