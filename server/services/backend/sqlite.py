"""
SQLite Backend Implementation
=============================

Implementation of BackendInterface using SQLite and SQLAlchemy.
Wraps existing logic from features.py and schedules.py.
"""

import logging
from contextlib import contextmanager
from typing import Any, Generator, Literal

from sqlalchemy.orm import Session

from api.database import Feature, Schedule, ScheduleOverride, create_database
from server.schemas import (
    DependencyGraphEdge,
    DependencyGraphNode,
    DependencyGraphResponse,
    FeatureBulkCreate,
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
)
from server.services.backend.interface import BackendInterface
from server.utils.project_helpers import get_project_path
from server.utils.validation import validate_project_name

logger = logging.getLogger(__name__)


class SQLiteBackend(BackendInterface):
    """SQLite implementation of persistence layer."""

    @contextmanager
    def _get_session(self, project_name: str) -> Generator[Session, None, None]:
        """Get database session for a project."""
        project_name = validate_project_name(project_name)
        project_dir = get_project_path(project_name)

        if not project_dir or not project_dir.exists():
            raise ValueError(f"Project '{project_name}' not found")

        _, SessionLocal = create_database(project_dir)
        session = SessionLocal()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def _feature_to_response(self, f: Feature, passing_ids: set[int] | None = None) -> FeatureResponse:
        """Convert Feature ORM to Pydantic."""
        deps = f.dependencies or []
        if passing_ids is None:
            blocked = False
            blocking = []
        else:
            blocking = [d for d in deps if d not in passing_ids]
            blocked = len(blocking) > 0

        return FeatureResponse(
            id=f.id,
            priority=f.priority,
            category=f.category,
            name=f.name,
            description=f.description,
            steps=f.steps if isinstance(f.steps, list) else [],
            dependencies=deps,
            passes=f.passes if f.passes is not None else False,
            in_progress=f.in_progress if f.in_progress is not None else False,
            blocked=blocked,
            blocking_dependencies=blocking,
        )

    def _schedule_to_response(self, s: Schedule) -> ScheduleResponse:
        """Convert Schedule ORM to Pydantic."""
        return ScheduleResponse.model_validate(s, from_attributes=True)

    # =========================================================================
    # Features
    # =========================================================================

    def list_features(self, project_name: str) -> dict[str, list[FeatureResponse]]:
        with self._get_session(project_name) as session:
            all_features = session.query(Feature).order_by(Feature.priority).all()
            passing_ids = {f.id for f in all_features if f.passes}

            pending = []
            in_progress = []
            done = []

            for f in all_features:
                resp = self._feature_to_response(f, passing_ids)
                if f.passes:
                    done.append(resp)
                elif f.in_progress:
                    in_progress.append(resp)
                else:
                    pending.append(resp)

            return {
                "pending": pending,
                "in_progress": in_progress,
                "done": done
            }

    def create_feature(self, project_name: str, feature: FeatureCreate) -> FeatureResponse:
        with self._get_session(project_name) as session:
            if feature.priority is None:
                max_priority = session.query(Feature).order_by(Feature.priority.desc()).first()
                priority = (max_priority.priority + 1) if max_priority else 1
            else:
                priority = feature.priority

            db_feature = Feature(
                priority=priority,
                category=feature.category,
                name=feature.name,
                description=feature.description,
                steps=feature.steps,
                dependencies=feature.dependencies if feature.dependencies else None,
                passes=False,
                in_progress=False,
            )

            session.add(db_feature)
            session.commit()
            session.refresh(db_feature)
            return self._feature_to_response(db_feature)

    def create_features_bulk(self, project_name: str, bulk: FeatureBulkCreate) -> list[FeatureResponse]:
        if not bulk.features:
            return []
            
        with self._get_session(project_name) as session:
            if bulk.starting_priority is not None:
                current_priority = bulk.starting_priority
            else:
                max_p = session.query(Feature).order_by(Feature.priority.desc()).first()
                current_priority = (max_p.priority + 1) if max_p else 1

            created_ids = []
            for fdata in bulk.features:
                db_f = Feature(
                    priority=current_priority,
                    category=fdata.category,
                    name=fdata.name,
                    description=fdata.description,
                    steps=fdata.steps,
                    dependencies=fdata.dependencies if fdata.dependencies else None,
                    passes=False,
                    in_progress=False
                )
                session.add(db_f)
                session.flush()
                created_ids.append(db_f.id)
                current_priority += 1
            
            session.commit()
            
            # Fetch back
            created = []
            for f in session.query(Feature).filter(Feature.id.in_(created_ids)).order_by(Feature.priority).all():
                created.append(self._feature_to_response(f))
            return created

    def get_feature(self, project_name: str, feature_id: int) -> FeatureResponse | None:
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            if not f:
                return None
            return self._feature_to_response(f)

    def update_feature(self, project_name: str, feature_id: int, update: FeatureUpdate) -> FeatureResponse:
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            if not f:
                raise ValueError(f"Feature {feature_id} not found")
            
            if f.passes:
                raise ValueError("Cannot edit completed feature")

            if update.category is not None: f.category = update.category
            if update.name is not None: f.name = update.name
            if update.description is not None: f.description = update.description
            if update.steps is not None: f.steps = update.steps
            if update.priority is not None: f.priority = update.priority
            if update.dependencies is not None: 
                f.dependencies = update.dependencies if update.dependencies else None

            session.commit()
            session.refresh(f)
            
            # Re-calculate passing IDs for blocked status
            all_features = session.query(Feature).all()
            passing_ids = {feat.id for feat in all_features if feat.passes}
            
            return self._feature_to_response(f, passing_ids)

    def delete_feature(self, project_name: str, feature_id: int) -> dict[str, Any]:
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            if not f:
                raise ValueError(f"Feature {feature_id} not found")

            # Clean up dependencies
            affected = []
            for other in session.query(Feature).all():
                if other.dependencies and feature_id in other.dependencies:
                    deps = [d for d in other.dependencies if d != feature_id]
                    other.dependencies = deps if deps else None
                    affected.append(other.id)
            
            session.delete(f)
            session.commit()
            
            msg = f"Feature {feature_id} deleted"
            if affected:
                msg += f". Removed from dependencies of: {affected}"
            
            return {"success": True, "message": msg, "affected_features": affected}

    def skip_feature(self, project_name: str, feature_id: int) -> bool:
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            if not f:
                raise ValueError(f"Feature {feature_id} not found")
            
            max_p = session.query(Feature).order_by(Feature.priority.desc()).first()
            f.priority = (max_p.priority + 1) if max_p else 1
            session.commit()
            return True

    def get_dependency_graph(self, project_name: str) -> DependencyGraphResponse:
        with self._get_session(project_name) as session:
            all_features = session.query(Feature).all()
            passing_ids = {f.id for f in all_features if f.passes}
            
            nodes = []
            edges = []
            
            for f in all_features:
                deps = f.dependencies or []
                blocking = [d for d in deps if d not in passing_ids]
                
                status = "pending"
                if f.passes: status = "done"
                elif blocking: status = "blocked"
                elif f.in_progress: status = "in_progress"
                
                nodes.append(DependencyGraphNode(
                    id=f.id,
                    name=f.name,
                    category=f.category,
                    status=status,
                    priority=f.priority,
                    dependencies=deps
                ))
                
                for dep_id in deps:
                    edges.append(DependencyGraphEdge(source=dep_id, target=f.id))
            
            return DependencyGraphResponse(nodes=nodes, edges=edges)

    # =========================================================================
    # Dependencies
    # =========================================================================
    
    # Note: Dependency validation logic (cycles, self-ref) is mostly pure logic
    # checking against the graph. We can implement it here.
    
    def add_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        # Circular dep check requires full graph
        from api.dependency_resolver import would_create_circular_dependency, MAX_DEPENDENCIES_PER_FEATURE
        
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            dep = session.query(Feature).filter(Feature.id == dep_id).first()
            
            if not f: raise ValueError(f"Feature {feature_id} not found")
            if not dep: raise ValueError(f"Dependency {dep_id} not found")
            if feature_id == dep_id: raise ValueError("Cannot depend on self")
            
            current = f.dependencies or []
            if len(current) >= MAX_DEPENDENCIES_PER_FEATURE:
                raise ValueError(f"Max dependencies ({MAX_DEPENDENCIES_PER_FEATURE}) exceeded")
            if dep_id in current:
                raise ValueError("Dependency already exists")
                
            # Check cycles
            all_dicts = [feat.to_dict() for feat in session.query(Feature).all()]
            if would_create_circular_dependency(all_dicts, feature_id, dep_id):
                raise ValueError("Would create circular dependency")
                
            current.append(dep_id)
            f.dependencies = sorted(current)
            session.commit()
            return f.dependencies

    def remove_dependency(self, project_name: str, feature_id: int, dep_id: int) -> list[int]:
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            if not f: raise ValueError(f"Feature {feature_id} not found")
            
            current = f.dependencies or []
            if dep_id not in current:
                raise ValueError("Dependency does not exist")
                
            current.remove(dep_id)
            f.dependencies = current if current else None
            session.commit()
            return f.dependencies or []

    def set_dependencies(self, project_name: str, feature_id: int, dep_ids: list[int]) -> list[int]:
        from api.dependency_resolver import would_create_circular_dependency
        
        if feature_id in dep_ids: raise ValueError("Cannot depend on self")
        if len(dep_ids) != len(set(dep_ids)): raise ValueError("Duplicate dependencies")
        
        with self._get_session(project_name) as session:
            f = session.query(Feature).filter(Feature.id == feature_id).first()
            if not f: raise ValueError(f"Feature {feature_id} not found")
            
            # Validate existence
            all_ids = {feat.id for feat in session.query(Feature).all()}
            missing = [d for d in dep_ids if d not in all_ids]
            if missing: raise ValueError(f"Dependencies not found: {missing}")
            
            # Check cycles logic (complex)
            all_features = [feat.to_dict() for feat in session.query(Feature).all()]
            test_features = []
            for feat in all_features:
                if feat["id"] == feature_id:
                    test_features.append({**feat, "dependencies": dep_ids})
                else:
                    test_features.append(feat)
            
            for dep_id in dep_ids:
                if would_create_circular_dependency(test_features, feature_id, dep_id):
                    raise ValueError(f"Circular dependency detected with {dep_id}")
            
            f.dependencies = sorted(dep_ids) if dep_ids else None
            session.commit()
            return f.dependencies or []

    # =========================================================================
    # Schedules
    # =========================================================================

    def list_schedules(self, project_name: str) -> list[ScheduleResponse]:
        with self._get_session(project_name) as session:
            schedules = session.query(Schedule).filter(
                Schedule.project_name == project_name
            ).order_by(Schedule.start_time).all()
            return [self._schedule_to_response(s) for s in schedules]

    def create_schedule(self, project_name: str, data: ScheduleCreate) -> ScheduleResponse:
        # Note: APScheduler hook logic is currently in the router.
        # The backend just persists data. The router/service layer needs to handle side effects.
        # OR we inject the scheduler here? 
        # For now, let's keep side effects in the router and just return the saved object.
        # BUT the interface says "create_schedule".
        
        with self._get_session(project_name) as session:
            count = session.query(Schedule).filter(Schedule.project_name == project_name).count()
            if count >= 50: raise ValueError("Max schedules exceeded")
            
            s = Schedule(
                project_name=project_name,
                start_time=data.start_time,
                duration_minutes=data.duration_minutes,
                days_of_week=data.days_of_week,
                enabled=data.enabled,
                yolo_mode=data.yolo_mode,
                model=data.model,
                max_concurrency=data.max_concurrency
            )
            session.add(s)
            session.commit()
            session.refresh(s)
            return self._schedule_to_response(s)

    def get_schedule(self, project_name: str, schedule_id: int) -> ScheduleResponse | None:
        with self._get_session(project_name) as session:
            s = session.query(Schedule).filter(
                Schedule.id == schedule_id,
                Schedule.project_name == project_name
            ).first()
            if not s: return None
            return self._schedule_to_response(s)

    def update_schedule(self, project_name: str, schedule_id: int, update: ScheduleUpdate) -> ScheduleResponse:
        with self._get_session(project_name) as session:
            s = session.query(Schedule).filter(
                Schedule.id == schedule_id,
                Schedule.project_name == project_name
            ).first()
            if not s: raise ValueError("Schedule not found")
            
            data = update.model_dump(exclude_unset=True)
            for k, v in data.items():
                setattr(s, k, v)
                
            session.commit()
            session.refresh(s)
            return self._schedule_to_response(s)

    def delete_schedule(self, project_name: str, schedule_id: int) -> bool:
        with self._get_session(project_name) as session:
            s = session.query(Schedule).filter(
                Schedule.id == schedule_id,
                Schedule.project_name == project_name
            ).first()
            if not s: return False
            
            session.delete(s)
            session.commit()
            return True

    # =========================================================================
    # Project Metadata (Delegated to Files)
    # =========================================================================
    # Note: SQLite is only used for features/schedules. Metadata uses files.

    def _get_metadata_path(self, project_name: str, filename: str):
        """Get path to metadata file."""
        from pathlib import Path
        project_dir = get_project_path(project_name)
        return Path(project_dir) / ".xaheen" / filename

    def _get_kb_dir(self, project_name: str):
        """Get knowledge base directory."""
        from pathlib import Path
        project_dir = get_project_path(project_name)
        return Path(project_dir) / ".xaheen" / "kb"

    def get_ideation(self, project_name: str) -> str:
        """Get ideation notes."""
        import json
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
