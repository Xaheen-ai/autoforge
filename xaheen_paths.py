"""
Xaheen Path Resolution
======================

Central module for resolving paths to xaheen-generated files within a project.

Implements a single-path resolution strategy:

    1. Check ``project_dir / ".xaheen" / X``

All runtime files are stored under ``.xaheen/``.
"""

import logging
import shutil
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# .gitignore content written into every .xaheen/ directory
# ---------------------------------------------------------------------------
_GITIGNORE_CONTENT = """\
# Xaheen runtime files
features.db
features.db-wal
features.db-shm
assistant.db
assistant.db-wal
assistant.db-shm
.agent.lock
.devserver.lock
.claude_settings.json
.claude_assistant_settings.json
.claude_settings.expand.*.json
.progress_cache
"""


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _resolve_path(project_dir: Path, filename: str) -> Path:
    """Resolve a file path using strict single-path strategy.

    Always returns ``.xaheen/filename``.
    """
    return project_dir / ".xaheen" / filename


def _resolve_dir(project_dir: Path, dirname: str) -> Path:
    """Resolve a directory path using strict single-path strategy.

    Always returns ``.xaheen/dirname``.
    """
    return project_dir / ".xaheen" / dirname


# ---------------------------------------------------------------------------
# .xaheen directory management
# ---------------------------------------------------------------------------

def get_xaheen_dir(project_dir: Path) -> Path:
    """Return the ``.xaheen`` directory path.  Does NOT create it."""
    return project_dir / ".xaheen"



def ensure_xaheen_dir(project_dir: Path) -> Path:
    """Create the ``.xaheen/`` directory (if needed) and write its ``.gitignore``.

    Returns:
        The path to the ``.xaheen`` directory.
    """
    xaheen_dir = get_xaheen_dir(project_dir)
    xaheen_dir.mkdir(parents=True, exist_ok=True)

    gitignore_path = xaheen_dir / ".gitignore"
    gitignore_path.write_text(_GITIGNORE_CONTENT, encoding="utf-8")

    return xaheen_dir



# ---------------------------------------------------------------------------
# Dual-path file helpers
# ---------------------------------------------------------------------------

def get_features_db_path(project_dir: Path) -> Path:
    """Resolve the path to ``features.db``."""
    return _resolve_path(project_dir, "features.db")


def get_assistant_db_path(project_dir: Path) -> Path:
    """Resolve the path to ``assistant.db``."""
    return _resolve_path(project_dir, "assistant.db")


def get_agent_lock_path(project_dir: Path) -> Path:
    """Resolve the path to ``.agent.lock``."""
    return _resolve_path(project_dir, ".agent.lock")


def get_devserver_lock_path(project_dir: Path) -> Path:
    """Resolve the path to ``.devserver.lock``."""
    return _resolve_path(project_dir, ".devserver.lock")


def get_claude_settings_path(project_dir: Path) -> Path:
    """Resolve the path to ``.claude_settings.json``."""
    return _resolve_path(project_dir, ".claude_settings.json")


def get_claude_assistant_settings_path(project_dir: Path) -> Path:
    """Resolve the path to ``.claude_assistant_settings.json``."""
    return _resolve_path(project_dir, ".claude_assistant_settings.json")


def get_progress_cache_path(project_dir: Path) -> Path:
    """Resolve the path to ``.progress_cache``."""
    return _resolve_path(project_dir, ".progress_cache")


def get_prompts_dir(project_dir: Path) -> Path:
    """Resolve the path to the ``prompts/`` directory."""
    return _resolve_dir(project_dir, "prompts")


# ---------------------------------------------------------------------------
# Non-dual-path helpers (always use new location)
# ---------------------------------------------------------------------------

def get_expand_settings_path(project_dir: Path, uuid_hex: str) -> Path:
    """Return the path for an ephemeral expand-session settings file.

    These files are short-lived and always stored in ``.xaheen/``.
    """
    return project_dir / ".xaheen" / f".claude_settings.expand.{uuid_hex}.json"


# ---------------------------------------------------------------------------
# Lock-file safety check
# ---------------------------------------------------------------------------

def has_agent_running(project_dir: Path) -> bool:
    """Check whether any agent or dev-server lock file exists in .xaheen/."""
    lock_names = (".agent.lock", ".devserver.lock")
    for name in lock_names:
        if (project_dir / ".xaheen" / name).exists():
            return True
    return False


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

def migrate_project_layout(project_dir: Path) -> list[str]:
    """No-op migration function (backwards compat removed)."""
    return []
