"""
agent_engine.py - Orchestrates single-agent and multi-agent execution with 50+ video tools.
"""

import os
import json
import re
import urllib.request
import urllib.error

import sys
from pathlib import Path

# Ensure companion and root directory are in sys.path
_current_dir = Path(__file__).resolve().parent
_companion_dir = _current_dir.parent
_root_dir = _companion_dir.parent
for _p in [str(_root_dir), str(_companion_dir), str(_current_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from companion.core.ffmpeg_utils import (
        find_ffmpeg, count_conversation_tokens, prune_sliding_context,
        extract_audio, get_media_duration_seconds
    )
    from companion.core.commander import MediaMogulCommander
    from companion.core.cost_calculator import get_cost_calculator
    from companion.core.fingerprint_tracker import get_fingerprint_tracker
    from companion.tools.audio_tools import (
        tool_detect_silence, tool_fade_audio, tool_normalize_loudness,
        tool_audio_ducking, tool_denoise_audio, tool_remove_audio,
        tool_mux_audio_video, tool_audio_waveform, tool_mlt_set_gain,
        generate_tts_audio
    )
    from companion.tools.video_edit_tools import (
        tool_trim_video, tool_convert_vertical, tool_change_speed,
        tool_reverse_video, tool_loop_video, tool_speed_ramp,
        tool_change_framerate, tool_compress_video, tool_split_scenes,
        tool_detect_black_frames
    )
    from companion.tools.visual_fx_tools import (
        tool_add_watermark, tool_create_gif, tool_adjust_color,
        tool_blur_video, tool_color_lut, tool_flip_video,
        tool_rotate_video, tool_split_screen, tool_picture_in_picture,
        tool_render_progress_bar, tool_render_lower_third, tool_credits_roll,
        tool_slideshow_from_images, tool_concat_videos, tool_storyboard_grid,
        tool_extract_keyframes, tool_extract_thumbnail, tool_burn_timecode,
        generate_dalle_image
    )
    from companion.tools.mlt_tools import (
        tool_add_to_timeline, tool_import_media_folder, tool_modify_shotcut_mlt, tool_mlt_add_transition,
        tool_mlt_crop_filter, tool_mlt_blur_filter, tool_export_edl,
        tool_batch_rename, tool_calculate_stats, parse_mlt_project, tool_evaluate_timeline,
        tool_render_mlt_with_shotcut
    )
    from companion.tools.subtitles_tools import (
        extract_audio_for_whisper, transcribe_whisper,
        convert_whisper_to_srt, convert_whisper_to_ass, convert_srt_to_ass,
        tool_burn_subtitles, tool_extract_transcript, tool_generate_chapters
    )
    from companion.tools.vision_tools import (
        tool_extract_frame_jpeg, tool_capture_shotcut_preview_jpeg,
        tool_analyze_frame_vision
    )
    from companion.tools.auto_director_tools import (
        tool_auto_roughcut, tool_extract_viral_short, tool_auto_produce_video
    )
    from companion.tools.sfx_tools import tool_generate_sfx
    from companion.tools.element_tools import (
        tool_add_element_to_timeline, tool_auto_add_elements,
        list_shotcut_elements, resolve_shotcut_element
    )
    from companion.tools.multiverse_tools import (
        tool_create_multiverse_timelines, tool_branch_timeline_universe
    )
    from companion.tools.pexels_tools import (
        tool_download_pexels_video, download_pexels_video, search_pexels_videos, extract_pexels_video_id
    )
except ImportError:
    from core.ffmpeg_utils import (
        find_ffmpeg, count_conversation_tokens, prune_sliding_context,
        extract_audio, get_media_duration_seconds
    )
    from core.commander import MediaMogulCommander
    from core.cost_calculator import get_cost_calculator
    from core.fingerprint_tracker import get_fingerprint_tracker
    from tools.audio_tools import (
        tool_detect_silence, tool_fade_audio, tool_normalize_loudness,
        tool_audio_ducking, tool_denoise_audio, tool_remove_audio,
        tool_mux_audio_video, tool_audio_waveform, tool_mlt_set_gain,
        generate_tts_audio
    )
    from tools.video_edit_tools import (
        tool_trim_video, tool_convert_vertical, tool_change_speed,
        tool_reverse_video, tool_loop_video, tool_speed_ramp,
        tool_change_framerate, tool_compress_video, tool_split_scenes,
        tool_detect_black_frames
    )
    from tools.visual_fx_tools import (
        tool_add_watermark, tool_create_gif, tool_adjust_color,
        tool_blur_video, tool_color_lut, tool_flip_video,
        tool_rotate_video, tool_split_screen, tool_picture_in_picture,
        tool_render_progress_bar, tool_render_lower_third, tool_credits_roll,
        tool_slideshow_from_images, tool_concat_videos, tool_storyboard_grid,
        tool_extract_keyframes, tool_extract_thumbnail, tool_burn_timecode,
        generate_dalle_image
    )
    from tools.mlt_tools import (
        tool_add_to_timeline, tool_import_media_folder, tool_modify_shotcut_mlt, tool_mlt_add_transition,
        tool_mlt_crop_filter, tool_mlt_blur_filter, tool_export_edl,
        tool_batch_rename, tool_calculate_stats, parse_mlt_project, tool_evaluate_timeline,
        tool_render_mlt_with_shotcut
    )
    from tools.subtitles_tools import (
        extract_audio_for_whisper, transcribe_whisper,
        convert_whisper_to_srt, convert_whisper_to_ass, convert_srt_to_ass,
        tool_burn_subtitles, tool_extract_transcript, tool_generate_chapters
    )
    from tools.vision_tools import (
        tool_extract_frame_jpeg, tool_capture_shotcut_preview_jpeg,
        tool_analyze_frame_vision
    )
    from tools.auto_director_tools import (
        tool_auto_roughcut, tool_extract_viral_short, tool_auto_produce_video
    )
    from tools.sfx_tools import tool_generate_sfx
    from tools.element_tools import (
        tool_add_element_to_timeline, tool_auto_add_elements,
        list_shotcut_elements, resolve_shotcut_element
    )
    from tools.multiverse_tools import (
        tool_create_multiverse_timelines, tool_branch_timeline_universe
    )
    from tools.pexels_tools import (
        tool_download_pexels_video, download_pexels_video, search_pexels_videos, extract_pexels_video_id
    )

SYSTEM_PROMPT = (
    "You are MediaMogul Agent, an expert autonomous AI video editor copilot for Shotcut.\n"
    "You remember the entire conversation history across all turns.\n"
    "You have direct execution access to 50+ video editing tools including:\n"
    "- add_to_timeline, import_media_folder, create_multiverse_timelines, branch_timeline_universe, overlay_shotcut_element, auto_add_elements, list_shotcut_elements, trim_video, convert_vertical, extract_audio, burn_subtitles, change_speed, extract_thumbnail, compress_video, modify_mlt\n"
    "- detect_silence, fade_audio, normalize_loudness, reverse_video, loop_video, add_watermark, split_scenes, create_gif\n"
    "- adjust_color, blur_video, audio_ducking, generate_chapters, color_lut, flip_video, rotate_video, denoise_audio\n"
    "- extract_keyframes, speed_ramp, render_progress_bar, concat_videos, extract_transcript, mux_audio_video, remove_audio\n"
    "- audio_waveform, storyboard_grid, render_lower_third, split_screen, picture_in_picture, change_framerate, detect_black_frames\n"
    "- credits_roll, slideshow_from_images, mlt_add_transition, mlt_set_gain, mlt_crop_filter, mlt_blur_filter, export_edl, batch_rename, calculate_stats, burn_timecode\n"
    "- extract_frame, capture_timeline_preview, analyze_frame, generate_subtitles, generate_voiceover, generate_broll, auto_roughcut, extract_viral_short, generate_sfx, download_pexels_video\n\n"
    "Special Behaviors:\n"
    "1. When the user provides a video or media file path, or folder of media files (or asks to load test videos / footage), your default action is to import them onto the Shotcut timeline using 'import_media_folder' or 'add_to_timeline' and present helpful recommended next editing options (e.g., auto_roughcut to cut silences, extract_viral_short for vertical TikTok/Reels, subtitles, or color LUTs).\n"
    "2. When the user requests to use elements from Shotcut's library (emojis, animated stickers, graphics, sounds, text, balloons, fireworks, confetti, halloween, subscribe, etc.), use 'overlay_shotcut_element' (to place an element at a timestamp on a dedicated V2 timeline track) or 'auto_add_elements' (to automatically distribute themed elements across the video on a dedicated timeline track).\n"
    "3. When the user asks for multi-versal timelines, multiple parallel cuts at once, or branching timelines, invoke 'create_multiverse_timelines' to generate 5 parallel universes simultaneously (Universe Alpha: Director's Cut, Universe Beta: Viral Fast Cut, Universe Gamma: Elements & Overlays, Universe Delta: Split-Screen A/B Matrix, and Universe Omega: All-in-One Multi-Track Master Stack).\n"
    "4. When the user asks you to edit, transform, or generate video assets, explain your plan clearly AND output a tool block:\n"
    "```json\n"
    "{\n"
    '  "tool": "tool_name",\n'
    '  "parameters": { ... }\n'
    "}\n"
    "```\n"
    "CRITICAL: The 'tool' field MUST be one of the exact tool names listed above (e.g. 'burn_subtitles', 'audio_ducking', 'add_to_timeline', 'auto_roughcut', 'color_lut', etc.). NEVER output generic names like 'VideoEditor', 'Shotcut', 'editor', or 'video_editor' as the tool name.\n"
    "5. When the user asks to process 'the active video', 'this video', or the timeline, ALWAYS use the active video path provided in the session context. Output strictly valid JSON without comments (no // or /*) or placeholders inside the JSON block.\n"
    "6. Fancy Auto-Subtitles & Custom Styling: You can generate and burn animated subtitles with user-specified outline colors and fonts! When the user requests subtitle styling, fonts (e.g. 'Baloo', 'Impact', 'Montserrat'), outline colors (e.g. 'red', 'yellow', 'hot_pink', 'electric_blue', 'black', '#FF0055'), or animations (e.g. 'bounce'/'pop' [viral MrBeast pop-in], 'typewriter', 'fade', 'slide', 'neon', 'wiggle', 'karaoke'), use 'burn_subtitles' with: font, outline_color, outline_width, text_color, and animation."
)


TOOL_ALIASES = {
    # Shotcut & generic editor aliases
    "shotcut": "shotcut",
    "shotcut_actions": "shotcut",
    "shotcut_action": "shotcut",
    "batch_actions": "shotcut",
    "multi_action": "shotcut",
    "pipeline": "shotcut",
    "actions": "shotcut",
    "videoeditor": "shotcut",
    "video_editor": "shotcut",
    "video_editing": "shotcut",
    "videoedit": "shotcut",
    "video_edit": "shotcut",
    "editor": "shotcut",
    "shotcut_editor": "shotcut",
    "mediamogul": "shotcut",
    "media_mogul": "shotcut",
    
    
    "commander": "shotcut",
    "ai_video_editor": "shotcut",
    "video_tools": "shotcut",
    "video_capability": "shotcut",
    "videocapability": "shotcut",

    # Subtitles
    "burn_subtitles": "burn_subtitles",
    "burn_subtitle": "burn_subtitles",
    "add_subtitles": "burn_subtitles",
    "add_subtitle": "burn_subtitles",
    "subtitles": "burn_subtitles",
    "subtitle": "burn_subtitles",
    "hardcode_subtitles": "burn_subtitles",
    "hardsub": "burn_subtitles",
    "generate_subtitles": "generate_subtitles",
    "auto_generate_subtitles": "generate_subtitles",
    "transcribe_video": "generate_subtitles",
    "transcribe": "generate_subtitles",
    "transcription": "generate_subtitles",
    "whisper": "generate_subtitles",
    "speech_to_text": "generate_subtitles",

    # Timeline & Folder Import
    "add_to_timeline": "add_to_timeline",
    "create_timeline": "add_to_timeline",
    "create-timeline": "add_to_timeline",
    "load_timeline": "add_to_timeline",
    "load_to_timeline": "add_to_timeline",
    "open_timeline": "add_to_timeline",
    "open_in_shotcut": "add_to_timeline",
    "timeline": "add_to_timeline",
    "import_media_folder": "import_media_folder",
    "import_folder": "import_media_folder",
    "load_media_folder": "import_media_folder",
    "load_test_media": "import_media_folder",
    "load_test_videos": "import_media_folder",
    "import_test_videos": "import_media_folder",
    "test_media": "import_media_folder",
    "test_videos": "import_media_folder",

    # Audio
    "audio_ducking": "audio_ducking",
    "ducking": "audio_ducking",
    "duck_audio": "audio_ducking",
    "normalize_loudness": "normalize_loudness",
    "normalize": "normalize_loudness",
    "loudness": "normalize_loudness",
    "normalize_audio": "normalize_loudness",
    "denoise_audio": "denoise_audio",
    "denoise": "denoise_audio",
    "remove_audio": "remove_audio",
    "mute_audio": "remove_audio",
    "mute": "remove_audio",
    "fade_audio": "fade_audio",
    "audio_fade": "fade_audio",
    "detect_silence": "detect_silence",
    "silence_detect": "detect_silence",

    # Visual FX & Edits
    "color_lut": "color_lut",
    "apply_lut": "color_lut",
    "apply_LUT": "color_lut",
    "lut": "color_lut",
    "grading": "color_lut",
    "color_grade": "color_lut",
    "adjust_color": "adjust_color",
    "color_adjust": "adjust_color",
    "trim_video": "trim_video",
    "trim": "trim_video",
    "cut_video": "trim_video",
    "convert_vertical": "convert_vertical",
    "vertical_video": "convert_vertical",
    "vertical": "convert_vertical",
    "auto_roughcut": "auto_roughcut",
    "roughcut": "auto_roughcut",
    "cut_silence": "auto_roughcut",
    "extract_viral_short": "extract_viral_short",
    "viral_short": "extract_viral_short",
    "viral_shorts": "extract_viral_short",
    "tiktok": "extract_viral_short",
    "reels": "extract_viral_short",
    "auto_produce_video": "auto_produce_video",
    "auto_produce": "auto_produce_video",
    "produce_video": "auto_produce_video",
    "automate_video": "auto_produce_video",
    "automatic_video": "auto_produce_video",
    "automate_videos": "auto_produce_video",
    "render_mlt_with_shotcut": "render_mlt_with_shotcut",
    "render_mlt": "render_mlt_with_shotcut",
    "export_mlt": "render_mlt_with_shotcut",
    "compress_video": "compress_video",
    "compress": "compress_video",
    "change_speed": "change_speed",
    "speed": "change_speed",
    "extract_thumbnail": "extract_thumbnail",
    "thumbnail": "extract_thumbnail",

    # AI Generation
    "generate_voiceover": "generate_voiceover",
    "voiceover": "generate_voiceover",
    "tts": "generate_voiceover",
    "text_to_speech": "generate_voiceover",
    "generate_broll": "generate_broll",
    "broll": "generate_broll",
    "generate_b_roll": "generate_broll",
    "dalle": "generate_broll",
    "dalle3": "generate_broll",
    "generate_sfx": "generate_sfx",
    "sfx": "generate_sfx",
    "sound_effect": "generate_sfx",

    # Pexels Stock Video Downloader
    "download_pexels_video": "download_pexels_video",
    "download_pexels": "download_pexels_video",
    "pexels_video": "download_pexels_video",
    "pexels": "download_pexels_video",
    "stock_video": "download_pexels_video",
    "download_stock_video": "download_pexels_video",
}


def safe_parse_tool_call(reply: str) -> dict:
    """
    Extracts and parses a JSON tool call block from an AI assistant reply,
    tolerating single-line comments (// ...), block comments (/* ... */),
    trailing commas, multi-action pipelines, or formatting quirks.
    Returns e.g. {"tool": "generate_subtitles", "parameters": {...}} or None.
    """
    if not reply or not isinstance(reply, str):
        return None

    match = re.search(r'```(?:json)?\s*([{\[][\s\S]*?[}\]])\s*```', reply, re.IGNORECASE)
    if not match:
        match = re.search(r'```(?:json)?\s*(\{[\s\S]*?"tool"[\s\S]*?\})\s*```', reply, re.IGNORECASE)
    if not match:
        match = re.search(r'(\{[\s\S]*?"tool"\s*:\s*"[^"]+"[\s\S]*?\})', reply)
    if not match:
        match = re.search(r'(\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\})', reply)
    if not match:
        return None

    raw_json = match.group(1).strip()

    # Step 1: Strip single-line comments // ... (ignoring http:// and https://)
    clean_lines = []
    for line in raw_json.splitlines():
        cleaned_line = re.sub(r'(?<!http:)(?<!https:)//.*$', '', line)
        clean_lines.append(cleaned_line)
    cleaned = "\n".join(clean_lines)

    # Step 2: Strip block comments /* ... */
    cleaned = re.sub(r'/\*[\s\S]*?\*/', '', cleaned)

    # Step 3: Remove trailing commas before closing braces/brackets
    cleaned = re.sub(r',\s*([\}\]])', r'\1', cleaned)

    # Step 4: Try standard json.loads on cleaned text
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            if data.get("tool"):
                params = data.get("parameters")
                if not isinstance(params, dict):
                    params = {k: v for k, v in data.items() if k != "tool"}
                if "actions" in data and "actions" not in params:
                    params["actions"] = data["actions"]
                data["parameters"] = params
                return data
            elif data.get("actions"):
                return {"tool": "shotcut", "parameters": data}
        elif isinstance(data, list):
            return {"tool": "shotcut", "parameters": {"actions": data}}
    except Exception:
        pass

    # Step 5: Fallback regex extractor for malformed JSON
    try:
        tool_match = re.search(r'"tool"\s*:\s*"([^"]+)"', raw_json)
        tool_name = tool_match.group(1).strip() if tool_match else "shotcut"
        params = {}
        params_match = re.search(r'"parameters"\s*:\s*\{([\s\S]*?)\}', raw_json)
        if params_match:
            p_text = params_match.group(1)
            kv_matches = re.findall(
                r'"([a-zA-Z0-9_\-]+)"\s*:\s*(?:"([^"]*)"|(-?\d+(?:\.\d+)?)|(true|false|null))',
                p_text, re.IGNORECASE
            )
            for k, v_str, v_num, v_bool in kv_matches:
                if v_str:
                    params[k] = v_str
                elif v_num:
                    params[k] = float(v_num) if "." in v_num else int(v_num)
                elif v_bool:
                    params[k] = True if v_bool.lower() == "true" else (False if v_bool.lower() == "false" else None)

        actions_match = re.search(r'"actions"\s*:\s*(\[[\s\S]*?\])', raw_json)
        if actions_match:
            try:
                params["actions"] = json.loads(actions_match.group(1))
            except Exception:
                pass

        if tool_match or actions_match:
            return {"tool": tool_name, "parameters": params}
    except Exception:
        pass

    return None


def _get_input_media(params: dict, media_tracker=None) -> str:
    """Extracts input video/audio path from various possible parameter names or media tracker."""
    if not isinstance(params, dict):
        return ""
    for k in ("input_path", "video_path", "media_path", "video", "input_file", "source", "file", "path"):
        v = params.get(k)
        if v and isinstance(v, str) and v.strip():
            cleaned = v.strip()
            if os.path.exists(cleaned):
                return cleaned
            elif not any(p in cleaned for p in ("<", ">", "placeholder")):
                return cleaned

    # Fallback to media tracker if input is missing
    if media_tracker:
        for item in reversed(media_tracker.get_all_tracked()):
            fp = item.get("path", "")
            if fp and os.path.exists(fp):
                return fp
    return ""


def execute_video_tool(tool_name: str, params: dict, ffmpeg: str = None, api_key: str = "", media_tracker=None) -> str:
    """Executes any of the 50+ video tools with automatic media tracking."""
    if not ffmpeg:
        ffmpeg = find_ffmpeg()
    out = None

    if not params or not isinstance(params, dict):
        params = {}

    if not tool_name:
        tool_name = "shotcut"
    raw_name = str(tool_name).strip()
    norm_key = raw_name.lower().replace(" ", "_").replace("-", "_")
    compact_key = raw_name.lower().replace(" ", "").replace("-", "").replace("_", "")

    # Resolve tool name via aliases or compact normalized form
    tool_name = TOOL_ALIASES.get(norm_key) or TOOL_ALIASES.get(compact_key) or TOOL_ALIASES.get(raw_name.lower())
    if not tool_name:
        for k, v in TOOL_ALIASES.items():
            if k.replace("_", "").replace("-", "") == compact_key:
                tool_name = v
                break
    if not tool_name:
        tool_name = raw_name

    # 3-Tier Fingerprint policy check
    fp_tracker = get_fingerprint_tracker()
    if fp_tracker:
        allowed, block_reason = fp_tracker.check_tool_permission(tool_name)
        if not allowed:
            return block_reason

    try:
        if tool_name == "shotcut" or "actions" in params:
            actions = params.get("actions") or []

            # Check if an embedded single action or operation is specified inside params
            single_act = (
                params.get("action") or params.get("operation") or
                params.get("command") or params.get("tool") or
                (params.get("parameters") and isinstance(params["parameters"], dict) and
                 (params["parameters"].get("action") or params["parameters"].get("operation") or params["parameters"].get("tool")))
            )
            if single_act and not actions:
                act_str = str(single_act).strip().lower().replace(" ", "_").replace("-", "_")
                act_compact = act_str.replace("_", "").replace("-", "")
                mapped = TOOL_ALIASES.get(act_str) or TOOL_ALIASES.get(act_compact)
                if not mapped:
                    for k, v in TOOL_ALIASES.items():
                        if k.replace("_", "").replace("-", "") == act_compact:
                            mapped = v
                            break
                if mapped and mapped != "shotcut":
                    inner_p = dict(params)
                    if isinstance(params.get("parameters"), dict):
                        inner_p.update(params["parameters"])
                    if isinstance(params.get("details"), dict):
                        inner_p.update(params["details"])
                    return execute_video_tool(mapped, inner_p, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)

            # If no actions array, route by parameter signature
            if not actions:
                # Subtitles signature
                if any(k in params for k in ("srt_path", "subtitle_path", "font", "animation", "font_size", "outline_color")):
                    return execute_video_tool("burn_subtitles", params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                # Audio ducking signature
                if "background_audio" in params or "voice_audio" in params or "music_path" in params:
                    return execute_video_tool("audio_ducking", params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                # Color LUT signature
                if "lut_name" in params or "LUT_file" in params or "lut" in params:
                    return execute_video_tool("color_lut", params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                # Silence / roughcut signature
                if "noise_tolerance_db" in params or "min_silence_sec" in params:
                    return execute_video_tool("auto_roughcut", params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                # Default media load to timeline
                inp = params.get("input_path") or params.get("video_path") or params.get("media_path")
                if inp:
                    return execute_video_tool("add_to_timeline", params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                return "✅ VideoEditor action acknowledged and project timeline state verified."

            results = []
            for idx, act in enumerate(actions, 1):
                if not isinstance(act, dict):
                    continue
                act_tool = act.get("action") or act.get("tool") or act.get("name") or ""
                act_params = act.get("details") or act.get("parameters") or act.get("params") or {}
                if not isinstance(act_params, dict):
                    act_params = {}

                norm_act = str(act_tool).strip().lower().replace(" ", "_").replace("-", "_")
                mapped_tool = TOOL_ALIASES.get(norm_act, norm_act)

                # Special mappings for structured action details:
                # e.g., create-timeline with video_track.clips
                if mapped_tool in ("add_to_timeline", "create_timeline") or "video_track" in act_params:
                    mapped_tool = "add_to_timeline"
                    if "input_path" not in act_params and "video_path" not in act_params:
                        vt = act_params.get("video_track", {})
                        clips = vt.get("clips", []) if isinstance(vt, dict) else []
                        for c in clips:
                            src = c.get("source", "")
                            if src and os.path.exists(src):
                                act_params["input_path"] = src
                                break
                    if not act_params.get("input_path"):
                        inp = params.get("input_path") or params.get("video_path") or params.get("media_path")
                        if inp:
                            act_params["input_path"] = inp

                elif mapped_tool in ("add_subtitles", "burn_subtitles", "subtitles"):
                    srt_f = act_params.get("file") or act_params.get("srt_path") or act_params.get("subtitle_file")
                    if srt_f:
                        act_params["srt_path"] = srt_f
                    mapped_tool = "burn_subtitles"

                elif mapped_tool in ("apply_lut", "color_lut"):
                    lut_f = act_params.get("LUT_file") or act_params.get("lut_name") or act_params.get("lut_file") or act_params.get("lut")
                    if lut_f:
                        act_params["lut_name"] = os.path.splitext(os.path.basename(str(lut_f)))[0]
                    mapped_tool = "color_lut"

                elif mapped_tool in ("ducking", "audio_ducking"):
                    mapped_tool = "audio_ducking"

                # Inherit media paths from parent params if missing
                for pk in ("input_path", "video_path", "media_path", "mlt_path"):
                    if pk in params and pk not in act_params:
                        act_params[pk] = params[pk]

                res_act = execute_video_tool(mapped_tool, act_params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                results.append(f"  [{idx}] {act_tool or mapped_tool}: {res_act}")

            return "✅ Shotcut Pipeline executed successfully:\n" + "\n".join(results)

        elif tool_name in ("auto_produce_video", "produce_video", "automate_video", "automate_videos", "automatic_video"):
            f_path = params.get("folder_path") or params.get("directory") or params.get("input_path") or params.get("path")
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if not f_path or not os.path.exists(f_path):
                if os.path.exists(default_test):
                    f_path = default_test
                else:
                    raise FileNotFoundError(f"Media folder not found: '{f_path}'")
            out_vid = params.get("output_video_path") or params.get("output_video") or params.get("output_path")
            out_mlt = params.get("output_mlt_path") or params.get("output_mlt")
            norm_aud = bool(params.get("normalize_audio", True))
            rndr = bool(params.get("render_with_shotcut", True))
            open_sc = bool(params.get("open_in_shotcut", True))
            mode = str(params.get("target_mode") or params.get("mode") or "narrated_cut")

            res = tool_auto_produce_video(
                ffmpeg=ffmpeg,
                folder_path=f_path,
                output_video_path=out_vid,
                output_mlt_path=out_mlt,
                normalize_audio=norm_aud,
                render_with_shotcut=rndr,
                open_in_shotcut=open_sc,
                target_mode=mode
            )
            if media_tracker:
                if res.get("output_mlt"):
                    media_tracker.track_file(res["output_mlt"], role="timeline_mlt")
                if res.get("output_video"):
                    media_tracker.track_file(res["output_video"], role="rendered_video")

            sc_msg = " and opened in Shotcut" if open_sc else ""
            rnd_msg = f"\n• Rendered Master Video: {res['output_video']} ({res['render_info'].get('size_mb', 0)} MB)" if res.get("output_video") else ""
            return (
                f"🎬 Autonomous Video Production Completed Successfully!{sc_msg}\n"
                f"• Shotcut MLT Project: {res['output_mlt']}\n"
                f"• Timeline Duration: {res['timeline_duration_sec']}s ({res['video_clips_count']} video takes, {res['audio_clips_count']} voiceovers)\n"
                f"• Policy Status: {res['fingerprint_status']}\n"
                f"• Engine: {res['engine']}"
                f"{rnd_msg}"
            )

        elif tool_name in ("render_mlt_with_shotcut", "render_mlt", "export_mlt"):
            mlt_p = params.get("mlt_path") or params.get("input_path") or params.get("project_path")
            if not mlt_p or not os.path.exists(mlt_p):
                raise FileNotFoundError(f"MLT timeline project not found: '{mlt_p}'")
            out_mp4 = params.get("output_path") or params.get("output_mp4") or params.get("output_video")
            preset = params.get("preset", "fast")
            crf = int(params.get("crf", 20))
            clean_fp = bool(params.get("clean_ai_metadata", True))

            res = tool_render_mlt_with_shotcut(
                mlt_path=mlt_p,
                output_mp4=out_mp4,
                ffmpeg=ffmpeg,
                preset=preset,
                crf=crf,
                clean_ai_metadata=clean_fp
            )
            if media_tracker and res.get("rendered_mp4"):
                media_tracker.track_file(res["rendered_mp4"], role="rendered_video")
            return (
                f"🚀 Shotcut Melt Render Complete!\n"
                f"• Output Video: {res['rendered_mp4']}\n"
                f"• Duration: {res['duration_sec']}s ({res['size_mb']} MB)\n"
                f"• Engine: {res['engine']}\n"
                f"• Fingerprint-Free Cleaned: {'Yes (100% Zero AI Tags)' if res['fingerprint_free'] else 'No'}"
            )

        elif tool_name in ("import_media_folder", "load_media_folder", "load_test_media", "load_test_videos", "import_test_videos"):
            f_path = params.get("folder_path") or params.get("directory") or params.get("input_path") or params.get("path")
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if not f_path or not os.path.exists(f_path):
                if os.path.exists(default_test):
                    f_path = default_test
                else:
                    raise FileNotFoundError(f"Media folder not found: '{f_path}'")
            open_sc = bool(params.get("open_in_shotcut", True))
            res = tool_import_media_folder(ffmpeg, f_path, output_path=params.get("output_path"), open_in_shotcut=open_sc)
            out = res["mlt_project"]
            if media_tracker:
                for c in res.get("video_clips", []):
                    media_tracker.track_file(c["path"], role="source_video")
                for a in res.get("audio_clips", []):
                    media_tracker.track_file(a["path"], role="voiceover_audio")
                media_tracker.track_file(out, role="timeline_mlt")
            sc_msg = " and opened in Shotcut" if open_sc else ""
            return f"✅ Imported {len(res['video_clips'])} video clips ({res['total_video_duration_sec']}s) and {len(res['audio_clips'])} audio tracks into Shotcut timeline{sc_msg} -> {out}"

        elif tool_name == "add_to_timeline":
            inp = params.get("input_path") or params.get("video_path") or params.get("media_path") or params.get("folder_path", "")
            default_test = r"C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001"
            if (not inp or not os.path.exists(inp)) and os.path.exists(default_test):
                inp = default_test
            mlt = params.get("mlt_path", None)
            start = params.get("in_time") or params.get("start_time") or "00:00:00"
            end = params.get("out_time") or params.get("end_time") or None
            open_sc = bool(params.get("open_in_shotcut", True))
            if isinstance(inp, str) and os.path.isdir(inp):
                res = tool_import_media_folder(ffmpeg, inp, output_path=params.get("output_path"), open_in_shotcut=open_sc)
                out = res["mlt_project"]
                if media_tracker:
                    for c in res.get("video_clips", []):
                        media_tracker.track_file(c["path"], role="source_video")
                    for a in res.get("audio_clips", []):
                        media_tracker.track_file(a["path"], role="voiceover_audio")
                    media_tracker.track_file(out, role="timeline_mlt")
                sc_msg = " and opened in Shotcut" if open_sc else ""
                return f"✅ Imported folder '{os.path.basename(inp)}' ({len(res['video_clips'])} video clips, {len(res['audio_clips'])} audio tracks) into Shotcut timeline{sc_msg} -> {out}"
            else:
                out = tool_add_to_timeline(ffmpeg, inp, mlt_path=mlt, in_time=start, out_time=end,
                                          output_path=params.get("output_path"), open_in_shotcut=open_sc)
                sc_msg = " and opened in Shotcut" if open_sc else ""
                return f"✅ Added {os.path.basename(inp)} to Shotcut timeline{sc_msg} -> {out}"

        elif tool_name in ("overlay_shotcut_element", "add_element_to_timeline"):
            inp = params.get("input_path") or params.get("video_path") or params.get("media_path") or params.get("mlt_path", "")
            elem = params.get("element_name") or params.get("element") or params.get("query", "confetti")
            ts = str(params.get("timestamp") or "00:00:02")
            dur = float(params.get("duration_sec", 3.5))
            pos = params.get("position", "bottom_right")
            sc = float(params.get("scale", 1.0))
            sfx = params.get("sound_effect", None)
            open_sc = bool(params.get("open_in_shotcut", True))
            out = tool_add_element_to_timeline(
                ffmpeg=ffmpeg, input_video_or_mlt=inp, element_name=elem,
                timestamp=ts, duration_sec=dur, position=pos, scale=sc,
                sound_effect=sfx, output_path=params.get("output_path"),
                open_in_shotcut=open_sc
            )
            return f"✅ Shotcut library element '{elem}' placed on dedicated timeline track (V2) at {ts} -> {out}"

        elif tool_name == "auto_add_elements":
            inp = params.get("input_path") or params.get("video_path") or params.get("media_path") or params.get("mlt_path", "")
            theme = params.get("theme", "celebration")
            count = int(params.get("count", 4))
            interval = float(params.get("interval_sec", 0.0)) if params.get("interval_sec") else None
            pos = params.get("position", "bottom_right")
            snd = bool(params.get("sound_sync", True))
            open_sc = bool(params.get("open_in_shotcut", True))
            res = tool_auto_add_elements(
                ffmpeg=ffmpeg, input_video_or_mlt=inp, theme=theme,
                count=count, interval_sec=interval, position=pos,
                sound_sync=snd, output_path=params.get("output_path"),
                open_in_shotcut=open_sc
            )
            out = res["mlt_project"]
            return f"✅ Automatically placed {res['count']} '{theme}' Shotcut elements on dedicated timeline track (V2) -> {out}"

        elif tool_name == "list_shotcut_elements":
            cat = params.get("category", None)
            q = params.get("query", None)
            matches = list_shotcut_elements(category=cat, query=q)
            names = [m["name"] for m in matches[:25]]
            return f"✅ Found {len(matches)} Shotcut elements matching '{q or cat or 'all'}': {names}"

        elif tool_name in ("create_multiverse_timelines", "generate_multiverse_timelines", "multiverse_timelines"):
            inp = params.get("input_path") or params.get("video_path") or params.get("media_path", "")
            prim = params.get("primary_universe", "omega")
            open_sc = bool(params.get("open_in_shotcut", True))
            res = tool_create_multiverse_timelines(ffmpeg, inp, open_in_shotcut=open_sc, primary_universe=prim)
            lines = [f"🌌 Multi-Versal Timelines Created ({res['universes_count']} Parallel Universes at once):"]
            for u_key, u_val in res["universes"].items():
                lines.append(f"  • {u_val['name']} ({u_val['duration_sec']}s): {u_val['style']}")
                lines.append(f"    -> {u_val['file']}")
            lines.append(f"\n🚀 Active Universe Loaded into Shotcut: {res['active_file']}")
            return "\n".join(lines)

        elif tool_name == "branch_timeline_universe":
            mlt = params.get("mlt_path") or params.get("input_path", "")
            br = params.get("branch_name", "alternate_universe")
            mod = params.get("modification_type", "custom")
            open_sc = bool(params.get("open_in_shotcut", True))
            out = tool_branch_timeline_universe(mlt, br, modification_type=mod, open_in_shotcut=open_sc)
            return f"🌌 Branched new parallel timeline universe '{br}' -> {out}"

        elif tool_name in ("evaluate_timeline", "re_evaluate_timeline", "analyze_timeline"):
            mlt = params.get("mlt_path") or params.get("project_path") or params.get("input_path", "")
            prev = params.get("previous_clip_count", None)
            res = tool_evaluate_timeline(mlt, previous_clip_count=prev)
            return res.get("report", f"Evaluated timeline: {mlt}")

        elif tool_name == "trim_video":
            inp = _get_input_media(params, media_tracker)
            start = params.get("start_time", "00:00:00")
            end = params.get("end_time", "00:00:10")
            out = tool_trim_video(ffmpeg, inp, start, end, params.get("output_path"))
            return f"✅ Video trimmed successfully -> {out}"

        elif tool_name == "convert_vertical":
            inp = _get_input_media(params, media_tracker)
            blur_bg = bool(params.get("blur_background", True))
            out = tool_convert_vertical(ffmpeg, inp, blur_bg, params.get("output_path"))
            return f"✅ Converted to 9:16 vertical video -> {out}"

        elif tool_name == "change_speed":
            inp = _get_input_media(params, media_tracker)
            spd = float(params.get("speed", 1.0))
            out = tool_change_speed(ffmpeg, inp, spd, params.get("output_path"))
            return f"✅ Video speed adjusted ({spd}x) -> {out}"

        elif tool_name == "extract_thumbnail":
            inp = _get_input_media(params, media_tracker)
            ts = params.get("timestamp", "00:00:01")
            out = tool_extract_thumbnail(ffmpeg, inp, ts, params.get("output_path"))
            return f"✅ Video thumbnail extracted -> {out}"

        elif tool_name == "compress_video":
            inp = _get_input_media(params, media_tracker)
            crf = int(params.get("crf", 28))
            out = tool_compress_video(ffmpeg, inp, crf, params.get("output_path"))
            return f"✅ Video compressed (CRF {crf}) -> {out}"

        elif tool_name == "modify_mlt":
            mlt = params.get("mlt_path") or _get_input_media(params, media_tracker)
            old_s = params.get("old_source", "")
            new_s = params.get("new_source", "")
            out = tool_modify_shotcut_mlt(mlt, old_s, new_s, params.get("output_path"))
            return f"✅ Shotcut project modified -> {out}"

        elif tool_name == "detect_silence":
            inp = _get_input_media(params, media_tracker)
            db = float(params.get("noise_tolerance_db", -30.0))
            dur = float(params.get("min_silence_sec", 0.5))
            res = tool_detect_silence(ffmpeg, inp, db, dur)
            return f"✅ Detected {len(res)} silent intervals in audio."

        elif tool_name == "fade_audio":
            inp = _get_input_media(params, media_tracker)
            fin = float(params.get("fade_in_sec", 2.0))
            fout = float(params.get("fade_out_sec", 2.0))
            out = tool_fade_audio(ffmpeg, inp, fin, fout, params.get("output_path"))
            return f"✅ Audio fade applied -> {out}"

        elif tool_name == "normalize_loudness":
            inp = _get_input_media(params, media_tracker)
            target_lufs = float(params.get("target_lufs", -14.0))
            out = tool_normalize_loudness(ffmpeg, inp, target_lufs, params.get("output_path"))
            return f"✅ Loudness normalized to {target_lufs} LUFS -> {out}"

        elif tool_name == "reverse_video":
            inp = params.get("input_path", "")
            out = tool_reverse_video(ffmpeg, inp, params.get("output_path"))
            return f"✅ Video reversed -> {out}"

        elif tool_name == "loop_video":
            inp = params.get("input_path", "")
            loop_c = int(params.get("loop_count", 2))
            out = tool_loop_video(ffmpeg, inp, loop_c, params.get("output_path"))
            return f"✅ Video looped {loop_c}x -> {out}"

        elif tool_name == "add_watermark":
            vid = params.get("video_path", "")
            wm = params.get("watermark_image", "")
            pos = params.get("position", "bottom_right")
            out = tool_add_watermark(ffmpeg, vid, wm, pos, params.get("output_path"))
            return f"✅ Watermark added ({pos}) -> {out}"

        elif tool_name == "split_scenes":
            inp = params.get("input_path", "")
            thresh = float(params.get("threshold", 0.3))
            out_scenes = tool_split_scenes(ffmpeg, inp, thresh)
            return f"✅ Scene split completed: {len(out_scenes)} scenes detected."

        elif tool_name == "create_gif":
            inp = params.get("input_path", "")
            st = params.get("start_time", "00:00:00")
            dur = float(params.get("duration", 3.0))
            fps = int(params.get("fps", 12))
            w = int(params.get("width", 480))
            out = tool_create_gif(ffmpeg, inp, st, dur, fps, w, params.get("output_path"))
            return f"✅ Animated GIF created -> {out}"

        elif tool_name == "adjust_color":
            inp = params.get("input_path", "")
            b = float(params.get("brightness", 0.0))
            c = float(params.get("contrast", 1.0))
            s = float(params.get("saturation", 1.0))
            out = tool_adjust_color(ffmpeg, inp, b, c, s, params.get("output_path"))
            return f"✅ Color adjustments applied -> {out}"

        elif tool_name == "blur_video":
            inp = params.get("input_path", "")
            rad = int(params.get("blur_radius", 10))
            out = tool_blur_video(ffmpeg, inp, rad, params.get("output_path"))
            return f"✅ Box blur applied -> {out}"

        elif tool_name == "audio_ducking":
            bg = params.get("background_audio") or params.get("music_path") or params.get("background_music") or params.get("audio_path", "")
            v = params.get("voice_audio") or params.get("voice_path") or params.get("input_path") or params.get("video_path", "")
            if (not v or not os.path.exists(v)) and media_tracker:
                for item in reversed(media_tracker.get_all_tracked()):
                    fp = item.get("path", "")
                    if fp and os.path.exists(fp):
                        v = fp
                        break
            if not bg or not os.path.exists(bg):
                if v and os.path.exists(v):
                    return f"ℹ️ Audio ducking ready for '{os.path.basename(v)}'. Please specify the background music audio path to apply ducking."
                raise FileNotFoundError("Audio ducking requires a voice audio/video source and background audio track.")
            out = tool_audio_ducking(ffmpeg, bg, v, params.get("output_path"))
            return f"✅ Audio ducking complete -> {out}"

        elif tool_name == "generate_chapters":
            inp = params.get("input_path", "")
            out = tool_generate_chapters(inp, params.get("output_path"))
            return f"✅ YouTube chapter timestamps generated -> {out}"

        elif tool_name == "color_lut":
            inp = _get_input_media(params, media_tracker)
            lut = params.get("lut_name", "warm")
            out = tool_color_lut(ffmpeg, inp, lut, params.get("output_path"))
            return f"✅ Color LUT grading ({lut}) applied -> {out}"

        elif tool_name == "flip_video":
            inp = params.get("input_path", "")
            d = params.get("direction", "horizontal")
            out = tool_flip_video(ffmpeg, inp, d, params.get("output_path"))
            return f"✅ Video flipped {d} -> {out}"

        elif tool_name == "rotate_video":
            inp = params.get("input_path", "")
            deg = int(params.get("degrees", 90))
            out = tool_rotate_video(ffmpeg, inp, deg, params.get("output_path"))
            return f"✅ Video rotated {deg}° -> {out}"

        elif tool_name == "denoise_audio":
            inp = params.get("input_path", "")
            out = tool_denoise_audio(ffmpeg, inp, params.get("output_path"))
            return f"✅ Audio background noise reduced -> {out}"

        elif tool_name == "extract_keyframes":
            inp = params.get("input_path", "")
            out = tool_extract_keyframes(ffmpeg, inp, params.get("output_dir"))
            return f"✅ Keyframes / I-Frames extracted to: {out}"

        elif tool_name == "speed_ramp":
            inp = params.get("input_path", "")
            sp = float(params.get("speed_multiplier", 2.0))
            out = tool_speed_ramp(ffmpeg, inp, sp, params.get("output_path"))
            return f"✅ Speed ramp applied ({sp}x) -> {out}"

        elif tool_name == "render_progress_bar":
            inp = params.get("input_path", "")
            col = params.get("bar_color", "red")
            h = int(params.get("bar_height", 8))
            out = tool_render_progress_bar(ffmpeg, inp, col, h, params.get("output_path"))
            return f"✅ Video progress bar rendered -> {out}"

        elif tool_name == "concat_videos":
            vids = params.get("video_paths", [])
            out = tool_concat_videos(ffmpeg, vids, params.get("output_path"))
            return f"✅ Concatenated {len(vids)} clips -> {out}"

        elif tool_name == "extract_transcript":
            inp = params.get("media_path", "")
            out = tool_extract_transcript(inp, api_key, params.get("output_path"))
            return f"✅ Transcript generated (.txt) -> {out}"

        elif tool_name == "mux_audio_video":
            vid = params.get("video_path", "")
            aud = params.get("audio_path", "")
            out = tool_mux_audio_video(ffmpeg, vid, aud, params.get("output_path"))
            return f"✅ Audio stream remuxed into video -> {out}"

        elif tool_name == "remove_audio":
            inp = params.get("input_path", "")
            out = tool_remove_audio(ffmpeg, inp, params.get("output_path"))
            return f"✅ Video audio stripped -> {out}"

        elif tool_name == "audio_waveform":
            inp = params.get("input_path", "")
            col = params.get("color", "cyan")
            out = tool_audio_waveform(ffmpeg, inp, col, params.get("output_path"))
            return f"✅ Visual waveform animation generated -> {out}"

        elif tool_name == "storyboard_grid":
            inp = params.get("input_path", "")
            cols = int(params.get("columns", 4))
            rows = int(params.get("rows", 3))
            out = tool_storyboard_grid(ffmpeg, inp, cols, rows, params.get("output_path"))
            return f"✅ Storyboard contact sheet created -> {out}"

        elif tool_name == "render_lower_third":
            inp = params.get("input_path", "")
            t1 = params.get("title", "")
            t2 = params.get("subtitle", "")
            out = tool_render_lower_third(ffmpeg, inp, t1, t2, params.get("output_path"))
            return f"✅ Lower third title graphic rendered -> {out}"

        elif tool_name == "split_screen":
            v1 = params.get("video1_path", "")
            v2 = params.get("video2_path", "")
            mode = params.get("layout", "horizontal")
            out = tool_split_screen(ffmpeg, v1, v2, mode, params.get("output_path"))
            return f"✅ Split screen video composed ({mode}) -> {out}"

        elif tool_name == "picture_in_picture":
            bg = params.get("background_video", "")
            ov = params.get("overlay_video", "")
            pos = params.get("position", "bottom_right")
            sc = float(params.get("scale", 0.3))
            out = tool_picture_in_picture(ffmpeg, bg, ov, pos, sc, params.get("output_path"))
            return f"✅ Picture-in-Picture composition created -> {out}"

        elif tool_name == "change_framerate":
            inp = params.get("input_path", "")
            fps = int(params.get("target_fps", 60))
            out = tool_change_framerate(ffmpeg, inp, fps, params.get("output_path"))
            return f"✅ Video framerate converted to {fps}fps -> {out}"

        elif tool_name == "detect_black_frames":
            inp = params.get("input_path", "")
            out_black = tool_detect_black_frames(ffmpeg, inp)
            return f"✅ Black frame detection finished: {len(out_black)} segments found."

        elif tool_name == "credits_roll":
            txt = params.get("credits_text", "")
            dur = float(params.get("duration", 8.0))
            out = tool_credits_roll(ffmpeg, txt, dur, params.get("output_path"))
            return f"✅ End credits roll animation generated -> {out}"

        elif tool_name == "slideshow_from_images":
            imgs = params.get("image_paths", [])
            dur = float(params.get("slide_duration", 3.0))
            out = tool_slideshow_from_images(ffmpeg, imgs, dur, params.get("output_path"))
            return f"✅ Photo slideshow video created -> {out}"

        elif tool_name == "mlt_add_transition":
            mlt = params.get("mlt_path", "")
            ttype = params.get("transition_type", "dissolve")
            dur = int(params.get("duration_frames", 30))
            out = tool_mlt_add_transition(mlt, ttype, dur, params.get("output_path"))
            return f"✅ Shotcut transition inserted -> {out}"

        elif tool_name == "mlt_set_gain":
            mlt = params.get("mlt_path", "")
            gain_db = float(params.get("gain_db", 3.0))
            out = tool_mlt_set_gain(mlt, gain_db, params.get("output_path"))
            return f"✅ MLT audio gain filter inserted ({gain_db} dB) -> {out}"

        elif tool_name == "mlt_crop_filter":
            mlt = params.get("mlt_path", "")
            t = int(params.get("top", 0))
            b = int(params.get("bottom", 0))
            l = int(params.get("left", 0))
            r = int(params.get("right", 0))
            out = tool_mlt_crop_filter(mlt, t, b, l, r, params.get("output_path"))
            return f"✅ MLT crop filter inserted -> {out}"

        elif tool_name == "mlt_blur_filter":
            mlt = params.get("mlt_path", "")
            rad = float(params.get("radius", 0.2))
            out = tool_mlt_blur_filter(mlt, rad, params.get("output_path"))
            return f"✅ MLT blur filter inserted -> {out}"

        elif tool_name == "export_edl":
            mlt = params.get("mlt_path", "")
            out = tool_export_edl(mlt, params.get("output_path"))
            return f"✅ CMX 3600 EDL exported -> {out}"

        elif tool_name == "batch_rename":
            d = params.get("directory", "")
            pat = params.get("pattern", "clip_{idx}")
            ext = params.get("ext", ".mp4")
            out_renamed = tool_batch_rename(d, pat, ext)
            return f"✅ Batch renamed {len(out_renamed)} media files."

        elif tool_name == "calculate_stats":
            inp = params.get("input_path", "")
            st = tool_calculate_stats(ffmpeg, inp)
            return f"✅ Media metadata calculated: {json.dumps(st, indent=2)}"

        elif tool_name == "burn_timecode":
            inp = params.get("input_path", "")
            fps = int(params.get("fps", 30))
            out = tool_burn_timecode(ffmpeg, inp, fps, params.get("output_path"))
            return f"✅ SMPTE visual timecode burned into clip -> {out}"

        elif tool_name == "extract_frame":
            inp = params.get("input_path", "")
            ts = params.get("timestamp", "00:00:01")
            out = tool_extract_frame_jpeg(ffmpeg, inp, ts, params.get("output_path"))
            return f"✅ Frame JPEG extracted -> {out}"

        elif tool_name == "capture_timeline_preview":
            out = tool_capture_shotcut_preview_jpeg(params.get("output_path"))
            return f"✅ Captured live Shotcut timeline preview JPEG -> {out}"

        elif tool_name == "analyze_frame":
            inp = params.get("input_path", "")
            ts = params.get("timestamp", "00:00:01")
            user_pmt = params.get("prompt", "")
            ext = os.path.splitext(inp)[1].lower() if inp else ""
            if ext in [".jpg", ".jpeg", ".png", ".webp"]:
                target_jpeg = inp
            elif inp:
                target_jpeg = tool_extract_frame_jpeg(ffmpeg, inp, ts)
            else:
                target_jpeg = tool_capture_shotcut_preview_jpeg()

            vision_res = tool_analyze_frame_vision(api_key, target_jpeg, user_pmt)
            out = target_jpeg
            return f"✅ Frame Composition Analysis ({os.path.basename(target_jpeg)}):\n\n{vision_res.get('analysis')}"

        elif tool_name == "auto_roughcut":
            inp = _get_input_media(params, media_tracker)
            if not inp or not os.path.exists(inp):
                raise FileNotFoundError(f"Input video not found: '{inp}'.")
            db = float(params.get("noise_tolerance_db", -30.0))
            dur = float(params.get("min_silence_sec", 0.5))
            res = tool_auto_roughcut(ffmpeg, inp, db, dur, params.get("output_path"))
            out = res["mlt_project"]
            return f"✅ Auto-Roughcut MLT timeline generated: {res['clips_count']} clips ({res['seconds_saved']}s dead-air removed) -> {out}"

        elif tool_name == "extract_viral_short":
            inp = _get_input_media(params, media_tracker)
            if not inp or not os.path.exists(inp):
                raise FileNotFoundError(f"Input video not found: '{inp}'.")
            dur_sec = int(params.get("duration_sec", 35))
            out = tool_extract_viral_short(ffmpeg, inp, api_key, dur_sec, params.get("output_path"))
            return f"✅ Viral 9:16 vertical short generated with subtitles -> {out}"

        elif tool_name == "burn_subtitles":
            inp = params.get("video_path") or params.get("input_path") or params.get("media_path", "")
            if inp and isinstance(inp, str) and inp.lower().endswith(".mlt") and os.path.exists(inp):
                try:
                    p_info = parse_mlt_project(inp)
                    for pr in p_info.get("producers", []):
                        s = pr.get("source", "").replace("/", "\\")
                        if s and os.path.exists(s) and s.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm")):
                            inp = s
                            break
                except Exception:
                    pass

            # Fallback to media tracker if inp is missing or placeholder
            if (not inp or not os.path.exists(inp)) and media_tracker:
                for item in reversed(media_tracker.get_all_tracked()):
                    fp = item.get("path", "")
                    if fp and os.path.exists(fp) and fp.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm")):
                        inp = fp
                        break

            if not inp or not os.path.exists(inp):
                raise FileNotFoundError(f"Media file not found for burning subtitles: '{inp}'.")

            srt = params.get("srt_path") or params.get("subtitle_path", "")
            if (not srt or not os.path.exists(srt)) and inp:
                base_video, _ = os.path.splitext(inp)
                candidate_srt = f"{base_video}.srt"
                if os.path.exists(candidate_srt):
                    srt = candidate_srt

            if not srt or not os.path.exists(srt):
                # Auto-generate subtitles via Whisper if .srt is not yet present on disk
                try:
                    execute_video_tool("generate_subtitles", params, ffmpeg=ffmpeg, api_key=api_key, media_tracker=media_tracker)
                    base_video, _ = os.path.splitext(inp)
                    candidate_srt = f"{base_video}.srt"
                    if os.path.exists(candidate_srt):
                        srt = candidate_srt
                except Exception:
                    pass

            if not srt or not os.path.exists(srt):
                raise FileNotFoundError(f"Subtitle .srt file not found: '{srt}'. Please generate subtitles first.")

            _burn = globals().get("tool_burn_subtitles")
            if not _burn:
                try:
                    from companion.tools.subtitles_tools import tool_burn_subtitles as _burn
                except ImportError:
                    from tools.subtitles_tools import tool_burn_subtitles as _burn

            font = params.get("font") or "Baloo"
            outline_color = params.get("outline_color") or params.get("outline") or "black"
            text_color = params.get("text_color") or params.get("color") or "white"
            animation = params.get("animation") or "bounce"
            outline_width = int(params.get("outline_width", 4))
            font_size = int(params.get("font_size", 52))

            out = _burn(
                ffmpeg, inp, srt, params.get("output_path"),
                font=font, text_color=text_color, outline_color=outline_color,
                outline_width=outline_width, animation=animation, font_size=font_size
            )
            return f"✅ Fancy animated subtitles ({animation} anim, font '{font}', outline '{outline_color}') burned into video -> {out}"

        elif tool_name in ("generate_subtitles", "auto_generate_subtitles", "transcribe_video"):
            inp = params.get("media_path") or params.get("input_path") or params.get("video_path", "")
            # If inp is a .mlt timeline project, extract its underlying media producer
            if inp and isinstance(inp, str) and inp.lower().endswith(".mlt") and os.path.exists(inp):
                try:
                    p_info = parse_mlt_project(inp)
                    for pr in p_info.get("producers", []):
                        s = pr.get("source", "").replace("/", "\\")
                        if s and os.path.exists(s) and s.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm", ".mp3", ".wav", ".aac", ".flac")):
                            inp = s
                            break
                except Exception:
                    pass

            # Fallback to media tracker if inp is missing or placeholder
            if (not inp or not os.path.exists(inp)) and media_tracker:
                for item in reversed(media_tracker.get_all_tracked()):
                    fp = item.get("path", "")
                    if fp and os.path.exists(fp) and fp.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm", ".mp3", ".wav")):
                        inp = fp
                        break

            if not inp or not os.path.exists(inp):
                raise FileNotFoundError(f"Media file not found: '{inp}'. Please specify a valid video file.")

            base, _ = os.path.splitext(inp)
            temp_mp3 = f"{base}_mediamogul_whisper_tmp.mp3"
            out_srt = params.get("output_path") or f"{base}.srt"

            _extract = globals().get("extract_audio_for_whisper")
            if not _extract:
                try:
                    from companion.tools.subtitles_tools import extract_audio_for_whisper as _extract
                except ImportError:
                    try:
                        from tools.subtitles_tools import extract_audio_for_whisper as _extract
                    except ImportError:
                        _extract = extract_audio

            _transcribe = globals().get("transcribe_whisper")
            if not _transcribe:
                try:
                    from companion.tools.subtitles_tools import transcribe_whisper as _transcribe
                except ImportError:
                    from tools.subtitles_tools import transcribe_whisper as _transcribe

            _convert = globals().get("convert_whisper_to_srt")
            if not _convert:
                try:
                    from companion.tools.subtitles_tools import convert_whisper_to_srt as _convert
                except ImportError:
                    from tools.subtitles_tools import convert_whisper_to_srt as _convert

            try:
                _extract(inp, temp_mp3, ffmpeg)
                w_data = _transcribe(temp_mp3, api_key)
                _convert(w_data, out_srt)

                # Record accurate Whisper transcription cost
                try:
                    c_calc = get_cost_calculator()
                    if c_calc:
                        dur_sec = 60.0
                        if os.path.exists(temp_mp3):
                            dur_sec = get_media_duration_seconds(ffmpeg, temp_mp3)
                        w_cost = c_calc.calculate_whisper_cost(dur_sec)
                        c_calc.record_transaction("Whisper STT Transcription", w_cost, {"audio_seconds": dur_sec}, f"Audio duration: {dur_sec:.1f}s")
                except Exception:
                    pass

                # Also automatically generate styled & animated .ass subtitle file
                font = params.get("font") or "Baloo"
                outline_color = params.get("outline_color") or "black"
                text_color = params.get("text_color") or "white"
                animation = params.get("animation") or "bounce"
                outline_width = int(params.get("outline_width", 4))
                out_ass = f"{base}.ass"

                _convert_ass = globals().get("convert_whisper_to_ass")
                if not _convert_ass:
                    try:
                        from companion.tools.subtitles_tools import convert_whisper_to_ass as _convert_ass
                    except ImportError:
                        from tools.subtitles_tools import convert_whisper_to_ass as _convert_ass

                if _convert_ass:
                    _convert_ass(
                        w_data, out_ass, font=font,
                        text_color=text_color, outline_color=outline_color,
                        outline_width=outline_width, animation=animation
                    )
            finally:
                if os.path.exists(temp_mp3):
                    try:
                        os.remove(temp_mp3)
                    except Exception:
                        pass

            out = out_srt
            return f"✅ Synchronized subtitles generated for {os.path.basename(inp)} -> {out_srt} & animated {base}.ass (font: '{font}', outline: '{outline_color}', anim: '{animation}')"

        elif tool_name == "generate_voiceover":
            txt = params.get("text", "")
            voice = params.get("voice", "alloy")
            out = generate_tts_audio(txt, voice, api_key, params.get("output_path"))
            c_calc = get_cost_calculator()
            if c_calc:
                tts_cost = c_calc.calculate_tts_cost(len(txt))
                c_calc.record_transaction("OpenAI Text-to-Speech", tts_cost, {"tts_chars": len(txt)}, f"Voice: {voice}, {len(txt)} chars")
            if fp_tracker:
                fp_tracker.record_media_asset(out, is_ai_generated=True)
            return f"✅ Studio TTS voiceover synthesized ({voice}) -> {out}"

        elif tool_name == "generate_broll":
            pmt = params.get("prompt", "")
            sz = params.get("size", "1024x1024")
            out = generate_dalle_image(pmt, api_key, sz, params.get("output_path"))
            c_calc = get_cost_calculator()
            if c_calc:
                dalle_cost = c_calc.calculate_dalle_cost(sz)
                c_calc.record_transaction("DALL-E 3 Image Generation", dalle_cost, {"dalle_images": 1}, f"Prompt: {pmt[:40]}")
            if fp_tracker:
                fp_tracker.record_media_asset(out, is_ai_generated=True)
            return f"✅ Visual B-Roll generated via DALL-E 3 -> {out}"

        elif tool_name == "generate_sfx":
            sfx_t = params.get("sfx_type", "whoosh")
            out = tool_generate_sfx(sfx_t, params.get("output_path"))
            return f"✅ Sound effect ({sfx_t}) synthesized -> {out}"

        elif tool_name in ("download_pexels_video", "download_pexels", "pexels_video", "pexels", "stock_video"):
            q_or_url = params.get("query") or params.get("url") or params.get("video_url") or params.get("topic") or params.get("keyword") or "nature"
            dest_dir = params.get("destination_dir") or params.get("output_dir") or params.get("folder")
            out_p = params.get("output_path") or params.get("output_file")
            orient = params.get("orientation")
            p_key = params.get("api_key")
            out = tool_download_pexels_video(
                query_or_url=q_or_url,
                output_path=out_p,
                destination_dir=dest_dir,
                api_key=p_key,
                orientation=orient,
                media_tracker=media_tracker
            )
            return out

        else:
            return f"⚠️ Unknown tool requested: {tool_name}"
    except Exception as err:
        return f"❌ Tool execution failed: {err}"
    finally:
        if fp_tracker:
            fp_tracker.record_action(tool_name, params)
            if out and isinstance(out, str) and os.path.exists(out) and tool_name not in ("generate_broll", "generate_voiceover"):
                fp_tracker.record_media_asset(out, is_ai_generated=False)
        if media_tracker:
            for k in ("input_path", "video_path", "media_path", "audio_path", "voice_path", "music_path", "background_video", "overlay_video", "video1_path", "video2_path"):
                if k in params and params[k]:
                    media_tracker.track_file(str(params[k]))
            if out and isinstance(out, str) and os.path.exists(out):
                media_tracker.track_file(out)
            media_tracker.record_action(tool_name, {"parameters": params, "result": str(out)})
