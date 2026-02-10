"""
Xaheen Path Resolution
======================

Central module for resolving paths to xaheen-generated files within a project.

Implements a quad-path resolution strategy for backward compatibility:

    1. Check ``project_dir / ".xaheen" / X`` (current layout)
    2. Check ``project_dir / ".autoforge" / X`` (legacy layout v2)
    3. Check ``project_dir / ".autocoder" / X`` (legacy layout v1)
    4. Check ``project_dir / X`` (legacy root-level layout)
    5. Default to the new location for fresh projects

This allows existing projects with root-level ``features.db``, ``.agent.lock``,
etc. to keep working while new projects store everything under ``.xaheen/``.
Projects using the old ``.autocoder/`` or ``.autoforge/`` directories are
auto-migrated on next start.

The ``migrate_project_layout`` function can move an old-layout project to the
new layout safely, with full integrity checks for SQLite databases.
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
    """Resolve a file path using quad-path strategy.

    Checks ``.xaheen/`` first, then legacy ``.autoforge/``, then
    ``.autocoder/``, then root-level.  If none exist,
    returns the new ``.xaheen/`` location.
    """
    new = project_dir / ".xaheen" / filename
    if new.exists():
        return new
    autoforge = project_dir / ".autoforge" / filename
    if autoforge.exists():
        return autoforge
    legacy = project_dir / ".autocoder" / filename
    if legacy.exists():
        return legacy
    old = project_dir / filename
    if old.exists():
        return old
    return new  # default for new projects


def _resolve_dir(project_dir: Path, dirname: str) -> Path:
    """Resolve a directory path using quad-path strategy."""
    new = project_dir / ".xaheen" / dirname
    if new.exists():
        return new
    autoforge = project_dir / ".autoforge" / dirname
    if autoforge.exists():
        return autoforge
    legacy = project_dir / ".autocoder" / dirname
    if legacy.exists():
        return legacy
    old = project_dir / dirname
    if old.exists():
        return old
    return new


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
    """Check whether any agent or dev-server lock file exists at any location.

    Inspects all layout locations so that a running agent is detected
    regardless of project layout.

    Returns:
        ``True`` if any ``.agent.lock`` or ``.devserver.lock`` exists.
    """
    lock_names = (".agent.lock", ".devserver.lock")
    for name in lock_names:
        if (project_dir / name).exists():
            return True
        for dirname in (".xaheen", ".autoforge", ".autocoder"):
            if (project_dir / dirname / name).exists():
                return True
    return False


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

def migrate_project_layout(project_dir: Path) -> list[str]:
    """Migrate a project from legacy layouts to ``.xaheen/``.

    The migration is incremental and safe:

    * ``project_dir/.autocoder/`` → ``project_dir/.xaheen/``
    * ``project_dir/.autoforge/`` → ``project_dir/.xaheen/``
    * ``project_dir/features.db`` (root-level) → ``project_dir/.xaheen/features.db``

    If the agent is running (lock files present) the migration is skipped.

    Returns:
        A list of human-readable descriptions of what was migrated.
    """
    if has_agent_running(project_dir):
        logger.warning("Migration skipped: agent or dev-server is running for %s", project_dir)
        return []

    migrated: list[str] = []

    # --- 0. Migrate .autocoder/ → .xaheen/ --------------------------------
    old_autocoder_dir = project_dir / ".autocoder"
    new_xaheen_dir = project_dir / ".xaheen"
    if old_autocoder_dir.exists() and old_autocoder_dir.is_dir() and not new_xaheen_dir.exists():
        try:
            old_autocoder_dir.rename(new_xaheen_dir)
            logger.info("Migrated .autocoder/ -> .xaheen/")
            migrated.append(".autocoder/ -> .xaheen/")
        except Exception:
            logger.warning("Failed to migrate .autocoder/ -> .xaheen/", exc_info=True)

    # --- 0b. Migrate .autoforge/ → .xaheen/ --------------------------------
    old_autoforge_dir = project_dir / ".autoforge"
    if old_autoforge_dir.exists() and old_autoforge_dir.is_dir() and not new_xaheen_dir.exists():
        try:
            old_autoforge_dir.rename(new_xaheen_dir)
            logger.info("Migrated .autoforge/ -> .xaheen/")
            migrated.append(".autoforge/ -> .xaheen/")
        except Exception:
            logger.warning("Failed to migrate .autoforge/ -> .xaheen/", exc_info=True)

    xaheen_dir = ensure_xaheen_dir(project_dir)

    # --- 1. Migrate prompts/ directory -----------------------------------
    try:
        old_prompts = project_dir / "prompts"
        new_prompts = xaheen_dir / "prompts"
        if old_prompts.exists() and old_prompts.is_dir() and not new_prompts.exists():
            shutil.copytree(str(old_prompts), str(new_prompts))
            shutil.rmtree(str(old_prompts))
            migrated.append("prompts/ -> .xaheen/prompts/")
            logger.info("Migrated prompts/ -> .xaheen/prompts/")
    except Exception:
        logger.warning("Failed to migrate prompts/ directory", exc_info=True)

    # --- 2. Migrate SQLite databases (features.db, assistant.db) ---------
    db_names = ("features.db", "assistant.db")
    for db_name in db_names:
        try:
            old_db = project_dir / db_name
            new_db = xaheen_dir / db_name
            if old_db.exists() and not new_db.exists():
                conn = sqlite3.connect(str(old_db))
                try:
                    cursor = conn.cursor()
                    cursor.execute("PRAGMA wal_checkpoint(TRUNCATE)")
                finally:
                    conn.close()

                shutil.copy2(str(old_db), str(new_db))

                verify_conn = sqlite3.connect(str(new_db))
                try:
                    verify_cursor = verify_conn.cursor()
                    result = verify_cursor.execute("PRAGMA integrity_check").fetchone()
                    if result is None or result[0] != "ok":
                        logger.error("Integrity check failed for migrated %s: %s", db_name, result)
                        new_db.unlink(missing_ok=True)
                        continue
                finally:
                    verify_conn.close()

                old_db.unlink(missing_ok=True)
                for suffix in ("-wal", "-shm"):
                    wal_file = project_dir / f"{db_name}{suffix}"
                    wal_file.unlink(missing_ok=True)

                migrated.append(f"{db_name} -> .xaheen/{db_name}")
                logger.info("Migrated %s -> .xaheen/%s", db_name, db_name)
        except Exception:
            logger.warning("Failed to migrate %s", db_name, exc_info=True)

    # --- 3. Migrate simple files -----------------------------------------
    simple_files = (
        ".agent.lock",
        ".devserver.lock",
        ".claude_settings.json",
        ".claude_assistant_settings.json",
        ".progress_cache",
    )
    for filename in simple_files:
        try:
            old_file = project_dir / filename
            new_file = xaheen_dir / filename
            if old_file.exists() and not new_file.exists():
                shutil.move(str(old_file), str(new_file))
                migrated.append(f"{filename} -> .xaheen/{filename}")
                logger.info("Migrated %s -> .xaheen/%s", filename, filename)
        except Exception:
            logger.warning("Failed to migrate %s", filename, exc_info=True)

    return migrated
