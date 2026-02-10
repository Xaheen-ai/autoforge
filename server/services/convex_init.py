"""
Convex Initialization Service
==============================

Handles automatic Convex project initialization for new Xaheen projects.
"""

import asyncio
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

import logging

logger = logging.getLogger(__name__)


class ConvexInitError(Exception):
    """Raised when Convex initialization fails."""
    pass


async def initialize_convex_for_project(
    project_path: Path,
    project_name: str,
    auto_approve: bool = True
) -> dict:
    """
    Initialize Convex for a project.
    
    Args:
        project_path: Path to the project directory
        project_name: Name of the project (used for Convex project name)
        auto_approve: If True, automatically approve prompts (default: True)
    
    Returns:
        dict with keys:
            - convex_url: The Convex deployment URL
            - convex_deployment: The deployment name
            - project_id: The Convex project ID
    
    Raises:
        ConvexInitError: If initialization fails
    """
    logger.info(f"Initializing Convex for project: {project_name}")
    
    # 1. Check prerequisites
    _check_prerequisites()
    
    # 2. Copy schema templates
    await _copy_schema_templates(project_path)
    
    # 3. Run npx convex dev
    convex_info = await _run_convex_init(project_path, project_name, auto_approve)
    
    # 4. Extract and store CONVEX_URL
    await _configure_environment(project_path, convex_info)
    
    logger.info(f"Convex initialization complete: {convex_info['convex_url']}")
    return convex_info


def _check_prerequisites():
    """Check that required tools are available."""
    # Check Node.js
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            raise ConvexInitError("Node.js is not installed or not in PATH")
        logger.debug(f"Node.js version: {result.stdout.strip()}")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        raise ConvexInitError("Node.js is not installed or not in PATH")
    
    # Check npm/npx
    try:
        result = subprocess.run(
            ["npx", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            raise ConvexInitError("npx is not installed or not in PATH")
        logger.debug(f"npx version: {result.stdout.strip()}")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        raise ConvexInitError("npx is not installed or not in PATH")


async def _copy_schema_templates(project_path: Path):
    """Copy Convex schema templates to the project."""
    # Get template directory
    template_dir = Path(__file__).parent.parent.parent / ".claude" / "templates" / "convex"
    
    if not template_dir.exists():
        raise ConvexInitError(f"Convex templates not found at {template_dir}")
    
    # Create convex directory in project
    convex_dir = project_path / "convex"
    convex_dir.mkdir(exist_ok=True)
    
    # Copy schema files
    for template_file in template_dir.glob("*.ts"):
        dest_file = convex_dir / template_file.name
        shutil.copy2(template_file, dest_file)
        logger.debug(f"Copied {template_file.name} to {dest_file}")


async def _run_convex_init(
    project_path: Path,
    project_name: str,
    auto_approve: bool
) -> dict:
    """
    Run npx convex dev to initialize the project.
    
    Returns dict with convex_url, convex_deployment, project_id
    """
    logger.info("Running npx convex dev --once...")
    
    # Prepare environment
    env = os.environ.copy()
    
    # Run npx convex dev with --once flag and --configure for non-interactive setup
    # --configure new: Create a new project
    # --once: Run once and exit (don't watch for changes)
    process = await asyncio.create_subprocess_exec(
        "npx", "-y", "convex", "dev",
        "--once",
        "--configure", "new",
        cwd=str(project_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    
    stdout_lines = []
    stderr_lines = []
    
    try:
        # Wait for process to complete or timeout after 60 seconds
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=60.0
            )
            stdout_lines = stdout.decode().split('\n')
            stderr_lines = stderr.decode().split('\n')
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise ConvexInitError("Convex initialization timed out after 60 seconds")
        
        # Check return code
        if process.returncode != 0:
            error_output = '\n'.join(stderr_lines[-10:])  # Last 10 lines
            raise ConvexInitError(f"npx convex dev failed with code {process.returncode}: {error_output}")
        
    except Exception as e:
        if process.returncode is None:
            process.kill()
            await process.wait()
        raise ConvexInitError(f"Failed to run npx convex dev: {e}")
    
    # Parse output to extract deployment info
    convex_info = _parse_convex_output(stdout_lines, project_path)
    
    return convex_info


def _parse_convex_output(output_lines: list[str], project_path: Path) -> dict:
    """
    Parse npx convex dev output to extract deployment information.
    
    Falls back to reading .env.local if parsing fails.
    """
    convex_url = None
    convex_deployment = None
    project_id = None
    
    # Try to parse from output
    for line in output_lines:
        if "CONVEX_URL" in line and "https://" in line:
            # Extract URL from line like "CONVEX_URL=https://..."
            parts = line.split("https://")
            if len(parts) > 1:
                convex_url = "https://" + parts[1].split()[0].strip()
        
        if "CONVEX_DEPLOYMENT" in line:
            # Extract deployment name
            parts = line.split("CONVEX_DEPLOYMENT")
            if len(parts) > 1:
                deployment = parts[1].split()[0].strip("=").strip()
                if deployment:
                    convex_deployment = deployment
    
    # Fallback: read from .env.local
    env_local = project_path / ".env.local"
    if env_local.exists():
        with open(env_local, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith("CONVEX_URL="):
                    convex_url = line.split("=", 1)[1].strip()
                elif line.startswith("CONVEX_DEPLOYMENT="):
                    convex_deployment = line.split("=", 1)[1].split("#")[0].strip()
                    # Extract project ID from comment if present
                    if "#" in line and "project:" in line:
                        project_id = line.split("project:")[1].strip().split()[0]
    
    if not convex_url:
        raise ConvexInitError("Failed to extract CONVEX_URL from initialization")
    
    return {
        "convex_url": convex_url,
        "convex_deployment": convex_deployment or "unknown",
        "project_id": project_id or "unknown"
    }


async def _configure_environment(project_path: Path, convex_info: dict):
    """
    Configure project environment with Convex settings.
    
    Writes CONVEX_URL to project's .env file.
    """
    env_file = project_path / ".env"
    
    # Read existing .env or create new
    env_lines = []
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_lines = f.readlines()
    
    # Check if CONVEX_URL already exists
    has_convex_url = any(line.startswith("CONVEX_URL=") for line in env_lines)
    
    if not has_convex_url:
        # Append CONVEX_URL
        with open(env_file, 'a') as f:
            f.write(f"\n# Convex Configuration\n")
            f.write(f"CONVEX_URL={convex_info['convex_url']}\n")
        logger.info(f"Added CONVEX_URL to {env_file}")
    else:
        logger.info("CONVEX_URL already exists in .env")


async def check_convex_initialized(project_path: Path) -> bool:
    """
    Check if Convex is already initialized for a project.
    
    Returns True if convex/ directory exists and .env.local has CONVEX_URL.
    """
    convex_dir = project_path / "convex"
    env_local = project_path / ".env.local"
    
    if not convex_dir.exists():
        return False
    
    if not env_local.exists():
        return False
    
    # Check if .env.local has CONVEX_URL
    with open(env_local, 'r') as f:
        for line in f:
            if line.strip().startswith("CONVEX_URL="):
                return True
    
    return False
