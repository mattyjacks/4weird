"""
core module for MediaMogul companion
"""
from .ffmpeg_utils import (
    find_ffmpeg, find_melt, find_shotcut_exe, find_shotcut_window,
    format_timestamp, extract_audio, get_media_duration_seconds,
    estimate_tokens, count_conversation_tokens, prune_sliding_context
)
from .media_tracker import MediaLibraryTracker
from .commander import MediaMogulCommander
from .cost_calculator import CostCalculator, get_cost_calculator
from .fingerprint_tracker import (
    FingerprintTracker, get_fingerprint_tracker,
    STATUS_FREE, STATUS_PARTS, STATUS_FULL, AI_FINGERPRINT_TOOLS, FINGERPRINT_FREE_TOOLS
)
from .prepared_plan import PreparedPlan
from .shotcut_remote import (
    remote_play_pause, remote_split_clip, remote_ripple_delete,
    remote_step_frame_backward, remote_step_frame_forward, remote_undo,
    bring_shotcut_to_front
)
from .autonomous_agent import (
    AutonomousVideoAgent, LocalIntentParser, GoalStage
)
from .agent_daemon import AgentDaemon


def __getattr__(name):
    if name in ("SYSTEM_PROMPT", "execute_video_tool", "safe_parse_tool_call"):
        from .agent_engine import SYSTEM_PROMPT, execute_video_tool, safe_parse_tool_call
        if name == "SYSTEM_PROMPT":
            return SYSTEM_PROMPT
        if name == "safe_parse_tool_call":
            return safe_parse_tool_call
        return execute_video_tool
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
