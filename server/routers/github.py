"""
GitHub Router
=============

API endpoints for Git/GitHub operations on projects.
Supports cloning, initializing, and managing remote repositories.
"""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import (
    GitInitRequest,
    GitRemoteRequest,
    GitRepoInfo,
    GitActionResponse,
)
from ..services.github_service import (
    GitError,
    clone_repo,
    get_github_token,
    get_repo_info,
    init_repo,
    setup_remote,
    validate_git_url,
)
from ..utils.project_helpers import get_project_path as _get_project_path
from ..utils.validation import validate_project_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects/{project_name}/git", tags=["git"])


@router.get("/info", response_model=GitRepoInfo)
async def get_git_info(project_name: str):
    """Get git repository information for a project."""
    project_name = validate_project_name(project_name)
    project_dir = _get_project_path(project_name)

    if not project_dir or not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    info = get_repo_info(project_dir)
    return GitRepoInfo(**info)


@router.post("/init", response_model=GitActionResponse)
async def initialize_git(project_name: str, request: GitInitRequest = GitInitRequest()):
    """Initialize a git repository for a project."""
    project_name = validate_project_name(project_name)
    project_dir = _get_project_path(project_name)

    if not project_dir or not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    try:
        init_repo(project_dir, default_branch=request.default_branch)
        return GitActionResponse(
            success=True,
            message=f"Git repository initialized in {project_name}",
        )
    except (GitError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/remote", response_model=GitActionResponse)
async def configure_remote(project_name: str, request: GitRemoteRequest):
    """Configure a git remote for a project."""
    project_name = validate_project_name(project_name)
    project_dir = _get_project_path(project_name)

    if not project_dir or not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")

    if not validate_git_url(request.remote_url):
        raise HTTPException(status_code=400, detail=f"Invalid git URL: {request.remote_url}")

    # Use provided token, or fall back to env
    token = request.token or get_github_token()

    try:
        setup_remote(
            project_dir,
            remote_url=request.remote_url,
            token=token,
            remote_name=request.remote_name,
        )
        return GitActionResponse(
            success=True,
            message=f"Remote '{request.remote_name}' configured for {project_name}",
        )
    except (GitError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
