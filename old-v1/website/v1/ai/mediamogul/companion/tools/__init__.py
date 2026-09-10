"""
tools package for MediaMogul companion
"""
from .audio_tools import (
    tool_detect_silence, tool_fade_audio, tool_normalize_loudness,
    tool_audio_ducking, tool_denoise_audio, tool_remove_audio,
    tool_mux_audio_video, tool_audio_waveform, tool_mlt_set_gain,
    generate_tts_audio
)
from .video_edit_tools import (
    tool_trim_video, tool_convert_vertical, tool_change_speed,
    tool_reverse_video, tool_loop_video, tool_speed_ramp,
    tool_change_framerate, tool_compress_video, tool_split_scenes,
    tool_detect_black_frames
)
from .visual_fx_tools import (
    tool_add_watermark, tool_create_gif, tool_adjust_color,
    tool_blur_video, tool_color_lut, tool_flip_video,
    tool_rotate_video, tool_split_screen, tool_picture_in_picture,
    tool_render_progress_bar, tool_render_lower_third, tool_credits_roll,
    tool_slideshow_from_images, tool_concat_videos, tool_storyboard_grid,
    tool_extract_keyframes, tool_extract_thumbnail, tool_burn_timecode,
    generate_dalle_image
)
from .mlt_tools import (
    tool_add_to_timeline, tool_import_media_folder,
    tool_modify_shotcut_mlt, tool_mlt_add_transition,
    tool_mlt_crop_filter, tool_mlt_blur_filter, tool_export_edl,
    tool_batch_rename, tool_calculate_stats, parse_mlt_project,
    tool_evaluate_timeline, tool_render_mlt_with_shotcut
)
from .subtitles_tools import (
    extract_audio_for_whisper, transcribe_whisper,
    convert_whisper_to_srt, convert_whisper_to_ass, convert_srt_to_ass,
    tool_burn_subtitles, tool_extract_transcript, tool_generate_chapters,
    color_to_ass, color_to_hex, ANIMATION_TAGS
)
from .vision_tools import (
    tool_extract_frame_jpeg, tool_capture_shotcut_preview_jpeg,
    tool_analyze_frame_vision
)
from .auto_director_tools import (
    tool_auto_roughcut, tool_extract_viral_short, tool_auto_produce_video
)
from .sfx_tools import (
    tool_generate_sfx, generate_cinematic_boom, generate_whoosh_transition,
    generate_glitch_riser, generate_ui_pop, generate_camera_shutter,
    generate_sub_drop, generate_vinyl_scratch, SFX_GENERATORS
)
from .element_tools import (
    find_shotcut_elements_dir, list_shotcut_elements, resolve_shotcut_element,
    tool_add_element_to_timeline, tool_auto_add_elements
)
from .multiverse_tools import (
    tool_create_multiverse_timelines, tool_branch_timeline_universe
)
from .pexels_tools import (
    extract_pexels_video_id, search_pexels_videos,
    download_pexels_video, tool_download_pexels_video
)
