"""
vision_tools.py - Video frame extraction, live preview grabbing, and multimodal vision AI composition critique.
"""

import os
import time
import json
import base64
import subprocess
import urllib.request
import urllib.error
try:
    from companion.core.ffmpeg_utils import find_melt
except ImportError:
    try:
        from ..core.ffmpeg_utils import find_melt
    except ImportError:
        from core.ffmpeg_utils import find_melt


def tool_extract_frame_jpeg(ffmpeg: str, input_path: str, timestamp: str = "00:00:01", output_jpeg: str = None) -> str:
    """
    Extract a single frame from either raw video or a Shotcut .mlt timeline as an optimized JPEG.
    Supports both raw camera footage and work-in-progress timeline projects.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if not output_jpeg:
        base, _ = os.path.splitext(input_path)
        clean_ts = str(timestamp).replace(":", "-").replace(".", "_")
        output_jpeg = f"{base}_frame_{clean_ts}.jpg"

    ext = os.path.splitext(input_path)[1].lower()

    # Timeline Work In Progress (.mlt project)
    if ext == ".mlt":
        melt_success = False
        melt_bin = find_melt()

        # 1. Try rendering frame through Shotcut's MLT Melt engine
        if melt_bin:
            try:
                cmd = [melt_bin, input_path, f"in={timestamp}", f"out={timestamp}", "-consumer", f"avformat:{output_jpeg}", "vframes=1"]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
                if res.returncode == 0 and os.path.exists(output_jpeg) and os.path.getsize(output_jpeg) > 0:
                    melt_success = True
            except Exception:
                pass

        # 2. Try rendering directly through FFmpeg MLT demuxer
        if not melt_success:
            try:
                cmd = [ffmpeg, "-y", "-ss", timestamp, "-i", input_path, "-vframes", "1", "-q:v", "2", output_jpeg]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
                if res.returncode == 0 and os.path.exists(output_jpeg) and os.path.getsize(output_jpeg) > 0:
                    melt_success = True
            except Exception:
                pass

        # 3. Fallback: Parse .mlt XML to find active producer/video file at timeline
        if not melt_success:
            try:
                tree = ET.parse(input_path)
                root = tree.getroot()
                producer_src = None
                for pr in root.findall(".//producer"):
                    src = pr.find("property[@name='resource']")
                    if src is not None and src.text and os.path.exists(src.text):
                        producer_src = src.text
                        break
                if producer_src:
                    cmd = [ffmpeg, "-y", "-ss", timestamp, "-i", producer_src, "-vframes", "1", "-q:v", "2", output_jpeg]
                    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
                else:
                    raise RuntimeError("No media resource found inside .mlt file to extract.")
            except Exception as e:
                raise RuntimeError(f"Failed to extract frame from .mlt project: {e}")

    else:
        # Raw video file (.mp4, .mov, .mkv, etc.)
        cmd = [ffmpeg, "-y", "-ss", timestamp, "-i", input_path, "-vframes", "1", "-q:v", "2", output_jpeg]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
        if res.returncode != 0 or not os.path.exists(output_jpeg):
            # Alternate seek position
            cmd = [ffmpeg, "-y", "-i", input_path, "-ss", timestamp, "-vframes", "1", "-q:v", "2", output_jpeg]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)

    return output_jpeg


def tool_capture_shotcut_preview_jpeg(output_jpeg: str = None) -> str:
    """
    Captures the live Shotcut video preview player directly from screen as a JPEG.
    Captures the full-timeline work-in-progress including all applied filters, cuts, and overlays.
    """
    try:
        from PIL import ImageGrab
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32

        found = None
        def enum_cb(hwnd, _):
            nonlocal found
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value
                    if "shotcut" in title.lower():
                        rect = wintypes.RECT()
                        user32.GetWindowRect(hwnd, ctypes.byref(rect))
                        if (rect.right - rect.left > 400) and (rect.bottom - rect.top > 300):
                            found = (hwnd, title, rect)
                            return False
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(WNDENUMPROC(enum_cb), 0)

        if not found:
            raise RuntimeError("Shotcut window is not active or visible on screen.")

        hwnd, title, rect = found
        bbox = (rect.left, rect.top, rect.right, rect.bottom)
        img = ImageGrab.grab(bbox)

        # Crop to the central viewport preview player where the video is rendered
        w, h = img.size
        player_crop = img.crop((int(w * 0.20), int(h * 0.12), int(w * 0.78), int(h * 0.70)))

        if not output_jpeg:
            output_jpeg = os.path.join(os.path.expanduser("~"), "Downloads", f"shotcut_timeline_preview_{int(time.time())}.jpg")

        player_crop.convert("RGB").save(output_jpeg, "JPEG", quality=92)
        return output_jpeg
    except Exception as e:
        raise RuntimeError(f"Failed to capture live Shotcut preview: {e}")


def tool_analyze_frame_vision(api_key: str, jpeg_path: str, user_prompt: str = None, model: str = "gpt-4o") -> dict:
    """
    Sends a video frame JPEG to OpenAI multimodal vision AI to analyze composition,
    rule of thirds, lighting, safe zones, and actionable timeline edit recommendations.
    """
    if not os.path.exists(jpeg_path):
        raise FileNotFoundError(f"JPEG frame file not found: {jpeg_path}")

    with open(jpeg_path, "rb") as f:
        b64_data = base64.b64encode(f.read()).decode("utf-8")

    sys_instruction = (
        "You are MediaMogul Vision AI, an elite Director of Photography, master colorist, and lead video editor for Shotcut.\n"
        "You are analyzing an individual video frame JPEG extracted from either raw camera footage or a work-in-progress timeline.\n"
        "Deliver a structured, professional cinematographic critique covering:\n\n"
        "1. 📐 Composition & Framing (Rule of Thirds, subject positioning, leading lines, horizon leveling)\n"
        "2. 👤 Headroom & Eye-Line (Lead room in direction of gaze, breathing space, framing balance)\n"
        "3. 🛡️ Safe Zones & UI Clearance (16:9 Title Safe bounds, 9:16 vertical safe areas to avoid TikTok/Instagram Reels/Shorts UI buttons)\n"
        "4. 🎨 Lighting, Exposure & Contrast (Highlight clipping, shadow detail, color temperature, and contrast ratio)\n"
        "5. 🧹 Focal Point & Visual Clutter (Background distractions, visual noise, separation of subject from background)\n"
        "6. 🎬 Actionable Shotcut Timeline Recommendations (Exact filter fixes: crop/pan/zoom, color grading LUT, vignette, subtitle placement, exposure adjustments)\n\n"
        "Provide direct, high-value, actionable advice to elevate this shot."
    )

    query = user_prompt or "Analyze this video frame for composition, framing, lighting, safe zones, and actionable Shotcut timeline improvements."

    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": sys_instruction},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": query},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_data}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 1200,
        "temperature": 0.5
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            analysis_text = res["choices"][0]["message"]["content"].strip()
            tokens_used = res.get("usage", {}).get("total_tokens", 0)
            return {
                "image_path": jpeg_path,
                "analysis": analysis_text,
                "model": model,
                "tokens_used": tokens_used
            }
    except urllib.error.HTTPError as he:
        err_msg = he.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI Vision API error ({he.code}): {err_msg}")
