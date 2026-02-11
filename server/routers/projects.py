"""
Projects Router
===============

API endpoints for project management.
Uses project registry for path lookups instead of fixed generations/ directory.
"""

import re
import shutil
import sys
from pathlib import Path
from typing import Any, Callable

from fastapi import APIRouter, HTTPException

from ..schemas import (
    ProjectCreate,
    ProjectDetail,
    ProjectPrompts,
    ProjectPromptsUpdate,
    ProjectRename,
    ProjectSettingsUpdate,
    ProjectStats,
    ProjectSummary,
    ProjectContextNotes,
    ProjectContextConfig,
    IdeaSave,
    FeatureStatusUpdate,
    FeatureUpdate,
)

# Lazy imports to avoid circular dependencies
# These are initialized by _init_imports() before first use.
_imports_initialized = False
_check_spec_exists: Callable[..., Any] | None = None
_scaffold_project_prompts: Callable[..., Any] | None = None
_get_project_prompts_dir: Callable[..., Any] | None = None
_count_passing_tests: Callable[..., Any] | None = None


def _init_imports():
    """Lazy import of project-level modules."""
    global _imports_initialized, _check_spec_exists
    global _scaffold_project_prompts, _get_project_prompts_dir
    global _count_passing_tests

    if _imports_initialized:
        return

    import sys
    root = Path(__file__).parent.parent.parent
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    from progress import count_passing_tests
    from prompts import get_project_prompts_dir, scaffold_project_prompts
    from start import check_spec_exists

    _check_spec_exists = check_spec_exists
    _scaffold_project_prompts = scaffold_project_prompts
    _get_project_prompts_dir = get_project_prompts_dir
    _count_passing_tests = count_passing_tests
    _imports_initialized = True


def _get_registry_functions():
    """Get registry functions with lazy import."""
    import sys
    root = Path(__file__).parent.parent.parent
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    from registry import (
        get_project_concurrency,
        get_project_path,
        list_registered_projects,
        register_project,
        rename_project,
        set_project_concurrency,
        unregister_project,
        validate_project_path,
    )
    return (
        register_project,
        unregister_project,
        get_project_path,
        list_registered_projects,
        validate_project_path,
        get_project_concurrency,
        set_project_concurrency,
        rename_project,
    )


router = APIRouter(prefix="/api/projects", tags=["projects"])


def validate_project_name(name: str) -> str:
    """Validate and sanitize project name to prevent path traversal."""
    if not re.match(r'^[a-zA-Z0-9_-]{1,50}$', name):
        raise HTTPException(
            status_code=400,
            detail="Invalid project name. Use only letters, numbers, hyphens, and underscores (1-50 chars)."
        )
    return name


def get_project_stats(project_dir: Path) -> ProjectStats:
    """Get statistics for a project."""
    _init_imports()
    assert _count_passing_tests is not None  # guaranteed by _init_imports()
    passing, in_progress, total = _count_passing_tests(project_dir)
    percentage = (passing / total * 100) if total > 0 else 0.0
    return ProjectStats(
        passing=passing,
        in_progress=in_progress,
        total=total,
        percentage=round(percentage, 1)
    )


@router.get("", response_model=list[ProjectSummary])
async def list_projects():
    """List all registered projects."""
    _init_imports()
    assert _check_spec_exists is not None  # guaranteed by _init_imports()
    (_, _, _, list_registered_projects, validate_project_path,
     get_project_concurrency, _, _) = _get_registry_functions()

    projects = list_registered_projects()
    result = []

    for name, info in projects.items():
        project_dir = Path(info["path"])

        # Skip if path no longer exists
        is_valid, _ = validate_project_path(project_dir)
        if not is_valid:
            continue

        has_spec = _check_spec_exists(project_dir)
        stats = get_project_stats(project_dir)

        result.append(ProjectSummary(
            name=name,
            path=info["path"],
            has_spec=has_spec,
            stats=stats,
            default_concurrency=info.get("default_concurrency", 3),
        ))

    return result


@router.post("", response_model=ProjectSummary)
async def create_project(project: ProjectCreate):
    """Create a new project at the specified path."""
    _init_imports()
    assert _scaffold_project_prompts is not None  # guaranteed by _init_imports()
    (register_project, _, get_project_path, list_registered_projects,
     _, _, _, _) = _get_registry_functions()

    name = validate_project_name(project.name)
    project_path = Path(project.path).resolve()

    # Check if project name already registered
    existing = get_project_path(name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Project '{name}' already exists at {existing}"
        )

    # Check if path already registered under a different name
    all_projects = list_registered_projects()
    for existing_name, info in all_projects.items():
        existing_path = Path(info["path"]).resolve()
        # Case-insensitive comparison on Windows
        if sys.platform == "win32":
            paths_match = str(existing_path).lower() == str(project_path).lower()
        else:
            paths_match = existing_path == project_path

        if paths_match:
            raise HTTPException(
                status_code=409,
                detail=f"Path '{project_path}' is already registered as project '{existing_name}'"
            )

    # Security: Check if path is in a blocked location
    from .filesystem import is_path_blocked
    if is_path_blocked(project_path):
        raise HTTPException(
            status_code=403,
            detail="Cannot create project in system or sensitive directory"
        )

    # Validate the path is usable
    if project_path.exists():
        if not project_path.is_dir():
            raise HTTPException(
                status_code=400,
                detail="Path exists but is not a directory"
            )
    else:
        # Create the directory
        try:
            project_path.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create directory: {e}"
            )

    # Scaffold prompts
    _scaffold_project_prompts(project_path)

    # Register in registry
    try:
        register_project(name, project_path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register project: {e}"
        )

    return ProjectSummary(
        name=name,
        path=project_path.as_posix(),
        has_spec=False,  # Just created, no spec yet
        stats=ProjectStats(passing=0, total=0, percentage=0.0),
        default_concurrency=3,
    )


@router.get("/{name}", response_model=ProjectDetail)
async def get_project(name: str):
    """Get detailed information about a project."""
    _init_imports()
    assert _check_spec_exists is not None  # guaranteed by _init_imports()
    assert _get_project_prompts_dir is not None  # guaranteed by _init_imports()
    (_, _, get_project_path, _, _, get_project_concurrency, _, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found in registry")

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project directory no longer exists: {project_dir}")

    has_spec = _check_spec_exists(project_dir)
    stats = get_project_stats(project_dir)
    prompts_dir = _get_project_prompts_dir(project_dir)

    return ProjectDetail(
        name=name,
        path=project_dir.as_posix(),
        has_spec=has_spec,
        stats=stats,
        prompts_dir=str(prompts_dir),
        default_concurrency=get_project_concurrency(name),
    )


@router.post("/{name}/rename", response_model=ProjectSummary)
async def rename_project_endpoint(name: str, payload: ProjectRename):
    """
    Rename a project.

    Moves the project directory and updates the registry and internal databases.
    """
    _init_imports()
    assert _check_spec_exists is not None
    (register_project, _, get_project_path, list_registered_projects,
     validate_project_path, get_project_concurrency, _,
     rename_project) = _get_registry_functions()

    old_name = validate_project_name(name)
    new_name = validate_project_name(payload.new_name)
    
    if old_name == new_name:
         raise HTTPException(status_code=400, detail="New name must be different from current name")

    # 1. Get current project path
    old_path = get_project_path(old_name)
    if not old_path:
        raise HTTPException(status_code=404, detail=f"Project '{old_name}' not found")
    
    if not old_path.exists():
        raise HTTPException(status_code=404, detail=f"Project directory not found: {old_path}")

    # 2. Derive new path (keep same parent directory)
    new_path = old_path.parent / new_name
    
    # 3. Validation: Check if new name or path already exists
    # Check registry for name collision
    if get_project_path(new_name):
        raise HTTPException(status_code=409, detail=f"Project name '{new_name}' is already taken")

    # Check filesystem for path collision
    if new_path.exists():
        raise HTTPException(status_code=409, detail=f"Destination directory already exists: {new_path}")

    # 4. Check if agent is running
    from xaheen_paths import has_agent_running
    if has_agent_running(old_path):
        raise HTTPException(
            status_code=409, detail="Cannot rename project while agent is running. Stop the agent first."
        )

    # 5. Dispose DB engines to unlock files (Windows compat)
    from api.database import dispose_engine as dispose_features_engine, get_database_url
    from server.services.assistant_database import dispose_engine as dispose_assistant_engine
    
    dispose_features_engine(old_path)
    dispose_assistant_engine(old_path)

    # 6. Move directory
    try:
        shutil.move(str(old_path), str(new_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move project directory: {e}")

    # 7. Update Registry
    try:
        rename_project(old_name, new_name, new_path)
    except Exception as e:
        # Rollback move if registry update fails
        try:
            shutil.move(str(new_path), str(old_path))
        except:
            pass # Critical failure if rollback fails
        raise HTTPException(status_code=500, detail=f"Failed to update registry: {e}")

    # 8. Update Internal Databases
    # features.db -> schedules table -> project_name
    try:
        from sqlalchemy import create_engine, text
        
        # Connect to DB at VALID NEW PATH
        db_url = get_database_url(new_path)
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            # Update project_name in schedules table
            # Check if table exists first? It should.
            conn.execute(
                text("UPDATE schedules SET project_name = :new_name WHERE project_name = :old_name"),
                {"new_name": new_name, "old_name": old_name}
            )
            conn.commit()
        
        engine.dispose()
    except Exception as e:
        # Log warning but don't fail the request check - directory and registry are moved.
        # This is a minor consistency issue that can be fixed manually or auto-healed later.
        print(f"Warning: Failed to update project_name in features.db: {e}", file=sys.stderr)

    # 9. Return new summary
    # Refresh imports for stats
    _init_imports()
    
    # We need to re-validate the new path exists (it should)
    has_spec = _check_spec_exists(new_path)
    stats = get_project_stats(new_path)

    return ProjectSummary(
        name=new_name,
        path=new_path.as_posix(),
        has_spec=has_spec,
        stats=stats,
        default_concurrency=get_project_concurrency(new_name),
    )


@router.delete("/{name}")
async def delete_project(name: str, delete_files: bool = False):
    """
    Delete a project from the registry.

    Args:
        name: Project name to delete
        delete_files: If True, also delete the project directory and files
    """
    _init_imports()
    (_, unregister_project, get_project_path, _, _, _, _, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    # Check if agent is running
    from xaheen_paths import has_agent_running
    if has_agent_running(project_dir):
        raise HTTPException(
            status_code=409,
            detail="Cannot delete project while agent is running. Stop the agent first."
        )

    # Optionally delete files
    if delete_files and project_dir.exists():
        try:
            shutil.rmtree(project_dir)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete project files: {e}")

    # Unregister from registry
    unregister_project(name)

    return {
        "success": True,
        "message": f"Project '{name}' deleted" + (" (files removed)" if delete_files else " (files preserved)")
    }


@router.get("/{name}/prompts", response_model=ProjectPrompts)
async def get_project_prompts(name: str):
    """Get the content of project prompt files."""
    _init_imports()
    assert _get_project_prompts_dir is not None  # guaranteed by _init_imports()
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    prompts_dir: Path = _get_project_prompts_dir(project_dir)

    def read_file(filename: str) -> str:
        filepath = prompts_dir / filename
        if filepath.exists():
            try:
                return filepath.read_text(encoding="utf-8")
            except Exception:
                return ""
        return ""

    return ProjectPrompts(
        app_spec=read_file("app_spec.txt"),
        initializer_prompt=read_file("initializer_prompt.md"),
        coding_prompt=read_file("coding_prompt.md"),
    )


@router.put("/{name}/prompts")
async def update_project_prompts(name: str, prompts: ProjectPromptsUpdate):
    """Update project prompt files."""
    _init_imports()
    assert _get_project_prompts_dir is not None  # guaranteed by _init_imports()
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    prompts_dir = _get_project_prompts_dir(project_dir)
    prompts_dir.mkdir(parents=True, exist_ok=True)

    def write_file(filename: str, content: str | None):
        if content is not None:
            filepath = prompts_dir / filename
            filepath.write_text(content, encoding="utf-8")

    write_file("app_spec.txt", prompts.app_spec)
    write_file("initializer_prompt.md", prompts.initializer_prompt)
    write_file("coding_prompt.md", prompts.coding_prompt)

    return {"success": True, "message": "Prompts updated"}


@router.get("/{name}/stats", response_model=ProjectStats)
async def get_project_stats_endpoint(name: str):
    """Get current progress statistics for a project."""
    _init_imports()
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    return get_project_stats(project_dir)


@router.post("/{name}/reset")
async def reset_project(name: str, full_reset: bool = False):
    """
    Reset a project to its initial state.

    Args:
        name: Project name to reset
        full_reset: If True, also delete prompts/ directory (triggers setup wizard)

    Returns:
        Dictionary with list of deleted files and reset type
    """
    _init_imports()
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    # Check if agent is running
    from xaheen_paths import has_agent_running
    if has_agent_running(project_dir):
        raise HTTPException(
            status_code=409,
            detail="Cannot reset project while agent is running. Stop the agent first."
        )

    # Dispose of database engines to release file locks (required on Windows)
    # Import here to avoid circular imports
    from api.database import dispose_engine as dispose_features_engine
    from server.services.assistant_database import dispose_engine as dispose_assistant_engine

    dispose_features_engine(project_dir)
    dispose_assistant_engine(project_dir)

    deleted_files: list[str] = []

    from xaheen_paths import (
        get_assistant_db_path,
        get_claude_assistant_settings_path,
        get_claude_settings_path,
        get_features_db_path,
    )

    # Build list of files to delete using path helpers (finds files at current location)
    # Plus explicit old-location fallbacks for backward compatibility
    db_path = get_features_db_path(project_dir)
    asst_path = get_assistant_db_path(project_dir)
    reset_files: list[Path] = [
        db_path,
        db_path.with_suffix(".db-wal"),
        db_path.with_suffix(".db-shm"),
        asst_path,
        asst_path.with_suffix(".db-wal"),
        asst_path.with_suffix(".db-shm"),
        get_claude_settings_path(project_dir),
        get_claude_assistant_settings_path(project_dir),
        # Also clean old root-level locations if they exist
        project_dir / "features.db",
        project_dir / "features.db-wal",
        project_dir / "features.db-shm",
        project_dir / "assistant.db",
        project_dir / "assistant.db-wal",
        project_dir / "assistant.db-shm",
        project_dir / ".claude_settings.json",
        project_dir / ".claude_assistant_settings.json",
    ]

    for file_path in reset_files:
        if file_path.exists():
            try:
                relative = file_path.relative_to(project_dir)
                file_path.unlink()
                deleted_files.append(str(relative))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to delete {file_path.name}: {e}")

    # Full reset: also delete prompts directory
    if full_reset:
        from xaheen_paths import get_prompts_dir
        # Delete prompts from both possible locations
        for prompts_dir in [get_prompts_dir(project_dir), project_dir / "prompts"]:
            if prompts_dir.exists():
                try:
                    relative = prompts_dir.relative_to(project_dir)
                    shutil.rmtree(prompts_dir)
                    deleted_files.append(f"{relative}/")
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to delete prompts: {e}")

    return {
        "success": True,
        "reset_type": "full" if full_reset else "quick",
        "deleted_files": deleted_files,
        "message": f"Project '{name}' has been reset" + (" (full reset)" if full_reset else " (quick reset)")
    }


@router.patch("/{name}/settings", response_model=ProjectDetail)
async def update_project_settings(name: str, settings: ProjectSettingsUpdate):
    """Update project-level settings (concurrency, etc.)."""
    _init_imports()
    assert _check_spec_exists is not None  # guaranteed by _init_imports()
    assert _get_project_prompts_dir is not None  # guaranteed by _init_imports()
    (_, _, get_project_path, _, _, get_project_concurrency,
     set_project_concurrency, _) = _get_registry_functions()

    name = validate_project_name(name)
    project_dir = get_project_path(name)

    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")

    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")

    # Update concurrency if provided
    if settings.default_concurrency is not None:
        success = set_project_concurrency(name, settings.default_concurrency)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update concurrency")

    # Return updated project details
    has_spec = _check_spec_exists(project_dir)
    stats = get_project_stats(project_dir)
    prompts_dir = _get_project_prompts_dir(project_dir)

    return ProjectDetail(
        name=name,
        path=project_dir.as_posix(),
        has_spec=has_spec,
        stats=stats,
        prompts_dir=str(prompts_dir),
        default_concurrency=get_project_concurrency(name),
    )


@router.post("/{name}/initialize-convex")
async def initialize_convex(name: str):
    """
    Initialize Convex backend for a project.
    
    This endpoint:
    1. Copies Convex schema templates to the project
    2. Runs `npx convex dev` to create and deploy the Convex project
    3. Extracts CONVEX_URL and writes it to the project's .env file
    
    Returns deployment information including the Convex URL.
    """
    _init_imports()
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    # Check if already initialized
    from server.services.convex_init import check_convex_initialized, initialize_convex_for_project, ConvexInitError
    
    if await check_convex_initialized(project_dir):
        raise HTTPException(
            status_code=409,
            detail="Convex is already initialized for this project. Check .env.local for CONVEX_URL."
        )
    
    # Initialize Convex
    try:
        convex_info = await initialize_convex_for_project(project_dir, name)
        return {
            "success": True,
            "message": "Convex initialized successfully",
            **convex_info
        }
    except ConvexInitError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during Convex initialization: {e}"
        )

# ============================================================================
# Context Management Endpoints
# ============================================================================

@router.get("/{name}/context")
async def get_project_context(name: str):
    """Get all project context data (notes, analysis, config)."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.context_manager import ContextManager
    context_mgr = ContextManager(project_dir)
    
    return context_mgr.get_all_context()


@router.put("/{name}/context/notes")
async def update_project_notes(name: str, body: ProjectContextNotes):
    """Update project notes."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.context_manager import ContextManager
    context_mgr = ContextManager(project_dir)
    context_mgr.save_notes(body.notes)
    
    return {"success": True, "message": "Notes updated"}


@router.post("/{name}/context/analyze")
async def analyze_project_codebase(name: str):
    """Run codebase analysis and generate AI summary."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    try:
        from ..services.context_manager import ContextManager
        from ..services.ai_assistant import AIAssistant
        
        print("🔍 Starting codebase analysis...")
        
        # Run codebase analysis
        context_mgr = ContextManager(project_dir)
        analysis = context_mgr.analyze_codebase()
        
        print(f"✅ Analysis complete: {analysis.get('total_files', 0)} files, {len(analysis.get('languages', {}))} languages")
        
        # Generate AI insights
        print("🤖 Generating AI insights...")
        ai = AIAssistant(use_mock=False)
        insights = ai.analyze_codebase(analysis)
        
        print(f"✅ AI insights generated")
        
        # Combine analysis and insights
        result = {
            **analysis,
            'insights': insights
        }
        
        return {"success": True, "analysis": result}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error analyzing codebase: {str(e)}")
        print(error_details)
        raise HTTPException(status_code=500, detail=f"Error analyzing codebase: {str(e)}")


@router.put("/{name}/context/config")
async def update_context_config(name: str, body: ProjectContextConfig):
    """Update context configuration."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.context_manager import ContextManager
    context_mgr = ContextManager(project_dir)
    
    # Only update fields that were provided
    config_updates = body.model_dump(exclude_none=True)
    context_mgr.update_config(config_updates)
    
    return {"success": True, "message": "Configuration updated"}

# ============================================================================
# Ideation Endpoints
# ============================================================================

@router.post("/{name}/ideation/generate")
async def generate_ideas(name: str):
    """
    Generate AI-powered improvement ideas for the project.
    Uses comprehensive context including README, dependencies, and git history.
    """
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    try:
        from ..services.context_manager import ContextManager
        from ..services.ai_assistant import AIAssistant
        from ..services.ideation import IdeationManager
        
        # Get comprehensive context for better AI generation
        context_mgr = ContextManager(project_dir)
        context = context_mgr.get_comprehensive_context()
        
        # Generate ideas using AI (REAL AI, not mock!)
        ai = AIAssistant(use_mock=False)
        ideas = ai.generate_ideas(context)
        
        print(f"🔍 Generated {len(ideas)} ideas, now saving...")
        
        # Save generated ideas to file
        ideation_mgr = IdeationManager(project_dir)
        saved_count = 0
        for i, idea in enumerate(ideas):
            success = ideation_mgr.save_idea(idea)
            if success:
                saved_count += 1
            else:
                print(f"⚠️  Failed to save idea {i+1}: {idea.get('title', 'Unknown')}")
        
        print(f"✅ Generated {len(ideas)} ideas, saved {saved_count} to {ideation_mgr.ideas_file}")
        
        return {"success": True, "ideas": ideas}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error generating ideas: {str(e)}")
        print(error_details)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate ideas: {str(e)}"
        )


@router.get("/{name}/ideation/ideas")
async def get_saved_ideas(name: str):
    """Get all saved ideas."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.ideation import IdeationManager
    
    ideation_mgr = IdeationManager(project_dir)
    ideas = ideation_mgr.get_saved_ideas()
    
    return {"ideas": ideas}


@router.post("/{name}/ideation/ideas")
async def save_idea(name: str, body: IdeaSave):
    """Save an idea."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.ideation import IdeationManager
    
    ideation_mgr = IdeationManager(project_dir)
    success = ideation_mgr.save_idea(body.idea.model_dump())
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save idea")
    
    return {"success": True, "message": "Idea saved"}


@router.delete("/{name}/ideation/ideas/{idea_id}")
async def delete_idea(name: str, idea_id: str):
    """Delete a saved idea."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.ideation import IdeationManager
    
    ideation_mgr = IdeationManager(project_dir)
    success = ideation_mgr.delete_idea(idea_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete idea")
    
    return {"success": True, "message": "Idea deleted"}


@router.get("/{name}/ideation/stats")
async def get_idea_stats(name: str):
    """Get idea statistics."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.ideation import IdeationManager
    
    ideation_mgr = IdeationManager(project_dir)
    stats = ideation_mgr.get_idea_stats()
    
    return stats


# ============================================================================
# Roadmap Endpoints
# ============================================================================

@router.post("/{name}/roadmap/generate")
async def generate_roadmap(name: str):
    """
    Generate AI-powered roadmap for the project.
    Uses comprehensive context including README, dependencies, and git history.
    """
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    try:
        from ..services.context_manager import ContextManager
        from ..services.ai_assistant import AIAssistant
        from ..services.roadmap import RoadmapManager
        
        # Get comprehensive context for better AI generation
        context_mgr = ContextManager(project_dir)
        context = context_mgr.get_comprehensive_context()
        
        # Add timeframe (default to 6 months)
        context['timeframe'] = '6_months'
        
        # Generate roadmap using AI (REAL AI, not mock!)
        ai = AIAssistant(use_mock=False)
        roadmap = ai.generate_roadmap(context)
        
        # Save roadmap
        roadmap_mgr = RoadmapManager(project_dir)
        roadmap_mgr.save_roadmap(roadmap)
        
        return {"success": True, "roadmap": roadmap}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error generating roadmap: {str(e)}")
        print(error_details)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate roadmap: {str(e)}"
        )


@router.get("/{name}/roadmap")
async def get_roadmap(name: str):
    """Get current roadmap."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.roadmap import RoadmapManager
    
    roadmap_mgr = RoadmapManager(project_dir)
    roadmap = roadmap_mgr.get_roadmap()
    
    return roadmap


@router.put("/{name}/roadmap/features/{feature_id}/status")
async def update_feature_status(name: str, feature_id: str, body: FeatureStatusUpdate):
    """Update feature status."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.roadmap import RoadmapManager
    
    roadmap_mgr = RoadmapManager(project_dir)
    success = roadmap_mgr.update_feature_status(feature_id, body.status)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update feature status")
    
    return {"success": True, "message": "Feature status updated"}


@router.put("/{name}/roadmap/features/{feature_id}")
async def update_feature(name: str, feature_id: str, body: FeatureUpdate):
    """Update feature details."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.roadmap import RoadmapManager
    
    roadmap_mgr = RoadmapManager(project_dir)
    updates = body.model_dump(exclude_none=True)
    success = roadmap_mgr.update_feature(feature_id, updates)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update feature")
    
    return {"success": True, "message": "Feature updated"}


@router.get("/{name}/roadmap/export")
async def export_roadmap(name: str, format: str = 'markdown'):
    """Export roadmap in specified format."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.roadmap import RoadmapManager
    
    roadmap_mgr = RoadmapManager(project_dir)
    
    try:
        exported = roadmap_mgr.export_roadmap(format)
        return {"success": True, "format": format, "content": exported}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{name}/roadmap/stats")
async def get_roadmap_stats(name: str):
    """Get roadmap statistics."""
    (_, _, get_project_path, _, _, _, _, _) = _get_registry_functions()
    
    name = validate_project_name(name)
    project_dir = get_project_path(name)
    
    if not project_dir:
        raise HTTPException(status_code=404, detail=f"Project '{name}' not found")
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project directory not found")
    
    from ..services.roadmap import RoadmapManager
    
    roadmap_mgr = RoadmapManager(project_dir)
    stats = roadmap_mgr.get_roadmap_stats()
    
    return stats


# ============================================================================
# Metadata Management Endpoints
# ============================================================================

@router.get("/{name}/metadata/ideation")
async def get_ideation(name: str):
    """Get project ideation notes."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    try:
        content = backend.get_ideation(name)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ideation: {e}")


@router.put("/{name}/metadata/ideation")
async def update_ideation(name: str, body: dict):
    """Update project ideation notes."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    content = body.get("content", "")
    
    try:
        success = backend.update_ideation(name, content)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update ideation: {e}")


@router.get("/{name}/metadata/context")
async def get_context(name: str):
    """Get project context metadata."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    try:
        context = backend.get_context(name)
        return context
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get context: {e}")


@router.put("/{name}/metadata/context")
async def update_context(name: str, body: dict):
    """Update project context metadata."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    try:
        updated = backend.update_context(name, body)
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update context: {e}")


@router.get("/{name}/metadata/knowledge")
async def list_knowledge(name: str):
    """List all knowledge base items."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    try:
        items = backend.list_knowledge_items(name)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list knowledge items: {e}")


@router.get("/{name}/metadata/knowledge/{filename}")
async def get_knowledge_item(name: str, filename: str):
    """Get a specific knowledge base item."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    # Validate filename (security)
    if not re.match(r'^[a-zA-Z0-9_-]+\.md$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    try:
        content = backend.get_knowledge_item(name, filename)
        if not content:
            raise HTTPException(status_code=404, detail="Knowledge item not found")
        return {"filename": filename, "content": content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get knowledge item: {e}")


@router.put("/{name}/metadata/knowledge/{filename}")
async def save_knowledge_item(name: str, filename: str, body: dict):
    """Save a knowledge base item."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    # Validate filename (security)
    if not re.match(r'^[a-zA-Z0-9_-]+\.md$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    content = body.get("content", "")
    
    try:
        success = backend.save_knowledge_item(name, filename, content)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save knowledge item: {e}")


@router.delete("/{name}/metadata/knowledge/{filename}")
async def delete_knowledge_item(name: str, filename: str):
    """Delete a knowledge base item."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    # Validate filename (security)
    if not re.match(r'^[a-zA-Z0-9_-]+\.md$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    try:
        success = backend.delete_knowledge_item(name, filename)
        if not success:
            raise HTTPException(status_code=404, detail="Knowledge item not found")
        return {"success": success}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete knowledge item: {e}")


@router.get("/{name}/metadata/roadmap")
async def get_roadmap_metadata(name: str):
    """Get project roadmap metadata."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    try:
        roadmap = backend.get_roadmap(name)
        return roadmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get roadmap: {e}")


@router.put("/{name}/metadata/roadmap")
async def update_roadmap_metadata(name: str, body: dict):
    """Update project roadmap metadata."""
    from ..services.backend.factory import BackendFactory
    
    name = validate_project_name(name)
    backend = BackendFactory.get_backend()
    
    try:
        updated = backend.update_roadmap(name, body)
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update roadmap: {e}")
