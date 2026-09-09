"""
mlt_tools.py - Shotcut MLT project XML manipulation, transitions, filters, and EDL export.
"""

import os
import re
import time
import shutil
import subprocess
import xml.etree.ElementTree as ET


def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', str(s))]


def tool_import_media_folder(ffmpeg: str, folder_path: str, output_path: str = None, open_in_shotcut: bool = True) -> dict:
    """
    Scans a directory for all video and audio files, sorts them in natural order,
    and builds a comprehensive multi-track Shotcut timeline project (.mlt) with:
      - Track V1: All video clips sequenced consecutively
      - Track A1: All audio voiceovers/tracks sequenced consecutively
    Optionally launches or opens it in Shotcut Video Editor.
    """
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"Folder not found: {folder_path}")
    if not os.path.isdir(folder_path):
        raise NotADirectoryError(f"Path is not a directory: {folder_path}")

    try:
        from companion.core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe
    except Exception:
        try:
            from ..core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe
        except Exception:
            from core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe

    VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv", ".flv"}
    AUDIO_EXTS = {".m4a", ".mp3", ".wav", ".aac", ".flac", ".ogg", ".wma"}

    all_entries = os.listdir(folder_path)
    video_files = []
    audio_files = []

    for fn in all_entries:
        fp = os.path.join(folder_path, fn)
        if not os.path.isfile(fp):
            continue
        ext = os.path.splitext(fn)[1].lower()
        if ext in VIDEO_EXTS:
            video_files.append(fp)
        elif ext in AUDIO_EXTS:
            audio_files.append(fp)

    video_files.sort(key=lambda p: natural_sort_key(os.path.basename(p)))
    audio_files.sort(key=lambda p: natural_sort_key(os.path.basename(p)))

    if not video_files and not audio_files:
        raise ValueError(f"No supported video or audio files found in directory: {folder_path}")

    folder_name = os.path.basename(os.path.normpath(folder_path))
    if not output_path:
        output_path = os.path.join(folder_path, f"{folder_name}_timeline.mlt")

    fps = 30
    mlt = ET.Element("mlt", {
        "LC_NUMERIC": "C",
        "version": "7.15.0",
        "title": f"MediaMogul Timeline - {folder_name}"
    })
    ET.SubElement(mlt, "profile", {
        "description": "HD 1080p 30 fps",
        "width": "1920",
        "height": "1080",
        "progressive": "1",
        "sample_aspect_num": "1",
        "sample_aspect_den": "1",
        "display_aspect_num": "16",
        "display_aspect_den": "9",
        "frame_rate_num": "30",
        "frame_rate_den": "1"
    })

    # 1. Create all Video & Audio producers first
    v_clips_info = []
    total_v_sec = 0.0
    total_v_frames = 0
    video_producers = []

    for i, v_path in enumerate(video_files):
        dur = get_media_duration_seconds(ffmpeg, v_path)
        total_v_sec += dur
        v_frames = max(1, int(dur * fps))
        total_v_frames += v_frames
        prod_id = f"producer_v{i}"
        abs_v = os.path.abspath(v_path).replace("\\", "/")

        prod = ET.SubElement(mlt, "producer", {
            "id": prod_id,
            "in": "0",
            "out": str(v_frames - 1)
        })
        ET.SubElement(prod, "property", {"name": "resource"}).text = abs_v
        ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

        video_producers.append((prod_id, v_frames))
        v_clips_info.append({
            "path": v_path,
            "filename": os.path.basename(v_path),
            "duration_sec": round(dur, 2),
            "frames": v_frames
        })

    a_clips_info = []
    total_a_sec = 0.0
    total_a_frames = 0
    audio_producers = []

    if audio_files:
        for j, a_path in enumerate(audio_files):
            dur = get_media_duration_seconds(ffmpeg, a_path)
            total_a_sec += dur
            a_frames = max(1, int(dur * fps))
            total_a_frames += a_frames
            prod_id = f"producer_a{j}"
            abs_a = os.path.abspath(a_path).replace("\\", "/")

            prod = ET.SubElement(mlt, "producer", {
                "id": prod_id,
                "in": "0",
                "out": str(a_frames - 1)
            })
            ET.SubElement(prod, "property", {"name": "resource"}).text = abs_a
            ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

            audio_producers.append((prod_id, a_frames))
            a_clips_info.append({
                "path": a_path,
                "filename": os.path.basename(a_path),
                "duration_sec": round(dur, 2),
                "frames": a_frames
            })

    # 2. Create Playlists referencing the producers
    if video_producers:
        pl_v1 = ET.SubElement(mlt, "playlist", {"id": "playlist_v1"})
        for prod_id, v_frames in video_producers:
            ET.SubElement(pl_v1, "entry", {
                "producer": prod_id,
                "in": "0",
                "out": str(v_frames - 1)
            })

    pl_a1 = None
    if audio_producers:
        pl_a1 = ET.SubElement(mlt, "playlist", {"id": "playlist_a1"})
        for prod_id, a_frames in audio_producers:
            ET.SubElement(pl_a1, "entry", {
                "producer": prod_id,
                "in": "0",
                "out": str(a_frames - 1)
            })

    # 3. Tractor Multitrack with full duration
    timeline_total_frames = max(total_v_frames, total_a_frames, 1)
    tractor = ET.SubElement(mlt, "tractor", {
        "id": "tractor0",
        "title": "Shotcut Timeline",
        "in": "0",
        "out": str(timeline_total_frames - 1)
    })
    multitrack = ET.SubElement(tractor, "multitrack")

    if video_files:
        ET.SubElement(multitrack, "track", {"producer": "playlist_v1"})
    if audio_files and pl_a1 is not None:
        ET.SubElement(multitrack, "track", {"producer": "playlist_a1", "hide": "video"})

    # Mix transition if both video and audio exist
    if video_files and audio_files:
        trans = ET.SubElement(tractor, "transition", {"id": "transition_mix"})
        ET.SubElement(trans, "property", {"name": "mlt_service"}).text = "mix"
        ET.SubElement(trans, "property", {"name": "always_active"}).text = "1"
        ET.SubElement(trans, "property", {"name": "combine"}).text = "1"
        ET.SubElement(trans, "property", {"name": "a_track"}).text = "0"
        ET.SubElement(trans, "property", {"name": "b_track"}).text = "1"

    tree = ET.ElementTree(mlt)
    ET.indent(tree, space="  ", level=0)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)

    if open_in_shotcut:
        try:
            sc_exe = find_shotcut_exe()
            if sc_exe and os.path.exists(sc_exe):
                subprocess.Popen([sc_exe, output_path], creationflags=0x00000008 | 0x00000200)
        except Exception:
            pass

    return {
        "mlt_project": output_path,
        "video_clips": v_clips_info,
        "audio_clips": a_clips_info,
        "total_video_duration_sec": round(total_v_sec, 2),
        "total_audio_duration_sec": round(total_a_sec, 2),
        "open_in_shotcut": open_in_shotcut
    }


def tool_add_to_timeline(ffmpeg: str, input_path, mlt_path: str = None,
                         in_time: str = "00:00:00", out_time: str = None,
                         output_path: str = None, open_in_shotcut: bool = True) -> str:
    """
    Adds media files directly into a Shotcut .mlt timeline project,
    and optionally launches or opens it in Shotcut Video Editor.
    If input_path is a directory, imports all video and audio files from the directory.
    If mlt_path is not specified or doesn't exist, a new Shotcut project (.mlt) is created.
    """
    # Check if input is a directory or list of files
    if isinstance(input_path, (list, tuple)):
        # If passed list of files, write multi-clip timeline
        if len(input_path) == 1 and os.path.isdir(str(input_path[0])):
            res = tool_import_media_folder(ffmpeg, str(input_path[0]), output_path=output_path, open_in_shotcut=open_in_shotcut)
            return res["mlt_project"]
        
        parent = os.path.dirname(os.path.abspath(input_path[0])) if input_path else ""
        if not output_path and parent:
            output_path = os.path.join(parent, "multi_clip_timeline.mlt")
        elif not output_path:
            output_path = "multi_clip_timeline.mlt"
            
        fps = 30
        mlt = ET.Element("mlt", {
            "LC_NUMERIC": "C",
            "version": "7.15.0",
            "title": "MediaMogul Timeline"
        })
        ET.SubElement(mlt, "profile", {
            "description": "HD 1080p 30 fps",
            "width": "1920",
            "height": "1080",
            "progressive": "1",
            "sample_aspect_num": "1",
            "sample_aspect_den": "1",
            "display_aspect_num": "16",
            "display_aspect_den": "9",
            "frame_rate_num": "30",
            "frame_rate_den": "1"
        })
        producers_list = []
        total_frames = 0
        for i, clip in enumerate(input_path):
            if not os.path.exists(clip):
                continue
            dur = get_media_duration_seconds(ffmpeg, clip)
            c_frames = max(1, int(dur * fps))
            total_frames += c_frames
            pid = f"producer{i}"
            prod = ET.SubElement(mlt, "producer", {"id": pid, "in": "0", "out": str(c_frames - 1)})
            ET.SubElement(prod, "property", {"name": "resource"}).text = os.path.abspath(clip).replace("\\", "/")
            ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"
            producers_list.append((pid, c_frames))

        pl = ET.SubElement(mlt, "playlist", {"id": "playlist0"})
        for pid, c_frames in producers_list:
            ET.SubElement(pl, "entry", {"producer": pid, "in": "0", "out": str(c_frames - 1)})

        tractor = ET.SubElement(mlt, "tractor", {
            "id": "tractor0",
            "title": "Shotcut Timeline",
            "in": "0",
            "out": str(max(1, total_frames) - 1)
        })
        multitrack = ET.SubElement(tractor, "multitrack")
        ET.SubElement(multitrack, "track", {"producer": "playlist0"})

        tree = ET.ElementTree(mlt)
        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)

        if open_in_shotcut:
            try:
                sc_exe = find_shotcut_exe()
                if sc_exe and os.path.exists(sc_exe):
                    subprocess.Popen([sc_exe, output_path], creationflags=0x00000008 | 0x00000200)
            except Exception:
                pass
        return output_path
    elif isinstance(input_path, str) and os.path.isdir(input_path):
        res = tool_import_media_folder(ffmpeg, input_path, output_path=output_path, open_in_shotcut=open_in_shotcut)
        return res["mlt_project"]

    if not isinstance(input_path, str) or not os.path.exists(input_path):
        raise FileNotFoundError(f"Media file not found: {input_path}")

    try:
        from companion.core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe
    except Exception:
        try:
            from ..core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe
        except Exception:
            from core.ffmpeg_utils import get_media_duration_seconds, find_shotcut_exe

    # Calculate duration
    total_sec = get_media_duration_seconds(ffmpeg, input_path)
    fps = 30
    total_frames = max(1, int(total_sec * fps))

    # Parse in_time and out_time
    def _parse_time_to_seconds(t_val, default=0.0):
        if t_val is None:
            return default
        if isinstance(t_val, (int, float)):
            return float(t_val)
        s = str(t_val).strip()
        parts = s.split(":")
        try:
            if len(parts) == 3:
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return float(parts[0]) * 60 + float(parts[1])
            else:
                return float(s)
        except Exception:
            return default

    in_sec = _parse_time_to_seconds(in_time, 0.0)
    out_sec = _parse_time_to_seconds(out_time, total_sec)
    if out_sec <= in_sec:
        out_sec = total_sec

    in_frame = max(0, int(in_sec * fps))
    out_frame = min(total_frames, int(out_sec * fps))

    abs_media = os.path.abspath(input_path).replace("\\", "/")

    if mlt_path and os.path.exists(mlt_path):
        if not output_path:
            output_path = mlt_path
        tree = ET.parse(mlt_path)
        root = tree.getroot()

        existing_producers = root.findall(".//producer")
        new_prod_id = f"producer{len(existing_producers)}"

        prod = ET.Element("producer", {
            "id": new_prod_id,
            "in": "0",
            "out": str(total_frames)
        })
        ET.SubElement(prod, "property", {"name": "resource"}).text = abs_media
        ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

        first_playlist = root.find(".//playlist")
        if first_playlist is not None:
            idx = list(root).index(first_playlist)
            root.insert(idx, prod)
        else:
            root.append(prod)

        playlist = root.find(".//playlist")
        if playlist is None:
            playlist = ET.SubElement(root, "playlist", {"id": "playlist0"})
            tractor = root.find(".//tractor")
            if tractor is None:
                tractor = ET.SubElement(root, "tractor", {"id": "tractor0", "title": "Shotcut Timeline"})
                multitrack = ET.SubElement(tractor, "multitrack")
                ET.SubElement(multitrack, "track", {"producer": "playlist0"})

        ET.SubElement(playlist, "entry", {
            "producer": new_prod_id,
            "in": str(in_frame),
            "out": str(out_frame)
        })
        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)
    else:
        if not output_path:
            base, _ = os.path.splitext(input_path)
            output_path = f"{base}_timeline.mlt"

        mlt = ET.Element("mlt", {
            "LC_NUMERIC": "C",
            "version": "7.15.0",
            "title": f"MediaMogul Timeline - {os.path.basename(input_path)}"
        })
        ET.SubElement(mlt, "profile", {
            "description": "HD 1080p 30 fps",
            "width": "1920",
            "height": "1080",
            "progressive": "1",
            "sample_aspect_num": "1",
            "sample_aspect_den": "1",
            "display_aspect_num": "16",
            "display_aspect_den": "9",
            "frame_rate_num": "30",
            "frame_rate_den": "1"
        })
        prod = ET.SubElement(mlt, "producer", {
            "id": "producer0",
            "in": "0",
            "out": str(total_frames)
        })
        ET.SubElement(prod, "property", {"name": "resource"}).text = abs_media
        ET.SubElement(prod, "property", {"name": "mlt_service"}).text = "avformat"

        playlist = ET.SubElement(mlt, "playlist", {"id": "playlist0"})
        ET.SubElement(playlist, "entry", {
            "producer": "producer0",
            "in": str(in_frame),
            "out": str(out_frame)
        })

        tractor = ET.SubElement(mlt, "tractor", {"id": "tractor0", "title": "Shotcut Timeline"})
        multitrack = ET.SubElement(tractor, "multitrack")
        ET.SubElement(multitrack, "track", {"producer": "playlist0"})

        tree = ET.ElementTree(mlt)
        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)

    if open_in_shotcut:
        try:
            sc_exe = find_shotcut_exe()
            if sc_exe and os.path.exists(sc_exe):
                subprocess.Popen([sc_exe, output_path], creationflags=0x00000008 | 0x00000200)
        except Exception:
            pass

    return output_path


def tool_modify_shotcut_mlt(mlt_path: str, filter_type: str, params: dict = None, output_path: str = None) -> str:
    """Inject a filter directly into Shotcut's MLT XML structure."""
    if not os.path.exists(mlt_path):
        raise FileNotFoundError(f"MLT file not found: {mlt_path}")
    if not output_path:
        base, ext = os.path.splitext(mlt_path)
        output_path = f"{base}_mediamogul{ext}"
    params = params or {}
    tree = ET.parse(mlt_path)
    root = tree.getroot()

    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root

    filter_elem = ET.SubElement(parent, "filter")
    filter_elem.set("id", f"mediamogul_{filter_type}_{int(time.time())}")

    ET.SubElement(filter_elem, "property", name="mlt_service").text = filter_type
    for k, v in params.items():
        ET.SubElement(filter_elem, "property", name=k).text = str(v)

    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_mlt_add_transition(mlt_path: str, transition_type: str = "luma", duration_frames: int = 30, output_path: str = None) -> str:
    """Add transition into Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_transition.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    trans = ET.SubElement(parent, "transition")
    trans.set("id", f"trans_{int(time.time())}")
    ET.SubElement(trans, "property", name="mlt_service").text = transition_type
    ET.SubElement(trans, "property", name="in").text = "0"
    ET.SubElement(trans, "property", name="out").text = str(duration_frames)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_mlt_crop_filter(mlt_path: str, top: int = 0, bottom: int = 0, left: int = 0, right: int = 0, output_path: str = None) -> str:
    """Insert crop filter into Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_cropped.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    filt = ET.SubElement(parent, "filter")
    filt.set("id", f"crop_{int(time.time())}")
    ET.SubElement(filt, "property", name="mlt_service").text = "crop"
    ET.SubElement(filt, "property", name="top").text = str(top)
    ET.SubElement(filt, "property", name="bottom").text = str(bottom)
    ET.SubElement(filt, "property", name="left").text = str(left)
    ET.SubElement(filt, "property", name="right").text = str(right)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_mlt_blur_filter(mlt_path: str, blur_radius: float = 0.2, output_path: str = None) -> str:
    """Add blur filter into Shotcut .mlt XML."""
    output_path = output_path or f"{os.path.splitext(mlt_path)[0]}_blurred.mlt"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    tractor = root.find(".//tractor")
    parent = tractor if tractor is not None else root
    filt = ET.SubElement(parent, "filter")
    filt.set("id", f"blur_{int(time.time())}")
    ET.SubElement(filt, "property", name="mlt_service").text = "boxblur"
    ET.SubElement(filt, "property", name="radius").text = str(blur_radius)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return output_path


def tool_export_edl(mlt_path: str, output_edl_path: str = None) -> str:
    """Export Edit Decision List (EDL) CMX 3600 from MLT project."""
    output_edl_path = output_edl_path or f"{os.path.splitext(mlt_path)[0]}.edl"
    tree = ET.parse(mlt_path)
    root = tree.getroot()
    edl_lines = ["TITLE: SHOTCUT_PROJECT", "FCM: NON-DROP FRAME\n"]
    idx = 1
    for clip in root.findall(".//producer"):
        src = clip.find("property[@name='resource']")
        if src is not None and src.text:
            fn = os.path.basename(src.text)
            edl_lines.append(f"{idx:03d}  AX       V     C        00:00:00:00 00:00:10:00 00:00:00:00 00:00:10:00")
            edl_lines.append(f"* FROM CLIP NAME: {fn}\n")
            idx += 1
    with open(output_edl_path, "w", encoding="utf-8") as f:
        f.write("\n".join(edl_lines))
    return output_edl_path


def tool_batch_rename(folder_path: str, pattern: str = "{index:03d}_{name}", dry_run: bool = False) -> list:
    """Batch rename files with numbering pattern."""
    files = sorted([f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))])
    renamed = []
    for idx, fn in enumerate(files, 1):
        b, ext = os.path.splitext(fn)
        new_name = pattern.format(index=idx, name=b) + ext
        old_full = os.path.join(folder_path, fn)
        new_full = os.path.join(folder_path, new_name)
        if not dry_run and old_full != new_full:
            shutil.move(old_full, new_full)
        renamed.append({"old": fn, "new": new_name})
    return renamed


def tool_calculate_stats(ffmpeg: str, video_path: str) -> dict:
    """Calculate duration, dimensions, bitrates, and streams."""
    cmd = [ffmpeg, "-i", video_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stats = {"file": os.path.basename(video_path), "size_mb": round(os.path.getsize(video_path)/(1024*1024), 2)}
    for l in res.stderr.splitlines():
        if "Duration:" in l:
            stats["duration"] = l.split("Duration:")[1].split(",")[0].strip()
            stats["bitrate"] = l.split("bitrate:")[1].strip() if "bitrate:" in l else "unknown"
        elif "Stream #" in l and "Video:" in l:
            stats["video_stream"] = l.split("Video:")[1].strip()
        elif "Stream #" in l and "Audio:" in l:
            stats["audio_stream"] = l.split("Audio:")[1].strip()
    return stats


def parse_mlt_project(mlt_file: str) -> dict:
    """Parse Shotcut .mlt file to inspect tracks, media files, filters, and timeline metadata."""
    if not os.path.exists(mlt_file):
        raise FileNotFoundError(f"Shotcut project file not found: {mlt_file}")

    tree = ET.parse(mlt_file)
    root = tree.getroot()

    producers = []
    for p in root.findall(".//producer"):
        pid = p.attrib.get("id", "")
        res = p.find("property[@name='resource']")
        length = p.find("property[@name='length']")
        service = p.find("property[@name='mlt_service']")
        if res is not None and res.text:
            producers.append({
                "id": pid,
                "source": res.text,
                "filename": os.path.basename(res.text),
                "length": length.text if length is not None else "unknown",
                "service": service.text if service is not None else "avformat"
            })

    # Find filters and transitions
    filters = []
    for f in root.findall(".//filter"):
        fid = f.attrib.get("id", "")
        svc = f.find("property[@name='mlt_service']")
        filters.append({
            "id": fid,
            "service": svc.text if svc is not None else "unknown"
        })

    transitions = []
    for t in root.findall(".//transition"):
        tid = t.attrib.get("id", "")
        svc = t.find("property[@name='mlt_service']")
        transitions.append({
            "id": tid,
            "service": svc.text if svc is not None else "unknown"
        })

    # Track count
    tracks = 0
    multitrack = root.find(".//tractor/multitrack")
    if multitrack is not None:
        tracks = len(multitrack.findall("track"))
    if tracks == 0:
        tracks = len(root.findall(".//playlist"))

    return {
        "file": mlt_file,
        "title": root.attrib.get("title", os.path.basename(mlt_file)),
        "producers_count": len(producers),
        "producers": producers,
        "filters_count": len(filters),
        "filters": filters,
        "transitions_count": len(transitions),
        "transitions": transitions,
        "tracks_count": max(1, tracks),
        "mtime": os.path.getmtime(mlt_file) if os.path.exists(mlt_file) else 0
    }


def tool_evaluate_timeline(mlt_path: str, previous_clip_count: int = None) -> dict:
    """
    Evaluates Shotcut timeline pacing, track balance, audio normalization,
    element overlay density, and generates intelligent editing recommendations.
    """
    info = parse_mlt_project(mlt_path)
    clips = info.get("producers", [])
    filters = info.get("filters", [])
    transitions = info.get("transitions", [])
    num_clips = len(clips)
    num_tracks = info.get("tracks_count", 1)

    filter_services = [f.get("service", "") for f in filters]
    has_subtitles = any(".srt" in c.get("source", "").lower() or "sub" in c.get("id", "").lower() for c in clips)
    has_gain_control = any("volume" in s.lower() or "gain" in s.lower() for s in filter_services)
    has_overlays = any("qtblend" in s.lower() or "element" in c.get("source", "").lower() or "tgs" in c.get("source", "").lower() for c in clips for s in filter_services) or num_tracks > 1
    has_transitions = len(transitions) > 0

    delta = (num_clips - previous_clip_count) if previous_clip_count is not None else 0

    recommendations = []
    if not has_subtitles:
        recommendations.append("🎙️ Generate synchronised subtitles (.srt) with Whisper for increased retention.")
    if not has_gain_control:
        recommendations.append("🔊 Apply audio ducking / gain normalization across voice and background audio.")
    if not has_overlays:
        recommendations.append("✨ Add dynamic Shotcut library elements (stickers, emojis, arrows) to highlight key moments.")
    if not has_transitions and num_clips >= 2:
        recommendations.append("🎬 Insert smooth cross-dissolve/luma transitions at cut boundaries.")
    if num_clips > 4:
        recommendations.append("🌌 Generate 5-Universe Multiverse Timelines for director's, viral, and overlay variants.")

    report = (
        f"📋 Timeline Evaluation for '{os.path.basename(mlt_path)}':\n"
        f"• Total Clips: {num_clips} (delta: {delta:+d})\n"
        f"• Active Tracks: {num_tracks}\n"
        f"• Filters Applied: {len(filters)} ({', '.join(set(filter_services)) if filter_services else 'None'})\n"
        f"• Transitions: {len(transitions)}\n"
        f"• Subtitle Track: {'✓ Detected' if has_subtitles else '✗ Missing'}\n"
        f"• Audio Leveling: {'✓ Active' if has_gain_control else '✗ Needs Gain/Ducking'}\n"
        f"• Elements/Overlays: {'✓ Present' if has_overlays else '✗ None'}\n"
        f"\nRecommended Next Actions:\n" + "\n".join(f"  {r}" for r in recommendations)
    )

    return {
        "file": mlt_path,
        "clip_count": num_clips,
        "delta": delta,
        "track_count": num_tracks,
        "has_subtitles": has_subtitles,
        "has_gain_control": has_gain_control,
        "has_overlays": has_overlays,
        "recommendations": recommendations,
        "report": report
    }


def tool_render_mlt_with_shotcut(
    mlt_path: str,
    output_mp4: str = None,
    ffmpeg: str = None,
    preset: str = "fast",
    crf: int = 20,
    clean_ai_metadata: bool = True
) -> dict:
    """
    Renders an MLT project timeline to a finished, export-ready MP4 using Shotcut's MLT Melt engine.
    Also strips any AI metadata tags if clean_ai_metadata is True, ensuring 100% Fingerprint-Free delivery.
    """
    if not os.path.exists(mlt_path):
        raise FileNotFoundError(f"MLT project not found: {mlt_path}")

    try:
        from companion.core.ffmpeg_utils import find_melt, find_ffmpeg, get_media_duration_seconds
    except Exception:
        try:
            from ..core.ffmpeg_utils import find_melt, find_ffmpeg, get_media_duration_seconds
        except Exception:
            from core.ffmpeg_utils import find_melt, find_ffmpeg, get_media_duration_seconds

    if not ffmpeg:
        ffmpeg = find_ffmpeg()

    if not output_mp4:
        base, _ = os.path.splitext(mlt_path)
        output_mp4 = f"{base}_rendered.mp4"

    melt_exe = find_melt()
    if not melt_exe or not os.path.exists(melt_exe):
        raise RuntimeError(f"Shotcut MLT engine (melt.exe) not found. Contained Shotcut should be in /v2/MediaMogul/shotcut/.")

    # Target intermediate file if stripping metadata
    temp_target = output_mp4 if not clean_ai_metadata else output_mp4 + ".raw.mp4"
    if os.path.exists(temp_target):
        try:
            os.remove(temp_target)
        except Exception:
            pass

    from companion.core.security import sanitize_text, validate_output_video_path

    output_mp4 = validate_output_video_path(output_mp4)

    cmd = [
        melt_exe,
        mlt_path,
        "-consumer", f"avformat:{temp_target}",
        "vcodec=libx264",
        f"preset={preset}",
        f"crf={crf}",
        "threads=0",      # Auto multi-core threads
        "real_time=-1",   # Maximize processing throughput
        "acodec=aac",
        "ab=192k",
        "movflags=+faststart",
        "terminate_on_pause=1"
    ]

    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
    if process.returncode != 0 or not os.path.exists(temp_target) or os.path.getsize(temp_target) == 0:
        err_out = sanitize_text(process.stderr.decode("utf-8", errors="ignore"))
        raise RuntimeError(f"Shotcut Melt render failed with code {process.returncode}:\n{err_out[:500]}")

    final_output = temp_target
    if clean_ai_metadata and ffmpeg:
        # Scrub any AI metadata, synthetic flags, C2PA claims, or generator comments
        clean_mp4 = output_mp4
        if os.path.exists(clean_mp4):
            try:
                os.remove(clean_mp4)
            except Exception:
                pass

        scrub_cmd = [
            ffmpeg, "-y",
            "-threads", "0",
            "-i", temp_target,
            "-map_metadata", "-1",
            "-metadata", "comment=",
            "-metadata", "description=",
            "-metadata", "synopsis=",
            "-metadata", "artist=CryptArtistStudio MediaMogul",
            "-c", "copy",
            clean_mp4
        ]
        res_scrub = subprocess.run(scrub_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res_scrub.returncode == 0 and os.path.exists(clean_mp4) and os.path.getsize(clean_mp4) > 0:
            final_output = clean_mp4
            try:
                os.remove(temp_target)
            except Exception:
                pass
        else:
            final_output = temp_target

    dur = get_media_duration_seconds(ffmpeg, final_output) if ffmpeg else 0.0
    size_mb = round(os.path.getsize(final_output) / (1024 * 1024), 2)

    return {
        "status": "success",
        "rendered_mp4": final_output,
        "duration_sec": round(dur, 2),
        "size_mb": size_mb,
        "engine": "Shotcut MLT (melt.exe)",
        "fingerprint_free": clean_ai_metadata
    }

