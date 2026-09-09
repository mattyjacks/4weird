"""
audio_tools.py - Dedicated audio processing and manipulation capabilities.
"""

import os
import time
import json
import subprocess
import urllib.request
import xml.etree.ElementTree as ET


def tool_detect_silence(ffmpeg: str, audio_path: str, noise_threshold_db: float = -30.0, min_duration_sec: float = 0.5) -> list:
    """Detect silent intervals for automatic jump-cutting."""
    cmd = [
        ffmpeg, "-i", audio_path,
        "-af", f"silencedetect=noise={noise_threshold_db}dB:d={min_duration_sec}",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    intervals = []
    curr_start = None
    for line in res.stderr.splitlines():
        if "silence_start:" in line:
            curr_start = float(line.split("silence_start:")[1].strip())
        elif "silence_end:" in line and curr_start is not None:
            end_val = float(line.split("silence_end:")[1].split("|")[0].strip())
            intervals.append({"start": curr_start, "end": end_val, "duration": round(end_val - curr_start, 3)})
            curr_start = None
    return intervals


def tool_fade_audio(ffmpeg: str, audio_path: str, fade_in_sec: float = 1.0, fade_out_sec: float = 1.0, output_path: str = None) -> str:
    """Apply fade-in and fade-out to audio."""
    if not output_path:
        b, ext = os.path.splitext(audio_path)
        output_path = f"{b}_faded{ext}"
    cmd_probe = [ffmpeg, "-i", audio_path]
    probe = subprocess.run(cmd_probe, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    dur = 10.0
    for l in probe.stderr.splitlines():
        if "Duration:" in l:
            try:
                t_str = l.split("Duration:")[1].split(",")[0].strip()
                h, m, s = t_str.split(":")
                dur = float(h)*3600 + float(m)*60 + float(s)
            except Exception:
                pass
    st_out = max(0.0, dur - fade_out_sec)
    af = f"afade=t=in:ss=0:d={fade_in_sec},afade=t=out:st={st_out}:d={fade_out_sec}"
    cmd = [ffmpeg, "-y", "-i", audio_path, "-af", af, output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_normalize_loudness(ffmpeg: str, audio_path: str, target_lufs: float = -14.0, output_path: str = None) -> str:
    """Normalize audio loudness according to EBU R128 standard (-14 LUFS default)."""
    if not output_path:
        b, ext = os.path.splitext(audio_path)
        output_path = f"{b}_norm{ext}"
    cmd = [ffmpeg, "-y", "-i", audio_path, "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_audio_ducking(ffmpeg: str, background_audio: str, voice_audio: str, output_path: str = None) -> str:
    """Automatically duck background music when voiceover speech is present."""
    if not output_path:
        b, ext = os.path.splitext(background_audio)
        output_path = f"{b}_ducked{ext}"
    cmd = [
        ffmpeg, "-y", "-i", background_audio, "-i", voice_audio,
        "-filter_complex", "[0:a][1:a]sidechaincompress=threshold=0.1:ratio=4:attack=20:release=300[out]",
        "-map", "[out]", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_denoise_audio(ffmpeg: str, audio_path: str, output_path: str = None) -> str:
    """Filter out background hum and hiss."""
    if not output_path:
        b, ext = os.path.splitext(audio_path)
        output_path = f"{b}_denoised{ext}"
    cmd = [ffmpeg, "-y", "-i", audio_path, "-af", "highpass=f=120,lowpass=f=8000", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_remove_audio(ffmpeg: str, video_path: str, output_path: str = None) -> str:
    """Strip audio stream entirely from video."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_muted{ext}"
    cmd = [ffmpeg, "-y", "-i", video_path, "-an", "-c:v", "copy", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_mux_audio_video(ffmpeg: str, video_path: str, audio_path: str, output_path: str = None) -> str:
    """Mux new audio track into video, replacing or adding sound."""
    if not output_path:
        b, ext = os.path.splitext(video_path)
        output_path = f"{b}_muxed{ext}"
    cmd = [ffmpeg, "-y", "-i", video_path, "-i", audio_path, "-c:v", "copy", "-c:a", "aac", "-shortest", output_path]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_audio_waveform(ffmpeg: str, audio_path: str, width: int = 1280, height: int = 360, output_path: str = None) -> str:
    """Generate visual audio waveform video."""
    if not output_path:
        b, _ = os.path.splitext(audio_path)
        output_path = f"{b}_waveform.mp4"
    cmd = [
        ffmpeg, "-y", "-i", audio_path,
        "-filter_complex", f"showwaves=s={width}x{height}:mode=line:colors=cyan,format=yuv420p[v]",
        "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-c:a", "copy", output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return output_path


def tool_mlt_set_gain(mlt_path: str, gain_db: float = 0.0, output_path: str = None) -> str:
    """Adjust audio gain in Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_gain.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    filt = ET.SubElement(parent, "filter")
    filt.set("id", f"gain_{int(time.time())}")
    ET.SubElement(filt, "property", name="mlt_service").text = "volume"
    ET.SubElement(filt, "property", name="gain").text = str(gain_db)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def generate_tts_audio(text: str, output_file: str, voice: str, api_key: str, model: str = "tts-1") -> str:
    """Synthesize speech using OpenAI Text-to-Speech API."""
    url = "https://api.openai.com/v1/audio/speech"
    payload = {
        "model": model,
        "input": text,
        "voice": voice.lower()
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        with open(output_file, "wb") as f:
            f.write(resp.read())
    return output_file
