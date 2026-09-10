"""
video_edit_tools.py - Trimming, aspect-ratio cropping, speed, framerate, and cutting tools.
"""

import os
import subprocess


def tool_trim_video(ffmpeg: str, input_path: str, start_time: str, end_time: str, output_path: str = None) -> str:
    """Trim a video segment precisely."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    if not output_path:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_trimmed{ext}"
    cmd = [ffmpeg, "-y", "-ss", start_time, "-to", end_time, "-i", input_path, "-c", "copy", output_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        cmd = [ffmpeg, "-y", "-ss", start_time, "-to", end_time, "-i", input_path, "-c:v", "libx264", "-c:a", "aac", output_path]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg trim error: {res.stderr.decode('utf-8', errors='ignore')}")
    return output_path


def tool_convert_vertical(ffmpeg: str, input_path: str, output_path: str = None) -> str:
    """Crop 16:9 widescreen to 9:16 vertical (Shorts/TikTok/Reels)."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    if not output_path:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_vertical_9x16{ext}"
    cmd = [
        ffmpeg, "-y", "-i", input_path,
        "-vf", "crop=ih*(9/16):ih,scale=1080:1920",
        "-c:v", "libx264", "-crf", "20", "-c:a", "aac",
        output_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg vertical conversion error: {res.stderr.decode('utf-8', errors='ignore')}")
    return output_path


def tool_change_speed(ffmpeg: str, video_path: str, speed: float, output_path: str = None) -> str:
    """Speed up or slow down video with audio pitch preservation."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if speed <= 0.1 or speed > 10.0:
        raise ValueError("Speed factor must be between 0.1 and 10.0")
    if not output_path:
        base, ext = os.path.splitext(video_path)
        output_path = f"{base}_speed_{speed}x{ext}"
    setpts = 1.0 / speed
    cmd = [
        ffmpeg, "-y", "-i", video_path,
        "-filter_complex", f"[0:v]setpts={setpts}*PTS[v];[0:a]atempo={speed}[a]",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-c:a", "aac",
        output_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg speed error: {res.stderr.decode('utf-8', errors='ignore')}")
    return output_path


def tool_reverse_video(ffmpeg: str, video_path: str, output_path: str = None) -> str:
    """Reverse video and audio playback."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_reversed{ext}"
    cmd = [
        ffmpeg, "-y", "-i", video_path,
        "-vf", "reverse", "-af", "areverse",
        "-c:v", "libx264", "-preset", "fast", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_loop_video(ffmpeg: str, video_path: str, loop_count: int = 2, output_path: str = None) -> str:
    """Loop video clip N times."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_loop{loop_count}x{ext}"
    cmd = [
        ffmpeg, "-y", "-stream_loop", str(loop_count - 1),
        "-i", video_path, "-c", "copy", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_speed_ramp(ffmpeg: str, video_path: str, speed_multiplier: float = 2.0, output_path: str = None) -> str:
    """Speed ramp clip."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_ramp{speed_multiplier}x{ext}"
    return tool_change_speed(ffmpeg, video_path, speed_multiplier, output_path)


def tool_change_framerate(ffmpeg: str, video_path: str, target_fps: int = 30, output_path: str = None) -> str:
    """Conform video to target frame rate."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_{target_fps}fps{ext}"
    cmd = [ffmpeg, "-y", "-i", video_path, "-r", str(target_fps), "-c:v", "libx264", "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_compress_video(ffmpeg: str, video_path: str, target_mb: float = 25.0, output_path: str = None) -> str:
    """Compress video for sharing limits (Discord / email)."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if not output_path:
        base, ext = os.path.splitext(video_path)
        output_path = f"{base}_compressed{ext}"
    cmd = [
        ffmpeg, "-y", "-i", video_path,
        "-c:v", "libx264", "-crf", "28", "-preset", "faster",
        "-c:a", "aac", "-b:a", "128k",
        output_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg compress error: {res.stderr.decode('utf-8', errors='ignore')}")
    return output_path


def tool_split_scenes(ffmpeg: str, video_path: str, threshold: float = 0.3) -> list:
    """Detect cut points and scene changes."""
    cmd = [
        ffmpeg, "-i", video_path,
        "-filter_complex", f"select='gt(scene,{threshold})',metadata=print:file=-",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    scenes = []
    for line in res.stdout.splitlines():
        if "pts_time:" in line:
            t = float(line.split("pts_time:")[1].strip())
            scenes.append(round(t, 3))
    return sorted(list(set(scenes)))


def tool_detect_black_frames(ffmpeg: str, video_path: str) -> list:
    """Identify black frame gaps."""
    cmd = [
        ffmpeg, "-i", video_path,
        "-vf", "blackdetect=d=0.1:pix_th=0.10",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    blacks = []
    for l in res.stderr.splitlines():
        if "black_start:" in l:
            try:
                st = float(l.split("black_start:")[1].split()[0])
                ed = float(l.split("black_end:")[1].split()[0])
                blacks.append({"start": st, "end": ed, "duration": round(ed - st, 3)})
            except Exception:
                pass
    return blacks
