# -*- coding: utf-8 -*-
"""
security.py - Security Hardening and Performance Optimization Engine for MediaMogul.

Capabilities:
1. Secret Masking and Leak Prevention: Redacts API keys and tokens from logs, UI, and exceptions.
2. Path Traversal and Injection Defense: Canonical path enforcement, safe directory sandboxing, and filename sanitization.
3. SSRF and Domain Whitelisting: Validates all outbound network requests against approved cryptographic HTTPS endpoints.
4. Process Lifecycle and Multi-Core Optimization: Dispatches optimized subprocesses with auto-threaded parameters and orphan protection.
"""

import os
import re
import sys
import subprocess
import urllib.parse
from pathlib import Path
from typing import Optional, List, Tuple, Union

WINDOWS_RESERVED_NAMES = {
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
}

ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.mlt'}
ALLOWED_AUDIO_EXTENSIONS = {'.m4a', '.mp3', '.wav', '.aac', '.flac', '.ogg'}
ALLOWED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.bmp'}

APPROVED_NETWORK_DOMAINS = (
    'api.openai.com',
    'api.pexels.com',
    'www.pexels.com',
    'pexels.com',
    'images.pexels.com',
    'videos.pexels.com'
)


def mask_secret(secret: Optional[str], visible_prefix: int = 4, visible_suffix: int = 4) -> str:
    """
    Masks a secret credential for safe display/logging.
    Example: 'sk-proj-1234567890abcdef' -> 'sk-p***cdef'
    """
    if not secret:
        return '***'
    s = str(secret).strip()
    if len(s) <= visible_prefix + visible_suffix:
        return '*' * len(s)
    return f'{s[:visible_prefix]}***{s[-visible_suffix:]}'


def sanitize_text(text: str) -> str:
    """
    Redacts any sensitive tokens, API keys, or authorization headers from text.
    """
    if not text:
        return ''
    sanitized = re.sub(r'(sk-[A-Za-z0-9_\-]{8,})', r'sk-***[REDACTED]', str(text))
    sanitized = re.sub(r'(Bearer\s+)[A-Za-z0-9_\-\.]{8,}', r'Bearer ***[REDACTED]', sanitized, flags=re.IGNORECASE)
    return sanitized


def sanitize_filename(filename: str, fallback: str = 'media_asset') -> str:
    """
    Sanitizes a filename to remove illegal filesystem characters and path separators.
    """
    if not filename:
        return fallback
    clean = re.sub(r'[<>:\"/\\\\|?*\x00-\x1F]', '_', filename).strip().strip('.')
    base_stem = Path(clean).stem.upper()
    if base_stem in WINDOWS_RESERVED_NAMES:
        clean = f'safe_{clean}'
    if clean.startswith('-'):
        clean = f'file_{clean}'
    return clean or fallback


def safe_join(base_dir: Union[str, Path], *paths: str) -> str:
    """
    Safely joins paths, ensuring the resolved target path remains within base_dir.
    Raises ValueError if a path traversal attempt is detected.
    """
    base_resolved = Path(base_dir).resolve()
    target_resolved = (base_resolved / Path(*paths)).resolve()
    try:
        target_resolved.relative_to(base_resolved)
    except ValueError:
        raise ValueError(f'Security Error: Path traversal detected. Target "{target_resolved}" outside "{base_resolved}".')
    return str(target_resolved)


def validate_output_video_path(filepath: str, allowed_exts: set = None) -> str:
    """
    Validates that a video output destination has an authorized extension and a clean directory structure.
    """
    exts = allowed_exts or (ALLOWED_VIDEO_EXTENSIONS | {'.mlt'})
    path = Path(filepath).resolve()
    if path.suffix.lower() not in exts:
        raise ValueError(f'Security Error: Disallowed extension "{path.suffix}". Allowed: {sorted(exts)}')
    path.parent.mkdir(parents=True, exist_ok=True)
    return str(path)


def is_safe_url(url: str, allowed_domains: Tuple[str, ...] = APPROVED_NETWORK_DOMAINS) -> bool:
    """
    Validates URL scheme, authority, and host against approved whitelist to prevent SSRF.
    Rejects loopback, private RFC1918 IPs, and non-HTTPS protocols.
    """
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme.lower() != 'https':
            return False
        hostname = (parsed.hostname or '').lower().strip()
        if not hostname:
            return False
        if hostname in ('localhost', '127.0.0.1', '::1') or hostname.startswith(('10.', '192.168.', '172.16.', '169.254.')):
            return False
        return any(hostname == d or hostname.endswith(f'.{d}') for d in allowed_domains)
    except Exception:
        return False


def run_optimized_subprocess(
    cmd: List[str],
    timeout: int = 180,
    add_threading_opts: bool = True
) -> Tuple[int, str, str]:
    """
    Executes a subprocess with multi-core performance flags, robust orphan cleanup,
    and sanitized exception output.
    """
    optimized_cmd = list(cmd)
    exe_name = Path(cmd[0]).stem.lower() if cmd else ''
    if add_threading_opts:
        if exe_name in ('ffmpeg', 'melt') and not any('threads' in c.lower() for c in optimized_cmd):
            if exe_name == 'ffmpeg':
                optimized_cmd.insert(1, '-threads')
                optimized_cmd.insert(2, '0')
            elif exe_name == 'melt':
                optimized_cmd.extend(['threads=0', 'real_time=-1'])
    creation_flags = 0x08000000 if sys.platform == 'win32' else 0
    proc = None
    try:
        proc = subprocess.Popen(
            optimized_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creation_flags
        )
        stdout_data, stderr_data = proc.communicate(timeout=timeout)
        out_str = stdout_data.decode('utf-8', errors='replace')
        err_str = stderr_data.decode('utf-8', errors='replace')
        return proc.returncode, out_str, err_str
    except subprocess.TimeoutExpired:
        if proc:
            proc.kill()
            try:
                proc.communicate(timeout=5)
            except Exception:
                pass
        raise TimeoutError(f'Process "{exe_name}" timed out after {timeout} seconds and was cleanly terminated.')
    except Exception as e:
        if proc:
            try:
                proc.kill()
            except Exception:
                pass
        raise RuntimeError(f'Subprocess execution error: {sanitize_text(str(e))}')
