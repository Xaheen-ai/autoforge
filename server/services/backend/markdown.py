"""
Markdown Backend Implementation
===============================

Implementation of BackendInterface using Markdown files for Features
and JSON for Schedules (since schedules are structured config).
"""

import json
import re
import logging
from pathlib import Path
from typing import Any, List, Optional, Dict
from datetime import datetime

from server.services.backend.interface import BackendInterface
from server.schemas import (
    FeatureCreate, FeatureResponse, FeatureUpdate,
    ScheduleCreate, ScheduleResponse, ScheduleUpdate,
    DependencyGraphResponse, FeatureBulkCreate
)
try:
    from registry import get_project_path
except ImportError:
    # Fallback for when running in different contexts
    import sys
    sys.path.append(str(Path(__file__).parent.parent.parent.parent))
    from registry import get_project_path

logger = logging.getLogger(__name__)

class MarkdownBackend(BackendInterface):
    """
    Markdown file-based implementation.
    
    Features are stored in `features.md`:
    - Headers (#) -> Categories
    - Checklists (- [ ]) -> Features
    - Sub-bullets -> Steps
    
    Schedules are stored in `schedules.json`.
    """
    
    def _get_project_dir(self, project_name: str) -> Path:
        path = get_project_path(project_name)
        if not path:
             raise ValueError(f"Project '{project_name}' not found in registry")
        return path

    def _get_features_file(self, project_name: str) -> Path:
        return self._get_project_dir(project_name) / "features.md"

    def _get_schedules_file(self, project_name: str) -> Path:
        return self._get_project_dir(project_name) / "schedules.json"

    # -------------------------------------------------------------------------
    # Feature IO
    # -------------------------------------------------------------------------

    def _parse_features_md(self, content: str) -> List[FeatureResponse]:
        """
        Parse markdown content into FeatureResponse objects.
        Simple state machine parser.
        """
        features: List[FeatureResponse] = []
        lines = content.split('\n')
        
        current_category = "General"
        current_feature: Optional[dict] = None
        
        # Regex per line
        # Header: # Category
        header_re = re.compile(r'^#+\s+(.+)$')
        # Item: - [ ] Name or - [x] Name or - [/] Name
        item_re = re.compile(r'^-\s+\[([ x/])\]\s+(.+)$')
        # Step:   - Step or     - Step
        step_re = re.compile(r'^\s+-\s+(.+)$')
        # Metadata: <!-- id: 1, pri: 5 -->
        meta_re = re.compile(r'<!--\s+id:\s*(\d+).*-->')

        feature_id_counter = 0

        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue
                
            # Header
            header_match = header_re.match(line)
            if header_match:
                current_category = header_match.group(1).strip()
                continue
                
            # Feature Item
            item_match = item_re.match(line)
            if item_match:
                status_char = item_match.group(1)
                name = item_match.group(2).strip()
                
                passes = status_char == 'x'
                in_progress = status_char == '/'
                
                # Check for metadata in name (hacky but needed for persistence of IDs if we want stable IDs)
                # Or we just auto-assign ID based on order?
                # BackendInterface requires ID.
                # If we auto-assign by order, IDs shift on reorder. 
                # Better to store ID in hidden comment?
                
                # Check for inline ID comment
                f_id = 0
                meta_match = meta_re.search(name)
                if meta_match:
                    f_id = int(meta_match.group(1))
                    # Remove meta from name for display
                    name = meta_re.sub('', name).strip()
                else:
                    # Auto-increment fallback (unstable)
                    feature_id_counter += 1
                    f_id = feature_id_counter
                
                # Commit previous feature
                if current_feature:
                    features.append(FeatureResponse(**current_feature))
                
                current_feature = {
                    "id": f_id,
                    "priority": len(features) + 1, # Priority by order
                    "category": current_category,
                    "name": name,
                    "description": "", # Multiline desc not supported well in simple list
                    "steps": [],
                    "passes": passes,
                    "in_progress": in_progress,
                    "dependencies": [], # Not parsed yet
                    "created_at": None
                }
                continue
                
            # Step or sub-item
            step_match = step_re.match(line)
            if step_match and current_feature:
                current_feature["steps"].append(step_match.group(1).strip())
                continue
                
        # Commit last
        if current_feature:
            features.append(FeatureResponse(**current_feature))
            
        return features

    def _serialize_features(self, features: List[FeatureResponse]) -> str:
        """Serialize features to Markdown."""
        lines = []
        
        # Group by category
        by_category: Dict[str, List[FeatureResponse]] = {}
        for f in features:
            cat = f.category or "General"
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(f)
            
        # Sort features by priority within category? 
        # Or preserve order? Interface returns lists.
        # Let's assume input `features` is already sorted or we sort by priority.
        
        # Actually, `features` input is flat list. We should respect its order if it reflects priority.
        
        # Sort categories alphabetically or keep "General" first?
        categories = sorted(by_category.keys())
        if "General" in categories:
            categories.remove("General")
            categories.insert(0, "General")
            
        for cat in categories:
            lines.append(f"# {cat}")
            lines.append("")
            
            # Sort items by priority
            items = sorted(by_category[cat], key=lambda x: x.priority)
            
            for f in items:
                mark = "x" if f.passes else "/" if f.in_progress else " "
                # Embed ID to make it stable
                lines.append(f"- [{mark}] {f.name} <!-- id: {f.id} -->")
                for s in f.steps:
                    lines.append(f"  - {s}")
            
            lines.append("")
            
        return "\n".join(lines)

    def _read_features_list(self, project_name: str) -> List[FeatureResponse]:
        file_path = self._get_features_file(project_name)
        if not file_path.exists():
            return []
        with open(file_path, "r", encoding="utf-8") as f:
            return self._parse_features_md(f.read())
            
    def _save_features_list(self, project_name: str, features: List[FeatureResponse]):
        file_path = self._get_features_file(project_name)
        content = self._serialize_features(features)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

    def list_features(self, project_name: str) -> dict[str, list[FeatureResponse]]:
        features = self._read_features_list(project_name)
        
        # Sort by priority
        features.sort(key=lambda x: x.priority)
        
        pending = [f for f in features if not f.passes and not f.in_progress]
        in_progress = [f for f in features if f.in_progress and not f.passes]
        done = [f for f in features if f.passes]
        
        return {
            "pending": pending,
            "in_progress": in_progress,
            "done": done
        }

    def create_feature(self, project_name: str, feature: FeatureCreate) -> FeatureResponse:
        features = self._read_features_list(project_name)
        
        # ID gen: max + 1
        max_id = max([f.id for f in features], default=0)
        new_id = max_id + 1
        
        # Priority: max + 1
        max_pri = max([f.priority for f in features], default=0)
        new_pri = feature.priority if feature.priority is not None else max_pri + 1
        
        new_feat = FeatureResponse(
            id=new_id,
            priority=new_pri,
            category=feature.category,
            name=feature.name,
            description=feature.description,
            steps=feature.steps,
            passes=False,
            in_progress=False,
            dependencies=feature.dependencies or [],
            created_at=None
        )
        
        features.append(new_feat)
        self._save_features_list(project_name, features)
        return new_feat

    def create_features_bulk(self, project_name: str, bulk: FeatureBulkCreate) -> list[FeatureResponse]:
        # Reuse single create logic but optimize save
        features = self._read_features_list(project_name)
        max_id = max([f.id for f in features], default=0)
        current_pri = bulk.starting_priority or 1
        
        created = []
        for f_in in bulk.features:
            max_id += 1
            new_feat = FeatureResponse(
                id=max_id,
                priority=current_pri,
                category=f_in.category,
                name=f_in.name,
                description=f_in.description,
                steps=f_in.steps,
                passes=False,
                in_progress=False,
                dependencies=f_in.dependencies or [],
                created_at=None
            )
            created.append(new_feat)
            features.append(new_feat)
            current_pri += 1
            
        self._save_features_list(project_name, features)
        return created

    def get_feature(self, project_name: str, feature_id: int) -> FeatureResponse | None:
        features = self._read_features_list(project_name)
        for f in features:
            if f.id == feature_id:
                return f
        return None

    def update_feature(self, project_name: str, feature_id: int, update: FeatureUpdate) -> FeatureResponse:
        features = self._read_features_list(project_name)
        target_idx = -1
        for i, f in enumerate(features):
            if f.id == feature_id:
                target_idx = i
                break
                
        if target_idx == -1:
            raise ValueError(f"Feature {feature_id} not found")
            
        # Update fields
        current = features[target_idx]
        data = update.model_dump(exclude_unset=True)
        updated = current.model_copy(update=data)
        
        features[target_idx] = updated
        self._save_features_list(project_name, features)
        return updated

    def delete_feature(self, project_name: str, feature_id: int) -> dict[str, Any]:
        features = self._read_features_list(project_name)
        new_list = [f for f in features if f.id != feature_id]
        if len(new_list) == len(features):
             return {"success": False} # Not found
             
        self._save_features_list(project_name, new_list)
        return {"success": True, "id": feature_id}

    def skip_feature(self, project_name: str, feature_id: int) -> bool:
        features = self._read_features_list(project_name)
        target = None
        for f in features:
            if f.id == feature_id:
                target = f
                break
        if not target:
            return False
            
        # Move to bottom priority
        max_pri = max([f.priority for f in features], default=0)
        target.priority = max_pri + 1
        
        self._save_features_list(project_name, features)
        return True

    def get_dependency_graph(self, project_name: str) -> DependencyGraphResponse:
        features = self._read_features_list(project_name)
        nodes = []
        edges = []
        for f in features:
            status = "done" if f.passes else "in_progress" if f.in_progress else "pending"
            nodes.append({
                "id": f.id,
                "label": f"{f.id}: {f.name}",
                "status": status
            })
            for dep in f.dependencies:
                edges.append({"from": dep, "to": f.id})
        return DependencyGraphResponse(nodes=nodes, edges=edges)
        
    def add_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
         # Simple read-modify-write
        features = self._read_features_list(project_name)
        for f in features:
            if f.id == feature_id:
                if dep_id not in f.dependencies:
                    f.dependencies.append(dep_id)
                    self._save_features_list(project_name, features)
                return f.dependencies
        raise ValueError("Feature not found")

    def remove_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        features = self._read_features_list(project_name)
        for f in features:
            if f.id == feature_id:
                if dep_id in f.dependencies:
                    f.dependencies.remove(dep_id)
                    self._save_features_list(project_name, features)
                return f.dependencies
        raise ValueError("Feature not found")

    def set_dependencies(self, project_name: str, feature_id: int, dep_ids: list[int]) -> list[int]:
        features = self._read_features_list(project_name)
        for f in features:
            if f.id == feature_id:
                f.dependencies = dep_ids
                self._save_features_list(project_name, features)
                return f.dependencies
        raise ValueError("Feature not found")


    # -------------------------------------------------------------------------
    # Schedule IO
    # -------------------------------------------------------------------------
    
    def _read_schedules_list(self, project_name: str) -> List[ScheduleResponse]:
        path = self._get_schedules_file(project_name)
        if not path.exists():
            return []
        try:
            with open(path, "r") as f:
                data = json.load(f)
                return [ScheduleResponse(**d) for d in data]
        except Exception:
            return []
            
    def _save_schedules_list(self, project_name: str, schedules: List[ScheduleResponse]):
        path = self._get_schedules_file(project_name)
        data = [s.model_dump(mode='json') for s in schedules]
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def list_schedules(self, project_name: str) -> list[ScheduleResponse]:
        return self._read_schedules_list(project_name)

    def create_schedule(self, project_name: str, schedule: ScheduleCreate) -> ScheduleResponse:
        schedules = self._read_schedules_list(project_name)
        
        # ID gen
        max_id = max([s.id for s in schedules], default=0)
        new_id = max_id + 1
        
        new_schedule = ScheduleResponse(
            id=new_id,
            project_name=project_name,
            crash_count=0,
            created_at=datetime.now(),
            **schedule.model_dump()
        )
        schedules.append(new_schedule)
        self._save_schedules_list(project_name, schedules)
        return new_schedule

    def get_schedule(self, project_name: str, schedule_id: int) -> ScheduleResponse | None:
        schedules = self._read_schedules_list(project_name)
        for s in schedules:
            if s.id == schedule_id:
                return s
        return None

    def update_schedule(self, project_name: str, schedule_id: int, update: ScheduleUpdate) -> ScheduleResponse:
        schedules = self._read_schedules_list(project_name)
        target_idx = -1
        for i, s in enumerate(schedules):
            if s.id == schedule_id:
                target_idx = i
                break
        
        if target_idx == -1:
             raise ValueError("Schedule not found")
             
        current = schedules[target_idx]
        data = update.model_dump(exclude_unset=True)
        updated = current.model_copy(update=data)
        
        schedules[target_idx] = updated
        self._save_schedules_list(project_name, schedules)
        return updated

    def delete_schedule(self, project_name: str, schedule_id: int) -> bool:
        schedules = self._read_schedules_list(project_name)
        new_list = [s for s in schedules if s.id != schedule_id]
        if len(new_list) == len(schedules):
            return False
        
        self._save_schedules_list(project_name, new_list)
        return True

    # =========================================================================
    # Project Metadata
    # =========================================================================

    def _get_metadata_path(self, project_name: str, filename: str) -> Path:
        """Get path to a metadata file in .xaheen directory."""
        return self._get_project_dir(project_name) / ".xaheen" / filename

    def _get_kb_dir(self, project_name: str) -> Path:
        """Get knowledge base directory path."""
        return self._get_project_dir(project_name) / ".xaheen" / "kb"

    # Ideation
    def get_ideation(self, project_name: str) -> str:
        """Get ideation notes (markdown)."""
        path = self._get_metadata_path(project_name, "ideation.md")
        return path.read_text(encoding="utf-8") if path.exists() else ""

    def update_ideation(self, project_name: str, content: str) -> bool:
        """Update ideation notes."""
        path = self._get_metadata_path(project_name, "ideation.md")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return True

    # Context
    def get_context(self, project_name: str) -> dict:
        """Get project context (JSON)."""
        path = self._get_metadata_path(project_name, "context.json")
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def update_context(self, project_name: str, context: dict) -> dict:
        """Update project context."""
        path = self._get_metadata_path(project_name, "context.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(context, indent=2), encoding="utf-8")
        return context

    # Knowledge Base
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
        """Get a specific knowledge item."""
        kb_dir = self._get_kb_dir(project_name)
        path = kb_dir / filename
        return path.read_text(encoding="utf-8") if path.exists() else ""

    def save_knowledge_item(self, project_name: str, filename: str, content: str) -> bool:
        """Save a knowledge item."""
        kb_dir = self._get_kb_dir(project_name)
        kb_dir.mkdir(parents=True, exist_ok=True)
        (kb_dir / filename).write_text(content, encoding="utf-8")
        return True

    def delete_knowledge_item(self, project_name: str, filename: str) -> bool:
        """Delete a knowledge item."""
        kb_dir = self._get_kb_dir(project_name)
        path = kb_dir / filename
        if path.exists():
            path.unlink()
            return True
        return False

    # Roadmap
    def get_roadmap(self, project_name: str) -> dict:
        """Get project roadmap (JSON)."""
        path = self._get_metadata_path(project_name, "roadmap.json")
        if not path.exists():
            return {"phases": [], "milestones": [], "currentPhase": None}
        return json.loads(path.read_text(encoding="utf-8"))

    def update_roadmap(self, project_name: str, roadmap: dict) -> dict:
        """Update project roadmap."""
        path = self._get_metadata_path(project_name, "roadmap.json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(roadmap, indent=2), encoding="utf-8")
        return roadmap
