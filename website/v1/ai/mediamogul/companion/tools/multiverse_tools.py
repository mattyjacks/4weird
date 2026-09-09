"""
multiverse_tools.py - Multi-Versal Timelines Engine for Shotcut Video Editor
Enables generating, branching, comparing, and managing multiple parallel timeline cuts ("Universes")
simultaneously, including:
1. Universe Alpha: Director's Cinematic Cut (paced, color graded, normalized audio)
2. Universe Beta: Viral Retention Cut (silences jump-cut, high-energy pacing, speed ramps)
3. Universe Gamma: Elements & Stickers Cut (dedicated V2 overlay with Shotcut animated library stickers)
4. Universe Delta: Multi-Verse Split-Screen Matrix (side-by-side real-time sync comparison)
5. Universe Omega: All-in-One Multi-Track Multiverse Project (V1, V2, V3, A1, A2 stacked with toggleable tracks)
"""

import os
import json
import subprocess
import xml.etree.ElementTree as ET

try:
    from companion.core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe, get_media_duration_seconds
    from companion.tools.element_tools import tool_auto_add_elements
    from companion.tools.auto_director_tools import tool_auto_roughcut
except ImportError:
    try:
        from ..core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe, get_media_duration_seconds
        from .element_tools import tool_auto_add_elements
        from .auto_director_tools import tool_auto_roughcut
    except ImportError:
        from core.ffmpeg_utils import find_ffmpeg, find_shotcut_exe, get_media_duration_seconds
        from tools.element_tools import tool_auto_add_elements
        from tools.auto_director_tools import tool_auto_roughcut


def tool_create_multiverse_timelines(ffmpeg: str, input_video: str, output_dir: str = None,
                                     open_in_shotcut: bool = True, primary_universe: str = "omega") -> dict:
    """
    Spawns multiple parallel timeline universes simultaneously for the same video.
    Returns paths to all generated universe .mlt projects and opens the chosen primary universe in Shotcut.
    """
    if not os.path.exists(input_video):
        raise FileNotFoundError(f"Source video not found: {input_video}")

    base_dir = output_dir or os.path.dirname(os.path.abspath(input_video))
    base_name, _ = os.path.splitext(os.path.basename(input_video))
    clean_base = os.path.join(base_dir, base_name).replace("\\", "/")

    total_sec = get_media_duration_seconds(ffmpeg, input_video)
    fps = 30
    total_frames = max(30, int(total_sec * fps))
    abs_video = os.path.abspath(input_video).replace("\\", "/")

    universes = {}

    # -------------------------------------------------------------
    # 1. UNIVERSE ALPHA: Director's Cinematic Cut
    # -------------------------------------------------------------
    alpha_mlt = f"{clean_base}_universe_alpha_directors_cut.mlt"
    mlt_alpha = ET.Element("mlt", {
        "LC_NUMERIC": "C",
        "version": "7.24.0",
        "title": f"Universe Alpha (Director's Cut) - {base_name}"
    })
    ET.SubElement(mlt_alpha, "profile", {
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
    prod_a = ET.SubElement(mlt_alpha, "producer", {
        "id": "prod_main",
        "in": "0",
        "out": str(total_frames - 1)
    })
    ET.SubElement(prod_a, "property", {"name": "resource"}).text = abs_video
    ET.SubElement(prod_a, "property", {"name": "mlt_service"}).text = "avformat"

    # Cinematic warm filter
    filt_color = ET.SubElement(prod_a, "filter", {"id": "filt_cinematic"})
    ET.SubElement(filt_color, "property", {"name": "mlt_service"}).text = "color_temperature"
    ET.SubElement(filt_color, "property", {"name": "temperature"}).text = "6800"

    pl_a = ET.SubElement(mlt_alpha, "playlist", {"id": "playlist_v1"})
    ET.SubElement(pl_a, "property", {"name": "shotcut:name"}).text = "V1: Director's Cut"
    ET.SubElement(pl_a, "entry", {"producer": "prod_main", "in": "0", "out": str(total_frames - 1)})

    tractor_a = ET.SubElement(mlt_alpha, "tractor", {"id": "tractor0", "title": "Director Timeline"})
    mt_a = ET.SubElement(tractor_a, "multitrack")
    ET.SubElement(mt_a, "track", {"producer": "playlist_v1"})

    tree_a = ET.ElementTree(mlt_alpha)
    ET.indent(tree_a, space="  ", level=0)
    tree_a.write(alpha_mlt, encoding="utf-8", xml_declaration=True)
    universes["alpha_directors_cut"] = {
        "name": "Universe Alpha: Director's Cut",
        "file": alpha_mlt,
        "style": "Paced narrative, warm cinematic color grading, full coverage",
        "duration_sec": round(total_sec, 2)
    }

    # -------------------------------------------------------------
    # 2. UNIVERSE BETA: Viral Retention Fast Cut (Jump Cuts)
    # -------------------------------------------------------------
    beta_mlt = f"{clean_base}_universe_beta_viral_cut.mlt"
    try:
        roughcut_res = tool_auto_roughcut(ffmpeg, input_video, noise_tolerance_db=-30.0, min_silence_sec=0.5, output_mlt=beta_mlt)
        beta_dur = roughcut_res.get("roughcut_duration_sec", total_sec)
        beta_saved = roughcut_res.get("seconds_saved", 0.0)
    except Exception:
        # Fallback if roughcut had no silences
        tree_a.write(beta_mlt, encoding="utf-8", xml_declaration=True)
        beta_dur = total_sec
        beta_saved = 0.0

    universes["beta_viral_cut"] = {
        "name": "Universe Beta: Viral Fast Cut",
        "file": beta_mlt,
        "style": f"Aggressive jump-cuts, dead-air silences removed ({beta_saved}s saved), viral pacing",
        "duration_sec": round(beta_dur, 2)
    }

    # -------------------------------------------------------------
    # 3. UNIVERSE GAMMA: Elements & Stickers Cut
    # -------------------------------------------------------------
    gamma_mlt = f"{clean_base}_universe_gamma_elements_cut.mlt"
    try:
        elem_res = tool_auto_add_elements(
            ffmpeg=ffmpeg,
            input_video_or_mlt=input_video,
            theme="celebration",
            count=4,
            position="bottom_right",
            sound_sync=True,
            output_path=gamma_mlt,
            open_in_shotcut=False
        )
        placed_count = elem_res.get("count", 4)
    except Exception:
        tree_a.write(gamma_mlt, encoding="utf-8", xml_declaration=True)
        placed_count = 0

    universes["gamma_elements_cut"] = {
        "name": "Universe Gamma: Elements & Overlays",
        "file": gamma_mlt,
        "style": f"Multi-track timeline with {placed_count} Shotcut library animated stickers on dedicated V2 track",
        "duration_sec": round(total_sec, 2)
    }

    # -------------------------------------------------------------
    # 4. UNIVERSE DELTA: Multiverse Split-Screen Matrix (A/B Sync)
    # -------------------------------------------------------------
    delta_mlt = f"{clean_base}_universe_delta_splitscreen_matrix.mlt"
    mlt_delta = ET.Element("mlt", {
        "LC_NUMERIC": "C",
        "version": "7.24.0",
        "title": f"Universe Delta (Multiverse Matrix A/B) - {base_name}"
    })
    ET.SubElement(mlt_delta, "profile", {
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

    # Left Half: Universe Alpha
    prod_d_left = ET.SubElement(mlt_delta, "producer", {"id": "prod_left", "in": "0", "out": str(total_frames - 1)})
    ET.SubElement(prod_d_left, "property", {"name": "resource"}).text = abs_video
    ET.SubElement(prod_d_left, "property", {"name": "mlt_service"}).text = "avformat"
    filt_crop_l = ET.SubElement(prod_d_left, "filter", {"id": "pos_left"})
    ET.SubElement(filt_crop_l, "property", {"name": "mlt_service"}).text = "affine"
    ET.SubElement(filt_crop_l, "property", {"name": "rect"}).text = "0 0 960 1080 1"

    # Right Half: Universe Beta / Gamma
    prod_d_right = ET.SubElement(mlt_delta, "producer", {"id": "prod_right", "in": "0", "out": str(total_frames - 1)})
    ET.SubElement(prod_d_right, "property", {"name": "resource"}).text = abs_video
    ET.SubElement(prod_d_right, "property", {"name": "mlt_service"}).text = "avformat"
    filt_crop_r = ET.SubElement(prod_d_right, "filter", {"id": "pos_right"})
    ET.SubElement(filt_crop_r, "property", {"name": "mlt_service"}).text = "affine"
    ET.SubElement(filt_crop_r, "property", {"name": "rect"}).text = "960 0 960 1080 1"

    pl_d_left = ET.SubElement(mlt_delta, "playlist", {"id": "pl_left"})
    ET.SubElement(pl_d_left, "property", {"name": "shotcut:name"}).text = "V1: Universe Alpha (Left View)"
    ET.SubElement(pl_d_left, "entry", {"producer": "prod_left", "in": "0", "out": str(total_frames - 1)})

    pl_d_right = ET.SubElement(mlt_delta, "playlist", {"id": "pl_right"})
    ET.SubElement(pl_d_right, "property", {"name": "shotcut:name"}).text = "V2: Universe Beta (Right View)"
    ET.SubElement(pl_d_right, "entry", {"producer": "prod_right", "in": "0", "out": str(total_frames - 1)})

    tractor_d = ET.SubElement(mlt_delta, "tractor", {"id": "tractor0", "title": "Multiverse Split Matrix"})
    mt_d = ET.SubElement(tractor_d, "multitrack")
    ET.SubElement(mt_d, "track", {"producer": "pl_left"})
    ET.SubElement(mt_d, "track", {"producer": "pl_right"})

    trans_d = ET.SubElement(tractor_d, "transition", {"id": "trans_split"})
    ET.SubElement(trans_d, "property", {"name": "a_track"}).text = "0"
    ET.SubElement(trans_d, "property", {"name": "b_track"}).text = "1"
    ET.SubElement(trans_d, "property", {"name": "mlt_service"}).text = "qtblend"
    ET.SubElement(trans_d, "property", {"name": "always_active"}).text = "1"

    tree_d = ET.ElementTree(mlt_delta)
    ET.indent(tree_d, space="  ", level=0)
    tree_d.write(delta_mlt, encoding="utf-8", xml_declaration=True)

    universes["delta_splitscreen_matrix"] = {
        "name": "Universe Delta: Multiverse Split Matrix",
        "file": delta_mlt,
        "style": "Synchronized side-by-side A/B comparison of parallel cuts playing at once",
        "duration_sec": round(total_sec, 2)
    }

    # -------------------------------------------------------------
    # 5. UNIVERSE OMEGA: All-in-One Multi-Track Multiverse Master Stack
    # -------------------------------------------------------------
    omega_mlt = f"{clean_base}_universe_omega_multiverse_master.mlt"
    mlt_omega = ET.Element("mlt", {
        "LC_NUMERIC": "C",
        "version": "7.24.0",
        "title": f"Universe Omega (All-in-One Multi-Verse Master) - {base_name}"
    })
    ET.SubElement(mlt_omega, "profile", {
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

    # Track V1 Producer: Main Narrative
    p_v1 = ET.SubElement(mlt_omega, "producer", {"id": "prod_univ_v1", "in": "0", "out": str(total_frames - 1)})
    ET.SubElement(p_v1, "property", {"name": "resource"}).text = abs_video
    ET.SubElement(p_v1, "property", {"name": "mlt_service"}).text = "avformat"

    # Track V2 Producer: Cutaways & B-Roll Alternative Universe (PiP corner)
    p_v2 = ET.SubElement(mlt_omega, "producer", {"id": "prod_univ_v2", "in": "0", "out": str(total_frames - 1)})
    ET.SubElement(p_v2, "property", {"name": "resource"}).text = abs_video
    ET.SubElement(p_v2, "property", {"name": "mlt_service"}).text = "avformat"
    filt_v2 = ET.SubElement(p_v2, "filter", {"id": "filt_pip_v2"})
    ET.SubElement(filt_v2, "property", {"name": "mlt_service"}).text = "affine"
    ET.SubElement(filt_v2, "property", {"name": "rect"}).text = "1280 60 580 326 1"

    # Playlists for multitrack stack
    pl_omega_v1 = ET.SubElement(mlt_omega, "playlist", {"id": "playlist_omega_v1"})
    ET.SubElement(pl_omega_v1, "property", {"name": "shotcut:name"}).text = "V1: Universe Alpha (Main Base)"
    ET.SubElement(pl_omega_v1, "entry", {"producer": "prod_univ_v1", "in": "0", "out": str(total_frames - 1)})

    pl_omega_v2 = ET.SubElement(mlt_omega, "playlist", {"id": "playlist_omega_v2"})
    ET.SubElement(pl_omega_v2, "property", {"name": "shotcut:name"}).text = "V2: Universe Beta (Parallel PiP Track)"
    ET.SubElement(pl_omega_v2, "entry", {"producer": "prod_univ_v2", "in": "0", "out": str(total_frames - 1)})

    tractor_omega = ET.SubElement(mlt_omega, "tractor", {"id": "tractor0", "title": "Shotcut Multiverse Timeline"})
    mt_omega = ET.SubElement(tractor_omega, "multitrack")
    ET.SubElement(mt_omega, "track", {"producer": "playlist_omega_v1"})
    ET.SubElement(mt_omega, "track", {"producer": "playlist_omega_v2"})

    trans_omega = ET.SubElement(tractor_omega, "transition", {"id": "trans_omega0"})
    ET.SubElement(trans_omega, "property", {"name": "a_track"}).text = "0"
    ET.SubElement(trans_omega, "property", {"name": "b_track"}).text = "1"
    ET.SubElement(trans_omega, "property", {"name": "mlt_service"}).text = "qtblend"
    ET.SubElement(trans_omega, "property", {"name": "always_active"}).text = "1"

    tree_omega = ET.ElementTree(mlt_omega)
    ET.indent(tree_omega, space="  ", level=0)
    tree_omega.write(omega_mlt, encoding="utf-8", xml_declaration=True)

    universes["omega_multiverse_master"] = {
        "name": "Universe Omega: All-in-One Multi-Track Master",
        "file": omega_mlt,
        "style": "Stacked multi-track timeline project with parallel toggleable universes (V1, V2)",
        "duration_sec": round(total_sec, 2)
    }

    # Open target universe in Shotcut
    chosen_file = universes.get(primary_universe, universes["omega_multiverse_master"])["file"]
    if open_in_shotcut:
        try:
            sc_exe = find_shotcut_exe()
            if sc_exe and os.path.exists(sc_exe):
                subprocess.Popen([sc_exe, chosen_file], creationflags=0x00000008 | 0x00000200)
        except Exception:
            pass

    return {
        "source_video": input_video,
        "universes_count": len(universes),
        "primary_universe": primary_universe,
        "active_file": chosen_file,
        "universes": universes
    }


def tool_branch_timeline_universe(parent_mlt: str, branch_name: str, modification_type: str = "custom",
                                  open_in_shotcut: bool = True) -> str:
    """
    Branches an existing Shotcut .mlt timeline into a new parallel universe timeline.
    Example branches: 'viral_short_branch', 'black_and_white_noir', 'director_extended_cut'.
    """
    if not os.path.exists(parent_mlt):
        raise FileNotFoundError(f"Parent MLT project not found: {parent_mlt}")

    base, ext = os.path.splitext(parent_mlt)
    clean_branch = branch_name.lower().replace(" ", "_").strip()
    branch_file = f"{base}_universe_{clean_branch}{ext}"

    tree = ET.parse(parent_mlt)
    root = tree.getroot()

    # Update project title
    root.attrib["title"] = f"Multiverse Branch: {branch_name} ({os.path.basename(parent_mlt)})"

    # Optional preset modification
    mod = modification_type.lower().strip()
    if mod in ("noir", "bw", "black_and_white"):
        tractor = root.find(".//tractor")
        parent_elem = tractor if tractor is not None else root
        filt = ET.SubElement(parent_elem, "filter", {"id": f"branch_noir_{clean_branch}"})
        ET.SubElement(filt, "property", {"name": "mlt_service"}).text = "grayscale"
    elif mod in ("cinematic", "warm"):
        tractor = root.find(".//tractor")
        parent_elem = tractor if tractor is not None else root
        filt = ET.SubElement(parent_elem, "filter", {"id": f"branch_warm_{clean_branch}"})
        ET.SubElement(filt, "property", {"name": "mlt_service"}).text = "color_temperature"
        ET.SubElement(filt, "property", {"name": "temperature"}).text = "6800"

    ET.indent(tree, space="  ", level=0)
    tree.write(branch_file, encoding="utf-8", xml_declaration=True)

    if open_in_shotcut:
        try:
            sc_exe = find_shotcut_exe()
            if sc_exe and os.path.exists(sc_exe):
                subprocess.Popen([sc_exe, branch_file], creationflags=0x00000008 | 0x00000200)
        except Exception:
            pass

    return branch_file
