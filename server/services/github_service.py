"""
GitHub Service
==============

Provides structured Git/GitHub operations for project management.
Handles cloning, initializing, and configuring remote repositories
with proper credential management.
"""

import logging
import os
import re
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Pattern to validate GitHub URLs (HTTPS and SSH)
GITHUB_URL_PATTERN = re.compile(
    r"^(https://github\.com/[\w.\-]+/[\w.\-]+(\.git)?/?|"
    r"git@github\.com:[\w.\-]+/[\w.\-]+(\.git)?)$"
)

# Broader git URL pattern (supports GitLab, Bitbucket, self-hosted)
GIT_URL_PATTERN = re.compile(
    r"^(https?://[\w.\-]+(:\d+)?/[\w.\-/]+(\.git)?/?|"
    r"git@[\w.\-]+:[\w.\-/]+(\.git)?)$"
)


class GitError(Exception):
    """Raised when a git operation fails."""

    def __init__(self, message: str, stderr: str = ""):
        self.stderr = stderr
        super().__init__(message)


def _run_git(
    args: list[str],
    cwd: Optional[Path] = None,
    env: Optional[dict[str, str]] = None,
    timeout: int = 120,
) -> subprocess.CompletedProcess:
    """Run a git command with proper error handling.

    Args:
        args: Git command arguments (without 'git' prefix).
        cwd: Working directory for the command.
        env: Additional environment variables.
        timeout: Command timeout in seconds.

    Returns:
        CompletedProcess result.

    Raises:
        GitError: If the command fails.
    """
    cmd = ["git"] + args

    run_env = os.environ.copy()
    if env:
        run_env.update(env)

    # Suppress interactive prompts (critical for VPS/headless)
    run_env["GIT_TERMINAL_PROMPT"] = "0"

    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=run_env,
        )
        if result.returncode != 0:
            raise GitError(
                f"git {args[0]} failed (exit {result.returncode}): {result.stderr.strip()}",
                stderr=result.stderr.strip(),
            )
        return result
    except subprocess.TimeoutExpired:
        raise GitError(f"git {args[0]} timed out after {timeout}s")
    except FileNotFoundError:
        raise GitError("git is not installed or not in PATH")


def validate_git_url(url: str) -> bool:
    """Validate that a URL looks like a valid git repository URL.

    Args:
        url: The URL to validate.

    Returns:
        True if the URL is valid.
    """
    return bool(GIT_URL_PATTERN.match(url.strip()))


def is_github_url(url: str) -> bool:
    """Check if a URL is specifically a GitHub URL.

    Args:
        url: The URL to check.

    Returns:
        True if the URL points to GitHub.
    """
    return bool(GITHUB_URL_PATTERN.match(url.strip()))


def _build_authenticated_url(url: str, token: Optional[str] = None) -> str:
    """Inject a token into an HTTPS git URL for authentication.

    For SSH URLs, the token is not injected (SSH keys handle auth).

    Args:
        url: The git repository URL.
        token: Optional GitHub/git token.

    Returns:
        URL with token injected (if HTTPS and token provided).
    """
    if not token or not url.startswith("https://"):
        return url

    # Insert token: https://github.com/... -> https://x-access-token:TOKEN@github.com/...
    return url.replace("https://", f"https://x-access-token:{token}@", 1)


def clone_repo(
    url: str,
    target_dir: Path,
    branch: Optional[str] = None,
    token: Optional[str] = None,
    depth: Optional[int] = None,
) -> Path:
    """Clone a git repository into the target directory.

    Args:
        url: Git repository URL (HTTPS or SSH).
        target_dir: Directory to clone into. Must not already exist.
        branch: Optional branch to checkout.
        token: Optional token for HTTPS authentication.
        depth: Optional shallow clone depth (e.g., 1 for latest commit only).

    Returns:
        Path to the cloned repository.

    Raises:
        GitError: If cloning fails.
        ValueError: If the URL is invalid or target exists.
    """
    url = url.strip()
    if not validate_git_url(url):
        raise ValueError(f"Invalid git URL: {url}")

    if target_dir.exists() and any(target_dir.iterdir()):
        raise ValueError(f"Target directory is not empty: {target_dir}")

    # Build clone command
    auth_url = _build_authenticated_url(url, token)
    args = ["clone"]

    if branch:
        args.extend(["--branch", branch])

    if depth:
        args.extend(["--depth", str(depth)])

    args.extend([auth_url, str(target_dir)])

    logger.info("Cloning repository %s into %s", url, target_dir)
    _run_git(args, timeout=300)  # Clone can take a while

    # Verify the clone was successful
    git_dir = target_dir / ".git"
    if not git_dir.exists():
        raise GitError(f"Clone appeared to succeed but {git_dir} not found")

    logger.info("Successfully cloned %s", url)
    return target_dir


def init_repo(project_dir: Path, default_branch: str = "main") -> None:
    """Initialize a new git repository in the project directory.

    Args:
        project_dir: Project directory to initialize.
        default_branch: Default branch name.

    Raises:
        GitError: If initialization fails.
        ValueError: If project_dir doesn't exist.
    """
    if not project_dir.exists():
        raise ValueError(f"Project directory does not exist: {project_dir}")

    git_dir = project_dir / ".git"
    if git_dir.exists():
        logger.info("Git repo already initialized in %s", project_dir)
        return

    logger.info("Initializing git repo in %s", project_dir)
    _run_git(["init", "--initial-branch", default_branch], cwd=project_dir)

    # Create a default .gitignore if one doesn't exist
    gitignore = project_dir / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(
            "# Dependencies\nnode_modules/\nvenv/\n__pycache__/\n\n"
            "# Environment\n.env\n.env.local\n\n"
            "# Build\ndist/\nbuild/\n\n"
            "# IDE\n.idea/\n.vscode/\n*.swp\n*.swo\n\n"
            "# OS\n.DS_Store\nThumbs.db\n"
        )

    logger.info("Git repo initialized in %s", project_dir)


def setup_remote(
    project_dir: Path,
    remote_url: str,
    token: Optional[str] = None,
    remote_name: str = "origin",
) -> None:
    """Configure a git remote for the project.

    Uses a credential helper to avoid storing tokens in .git/config.

    Args:
        project_dir: Project directory with an initialized git repo.
        remote_url: Remote repository URL.
        token: Optional token for HTTPS authentication.
        remote_name: Name of the remote (default: 'origin').

    Raises:
        GitError: If remote setup fails.
        ValueError: If the URL is invalid or no git repo exists.
    """
    remote_url = remote_url.strip()
    if not validate_git_url(remote_url):
        raise ValueError(f"Invalid git URL: {remote_url}")

    git_dir = project_dir / ".git"
    if not git_dir.exists():
        raise ValueError(f"No git repository in {project_dir}")

    # Check if remote already exists
    try:
        result = _run_git(["remote", "get-url", remote_name], cwd=project_dir)
        existing_url = result.stdout.strip()
        if existing_url:
            # Remote exists — update it
            logger.info("Updating remote '%s' from %s to %s", remote_name, existing_url, remote_url)
            _run_git(["remote", "set-url", remote_name, remote_url], cwd=project_dir)
    except GitError:
        # Remote doesn't exist — add it
        logger.info("Adding remote '%s' -> %s", remote_name, remote_url)
        _run_git(["remote", "add", remote_name, remote_url], cwd=project_dir)

    # If token is provided, configure credential helper for this repo
    if token and remote_url.startswith("https://"):
        _configure_credential_helper(project_dir, remote_url, token)

    logger.info("Remote '%s' configured for %s", remote_name, project_dir)


def _configure_credential_helper(
    project_dir: Path, url: str, token: str
) -> None:
    """Configure a store-based credential helper for this repo.

    Writes credentials to a project-local file that git reads automatically.
    This avoids putting tokens in .git/config or environment variables.

    Args:
        project_dir: Project directory.
        url: The remote URL.
        token: Authentication token.
    """
    # Use a project-local credential store
    cred_file = project_dir / ".git" / "xaheen-credentials"
    auth_url = _build_authenticated_url(url, token)
    cred_file.write_text(auth_url + "\n")
    cred_file.chmod(0o600)  # Owner read/write only

    # Configure git to use this credential store for this repo only
    _run_git(
        ["config", "--local", "credential.helper", f"store --file={cred_file}"],
        cwd=project_dir,
    )


def get_repo_info(project_dir: Path) -> dict:
    """Get information about a git repository.

    Args:
        project_dir: Project directory.

    Returns:
        Dict with repo info (initialized, branch, remotes, has_commits).
    """
    git_dir = project_dir / ".git"
    if not git_dir.exists():
        return {"initialized": False}

    info: dict = {"initialized": True}

    # Get current branch
    try:
        result = _run_git(["branch", "--show-current"], cwd=project_dir)
        info["branch"] = result.stdout.strip() or None
    except GitError:
        info["branch"] = None

    # Get remotes
    try:
        result = _run_git(["remote", "-v"], cwd=project_dir)
        remotes = {}
        for line in result.stdout.strip().split("\n"):
            if line:
                parts = line.split()
                if len(parts) >= 2:
                    name = parts[0]
                    url = parts[1]
                    # Strip credentials from URL for display
                    url = re.sub(r"://[^@]+@", "://", url)
                    remotes[name] = url
        info["remotes"] = remotes
    except GitError:
        info["remotes"] = {}

    # Check if there are any commits
    try:
        _run_git(["rev-parse", "HEAD"], cwd=project_dir)
        info["has_commits"] = True
    except GitError:
        info["has_commits"] = False

    # Get last commit info (if any)
    if info.get("has_commits"):
        try:
            result = _run_git(
                ["log", "-1", "--format=%H|%s|%ai"],
                cwd=project_dir,
            )
            parts = result.stdout.strip().split("|", 2)
            if len(parts) == 3:
                info["last_commit"] = {
                    "hash": parts[0][:8],
                    "message": parts[1],
                    "date": parts[2],
                }
        except GitError:
            pass

    return info


def get_github_token() -> Optional[str]:
    """Get the GitHub token from environment variables.

    Checks GITHUB_TOKEN first, then GH_TOKEN (GitHub CLI convention).

    Returns:
        Token string or None.
    """
    return os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
