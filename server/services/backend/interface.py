"""
Backend Interface
=================

Abstract base class for storage backends (SQLite, Convex, Markdown).
"""

from abc import ABC, abstractmethod
from typing import Any, Literal

from server.schemas import (
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
    DependencyGraphResponse,
    FeatureBulkCreate
)


class BackendInterface(ABC):
    """Abstract interface for persistence operations."""

    # =========================================================================
    # Features
    # =========================================================================

    @abstractmethod
    def list_features(self, project_name: str) -> dict[str, list[FeatureResponse]]:
        """
        List all features for a project organized by status.
        Returns: {"pending": [], "in_progress": [], "done": []}
        """
        pass

    @abstractmethod
    def create_feature(self, project_name: str, feature: FeatureCreate) -> FeatureResponse:
        """Create a new feature."""
        pass

    @abstractmethod
    def create_features_bulk(self, project_name: str, bulk: FeatureBulkCreate) -> list[FeatureResponse]:
        """Create multiple features at once."""
        pass

    @abstractmethod
    def get_feature(self, project_name: str, feature_id: int) -> FeatureResponse | None:
        """Get a single feature by ID. Returns None if not found."""
        pass

    @abstractmethod
    def update_feature(self, project_name: str, feature_id: int, update: FeatureUpdate) -> FeatureResponse:
        """Update a feature."""
        pass

    @abstractmethod
    def delete_feature(self, project_name: str, feature_id: int) -> dict[str, Any]:
        """Delete a feature and return result info (success, message, affected_features)."""
        pass

    @abstractmethod
    def skip_feature(self, project_name: str, feature_id: int) -> bool:
        """Skip a feature (move to end of queue)."""
        pass
        
    @abstractmethod
    def get_dependency_graph(self, project_name: str) -> DependencyGraphResponse:
        """Get the dependency graph for visualization."""
        pass

    # =========================================================================
    # Dependencies
    # =========================================================================
    
    @abstractmethod
    def add_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        """Add a dependency. Returns updated list of dependencies."""
        pass

    @abstractmethod
    def remove_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        """Remove a dependency. Returns updated list of dependencies."""
        pass

    @abstractmethod
    def set_dependencies(self, project_name: str, feature_id: int, dep_ids: list[int]) -> list[int]:
        """Set all dependencies for a feature. Returns updated list."""
        pass

    # =========================================================================
    # Schedules
    # =========================================================================

    @abstractmethod
    def list_schedules(self, project_name: str) -> list[ScheduleResponse]:
        """List all schedules for a project."""
        pass

    @abstractmethod
    def create_schedule(self, project_name: str, schedule: ScheduleCreate) -> ScheduleResponse:
        """Create a new schedule."""
        pass

    @abstractmethod
    def get_schedule(self, project_name: str, schedule_id: int) -> ScheduleResponse | None:
        """Get a schedule by ID."""
        pass

    @abstractmethod
    def update_schedule(self, project_name: str, schedule_id: int, update: ScheduleUpdate) -> ScheduleResponse:
        """Update a schedule."""
        pass

    @abstractmethod
    def delete_schedule(self, project_name: str, schedule_id: int) -> bool:
        """Delete a schedule."""
        pass
