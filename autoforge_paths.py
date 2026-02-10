"""
Backwards-compatibility shim for autoforge_paths.

All functionality has moved to xaheen_paths. This module re-exports
everything so that existing code using ``import autoforge_paths`` continues
to work without modification.
"""

from xaheen_paths import *  # noqa: F401, F403
from xaheen_paths import (
    _resolve_path,
    _resolve_dir,
    _GITIGNORE_CONTENT,
    get_xaheen_dir,
    ensure_xaheen_dir,
    get_autoforge_dir,
    ensure_autoforge_dir,
    get_features_db_path,
    get_assistant_db_path,
    get_agent_lock_path,
    get_devserver_lock_path,
    get_claude_settings_path,
    get_claude_assistant_settings_path,
    get_progress_cache_path,
    get_prompts_dir,
    get_expand_settings_path,
    has_agent_running,
    migrate_project_layout,
)
