"""
Server-Sent Events (SSE) utilities for streaming progress updates.
"""

from typing import Generator, Dict, Any
import json


def sse_message(data: Dict[str, Any], event: str = "message") -> str:
    """
    Format data as Server-Sent Event message.
    
    Args:
        data: Dictionary to send as JSON
        event: Event type name
        
    Returns:
        Formatted SSE message string
    """
    msg = f"event: {event}\n"
    msg += f"data: {json.dumps(data)}\n\n"
    return msg


def progress_event(stage: str, progress: int, message: str, thought: str = "") -> str:
    """
    Create a progress update SSE message.
    
    Args:
        stage: Current stage name
        progress: Progress percentage (0-100)
        message: Progress message
        thought: Optional AI thought/insight
        
    Returns:
        Formatted SSE message
    """
    return sse_message({
        "stage": stage,
        "progress": progress,
        "message": message,
        "thought": thought
    }, event="progress")


def complete_event(result: Any) -> str:
    """
    Create a completion SSE message.
    
    Args:
        result: Final result data
        
    Returns:
        Formatted SSE message
    """
    return sse_message({
        "stage": "complete",
        "progress": 100,
        "result": result
    }, event="complete")


def error_event(error: str) -> str:
    """
    Create an error SSE message.
    
    Args:
        error: Error message
        
    Returns:
        Formatted SSE message
    """
    return sse_message({
        "stage": "error",
        "error": error
    }, event="error")
