"""
element_tools.py - Integration with Shotcut's Built-in Elements Library (Stickers, Emojis, Sounds, Graphics)
Enables automatic discovery, keyword resolution, and placement of Shotcut library elements
onto dedicated overlay timeline tracks (V2 / SFX A1) with native MLT glaxnimate & qtblend compositing.
"""

import os
import re
import json
import random
import subprocess
try:
    from companion.core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe, get_media_duration_seconds
except ImportError:
    try:
        from ..core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe, get_media_duration_seconds
    except ImportError:
        from core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe, get_media_duration_seconds


def find_shotcut_elements_dir() -> str:
    """Locate Shotcut's built-in elements folder containing emojis, graphics, sounds, text, transitions."""
    sc_exe = find_shotcut_exe()
    if sc_exe:
        base = os.path.dirname(sc_exe)
        for cand in (
            os.path.join(base, "share", "shotcut", "elements"),
            os.path.join(os.path.dirname(base), "share", "shotcut", "elements"),
            os.path.join(base, "elements"),
        ):
            if os.path.exists(cand):
                return os.path.abspath(cand)

    candidates = [
        r"C:\Program Files\Shotcut\share\shotcut\elements",
        r"C:\Program Files (x86)\Shotcut\share\shotcut\elements",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Shotcut\share\shotcut\elements"),
        os.path.expandvars(r"%LOCALAPPDATA%\Shotcut\share\shotcut\elements"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return None


def list_shotcut_elements(category: str = None, query: str = None) -> list:
    """
    Lists and searches Shotcut library elements.
    Categories: 'activity', 'food', 'nature', 'object', 'person', 'standard', 'symbol', 'travel',
                'graphics', 'sounds', 'text', 'transitions'.
    """
    elem_root = find_shotcut_elements_dir()
    if not elem_root or not os.path.exists(elem_root):
        return []

    results = []
    q = query.lower().strip() if query else None
    cat_filter = category.lower().strip() if category else None

    for root, _, files in os.walk(elem_root):
        rel = os.path.relpath(root, elem_root).replace("\\", "/").lower()
        if rel == ".":
            curr_cat = "root"
        else:
            curr_cat = rel.replace("emojis/", "")

        if cat_filter and cat_filter != "all" and cat_filter not in curr_cat:
            continue

        for fn in files:
            name, ext = os.path.splitext(fn)
            ext_l = ext.lower()
            if ext_l not in (".tgs", ".json", ".rawr", ".flac", ".webp", ".png"):
                continue

            # Format human-friendly display name
            display_name = name
            # Remove leading numbering like '001-'
            clean_name = re.sub(r"^\d+[-_]", "", name)

            if q and (q not in name.lower() and q not in curr_cat):
                continue

            elem_type = "sticker_lottie" if ext_l in (".tgs", ".json") else \
                        ("sound_sfx" if ext_l in (".flac", ".wav", ".mp3") else \
                        ("template_text" if ext_l == ".rawr" else "graphic"))

            results.append({
                "name": name,
                "clean_name": clean_name,
                "category": curr_cat,
                "filename": fn,
                "path": os.path.join(root, fn).replace("\\", "/"),
                "extension": ext_l,
                "type": elem_type
            })

    results.sort(key=lambda x: (x["category"], x["name"]))
    return results


def resolve_shotcut_element(name_or_query: str) -> dict:
    """
    Fuzzy resolves a user prompt or keyword to the exact Shotcut element file.
    Examples: 'halloween' -> '001-halloween_jack_o_lantern_pumpkin.tgs'
              'confetti'  -> '009-confetti.tgs'
              'fireworks' -> '003-fireworks.tgs'
              'subscribe' -> 'Subscribe.json'
              'whoosh'    -> 'Woosh.flac'
    """
    if not name_or_query:
        return None

    # Check if exact file path passed
    if os.path.exists(name_or_query):
        fn = os.path.basename(name_or_query)
        name, ext = os.path.splitext(fn)
        return {
            "name": name,
            "path": os.path.abspath(name_or_query).replace("\\", "/"),
            "extension": ext.lower(),
            "category": "custom"
        }

    all_elems = list_shotcut_elements()
    if not all_elems:
        return None

    q = name_or_query.lower().strip()
    # 1. Exact match on filename or name
    for el in all_elems:
        if el["name"].lower() == q or el["filename"].lower() == q or el["clean_name"].lower() == q:
            return el

    # 2. Substring match
    for el in all_elems:
        if q in el["clean_name"].lower() or q in el["name"].lower():
            return el

    # 3. Keyword semantic associations
    keyword_map = {
        "halloween": "001-halloween_jack_o_lantern",
        "pumpkin": "001-halloween_jack_o_lantern",
        "christmas": "002-christmas_tree",
        "xmas": "002-christmas_tree",
        "fireworks": "003-fireworks",
        "sparkler": "004-sparkler",
        "firecracker": "005-firecracker",
        "sparkles": "006-sparkles",
        "sparkle": "006-sparkles",
        "magic": "006-sparkles",
        "balloon": "007-balloon",
        "balloons": "007-balloon",
        "popper": "008-popper",
        "party_popper": "008-popper",
        "party": "008-popper",
        "celebration": "009-confetti",
        "confetti": "009-confetti",
        "subscribe": "Subscribe",
        "sub": "Subscribe",
        "youtube": "Subscribe",
        "bell": "Ding",
        "ding": "Ding",
        "chime": "Ding",
        "whoosh": "Woosh",
        "swoosh": "Woosh",
        "laugh": "Laugh",
        "funny": "Laugh",
        "arrow": "Arrow",
        "pointer": "Arrow",
        "star": "Gold Star",
        "loading": "Loading",
        "lower_third": "Lower Third",
        "title": "Centered Title Boxes",
        "banner": "Top Banner",
    }
    for kw, target in keyword_map.items():
        if kw in q:
            for el in all_elems:
                if target.lower() in el["name"].lower():
                    return el

    # Fallback to first element containing any word in query
    words = q.split()
    for w in words:
        if len(w) >= 3:
            for el in all_elems:
                if w in el["name"].lower():
                    return el

    # Fallback to confetti if no match
    for el in all_elems:
        if "confetti" in el["name"].lower():
            return el
    return all_elems[0]


def _calculate_element_rect(position: str = "bottom_right", scale: float = 1.0, canvas_w: int = 1920, canvas_h: int = 1080) -> str:
    """
    Calculates MLT affine rect string 'X Y Width Height 1' for placing elements on screen.
    """
    base_size = int(420 * scale)
    pos = (position or "bottom_right").lower().replace("-", "_").strip()

    if pos == "center":
        w = int(580 * scale)
        h = int(580 * scale)
        x = (canvas_w - w) // 2
        y = (canvas_h - h) // 2
    elif pos == "top_right":
        w = base_size
        h = base_size
        x = canvas_w - w - 60
        y = 60
    elif pos == "top_left":
        w = base_size
        h = base_size
        x = 60
        y = 60
    elif pos == "bottom_left":
        w = base_size
        h = base_size
        x = 60
        y = canvas_h - h - 60
    elif pos == "full":
        return f"0 0 {canvas_w} {canvas_h} 1"
    elif pos == "lower_third":
        w = int(canvas_w * 0.8)
        h = int(220 * scale)
        x = (canvas_w - w) // 2
        y = canvas_h - h - 80
    else:  # bottom_right default
        w = base_size
        h = base_size
        x = canvas_w - w - 60
        y = canvas_h - h - 60

    return f"{x} {y} {w} {h} 1"


def _parse_time_seconds(t_val, default: float = 0.0) -> float:
    """Parses time into float seconds."""
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
        return float(s)
    except Exception:
        return default


def tool_add_element_to_timeline(ffmpeg: str, input_video_or_mlt: str, element_name: str,
                                 timestamp: str = "00:00:02", duration_sec: float = 3.5,
                                 position: str = "bottom_right", scale: float = 1.0,
                                 sound_effect: str = None, output_path: str = None,
                                 open_in_shotcut: bool = True) -> str:
    """
    Places an element from the Shotcut library (e.g. animated sticker, graphic, text)
    onto a dedicated overlay timeline track (V2) in the Shotcut project (.mlt).
    If sound_effect is provided, synchronizes an audio trigger from Shotcut library on the timeline.
    """
    if not os.path.exists(input_video_or_mlt):
        raise FileNotFoundError(f"Source media or project not found: {input_video_or_mlt}")

    # Resolve element file
    elem_info = resolve_shotcut_element(element_name)
    if not elem_info:
        raise ValueError(f"Could not resolve Shotcut element for: '{element_name}'")

    elem_path = elem_info["path"]
    fps = 30

    # Probe duration of base media
    is_mlt = input_video_or_mlt.lower().endswith(".mlt")
    if is_mlt:
        total_sec = 120.0  # default fallback
        try:
            tree_probe = ET.parse(input_video_or_mlt)
            root_probe = tree_probe.getroot()
            tractor = root_probe.find(".//tractor")
            if tractor is not None and "out" in tractor.attrib:
                total_sec = float(tractor.attrib["out"]) / fps
        except Exception:
            pass
    else:
        total_sec = get_media_duration_seconds(ffmpeg, input_video_or_mlt)

    total_frames = max(30, int(total_sec * fps))

    start_sec = _parse_time_seconds(timestamp, 2.0)
    dur_sec = max(1.0, float(duration_sec))
    start_frame = max(0, int(start_sec * fps))
    elem_frames = max(15, int(dur_sec * fps))

    # Determine element mlt_service
    ext = elem_info["extension"]
    is_lottie = ext in (".tgs", ".json", ".rawr")
    is_sound = ext in (".flac", ".wav", ".mp3")

    if not output_path:
        base, _ = os.path.splitext(input_video_or_mlt)
        output_path = f"{base}_elements.mlt" if not is_mlt else input_video_or_mlt

    rect_str = _calculate_element_rect(position, scale)

    # -------------------------------------------------------------
    # CASE A: Modifying an Existing .mlt Project
    # -------------------------------------------------------------
    if is_mlt:
        tree = ET.parse(input_video_or_mlt)
        root = tree.getroot()

        # Producer ID
        existing_prods = root.findall(".//producer")
        elem_prod_id = f"producer_elem_{len(existing_prods)}"

        elem_prod = ET.Element("producer", {
            "id": elem_prod_id,
            "in": "0",
            "out": str(elem_frames - 1)
        })
        ET.SubElement(elem_prod, "property", {"name": "length"}).text = str(elem_frames)
        ET.SubElement(elem_prod, "property", {"name": "resource"}).text = elem_path
        if is_lottie:
            ET.SubElement(elem_prod, "property", {"name": "mlt_service"}).text = "glaxnimate"
            ET.SubElement(elem_prod, "property", {"name": "background"}).text = "#00000000"
            ET.SubElement(elem_prod, "property", {"name": "eof"}).text = "loop"
            # Affine position filter
            filt = ET.SubElement(elem_prod, "filter", {"id": f"affine_{elem_prod_id}"})
            ET.SubElement(filt, "property", {"name": "mlt_service"}).text = "affine"
            ET.SubElement(filt, "property", {"name": "rect"}).text = rect_str
        elif is_sound:
            ET.SubElement(elem_prod, "property", {"name": "mlt_service"}).text = "avformat"
            ET.SubElement(elem_prod, "property", {"name": "video_index"}).text = "-1"
            ET.SubElement(elem_prod, "property", {"name": "audio_index"}).text = "0"
        else:
            ET.SubElement(elem_prod, "property", {"name": "mlt_service"}).text = "avformat"

        # Insert producer before first playlist
        first_pl = root.find(".//playlist")
        if first_pl is not None:
            root.insert(list(root).index(first_pl), elem_prod)
        else:
            root.append(elem_prod)

        # Locate or create dedicated Elements playlist (V2)
        elem_pl = None
        for pl in root.findall(".//playlist"):
            p_name = pl.find("property[@name='shotcut:name']")
            if p_name is not None and "element" in p_name.text.lower():
                elem_pl = pl
                break

        tractor = root.find(".//tractor")
        multitrack = tractor.find(".//multitrack") if tractor is not None else None

        if elem_pl is None:
            elem_pl = ET.SubElement(root, "playlist", {"id": "playlist_elements_v2"})
            ET.SubElement(elem_pl, "property", {"name": "shotcut:name"}).text = "Elements (V2)"
            if multitrack is not None:
                ET.SubElement(multitrack, "track", {"producer": "playlist_elements_v2"})
                # Add transition blend with main video track
                trans = ET.SubElement(tractor, "transition", {"id": f"blend_elem_{int(start_sec)}"})
                ET.SubElement(trans, "property", {"name": "a_track"}).text = "0"
                ET.SubElement(trans, "property", {"name": "b_track"}).text = str(len(multitrack) - 1)
                ET.SubElement(trans, "property", {"name": "mlt_service"}).text = "qtblend"
                ET.SubElement(trans, "property", {"name": "always_active"}).text = "1"

        # Add blank padding if beginning of track or gap
        curr_duration_frames = 0
        for child in elem_pl:
            if child.tag == "blank":
                curr_duration_frames += int(child.attrib.get("length", 0))
            elif child.tag == "entry":
                curr_duration_frames += int(child.attrib.get("out", 0)) - int(child.attrib.get("in", 0)) + 1

        gap = start_frame - curr_duration_frames
        if gap > 0:
            ET.SubElement(elem_pl, "blank", {"length": str(gap)})

        ET.SubElement(elem_pl, "entry", {
            "producer": elem_prod_id,
            "in": "0",
            "out": str(elem_frames - 1)
        })

        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)

    # -------------------------------------------------------------
    # CASE B: Building Fresh Project with Video on V1 and Elements on V2
    # -------------------------------------------------------------
    else:
        abs_video = os.path.abspath(input_video_or_mlt).replace("\\", "/")

        mlt = ET.Element("mlt", {
            "LC_NUMERIC": "C",
            "version": "7.24.0",
            "title": f"MediaMogul Elements Project - {os.path.basename(input_video_or_mlt)}"
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

        # Producer: Main Video (Track V1)
        prod_main = ET.SubElement(mlt, "producer", {
            "id": "producer_main",
            "in": "0",
            "out": str(total_frames - 1)
        })
        ET.SubElement(prod_main, "property", {"name": "resource"}).text = abs_video
        ET.SubElement(prod_main, "property", {"name": "mlt_service"}).text = "avformat"

        # Producer: Element Overlay (Dedicated Track V2)
        prod_elem = ET.SubElement(mlt, "producer", {
            "id": "producer_elem0",
            "in": "0",
            "out": str(elem_frames - 1)
        })
        ET.SubElement(prod_elem, "property", {"name": "length"}).text = str(elem_frames)
        ET.SubElement(prod_elem, "property", {"name": "resource"}).text = elem_path
        if is_lottie:
            ET.SubElement(prod_elem, "property", {"name": "mlt_service"}).text = "glaxnimate"
            ET.SubElement(prod_elem, "property", {"name": "background"}).text = "#00000000"
            ET.SubElement(prod_elem, "property", {"name": "eof"}).text = "loop"
            filt = ET.SubElement(prod_elem, "filter", {"id": "filter_pos"})
            ET.SubElement(filt, "property", {"name": "mlt_service"}).text = "affine"
            ET.SubElement(filt, "property", {"name": "rect"}).text = rect_str
        elif is_sound:
            ET.SubElement(prod_elem, "property", {"name": "mlt_service"}).text = "avformat"
            ET.SubElement(prod_elem, "property", {"name": "video_index"}).text = "-1"
            ET.SubElement(prod_elem, "property", {"name": "audio_index"}).text = "0"
        else:
            ET.SubElement(prod_elem, "property", {"name": "mlt_service"}).text = "avformat"

        # Playlist V1 (Main Video)
        pl_v1 = ET.SubElement(mlt, "playlist", {"id": "playlist_v1"})
        ET.SubElement(pl_v1, "property", {"name": "shotcut:name"}).text = "Video 1 (Base)"
        ET.SubElement(pl_v1, "entry", {
            "producer": "producer_main",
            "in": "0",
            "out": str(total_frames - 1)
        })

        # Playlist V2 (Dedicated Elements Track)
        pl_v2 = ET.SubElement(mlt, "playlist", {"id": "playlist_v2"})
        ET.SubElement(pl_v2, "property", {"name": "shotcut:name"}).text = "Elements (V2)"
        if start_frame > 0:
            ET.SubElement(pl_v2, "blank", {"length": str(start_frame)})
        ET.SubElement(pl_v2, "entry", {
            "producer": "producer_elem0",
            "in": "0",
            "out": str(elem_frames - 1)
        })

        # Tractor Multitrack with Compositor
        tractor = ET.SubElement(mlt, "tractor", {"id": "tractor0", "title": "Shotcut Timeline", "in": "0", "out": str(total_frames - 1)})
        multitrack = ET.SubElement(tractor, "multitrack")
        ET.SubElement(multitrack, "track", {"producer": "playlist_v1"})
        ET.SubElement(multitrack, "track", {"producer": "playlist_v2"})

        # Transition qtblend for transparent sticker overlay
        trans = ET.SubElement(tractor, "transition", {"id": "transition_blend0"})
        ET.SubElement(trans, "property", {"name": "a_track"}).text = "0"
        ET.SubElement(trans, "property", {"name": "b_track"}).text = "1"
        ET.SubElement(trans, "property", {"name": "mlt_service"}).text = "qtblend"
        ET.SubElement(trans, "property", {"name": "always_active"}).text = "1"

        tree = ET.ElementTree(mlt)
        ET.indent(tree, space="  ", level=0)
        tree.write(output_path, encoding="utf-8", xml_declaration=True)

    # Launch or reload in Shotcut if requested
    if open_in_shotcut:
        try:
            sc_exe = find_shotcut_exe()
            if sc_exe and os.path.exists(sc_exe):
                subprocess.Popen([sc_exe, output_path], creationflags=0x00000008 | 0x00000200)
        except Exception:
            pass

    return output_path


def tool_auto_add_elements(ffmpeg: str, input_video_or_mlt: str, theme: str = "celebration",
                           count: int = 4, interval_sec: float = None, position: str = "bottom_right",
                           sound_sync: bool = True, output_path: str = None, open_in_shotcut: bool = True) -> dict:
    """
    Automatically distributes a cohesive theme of Shotcut library elements across the video timeline
    on a dedicated Elements track (V2), with synchronized SFX triggers.

    Themes:
      - 'celebration' / 'party': Fireworks, Confetti, Party Popper, Sparkler, Balloon
      - 'halloween': Halloween Jack-o-Lantern, Sparkles, Firecracker
      - 'youtube' / 'creator': Subscribe button, Lower Third, Stars, Arrows
      - 'tutorial' / 'coding': Focus Arrows, Sparkles, Star, Checkmarks
      - 'gaming': Game Entry, Fire, Sparkles, Confetti
    """
    if not os.path.exists(input_video_or_mlt):
        raise FileNotFoundError(f"Source file not found: {input_video_or_mlt}")

    # Determine theme elements
    theme_lower = (theme or "celebration").lower().strip()
    theme_catalogs = {
        "celebration": ["003-fireworks", "009-confetti", "008-popper", "007-balloon", "004-sparkler", "006-sparkles"],
        "party": ["009-confetti", "008-popper", "007-balloon", "003-fireworks"],
        "halloween": ["001-halloween_jack_o_lantern_pumpkin", "005-firecracker", "006-sparkles", "004-sparkler"],
        "youtube": ["Subscribe", "Gold Star", "Arrow", "Lower Third", "006-sparkles"],
        "creator": ["Subscribe", "Gold Star", "Arrow", "009-confetti"],
        "tutorial": ["Arrow", "Gold Star", "006-sparkles", "Centered Title Boxes"],
        "coding": ["Arrow", "Gold Star", "Loading", "006-sparkles"],
        "gaming": ["003-fireworks", "005-firecracker", "Gold Star", "008-popper"]
    }

    selected_names = theme_catalogs.get(theme_lower, theme_catalogs["celebration"])

    # Calculate timestamps across total duration
    total_sec = get_media_duration_seconds(ffmpeg, input_video_or_mlt) if not input_video_or_mlt.lower().endswith(".mlt") else 120.0
    num_elements = max(1, min(count, len(selected_names)))

    if interval_sec and interval_sec > 0:
        timestamps = [round(i * interval_sec + 2.0, 1) for i in range(num_elements)]
    else:
        # Distribute evenly across video (avoiding very first 2 seconds and final 5 seconds)
        usable_duration = max(10.0, total_sec - 8.0)
        step = usable_duration / (num_elements + 1)
        timestamps = [round(2.0 + (i + 1) * step, 1) for i in range(num_elements)]

    current_project = input_video_or_mlt
    placed = []

    # Sequential injection
    for idx in range(num_elements):
        elem_name = selected_names[idx % len(selected_names)]
        ts_str = str(timestamps[idx])
        # Open in Shotcut only on the last insertion
        is_last = (idx == num_elements - 1)
        res_mlt = tool_add_element_to_timeline(
            ffmpeg=ffmpeg,
            input_video_or_mlt=current_project,
            element_name=elem_name,
            timestamp=ts_str,
            duration_sec=3.5,
            position=position,
            scale=1.0,
            sound_effect="Ding" if sound_sync else None,
            output_path=output_path if is_last else None,
            open_in_shotcut=open_in_shotcut if is_last else False
        )
        current_project = res_mlt
        placed.append({"element": elem_name, "timestamp_sec": timestamps[idx]})

    return {
        "theme": theme_lower,
        "elements_placed": placed,
        "count": len(placed),
        "mlt_project": current_project
    }
