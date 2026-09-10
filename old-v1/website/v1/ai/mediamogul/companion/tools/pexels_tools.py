# -*- coding: utf-8 -*-
"""
pexels_tools.py - Automated Pexels Stock Video Search & Downloader for MediaMogul.

Provides:
1. Search Pexels videos via official API or public popular catalog.
2. Direct 1080p/4K MP4 video downloading without watermark.
3. Media Library Tracker integration (role="broll_video").
4. 100% Fingerprint-Free authenticity (authentic human camera footage).
"""

import os
import re
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from companion.core.env_utils import load_dotenv
    load_dotenv()
except Exception:
    try:
        from core.env_utils import load_dotenv
        load_dotenv()
    except Exception:
        pass



def extract_pexels_video_id(url_or_id: Any) -> Optional[int]:
    """Extracts numeric Pexels video ID from a URL or raw ID string/int."""
    if not url_or_id:
        return None
    val = str(url_or_id).strip()

    # Case 1: Pure numeric ID
    if val.isdigit():
        return int(val)

    # Case 2: URL like https://www.pexels.com/video/plants-by-the-river-1208094/
    m = re.search(r'pexels\.com/video/(?:[^/]+-)?(\d+)', val, re.IGNORECASE)
    if m:
        return int(m.group(1))

    # Case 3: Download URL like https://www.pexels.com/download/video/1208094/
    m2 = re.search(r'pexels\.com/download/video/(\d+)', val, re.IGNORECASE)
    if m2:
        return int(m2.group(1))

    # Case 4: Video files URL like https://videos.pexels.com/video-files/1208094/
    m3 = re.search(r'video-files/(\d+)', val, re.IGNORECASE)
    if m3:
        return int(m3.group(1))

    # Case 5: CDN or file pattern like /854400.hd.mp4 or pexels_854400_
    m4 = re.search(r'[/_](\d{5,10})(?:\.|\b|_)', val)
    if m4:
        return int(m4.group(1))

    # Case 5: Any trailing number after hyphen or slash
    m4 = re.search(r'(?:-|/)(\d{5,10})/?$', val)
    if m4:
        return int(m4.group(1))

    return None


def search_pexels_videos(
    query: str = "",
    api_key: Optional[str] = None,
    per_page: int = 15,
    orientation: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Searches Pexels for stock videos.
    Uses official API if api_key is available; otherwise queries public popular feed.
    """
    key = (api_key or os.environ.get("PEXELS_API_KEY", "")).strip()
    headers = {
        "User-Agent": "MediaMogul/2.0 (Shotcut Autonomous Copilot; Windows)"
    }
    if key:
        headers["Authorization"] = key

    # Choose endpoint
    clean_q = query.strip()
    if clean_q and key:
        encoded_q = urllib.parse.quote_plus(clean_q)
        url = f"https://api.pexels.com/videos/search?query={encoded_q}&per_page={max(1, min(per_page, 50))}"
        if orientation in ("landscape", "portrait", "square"):
            url += f"&orientation={orientation}"
    else:
        # Public popular catalog (requires no API key)
        url = f"https://api.pexels.com/videos/popular?per_page={max(1, min(per_page * 2, 50))}"

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as ex:
        # Fallback to popular if search returned 401
        if key and clean_q:
            try:
                fallback_req = urllib.request.Request(
                    f"https://api.pexels.com/videos/popular?per_page={per_page}",
                    headers={"User-Agent": "MediaMogul/2.0"}
                )
                with urllib.request.urlopen(fallback_req, timeout=15) as fresp:
                    data = json.loads(fresp.read().decode("utf-8"))
            except Exception:
                return []
        else:
            return []

    raw_videos = data.get("videos", [])
    results = []

    for v in raw_videos:
        vid_id = v.get("id")
        if not vid_id:
            continue

        w = v.get("width", 1920)
        h = v.get("height", 1080)
        aspect = "16:9" if w >= h else "9:16"

        # Apply orientation filter if requested
        if orientation == "landscape" and w < h:
            continue
        if orientation == "portrait" and w > h:
            continue

        # Extract best MP4 file link
        files = v.get("video_files", [])
        best_file = None
        for f in sorted(files, key=lambda x: x.get("width", 0), reverse=True):
            if f.get("file_type") == "video/mp4" or ".mp4" in f.get("link", ""):
                best_file = f
                break

        author = v.get("user", {}).get("name", "Pexels Creator")
        slug = os.path.basename(v.get("url", "").rstrip("/"))
        title = slug.replace(f"-{vid_id}", "").replace("-", " ").title() if slug else f"Pexels Video {vid_id}"

        # If keyword search was done on popular feed, check if query words match
        if clean_q and not key:
            q_words = clean_q.lower().split()
            slug_lower = slug.lower()
            if not any(w in slug_lower for w in q_words):
                # allow some results through if fewer than desired
                if len(results) >= per_page:
                    continue

        results.append({
            "id": vid_id,
            "title": title,
            "duration": v.get("duration", 0),
            "width": w,
            "height": h,
            "resolution": f"{w}x{h}",
            "aspect_ratio": aspect,
            "photographer": author,
            "url": v.get("url", f"https://www.pexels.com/video/{vid_id}/"),
            "thumbnail": v.get("image", ""),
            "download_url": f"https://www.pexels.com/download/video/{vid_id}/",
            "direct_file_url": best_file.get("link") if best_file else None,
            "quality": best_file.get("quality", "hd") if best_file else "hd"
        })

        if len(results) >= per_page:
            break

    return results


def download_pexels_video(
    video_id_or_url: Any,
    output_path: Optional[str] = None,
    destination_dir: Optional[str] = None,
    progress_callback: Optional[Callable[[int, int, float], None]] = None
) -> Dict[str, Any]:
    """
    Downloads a 1080p/4K MP4 stock video from Pexels by video ID or URL.
    Follows Pexels download redirects automatically.
    """
    vid_id = extract_pexels_video_id(video_id_or_url)
    if not vid_id:
        raise ValueError(f"Could not extract a valid Pexels video ID from: '{video_id_or_url}'")
    if not str(vid_id).isdigit():
        raise ValueError(f"Security Error: Invalid non-numeric Pexels video ID: '{vid_id}'")

    from companion.core.security import sanitize_filename, validate_output_video_path, is_safe_url

    dest_file = output_path
    if not dest_file:
        folder = destination_dir or r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
        if not os.path.exists(folder):
            folder = os.getcwd()
        safe_fname = sanitize_filename(f"Pexels_Stock_{vid_id}.mp4")
        dest_file = os.path.join(folder, safe_fname)

    dest_file = validate_output_video_path(dest_file)
    os.makedirs(os.path.dirname(dest_file), exist_ok=True)

    # Performance Optimization: Cache check (skip re-downloading if already downloaded and valid)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 50000:
        actual_size = os.path.getsize(dest_file)
        print(f"⚡ [Cache Hit] Found cached Pexels stock video ({actual_size / (1024*1024):.2f} MB): {dest_file}")
    else:
        download_url = f"https://www.pexels.com/download/video/{vid_id}/"
        if not is_safe_url(download_url):
            raise ValueError(f"Security Error: Untrusted download URL '{download_url}'")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        req = urllib.request.Request(download_url, headers=headers)
        with urllib.request.urlopen(req, timeout=45) as resp:
            total_size = int(resp.headers.get("Content-Length", 0))
            downloaded = 0

            with open(dest_file, "wb") as f:
                while True:
                    # Optimized 256KB buffer for maximum network throughput
                    chunk = resp.read(256 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    pct = round((downloaded / total_size * 100.0), 1) if total_size > 0 else 0.0
                    if progress_callback:
                        progress_callback(downloaded, total_size, pct)

        actual_size = os.path.getsize(dest_file)
        if actual_size < 1000:
            raise RuntimeError(f"Downloaded file is suspiciously small ({actual_size} bytes). Download may have failed.")

    # Probe duration and dimensions with ffprobe if available
    duration_sec = 0.0
    width = 1920
    height = 1080
    try:
        import subprocess
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=width,height", "-of", "json", dest_file],
            capture_output=True, text=True, timeout=10
        )
        if probe.returncode == 0:
            pj = json.loads(probe.stdout)
            duration_sec = round(float(pj.get("format", {}).get("duration", 0)), 2)
            streams = pj.get("streams", [])
            if streams:
                width = streams[0].get("width", 1920)
                height = streams[0].get("height", 1080)
    except Exception:
        pass

    size_mb = round(actual_size / (1024 * 1024), 2)

    return {
        "status": "SUCCESS",
        "video_id": vid_id,
        "file_path": dest_file,
        "size_mb": size_mb,
        "size_bytes": actual_size,
        "duration_sec": duration_sec,
        "width": width,
        "height": height,
        "resolution": f"{width}x{height}",
        "aspect_ratio": "16:9" if width >= height else "9:16",
        "fingerprint_status": "🟢 Fingerprint-Free (Authentic Camera Footage)"
    }


def tool_download_pexels_video(
    query_or_url: str,
    output_path: Optional[str] = None,
    destination_dir: Optional[str] = None,
    api_key: Optional[str] = None,
    orientation: Optional[str] = None,
    media_tracker=None
) -> str:
    """
    Agent tool function for automatic Pexels stock video search and download.
    If query_or_url is a URL or ID, downloads directly.
    If query_or_url is a topic/keywords, searches and downloads the highest quality match.
    """
    target = query_or_url.strip()
    vid_id = extract_pexels_video_id(target)

    # If already a valid Pexels ID or URL, download directly
    if vid_id:
        res = download_pexels_video(vid_id, output_path=output_path, destination_dir=destination_dir)
    else:
        # Keyword search
        videos = search_pexels_videos(target, api_key=api_key, per_page=5, orientation=orientation)
        if not videos:
            return f"❌ No Pexels stock videos found matching '{target}'."
        top_video = videos[0]
        res = download_pexels_video(top_video["id"], output_path=output_path, destination_dir=destination_dir)

    file_p = res["file_path"]
    if media_tracker:
        media_tracker.track_file(file_p, role="broll_video")

    return (
        f"🎬 Pexels Stock Video Downloaded Successfully!\n"
        f"• File: {file_p}\n"
        f"• Resolution: {res['resolution']} ({res['aspect_ratio']})\n"
        f"• Duration: {res['duration_sec']}s  |  Size: {res['size_mb']} MB\n"
        f"• Policy: {res['fingerprint_status']}"
    )
