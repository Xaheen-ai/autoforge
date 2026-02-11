"""
Hooks for metadata validation and enforcement.
"""

from .pre_session_metadata import pre_session_hook, validate_metadata_exists, create_missing_metadata

__all__ = [
    "pre_session_hook",
    "validate_metadata_exists",
    "create_missing_metadata",
]
