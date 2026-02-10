"""
Features Router
===============

API endpoints for feature/test case management.
Delegates persistence to Pluggable Backend Architecture.
"""

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException

from server.services.backend.factory import BackendFactory
from server.schemas import (
    DependencyGraphEdge,
    DependencyGraphNode,
    DependencyGraphResponse,
    DependencyUpdate,
    FeatureBulkCreate,
    FeatureBulkCreateResponse,
    FeatureCreate,
    FeatureListResponse,
    FeatureResponse,
    FeatureUpdate,
)
from ..utils.validation import validate_project_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects/{project_name}/features", tags=["features"])


def _handle_backend_error(e: Exception):
    """Convert backend exceptions to HTTP exceptions."""
    msg = str(e)
    if "not found" in msg.lower():
        raise HTTPException(status_code=404, detail=msg)
    if "already exists" in msg.lower() or "circular" in msg.lower() or "self" in msg.lower():
        raise HTTPException(status_code=400, detail=msg)
    logger.exception("Backend error")
    raise HTTPException(status_code=500, detail=f"Internal error: {msg}")


@router.get("", response_model=FeatureListResponse)
async def list_features(project_name: str):
    """
    List all features for a project organized by status.
    """
    try:
        backend = BackendFactory.get_backend()
        result = backend.list_features(project_name)
        return FeatureListResponse(
            pending=result["pending"],
            in_progress=result["in_progress"],
            done=result["done"],
        )
    except Exception as e:
        _handle_backend_error(e)


@router.post("", response_model=FeatureResponse)
async def create_feature(project_name: str, feature: FeatureCreate):
    """Create a new feature/test case manually."""
    try:
        backend = BackendFactory.get_backend()
        return backend.create_feature(project_name, feature)
    except Exception as e:
        _handle_backend_error(e)


@router.post("/bulk", response_model=FeatureBulkCreateResponse)
async def create_features_bulk(project_name: str, bulk: FeatureBulkCreate):
    """Create multiple features at once."""
    try:
        backend = BackendFactory.get_backend()
        created = backend.create_features_bulk(project_name, bulk)
        return FeatureBulkCreateResponse(
            created=len(created),
            features=created
        )
    except Exception as e:
        _handle_backend_error(e)


@router.get("/graph", response_model=DependencyGraphResponse)
async def get_dependency_graph(project_name: str):
    """Return dependency graph data for visualization."""
    try:
        backend = BackendFactory.get_backend()
        return backend.get_dependency_graph(project_name)
    except Exception as e:
        _handle_backend_error(e)


@router.get("/{feature_id}", response_model=FeatureResponse)
async def get_feature(project_name: str, feature_id: int):
    """Get details of a specific feature."""
    try:
        backend = BackendFactory.get_backend()
        feature = backend.get_feature(project_name, feature_id)
        if not feature:
            raise HTTPException(status_code=404, detail=f"Feature {feature_id} not found")
        return feature
    except HTTPException:
        raise
    except Exception as e:
        _handle_backend_error(e)


@router.patch("/{feature_id}", response_model=FeatureResponse)
async def update_feature(project_name: str, feature_id: int, update: FeatureUpdate):
    """Update a feature's details."""
    try:
        backend = BackendFactory.get_backend()
        return backend.update_feature(project_name, feature_id, update)
    except Exception as e:
        _handle_backend_error(e)


@router.delete("/{feature_id}")
async def delete_feature(project_name: str, feature_id: int):
    """Delete a feature and clean up references."""
    try:
        backend = BackendFactory.get_backend()
        return backend.delete_feature(project_name, feature_id)
    except Exception as e:
        _handle_backend_error(e)


@router.patch("/{feature_id}/skip")
async def skip_feature(project_name: str, feature_id: int):
    """Mark a feature as skipped by moving it to the end of the priority queue."""
    try:
        backend = BackendFactory.get_backend()
        backend.skip_feature(project_name, feature_id)
        return {"success": True, "message": f"Feature {feature_id} moved to end of queue"}
    except Exception as e:
        _handle_backend_error(e)


# ============================================================================
# Dependency Management Endpoints
# ============================================================================

@router.post("/{feature_id}/dependencies/{dep_id}")
async def add_dependency(project_name: str, feature_id: int, dep_id: int):
    """Add a dependency relationship between features."""
    try:
        backend = BackendFactory.get_backend()
        deps = backend.add_dependency(project_name, feature_id, dep_id)
        return {"success": True, "feature_id": feature_id, "dependencies": deps}
    except Exception as e:
        _handle_backend_error(e)


@router.delete("/{feature_id}/dependencies/{dep_id}")
async def remove_dependency(project_name: str, feature_id: int, dep_id: int):
    """Remove a dependency from a feature."""
    try:
        backend = BackendFactory.get_backend()
        deps = backend.remove_dependency(project_name, feature_id, dep_id)
        return {"success": True, "feature_id": feature_id, "dependencies": deps}
    except Exception as e:
        _handle_backend_error(e)


@router.put("/{feature_id}/dependencies")
async def set_dependencies(project_name: str, feature_id: int, update: DependencyUpdate):
    """Set all dependencies for a feature at once."""
    try:
        backend = BackendFactory.get_backend()
        deps = backend.set_dependencies(project_name, feature_id, update.dependency_ids)
        return {"success": True, "feature_id": feature_id, "dependencies": deps}
    except Exception as e:
        _handle_backend_error(e)
