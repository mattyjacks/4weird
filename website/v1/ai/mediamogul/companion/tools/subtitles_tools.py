"""
subtitles_tools.py - Whisper AI transcription, SRT generation, and subtitle burn-in.
"""

import os
import json
import urllib.request
import urllib.error
import subprocess

try:
    from companion.core.ffmpeg_utils import format_timestamp, extract_audio, find_ffmpeg, find_melt
except ImportError:
    try:
        from ..core.ffmpeg_utils import format_timestamp, extract_audio, find_ffmpeg, find_melt
    except ImportError:
        from core.ffmpeg_utils import format_timestamp, extract_audio, find_ffmpeg, find_melt


def extract_audio_for_whisper(input_video: str, output_audio: str, ffmpeg_path: str = None) -> bool:
    """Extract audio stream converted to 16kHz mono MP3 for OpenAI Whisper."""
    return extract_audio(input_video, output_audio, ffmpeg_path)


def transcribe_whisper(audio_path: str, api_key: str) -> dict:
    """Send audio file to OpenAI Whisper API."""
    if not api_key or not str(api_key).strip():
        raise ValueError("OpenAI API key is required for Whisper transcription. Please configure your API key in Settings.")
    url = "https://api.openai.com/v1/audio/transcriptions"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    with open(audio_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(audio_path)
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: audio/mpeg\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")

    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="model"\r\n\r\n')
    body.extend(b"whisper-1\r\n")

    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="response_format"\r\n\r\n')
    body.extend(b"verbose_json\r\n")

    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(b'Content-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\n')
    body.extend(b"segment\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(url, data=bytes(body))
    req.add_header("Authorization", f"Bearer {api_key.strip()}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Whisper API error: {err_msg}")


# Color palette for ASS (&HAABBGGRR) and MLT (#RRGGBB)
COLOR_PALETTE = {
    "white": {"ass": "&H00FFFFFF", "hex": "#FFFFFF"},
    "black": {"ass": "&H00000000", "hex": "#000000"},
    "yellow": {"ass": "&H0000FFFF", "hex": "#FFFF00"},
    "red": {"ass": "&H000000FF", "hex": "#FF0000"},
    "green": {"ass": "&H0000FF00", "hex": "#00FF00"},
    "blue": {"ass": "&H00FF0000", "hex": "#0000FF"},
    "cyan": {"ass": "&H00FFFF00", "hex": "#00FFFF"},
    "magenta": {"ass": "&H00FF00FF", "hex": "#FF00FF"},
    "orange": {"ass": "&H0000A5FF", "hex": "#FFA500"},
    "gold": {"ass": "&H0000D7FF", "hex": "#FFD700"},
    "hot_pink": {"ass": "&H00B469FF", "hex": "#FF69B4"},
    "pink": {"ass": "&H00CBC0FF", "hex": "#FFC0CB"},
    "purple": {"ass": "&H00800080", "hex": "#800080"},
    "neon_green": {"ass": "&H0039FF14", "hex": "#14FF39"},
    "electric_blue": {"ass": "&H00FF7F00", "hex": "#007FFF"},
    "lime": {"ass": "&H0000FF00", "hex": "#00FF00"},
    "crimson": {"ass": "&H003C14DC", "hex": "#DC143C"},
}


def color_to_ass(c: str) -> str:
    """Convert any color name or hex string to ASS &HAABBGGRR format."""
    if not c:
        return "&H00000000"
    k = str(c).strip().lower().replace(" ", "_").replace("-", "_")
    if k in COLOR_PALETTE:
        return COLOR_PALETTE[k]["ass"]
    if k.startswith("&h"):
        return c.upper()
    if k.startswith("#"):
        h = k.lstrip("#")
        if len(h) == 6:
            r, g, b = h[0:2], h[2:4], h[4:6]
            return f"&H00{b}{g}{r}".upper()
        elif len(h) == 8:
            a, r, g, b = h[0:2], h[2:4], h[4:6], h[6:8]
            return f"&H{a}{b}{g}{r}".upper()
    return "&H00000000"


def color_to_hex(c: str) -> str:
    """Convert any color name or hex string to #RRGGBB format."""
    if not c:
        return "#000000"
    k = str(c).strip().lower().replace(" ", "_").replace("-", "_")
    if k in COLOR_PALETTE:
        return COLOR_PALETTE[k]["hex"]
    if k.startswith("#"):
        return k.upper()
    return "#000000"


def srt_ts_to_ass_ts(srt_ts: str) -> str:
    """Convert SRT timestamp 00:01:23,456 to ASS format 0:01:23.45."""
    s = srt_ts.strip().replace(",", ".")
    parts = s.split(":")
    if len(parts) == 3:
        h = str(int(parts[0]))
        m = parts[1]
        s_part = parts[2]
        if "." in s_part:
            sec, ms = s_part.split(".")
            cs = ms[:2].ljust(2, "0")
            return f"{h}:{m}:{sec}.{cs}"
        return f"{h}:{m}:{s_part}.00"
    return s


def sec_to_ass_ts(seconds: float) -> str:
    """Convert seconds to ASS format 0:01:23.45."""
    total_cs = int(round(seconds * 100))
    cs = total_cs % 100
    total_s = total_cs // 100
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


# Animation preset tags for Advanced SubStation Alpha (.ass)
ANIMATION_TAGS = {
    "bounce": r"{\fscx85\fscy85\t(0,90,\fscx115\fscy115)\t(90,170,\fscx100\fscy100)}",
    "pop": r"{\fscx80\fscy80\t(0,100,\fscx118\fscy118)\t(100,180,\fscx100\fscy100)}",
    "fade": r"{\fad(180,180)}",
    "slide": r"{\an2\t(0,180,\fscy110)\fad(140,0)}",
    "neon": r"{\t(0,250,\bord8)\t(250,500,\bord4)}",
    "wiggle": r"{\t(0,80,\frz2)\t(80,160,\frz-2)\t(160,240,\frz0)}",
    "zoom": r"{\fscx60\fscy60\t(0,180,\fscx100\fscy100)}",
    "classic": "",
    "none": ""
}


def convert_whisper_to_srt(whisper_data: dict, output_srt: str):
    """Convert Whisper JSON output with timestamps to standard SubRip (.srt) file."""
    segments = whisper_data.get("segments", [])
    lines = []
    for idx, seg in enumerate(segments, 1):
        start_ts = format_timestamp(seg.get("start", 0.0))
        end_ts = format_timestamp(seg.get("end", 0.0))
        text = seg.get("text", "").strip()

        lines.append(f"{idx}")
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(text)
        lines.append("")

    with open(output_srt, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def convert_whisper_to_ass(
    whisper_data: dict,
    output_ass: str,
    font: str = "Baloo",
    font_size: int = 54,
    text_color: str = "white",
    outline_color: str = "black",
    outline_width: int = 4,
    animation: str = "bounce",
    highlight_color: str = "yellow"
) -> str:
    """
    Convert Whisper JSON output with timestamps to a rich animated .ass file
    with user-specified font, text color, outline color, outline width, and animation.
    """
    pri_col = color_to_ass(text_color)
    out_col = color_to_ass(outline_color)
    sec_col = color_to_ass(highlight_color)
    anim_key = str(animation or "bounce").lower().strip()
    anim_prefix = ANIMATION_TAGS.get(anim_key, ANIMATION_TAGS["bounce"])

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{font_size},{pri_col},{sec_col},{out_col},&H80000000,1,0,0,0,100,100,0,0,1,{outline_width},1,2,40,40,65,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    dialogues = []
    segments = whisper_data.get("segments", [])
    for seg in segments:
        start_ts = sec_to_ass_ts(seg.get("start", 0.0))
        end_ts = sec_to_ass_ts(seg.get("end", 0.0))
        text = seg.get("text", "").strip()
        if not text:
            continue

        if anim_key == "karaoke" and "words" in seg and seg["words"]:
            k_parts = []
            for w in seg["words"]:
                w_start = w.get("start", 0.0)
                w_end = w.get("end", 0.0)
                dur_cs = max(1, int(round((w_end - w_start) * 100)))
                w_text = w.get("word", "").strip()
                k_parts.append(f"{{\\k{dur_cs}}}{w_text}")
            line_text = anim_prefix + " ".join(k_parts)
        else:
            line_text = f"{anim_prefix}{text}"

        dialogues.append(f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{line_text}")

    content = header + "\n".join(dialogues) + "\n"
    with open(output_ass, "w", encoding="utf-8") as f:
        f.write(content)
    return output_ass


def convert_srt_to_ass(
    srt_path: str,
    output_ass: str = None,
    font: str = "Baloo",
    font_size: int = 54,
    text_color: str = "white",
    outline_color: str = "black",
    outline_width: int = 4,
    animation: str = "bounce",
    highlight_color: str = "yellow"
) -> str:
    """
    Convert an existing .srt subtitle file into a fancy animated .ass subtitle file
    with user-specified font, text color, outline color, outline width, and animation.
    """
    if not os.path.exists(srt_path):
        raise FileNotFoundError(f"SRT file not found: {srt_path}")
    if not output_ass:
        base, _ = os.path.splitext(srt_path)
        output_ass = f"{base}.ass"

    pri_col = color_to_ass(text_color)
    out_col = color_to_ass(outline_color)
    sec_col = color_to_ass(highlight_color)
    anim_key = str(animation or "bounce").lower().strip()
    anim_prefix = ANIMATION_TAGS.get(anim_key, ANIMATION_TAGS["bounce"])

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{font_size},{pri_col},{sec_col},{out_col},&H80000000,1,0,0,0,100,100,0,0,1,{outline_width},1,2,40,40,65,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(srt_path, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()

    blocks = raw.strip().replace("\r\n", "\n").split("\n\n")
    dialogues = []
    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if len(lines) >= 2:
            time_line = None
            text_lines = []
            for l in lines:
                if "-->" in l:
                    time_line = l
                elif time_line:
                    text_lines.append(l)
            if time_line and text_lines:
                pts = time_line.split("-->")
                start_ts = srt_ts_to_ass_ts(pts[0])
                end_ts = srt_ts_to_ass_ts(pts[1])
                body_text = r"\N".join(text_lines)
                dialogues.append(f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{anim_prefix}{body_text}")

    content = header + "\n".join(dialogues) + "\n"
    with open(output_ass, "w", encoding="utf-8") as f:
        f.write(content)
    return output_ass


def tool_burn_subtitles(
    ffmpeg: str,
    video_path: str,
    srt_path: str = None,
    output_path: str = None,
    font: str = "Baloo",
    text_color: str = "white",
    outline_color: str = "black",
    outline_width: int = 4,
    animation: str = "bounce",
    font_size: int = 52
) -> str:
    """
    Burn fancy animated subtitles directly onto video frames with user-specified
    font, text color, outline color, outline width, and animation presets.
    Uses Shotcut's native Melt engine or FFmpeg.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Auto-discover subtitle file if not explicitly supplied
    if not srt_path or not os.path.exists(srt_path):
        base, _ = os.path.splitext(video_path)
        for ext in (".ass", ".srt"):
            candidate = base + ext
            if os.path.exists(candidate):
                srt_path = candidate
                break

    if not srt_path or not os.path.exists(srt_path):
        raise FileNotFoundError(f"Subtitle file (.srt or .ass) not found for: {video_path}")

    if not output_path:
        base, ext = os.path.splitext(video_path)
        anim_slug = f"_{animation}" if animation and animation != "none" else ""
        output_path = f"{base}_subtitled{anim_slug}{ext}"

    # If it is an SRT file or if custom animation/outline styling is requested, convert to ASS
    target_sub = srt_path
    temp_ass = None
    if srt_path.lower().endswith(".srt"):
        base, _ = os.path.splitext(srt_path)
        temp_ass = f"{base}_fancy.ass"
        convert_srt_to_ass(
            srt_path=srt_path,
            output_ass=temp_ass,
            font=font or "Baloo",
            font_size=font_size or 52,
            text_color=text_color or "white",
            outline_color=outline_color or "black",
            outline_width=outline_width if outline_width is not None else 4,
            animation=animation or "bounce"
        )
        target_sub = temp_ass

    melt_exe = find_melt()
    success = False
    err_log = ""

    # 1. Primary engine: Shotcut's melt engine (natively renders ASS & SRT with accurate audio sync)
    if melt_exe and os.path.exists(melt_exe):
        try:
            cmd = [
                melt_exe, video_path,
                "-attach", "subtitle", f"resource={target_sub}",
                "-consumer", f"avformat:{output_path}",
                "vcodec=libx264", "preset=fast", "crf=20", "acodec=aac"
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                success = True
            else:
                err_log = res.stderr.decode("utf-8", errors="ignore")
        except Exception as e:
            err_log = str(e)

    # 2. Fallback engine: ffmpeg with ass or subtitles filter
    if not success:
        if not ffmpeg or not os.path.exists(ffmpeg):
            ffmpeg = find_ffmpeg()
        if ffmpeg and os.path.exists(ffmpeg):
            escaped_sub = target_sub.replace("\\", "/").replace(":", "\\:")
            for filt in [f"ass='{escaped_sub}'", f"subtitles='{escaped_sub}'"]:
                cmd = [
                    ffmpeg, "-y", "-i", video_path,
                    "-vf", filt,
                    "-c:v", "libx264", "-crf", "20", "-c:a", "copy",
                    output_path
                ]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    success = True
                    break
                else:
                    err_log = res.stderr.decode("utf-8", errors="ignore")

    # Clean up temporary ASS file if created
    if temp_ass and os.path.exists(temp_ass):
        try:
            os.remove(temp_ass)
        except Exception:
            pass

    if not success:
        raise RuntimeError(f"Failed to burn subtitles into video. Engine log: {err_log}")

    return output_path


def tool_extract_transcript(media_path: str, api_key: str, output_txt: str = None) -> str:
    """Transcribe media to readable narrative text transcript."""
    if not output_txt:
        b, _ = os.path.splitext(media_path)
        output_txt = f"{b}_transcript.txt"
    tmp_audio = f"{os.path.splitext(media_path)[0]}_trans_tmp.mp3"
    ffmpeg = find_ffmpeg()
    extract_audio(media_path, tmp_audio, ffmpeg)
    try:
        data = transcribe_whisper(tmp_audio, api_key)
        text = data.get("text", "")
        with open(output_txt, "w", encoding="utf-8") as f:
            f.write(text)
    finally:
        if os.path.exists(tmp_audio):
            try:
                os.remove(tmp_audio)
            except Exception:
                pass
    return output_txt


def tool_generate_chapters(srt_path: str, output_path: str = None) -> str:
    """Generate YouTube/Vimeo chapters list from an SRT subtitle file."""
    if not output_path:
        b, _ = os.path.splitext(srt_path)
        output_path = f"{b}_youtube_chapters.txt"
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    blocks = content.strip().split("\n\n")
    chapters = ["00:00 Intro"]
    last_sec = 0
    for block in blocks:
        lines = block.splitlines()
        if len(lines) >= 3 and "-->" in lines[1]:
            ts = lines[1].split("-->")[0].strip().split(",")[0]
            h, m, s = ts.split(":")
            sec = int(h) * 3600 + int(m) * 60 + int(s)
            if sec - last_sec >= 30:  # new chapter every 30+ seconds
                text = " ".join(lines[2:])[:40]
                formatted = f"{m}:{s} {text}" if int(h) == 0 else f"{h}:{m}:{s} {text}"
                chapters.append(formatted)
                last_sec = sec
    res = "\n".join(chapters)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(res)
    return output_path
