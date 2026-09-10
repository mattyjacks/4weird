# -*- coding: utf-8 -*-
"""
test_security_optimization.py - Unit test suite for MediaMogul Security and Optimization.
"""

import os
import sys
import unittest
import tempfile

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
companion_dir = os.path.join(root_dir, 'companion')
if companion_dir not in sys.path:
    sys.path.insert(0, companion_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from companion.core.security import (
    mask_secret, sanitize_text, sanitize_filename,
    safe_join, validate_output_video_path, is_safe_url
)
from companion.tools.pexels_tools import download_pexels_video


class TestSecurityAndOptimization(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='sec_test_')

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
            except Exception:
                pass

    def test_01_mask_secret(self):
        secret = 'sk-proj-1234567890abcdefghijklmnop'
        masked = mask_secret(secret)
        self.assertNotIn(secret[5:-5], masked)
        self.assertTrue(masked.startswith('sk-p'))
        self.assertTrue(masked.endswith('mnop'))

    def test_02_sanitize_text(self):
        raw_err = 'Error at https://api.openai.com with Authorization: Bearer sk-proj1234567890987654321'
        clean = sanitize_text(raw_err)
        self.assertNotIn('sk-proj1234567890987654321', clean)
        self.assertIn('sk-***[REDACTED]', clean)

    def test_03_sanitize_filename(self):
        malicious = '../../exquisite:file*?name\t.mp4'
        clean = sanitize_filename(malicious)
        for bad in (':', '/', '\\', '*', '?', '<', '>', '|'):
            self.assertNotIn(bad, clean)

        # Test Windows reserved name
        reserved = sanitize_filename('CON.mp4')
        self.assertTrue(reserved.startswith('safe_'))

    def test_04_safe_join_prevents_traversal(self):
        with self.assertRaises(ValueError):
            safe_join(self.temp_dir, '..', '..', 'System32', 'cmd.exe')

    def test_05_validate_output_video_path(self):
        valid = os.path.join(self.temp_dir, 'subfolder', 'official_cut.mp4')
        validated = validate_output_video_path(valid)
        self.assertTrue(os.path.exists(os.path.dirname(validated)))

        with self.assertRaises(ValueError):
            validate_output_video_path(os.path.join(self.temp_dir, 'ransomware.exe'))

    def test_06_is_safe_url(self):
        self.assertTrue(is_safe_url('https://api.pexels.com/videos/search'))
        self.assertTrue(is_safe_url('https://videos.pexels.com/download/12345'))
        self.assertTrue(is_safe_url('https://api.openai.com/v1/chat/completions'))

        # Block non-HTTPS
        self.assertFalse(is_safe_url('http://api.pexels.com'))
        # Block SSRF private IPs and localhost
        self.assertFalse(is_safe_url('https://127.0.0.1:8080'))
        self.assertFalse(is_safe_url('https://169.254.169.254/latest/meta-data'))
        self.assertTrue(not is_safe_url('https://evil-hacker.com'))

    def test_07_pexels_download_caching(self):
        # Create a fake cached stock file of size > 50KB
        cache_file = os.path.join(self.temp_dir, 'Pexels_Stock_99999.mp4')
        with open(cache_file, 'wb') as f:
            f.write(b'0' * 100000)

        # Should return instantly via Cache Hit without making any network call
        res = download_pexels_video(99999, output_path=cache_file)
        self.assertEqual(str(res['video_id']), '99999')
        self.assertEqual(res['file_path'], cache_file)


if __name__ == '__main__':
    unittest.main()
