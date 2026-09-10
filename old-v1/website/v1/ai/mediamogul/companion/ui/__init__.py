"""MediaMogul UI Tab & Component Modules"""
from .top_bar import MediaMogulTopBarButton
from .remote_bar import setup_remote_bar
from .agent_tab import setup_agent_tab
from .subtitles_tab import setup_subtitles_tab
from .voiceover_tab import setup_voiceover_tab
from .broll_tab import setup_broll_tab
from .inspector_tab import setup_inspector_tab
from .vision_tab import setup_vision_tab
from .collab_tab import setup_collab_tab
from .settings_tab import setup_settings_tab
from .director_tab import setup_director_tab
from .sfx_tab import setup_sfx_tab
from .elements_tab import setup_elements_tab
from .multiverse_tab import setup_multiverse_tab

__all__ = [
    "MediaMogulTopBarButton",
    "setup_remote_bar",
    "setup_agent_tab",
    "setup_subtitles_tab",
    "setup_voiceover_tab",
    "setup_broll_tab",
    "setup_inspector_tab",
    "setup_vision_tab",
    "setup_collab_tab",
    "setup_settings_tab",
    "setup_director_tab",
    "setup_sfx_tab",
    "setup_elements_tab",
    "setup_multiverse_tab",
]
