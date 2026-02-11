"""
Convex Backend Implementation
=============================

Implementation of BackendInterface using Convex.
"""

import os
from datetime import datetime
from typing import Any
from convex import ConvexClient

from server.services.backend.interface import BackendInterface
from server.schemas import (
    FeatureCreate, FeatureResponse, FeatureUpdate,
    ScheduleCreate, ScheduleResponse, ScheduleUpdate,
    DependencyGraphResponse, FeatureBulkCreate
)


class ConvexBackend(BackendInterface):
    """Convex implementation of persistence layer."""

    def __init__(self):
        url = os.getenv("CONVEX_URL")
        if not url:
            raise ValueError("CONVEX_URL environment variable is required for Convex backend")
        self.client = ConvexClient(url)

    def _feature_from_convex(self, doc: dict) -> FeatureResponse:
        """Convert Convex document to FeatureResponse."""
        # Handle optional fields or defaults
        return FeatureResponse(
            id=doc["featureId"],  # Map internal featureId to id
            priority=doc.get("priority", 0),
            category=doc["category"],
            name=doc["name"],
            description=doc["description"],
            steps=doc["steps"],
            passes=doc["passes"],
            in_progress=doc["in_progress"],
            dependencies=doc.get("dependencies", []),
            created_at=doc.get("_creationTime", 0) / 1000.0 if "_creationTime" in doc else None
        )

    def _schedule_from_convex(self, doc: dict) -> ScheduleResponse:
        """Convert Convex document to ScheduleResponse."""
        created_ts = doc.get("_creationTime", 0) / 1000.0 if "_creationTime" in doc else None
        created_at = datetime.fromtimestamp(created_ts) if created_ts else datetime.now()
        
        return ScheduleResponse(
            id=doc["scheduleId"],
            project_name=doc["projectId"],
            start_time=doc["start_time"],
            duration_minutes=doc["duration_minutes"],
            days_of_week=doc["days_of_week"],
            enabled=doc["enabled"],
            yolo_mode=doc["yolo_mode"],
            model=doc.get("model"),
            max_concurrency=doc["max_concurrency"],
            crash_count=doc.get("crash_count", 0),
            created_at=created_at
        )

    def list_features(self, project_name: str) -> dict[str, list[FeatureResponse]]:
        docs = self.client.query("features:list", {"projectId": project_name})
        
        pending = []
        in_progress = []
        done = []
        
        for doc in docs:
            feat = self._feature_from_convex(doc)
            if feat.passes:
                done.append(feat)
            elif feat.in_progress:
                in_progress.append(feat)
            else:
                pending.append(feat)
                
        return {
            "pending": pending,
            "in_progress": in_progress,
            "done": done
        }

    def create_feature(self, project_name: str, feature: FeatureCreate) -> FeatureResponse:
        # Pydantic to dict, excluding None?
        args = feature.model_dump(exclude_unset=True)
        # Add projectId
        args["projectId"] = project_name
        
        # Ensure dependencies is set (defaults to [] if unset in Pydantic)
        if "dependencies" not in args:
            args["dependencies"] = feature.dependencies if feature.dependencies is not None else []
            
        # Add default status fields (required by Convex schema)
        args["passes"] = False
        args["in_progress"] = False
        
        # Call mutation
        doc = self.client.mutation("features:create", args)
        return self._feature_from_convex(doc)

    def create_features_bulk(self, project_name: str, bulk: FeatureBulkCreate) -> list[FeatureResponse]:
        features_data = [f.model_dump(exclude={"priority"}) for f in bulk.features]
        args = {
            "projectId": project_name,
            "features": features_data
        }
        if bulk.starting_priority is not None:
            args["startingPriority"] = bulk.starting_priority
            
        docs = self.client.mutation("features:createBulk", args)
        return [self._feature_from_convex(d) for d in docs]

    def get_feature(self, project_name: str, feature_id: int) -> FeatureResponse | None:
        doc = self.client.query("features:getByFeatureId", {
            "projectId": project_name,
            "featureId": feature_id
        })
        if not doc:
            return None
        return self._feature_from_convex(doc)

    def update_feature(self, project_name: str, feature_id: int, update: FeatureUpdate) -> FeatureResponse:
        fields = update.model_dump(exclude_unset=True)
        doc = self.client.mutation("features:updateByFeatureId", {
            "projectId": project_name,
            "featureId": feature_id,
            "fields": fields
        })
        return self._feature_from_convex(doc)

    def delete_feature(self, project_name: str, feature_id: int) -> dict[str, Any]:
        success = self.client.mutation("features:deleteByFeatureId", {
            "projectId": project_name,
            "featureId": feature_id
        })
        if not success:
             raise ValueError("Feature not found") # Or return specific dict
        return {"success": True, "id": feature_id}

    def skip_feature(self, project_name: str, feature_id: int) -> bool:
        # We need a skip mutation or handle logic here?
        # Logic: move to bottom of priority.
        # Implemented 'skip' mutation in TS.
        return self.client.mutation("features:skip", {
            "projectId": project_name,
            "featureId": feature_id
        })

    def get_dependency_graph(self, project_name: str) -> DependencyGraphResponse:
        # Fetch all
        docs = self.client.query("features:list", {"projectId": project_name})
        nodes = []
        edges = []
        
        for doc in docs:
            # Add node
            status = "done" if doc["passes"] else "in_progress" if doc["in_progress"] else "pending"
            nodes.append({
                "id": doc["featureId"],
                "label": f"{doc['featureId']}: {doc['name']}",
                "status": status
            })
            
            # Add edges
            if doc.get("dependencies"):
                for dep_id in doc["dependencies"]:
                    edges.append({
                        "from": dep_id,
                        "to": doc["featureId"]
                    })
                    
        return DependencyGraphResponse(nodes=nodes, edges=edges)

    def add_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        # 1. Get feature
        feat = self.get_feature(project_name, feature_id)
        if not feat:
            raise ValueError("Feature not found")
            
        current_deps = feat.dependencies or []
        if dep_id in current_deps:
            return current_deps
            
        # 2. Check circular (simple check: if dep_id == feature_id)
        # Full circular check requires graph traversal.
        # SQLite implementation did a check.
        # For MVP Convex, let's just add it.
        # Better: Reuse the 'set_dependencies' logic?
        
        new_deps = current_deps + [dep_id]
        
        self.update_feature(project_name, feature_id, FeatureUpdate(dependencies=new_deps))
        return new_deps

    def remove_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        feat = self.get_feature(project_name, feature_id)
        if not feat:
            raise ValueError("Feature not found")
            
        current_deps = feat.dependencies or []
        if dep_id not in current_deps:
            return current_deps
            
        new_deps = [d for d in current_deps if d != dep_id]
        self.update_feature(project_name, feature_id, FeatureUpdate(dependencies=new_deps))
        return new_deps

    def set_dependencies(self, project_name: str, feature_id: int, dep_ids: list[int]) -> list[int]:
        self.update_feature(project_name, feature_id, FeatureUpdate(dependencies=dep_ids))
        return dep_ids

    def list_schedules(self, project_name: str) -> list[ScheduleResponse]:
        docs = self.client.query("schedules:list", {"projectId": project_name})
        return [self._schedule_from_convex(d) for d in docs]

    def create_schedule(self, project_name: str, schedule: ScheduleCreate) -> ScheduleResponse:
        args = schedule.model_dump()
        args["projectId"] = project_name
        
        # Remove keys with None values (Convex requires optional fields to be missing, not null)
        args = {k: v for k, v in args.items() if v is not None}
        
        doc = self.client.mutation("schedules:create", args)
        return self._schedule_from_convex(doc)

    def get_schedule(self, project_name: str, schedule_id: int) -> ScheduleResponse | None:
        doc = self.client.query("schedules:getByScheduleId", {
            "projectId": project_name,
            "scheduleId": schedule_id
        })
        if not doc:
             return None
        return self._schedule_from_convex(doc)

    def update_schedule(self, project_name: str, schedule_id: int, update: ScheduleUpdate) -> ScheduleResponse:
        fields = update.model_dump(exclude_unset=True)
        doc = self.client.mutation("schedules:updateByScheduleId", {
            "projectId": project_name,
            "scheduleId": schedule_id,
            "fields": fields
        })
        return self._schedule_from_convex(doc)

    def delete_schedule(self, project_name: str, schedule_id: int) -> bool:
        return self.client.mutation("schedules:deleteByScheduleId", {
            "projectId": project_name,
            "scheduleId": schedule_id
        })

    # =========================================================================
    # Project Metadata (Delegated to Files)
    # =========================================================================
    # Note: Convex backend also uses local files for metadata (for now)

    def _get_project_dir(self, project_name: str):
        """Get project directory path."""
        from pathlib import Path
        from server.utils.project_helpers import get_project_path
        project_dir = get_project_path(project_name)
        return Path(project_dir)

    def _get_metadata_path(self, project_name: str, filename: str):
        """Get path to metadata file."""
        return self._get_project_dir(project_name) / ".xaheen" / filename

    def _get_kb_dir(self, project_name: str):
        """Get knowledge base directory."""
        return self._get_project_dir(project_name) / ".xaheen" / "kb"

    def get_ideation(self, project_name: str) -> str:
        """Get ideation notes."""
        path = self._get_metadata_path(project_name, "ideation.md")
        return path.read_text(encoding="utf-8") if path.exists() else ""

    def update_ideation(self, project_name: str, content: str) -> bool:
        """Update ideation notes."""
        path = self._get_metadata_path(project_name, "ideation.md")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return True

    def get_context(self, project_name: str) -> dict:
        """Get project context."""
        import json
        path = self._get_metadata_path(project_name, "context.json")
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def update_context(self, project_name: str, context: dict) -> dict:
        """Update project context."""
        import json
        path = self._get_metadata_path(project_name, "context.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(context, indent=2), encoding="utf-8")
        return context

    def list_knowledge_items(self, project_name: str) -> list[dict]:
        """List knowledge base items."""
        kb_dir = self._get_kb_dir(project_name)
        if not kb_dir.exists():
            return []
        
        items = []
        for md_file in sorted(kb_dir.glob("*.md")):
            items.append({
                "filename": md_file.name,
                "title": md_file.stem.replace("_", " ").replace("-", " ").title(),
                "path": str(md_file),
            })
        return items

    def get_knowledge_item(self, project_name: str, filename: str) -> str:
        """Get knowledge item."""
        kb_dir = self._get_kb_dir(project_name)
        path = kb_dir / filename
        return path.read_text(encoding="utf-8") if path.exists() else ""

    def save_knowledge_item(self, project_name: str, filename: str, content: str) -> bool:
        """Save knowledge item."""
        kb_dir = self._get_kb_dir(project_name)
        kb_dir.mkdir(parents=True, exist_ok=True)
        (kb_dir / filename).write_text(content, encoding="utf-8")
        return True

    def delete_knowledge_item(self, project_name: str, filename: str) -> bool:
        """Delete knowledge item."""
        kb_dir = self._get_kb_dir(project_name)
        path = kb_dir / filename
        if path.exists():
            path.unlink()
            return True
        return False

    def get_roadmap(self, project_name: str) -> dict:
        """Get project roadmap."""
        import json
        path = self._get_metadata_path(project_name, "roadmap.json")
        if not path.exists():
            return {"phases": [], "milestones": [], "currentPhase": None}
        return json.loads(path.read_text(encoding="utf-8"))

    def update_roadmap(self, project_name: str, roadmap: dict) -> dict:
        """Update project roadmap."""
        import json
        path = self._get_metadata_path(project_name, "roadmap.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(roadmap, indent=2), encoding="utf-8")
        return roadmap
