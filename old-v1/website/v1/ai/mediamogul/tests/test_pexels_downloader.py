"""
Unit tests for Pexels stock video downloader and .env environment loader.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Setup paths
_test_dir = Path(__file__).resolve().parent
_v2_dir = _test_dir.parent
if str(_v2_dir) not in sys.path:
    sys.path.insert(0, str(_v2_dir))

from companion.core.env_utils import parse_env_file, load_dotenv, find_env_file
from companion.tools.pexels_tools import (
    extract_pexels_video_id,
    search_pexels_videos,
    download_pexels_video,
    tool_download_pexels_video
)
from companion.core.fingerprint_tracker import FINGERPRINT_FREE_TOOLS, get_fingerprint_tracker


class TestEnvLoader(unittest.TestCase):
    """Test suite for zero-dependency .env loader."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.env_file = Path(self.temp_dir.name) / ".env"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_parse_env_file_basic(self):
        content = """
        # Comment line
        PEXELS_API_KEY=test_pexels_12345
        OPENAI_API_KEY="test_openai_secret_67890"
        SINGLE_QUOTED='single_value'
        SPACED_VALUE = value_with_spaces # inline comment
        export EXPORTED_VAR=exported_val
        EMPTY_VAR=
        """
        self.env_file.write_text(content, encoding="utf-8")
        parsed = parse_env_file(self.env_file)

        self.assertEqual(parsed.get("PEXELS_API_KEY"), "test_pexels_12345")
        self.assertEqual(parsed.get("OPENAI_API_KEY"), "test_openai_secret_67890")
        self.assertEqual(parsed.get("SINGLE_QUOTED"), "single_value")
        self.assertEqual(parsed.get("SPACED_VALUE"), "value_with_spaces")
        self.assertEqual(parsed.get("EXPORTED_VAR"), "exported_val")
        self.assertEqual(parsed.get("EMPTY_VAR"), "")

    def test_load_dotenv_injection(self):
        content = "TEST_SPECIAL_ENV_VAR_XYZ=hello_world_123\n"
        self.env_file.write_text(content, encoding="utf-8")

        # Ensure not set prior
        if "TEST_SPECIAL_ENV_VAR_XYZ" in os.environ:
            del os.environ["TEST_SPECIAL_ENV_VAR_XYZ"]

        loaded = load_dotenv(self.env_file)
        self.assertIn("TEST_SPECIAL_ENV_VAR_XYZ", loaded)
        self.assertEqual(os.environ.get("TEST_SPECIAL_ENV_VAR_XYZ"), "hello_world_123")

        # Cleanup
        del os.environ["TEST_SPECIAL_ENV_VAR_XYZ"]


class TestPexelsDownloader(unittest.TestCase):
    """Test suite for Pexels stock video downloader & agent tools."""

    def test_extract_pexels_video_id(self):
        # Numeric ID
        self.assertEqual(extract_pexels_video_id("854400"), 854400)
        self.assertEqual(extract_pexels_video_id(854400), 854400)

        # Standard web URL
        url1 = "https://www.pexels.com/video/drone-footage-of-waves-crashing-854400/"
        self.assertEqual(extract_pexels_video_id(url1), 854400)

        # Download URL
        url2 = "https://www.pexels.com/download/video/3195394/"
        self.assertEqual(extract_pexels_video_id(url2), 3195394)

        # API link
        url3 = "https://player.vimeo.com/external/854400.hd.mp4?s=123"
        self.assertEqual(extract_pexels_video_id(url3), 854400)

        # Non-ID query
        self.assertIsNone(extract_pexels_video_id("nature mountains cinematic"))
        self.assertIsNone(extract_pexels_video_id(""))

    def test_fingerprint_policy_compliance(self):
        """Verify Pexels tool is recognized as 100% Fingerprint-Free."""
        self.assertIn("download_pexels_video", FINGERPRINT_FREE_TOOLS)
        self.assertIn("pexels_video", FINGERPRINT_FREE_TOOLS)

        fp_tracker = get_fingerprint_tracker({"disable_ai_fingerprint_features": True})
        # Fingerprint-free should allow downloading Pexels stock footage
        allowed, _ = fp_tracker.check_tool_permission("download_pexels_video")
        self.assertTrue(allowed)

    @patch("companion.tools.pexels_tools.urllib.request.urlopen")
    def test_search_pexels_videos_mock(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = b"""{
            "videos": [
                {
                    "id": 854400,
                    "width": 1920,
                    "height": 1080,
                    "duration": 18,
                    "url": "https://www.pexels.com/video/waves-crashing-854400/",
                    "user": {"name": "Aerial Cinematics"},
                    "video_files": [
                        {"id": 1, "width": 1920, "height": 1080, "file_type": "video/mp4", "link": "https://video.mp4"}
                    ]
                }
            ]
        }"""
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        results = search_pexels_videos("waves", api_key="fake_key", per_page=1, orientation="landscape")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], 854400)
        self.assertEqual(results[0]["resolution"], "1920x1080")
        self.assertEqual(results[0]["aspect_ratio"], "16:9")
        self.assertEqual(results[0]["photographer"], "Aerial Cinematics")

    @patch("companion.tools.pexels_tools.download_pexels_video")
    def test_tool_download_pexels_video_wrapper(self, mock_download):
        mock_download.return_value = {
            "status": "SUCCESS",
            "video_id": 854400,
            "file_path": "C:\\videos\\pexels_854400_1080p.mp4",
            "size_mb": 25.4,
            "size_bytes": 26633830,
            "duration_sec": 18.0,
            "width": 1920,
            "height": 1080,
            "resolution": "1920x1080",
            "aspect_ratio": "16:9",
            "fingerprint_status": "🟢 Fingerprint-Free (Authentic Camera Footage)"
        }

        tracker = MagicMock()
        res = tool_download_pexels_video("854400", media_tracker=tracker)
        self.assertIn("Pexels Stock Video Downloaded Successfully", res)
        self.assertIn("pexels_854400_1080p.mp4", res)
        self.assertIn("🟢 Fingerprint-Free", res)
        tracker.track_file.assert_called_with("C:\\videos\\pexels_854400_1080p.mp4", role="broll_video")


if __name__ == "__main__":
    unittest.main()
