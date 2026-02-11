"""
SSE streaming endpoint for ideation generation with progress updates.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from typing import Generator
import asyncio

router = APIRouter()


async def generate_ideas_stream(project_name: str) -> Generator[str, None, None]:
    """
    Stream ideation generation progress using Server-Sent Events.
    
    Yields SSE-formatted progress updates.
    """
    from ..services.ai_assistant import AIAssistant
    from ..services.ideation import IdeationManager
    from ..utils.sse import progress_event, complete_event, error_event
    from ...registry import get_project_path
    
    try:
        # Stage 1: Analyzing Project
        yield progress_event(
            stage="analyzing",
            progress=25,
            message="Reading project structure and dependencies...",
            thought="Scanning codebase to understand the project architecture"
        )
        await asyncio.sleep(0.5)  # Allow UI to update
        
        # Stage 2: Understanding Context
        yield progress_event(
            stage="context",
            progress=50,
            message="Processing README and git history...",
            thought="Analyzing recent changes and project documentation"
        )
        await asyncio.sleep(0.5)
        
        # Stage 3: Generating Ideas
        yield progress_event(
            stage="generating",
            progress=75,
            message="AI is brainstorming improvement ideas...",
            thought="Considering UI improvements, performance optimizations, and new features"
        )
        
        # Get project directory
        project_dir = get_project_path(project_name)
        if not project_dir:
            yield error_event(f"Project '{project_name}' not found")
            return
        
        # Generate ideas
        ai = AIAssistant(use_mock=False)
        ideas = ai.generate_ideas(str(project_dir))
        
        # Save ideas
        ideation_mgr = IdeationManager(project_dir)
        for idea in ideas:
            ideation_mgr.save_idea(idea)
        
        # Stage 4: Complete
        yield complete_event({
            "ideas": ideas,
            "count": len(ideas)
        })
        
    except Exception as e:
        yield error_event(str(e))


@router.get("/{name}/ideation/generate/stream")
async def stream_ideation_generation(name: str):
    """Stream ideation generation with progress updates."""
    return StreamingResponse(
        generate_ideas_stream(name),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
