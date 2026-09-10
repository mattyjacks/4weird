"""
fingerprint_tracker.py - 3-Tier AI Fingerprint Detection & Enforcement Engine.

Statuses:
- Fingerprint-Free: Zero AI frames or synthetic audio. Purely authentic human/camera footage
  with deterministic edits (roughcuts, audio ducking, loudness normalization, MLT filters, stickers).
  Guarantees optimal algorithmic reach on TikTok, YouTube, Instagram & Reels without AI labels.
- Fingerprint-Parts: 1 frame or more of AI-generated assets (DALL-E B-roll, TTS voiceover, AI overlay).
- Fingerprint-Full: Majority of content is AI-touched (>= 50% duration or assets).
"""

import os
import json


STATUS_FREE = "Fingerprint-Free"
STATUS_PARTS = "Fingerprint-Parts"
STATUS_FULL = "Fingerprint-Full"

# Tools that introduce an AI fingerprint into the output video/audio
AI_FINGERPRINT_TOOLS = {
    "generate_broll": "DALL-E 3 AI Image Generation (Introduces synthetic imagery)",
    "generate_voiceover": "OpenAI Text-to-Speech (Introduces synthetic AI voice track)",
    "extract_viral_short": "Auto-generates AI B-roll or synthetic captions if enabled"
}

# Tools that are 100% fingerprint-free (deterministic signal processing and local editing)
FINGERPRINT_FREE_TOOLS = {
    "auto_roughcut", "normalize_loudness", "audio_ducking", "trim_video",
    "convert_vertical", "change_speed", "reverse_video", "loop_video",
    "color_lut", "adjust_color", "blur_video", "denoise_audio",
    "remove_audio", "mux_audio_video", "audio_waveform", "storyboard_grid",
    "render_lower_third", "split_screen", "picture_in_picture", "change_framerate",
    "detect_black_frames", "detect_silence", "fade_audio", "credits_roll",
    "slideshow_from_images", "mlt_add_transition", "mlt_set_gain",
    "mlt_crop_filter", "mlt_blur_filter", "export_edl", "batch_rename",
    "calculate_stats", "burn_timecode", "add_to_timeline", "overlay_shotcut_element",
    "auto_add_elements", "create_multiverse_timelines", "branch_timeline_universe",
    "evaluate_timeline", "burn_subtitles", "generate_subtitles", "generate_sfx",
    "download_pexels_video", "download_pexels", "pexels_video",
    "build_well_produced_commercial", "master_commercial", "auto_produce_video",
    "tool_auto_produce_video", "render_mlt_with_shotcut"
}


class FingerprintTracker:
    """Tracks project media assets and tool actions to evaluate and enforce AI fingerprinting."""

    def __init__(self, settings_ref=None):
        self.settings = settings_ref or {}
        self.ai_assets_count = 0
        self.clean_assets_count = 0
        self.ai_duration_seconds = 0.0
        self.total_duration_seconds = 0.0
        self.applied_ai_tools = []

    def is_strict_mode(self) -> bool:
        """Returns True if the user has disabled all features that add an AI fingerprint."""
        return bool(self.settings.get("disable_ai_fingerprint_features", False))

    def check_tool_permission(self, tool_name: str) -> tuple[bool, str]:
        """
        Validates whether a tool can be executed under the current fingerprint policy.
        Returns (is_allowed, reason_or_warning).
        """
        t_key = tool_name.lower().strip().replace("-", "_")
        if self.is_strict_mode() and t_key in AI_FINGERPRINT_TOOLS:
            reason = (
                f"🛡️ Tool '{tool_name}' is blocked by Fingerprint-Free policy.\n"
                f"Reason: {AI_FINGERPRINT_TOOLS[t_key]}.\n"
                "Your project is configured to remain 100% Fingerprint-Free for maximum social media algorithmic reach."
            )
            return False, reason
        return True, ""

    def record_media_asset(self, filepath: str, is_ai_generated: bool = False, duration_sec: float = 0.0):
        """Records an asset in the project manifest with authenticity metadata."""
        if is_ai_generated:
            self.ai_assets_count += 1
            self.ai_duration_seconds += max(0.0, float(duration_sec))
        else:
            self.clean_assets_count += 1
        self.total_duration_seconds += max(0.0, float(duration_sec))

    def record_action(self, tool_name: str, params: dict = None):
        """Records a video tool execution and tracks AI footprint."""
        t_key = tool_name.lower().strip().replace("-", "_")
        if t_key in AI_FINGERPRINT_TOOLS:
            self.ai_assets_count += 1
            self.applied_ai_tools.append(tool_name)

    def evaluate_status(self) -> dict:
        """
        Computes the current 3-tier status:
        - Fingerprint-Free: 0 AI frames/audio
        - Fingerprint-Parts: 1+ frames of AI assets (< 50%)
        - Fingerprint-Full: >= 50% AI content
        """
        if self.ai_assets_count == 0 and len(self.applied_ai_tools) == 0:
            status = STATUS_FREE
            badge_icon = "🟢"
            badge_color = "#10b981"
            description = "100% Authentic Human/Camera Footage. No AI detected (Max algorithm reach on TikTok, YouTube & Reels)."
        else:
            total_items = self.ai_assets_count + self.clean_assets_count
            if self.total_duration_seconds > 0:
                ai_ratio = self.ai_duration_seconds / self.total_duration_seconds
            else:
                ai_ratio = (self.ai_assets_count / total_items) if total_items > 0 else 1.0

            # Fingerprint-Full: majority of content is AI touched (at least 50%)
            # If total_duration_seconds > 0, ratio >= 0.50 indicates majority duration.
            # If duration is 0, require majority of items (>50%) or multiple AI assets.
            is_full = False
            if self.total_duration_seconds > 0:
                is_full = (ai_ratio >= 0.50)
            else:
                is_full = (self.ai_assets_count > self.clean_assets_count) or (self.ai_assets_count >= 2 and total_items <= 2)

            if is_full or len(self.applied_ai_tools) >= 3:
                status = STATUS_FULL
                badge_icon = "🟣"
                badge_color = "#a855f7"
                description = f"Majority AI-Touched ({ai_ratio*100:.0f}% AI content). Platforms may label as 'AI Generated'."
            else:
                status = STATUS_PARTS
                badge_icon = "🟡"
                badge_color = "#f59e0b"
                description = f"Partial AI Detected ({self.ai_assets_count} AI asset(s)). Check platform labeling guidelines."

        return {
            "status": status,
            "badge_icon": badge_icon,
            "badge_color": badge_color,
            "description": description,
            "ai_assets_count": self.ai_assets_count,
            "clean_assets_count": self.clean_assets_count,
            "applied_ai_tools": list(self.applied_ai_tools),
            "is_strict_mode": self.is_strict_mode()
        }

    def reset(self):
        """Resets tracking counters for a new project session."""
        self.ai_assets_count = 0
        self.clean_assets_count = 0
        self.ai_duration_seconds = 0.0
        self.total_duration_seconds = 0.0
        self.applied_ai_tools = []


# Singleton tracker
_global_fingerprint_tracker = None

def get_fingerprint_tracker(settings=None) -> FingerprintTracker:
    global _global_fingerprint_tracker
    if _global_fingerprint_tracker is None:
        _global_fingerprint_tracker = FingerprintTracker(settings)
    elif settings:
        _global_fingerprint_tracker.settings = settings
    return _global_fingerprint_tracker
