"""
visual_fx_tools.py - Watermarks, color grading, overlays, progress bars, thumbnails, and DALL-E generation.
"""

import os
import time
import json
import subprocess
import urllib.request


def tool_add_watermark(ffmpeg: str, video_path: str, watermark_img: str, position: str = "bottom_right", output_path: str = None) -> str:
    """Burn image watermark or logo onto video."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_watermarked{ext}"
    pos_map = {
        "top_left": "10:10",
        "top_right": "W-w-10:10",
        "bottom_left": "10:H-h-10",
        "bottom_right": "W-w-10:H-h-10",
        "center": "(W-w)/2:(H-h)/2"
    }
    coords = pos_map.get(position, "W-w-10:H-h-10")
    cmd = [
        ffmpeg, "-y", "-i", video_path, "-i", watermark_img,
        "-filter_complex", f"[0:v][1:v]overlay={coords}[v]",
        "-map", "[v]", "-map", "0:a?", "-c:a", "copy", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_create_gif(ffmpeg: str, video_path: str, start_time: str = "00:00:00", duration: float = 3.0, fps: int = 12, width: int = 480, output_path: str = None) -> str:
    """Convert video clip to high-quality animated GIF with 2-pass palette."""
    if not output_path:
        b, _ = os.path.splitext(video_path)
        output_path = f"{b}_clip.gif"
    filter_arg = f"fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
    cmd = [ffmpeg, "-y", "-ss", start_time, "-t", str(duration), "-i", video_path, "-vf", filter_arg, output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_adjust_color(ffmpeg: str, video_path: str, brightness: float = 0.0, contrast: float = 1.0, saturation: float = 1.0, output_path: str = None) -> str:
    """Adjust brightness, contrast, and saturation."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_color{ext}"
    eq = f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}"
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", eq, "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_blur_video(ffmpeg: str, video_path: str, blur_radius: int = 10, output_path: str = None) -> str:
    """Apply box blur to video."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_blurred{ext}"
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", f"boxblur={blur_radius}:1", "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_color_lut(ffmpeg: str, video_path: str, lut_name: str = "warm", output_path: str = None) -> str:
    """Simulate cinematic color grading presets."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_{lut_name}{ext}"
    lut_curves = {
        "warm": "colorbalance=rs=0.1:gs=0.0:bs=-0.1:rm=0.15:gm=0.0:bm=-0.15",
        "cool": "colorbalance=rs=-0.1:gs=0.0:bs=0.15:rm=-0.1:gm=0.05:bm=0.2",
        "vintage": "curves=vintage",
        "cyberpunk": "colorbalance=rs=0.2:bs=0.3:rm=0.2:bm=0.25,hue=s=1.3",
        "bw": "hue=s=0"
    }
    curve = lut_curves.get(lut_name.lower(), lut_curves["warm"])
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", curve, "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_flip_video(ffmpeg: str, video_path: str, direction: str = "horizontal", output_path: str = None) -> str:
    """Flip video horizontally (hflip) or vertically (vflip)."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_flipped_{direction}{ext}"
    vf = "hflip" if direction.lower().startswith("h") else "vflip"
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", vf, "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_rotate_video(ffmpeg: str, video_path: str, degrees: int = 90, output_path: str = None) -> str:
    """Rotate video by 90, 180, or 270 degrees."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_rot{degrees}{ext}"
    rot_map = {90: "transpose=1", 180: "transpose=2,transpose=2", 270: "transpose=2"}
    vf = rot_map.get(degrees, "transpose=1")
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", vf, "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_split_screen(ffmpeg: str, video1_path: str, video2_path: str, output_path: str = None) -> str:
    """Side-by-side split screen."""
    if not output_path:
        b, ext = os.path.splitext(video1_path)
        output_path = f"{b}_splitscreen{ext}"
    cmd = [
        ffmpeg, "-y", "-i", video1_path, "-i", video2_path,
        "-filter_complex", "[0:v][1:v]hstack=inputs=2[v]",
        "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_picture_in_picture(ffmpeg: str, background_video: str, overlay_video: str, position: str = "top_right", scale: float = 0.3, output_path: str = None) -> str:
    """Picture-in-picture overlay."""
    if not output_path:
        b, ext = os.path.splitext(background_video)
        output_path = f"{b}_pip{ext}"
    pos_map = {
        "top_right": "W-w-20:20",
        "top_left": "20:20",
        "bottom_right": "W-w-20:H-h-20",
        "bottom_left": "20:H-h-20"
    }
    coords = pos_map.get(position, "W-w-20:20")
    cmd = [
        ffmpeg, "-y", "-i", background_video, "-i", overlay_video,
        "-filter_complex", f"[1:v]scale=iw*{scale}:-1[ov];[0:v][ov]overlay={coords}[out]",
        "-map", "[out]", "-map", "0:a?", "-c:v", "libx264", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_render_progress_bar(ffmpeg: str, video_path: str, bar_color: str = "red", bar_height: int = 8, output_path: str = None) -> str:
    """Draw expanding social media progress bar."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_progressbar{ext}"
    vf = f"drawbox=y=ih-{bar_height}:x=0:w='iw*(t/duration)':h={bar_height}:color={bar_color}@1.0:t=fill"
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", vf, "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_render_lower_third(ffmpeg: str, video_path: str, line1: str = "Speaker Name", line2: str = "Title", output_path: str = None) -> str:
    """Render styled lower third banner onto video."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_lowerthird{ext}"
    box = "drawbox=y=ih-120:x=40:w=420:h=80:color=black@0.7:t=fill"
    t1 = f"drawtext=text='{line1}':x=60:y=ih-110:fontsize=28:fontcolor=white:bold=1"
    t2 = f"drawtext=text='{line2}':x=60:y=ih-75:fontsize=20:fontcolor=cyan"
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", f"{box},{t1},{t2}", "-c:a", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_credits_roll(ffmpeg: str, credits_text: str, duration: float = 10.0, output_path: str = "credits.mp4") -> str:
    """Generate scrolling credits video."""
    safe_txt = credits_text.replace("\n", "\\n").replace("'", "")
    cmd = [
        ffmpeg, "-y", "-f", "lavfi", "-i", "color=c=black:s=1920x1080:r=30",
        "-t", str(duration),
        "-vf", f"drawtext=text='{safe_txt}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-(h+text_h)*t/{duration}",
        "-c:v", "libx264", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_slideshow_from_images(ffmpeg: str, image_paths: list, duration_per_image: float = 3.0, output_path: str = "slideshow.mp4") -> str:
    """Convert sequence of images into slideshow."""
    list_file = "slideshow_list.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for img in image_paths:
            f.write(f"file '{os.path.abspath(img)}'\nduration {duration_per_image}\n")
        f.write(f"file '{os.path.abspath(image_paths[-1])}'\n")
    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-pix_fmt", "yuv420p", "-c:v", "libx264", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        os.remove(list_file)
    except Exception:
        pass
    return output_path


def tool_concat_videos(ffmpeg: str, video_paths: list, output_path: str = "combined.mp4") -> str:
    """Concatenate multiple video files."""
    list_file = "concat_list.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for vp in video_paths:
            f.write(f"file '{os.path.abspath(vp)}'\n")
    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", output_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c:v", "libx264", "-c:a", "aac", output_path]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        os.remove(list_file)
    except Exception:
        pass
    return output_path


def tool_storyboard_grid(ffmpeg: str, video_path: str, cols: int = 3, rows: int = 3, output_path: str = None) -> str:
    """Generate storyboard contact sheet grid."""
    if not output_path:
        b, _ = os.path.splitext(video_path)
        output_path = f"{b}_storyboard.png"
    total_frames = cols * rows
    cmd = [
        ffmpeg, "-y", "-i", video_path,
        "-vf", f"select='not(mod(n\\,100))',scale=320:-1,tile={cols}x{rows}",
        "-frames:v", "1", "-q:v", "2", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_extract_keyframes(ffmpeg: str, video_path: str, output_dir: str = None) -> str:
    """Extract keyframes (I-frames) from video."""
    output_dir = output_dir or os.path.join(os.path.dirname(video_path), "keyframes")
    os.makedirs(output_dir, exist_ok=True)
    out_pattern = os.path.join(output_dir, "keyframe_%03d.png")
    cmd = [ffmpeg, "-y", "-i", video_path, "-vf", "select='eq(pict_type\\,I)'", "-vsync", "vfr", "-q:v", "2", out_pattern]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_dir


def tool_extract_thumbnail(ffmpeg: str, video_path: str, timestamp: str = "00:00:01", output_path: str = None) -> str:
    """Extract single frame thumbnail."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if not output_path:
        base, _ = os.path.splitext(video_path)
        output_path = f"{base}_thumbnail.png"
    cmd = [ffmpeg, "-y", "-ss", timestamp, "-i", video_path, "-vframes", "1", "-q:v", "2", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_burn_timecode(ffmpeg: str, video_path: str, output_path: str = None) -> str:
    """Burn running SMPTE timecode onto video."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_timecode{ext}"
    cmd = [
        ffmpeg, "-y", "-i", video_path,
        "-vf", "drawtext=timecode='00\\:00\\:00\\:00':r=30:x=(w-text_w)/2:y=h-60:fontsize=30:fontcolor=white:box=1:boxcolor=black@0.6",
        "-c:a", "copy", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def generate_dalle_image(prompt: str, output_file: str, api_key: str, size: str = "1792x1024") -> str:
    """Generate B-Roll image using OpenAI DALL-E 3 API."""
    url = "https://api.openai.com/v1/images/generations"
    payload = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "url"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        img_url = data["data"][0]["url"]

    # Download the image to disk
    with urllib.request.urlopen(img_url, timeout=60) as resp:
        with open(output_file, "wb") as f:
            f.write(resp.read())

    return img_url
