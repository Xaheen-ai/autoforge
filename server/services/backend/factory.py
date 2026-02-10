"""
Backend Factory
===============

Factory for creating backend instances based on configuration.
"""

import os
from typing import Optional

from server.services.backend.interface import BackendInterface
from server.services.backend.sqlite import SQLiteBackend
# Lazy import convex/markdown to avoid hard dependencies if packages missing
# but for now we import them directly as they are part of codebase.
from server.services.backend.convex import ConvexBackend
from server.services.backend.markdown import MarkdownBackend


class BackendFactory:
    _instance: Optional[BackendInterface] = None

    @classmethod
    def get_backend(cls) -> BackendInterface:
        """Get the configured backend instance (singleton)."""
        if cls._instance is None:
            backend_type = os.getenv("XAHEEN_BACKEND_TYPE", "sqlite").lower()
            
            if backend_type == "sqlite":
                cls._instance = SQLiteBackend()
            elif backend_type == "convex":
                cls._instance = ConvexBackend()
            elif backend_type == "markdown":
                cls._instance = MarkdownBackend()
            else:
                # Default fallback or error? Strategy says Env controls it.
                raise ValueError(f"Unknown backend type: {backend_type}")
                
        return cls._instance

    @classmethod
    def reset(cls):
        """Reset the singleton instance (useful for tests)."""
        cls._instance = None
