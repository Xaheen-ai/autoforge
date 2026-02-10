"""
Schedules Router
================

API endpoints for managing automated agent schedules.
Delegates persistence to Pluggable Backend Architecture.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

try:
    from server.scheduler import scheduler as agent_scheduler
except ImportError:
    # Fallback/Mock for testing if specific scheduler module is missing
    # In real app it should exist.
    print("Warning: server.scheduler not found, using mock")
    class MockScheduler:
        def add_project_schedule(self, *args): pass
        def remove_project_schedule(self, *args): pass
        def get_job(self, *args): return None
    agent_scheduler = MockScheduler()

from server.services.backend.factory import BackendFactory
from server.schemas import (
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
)
from server.utils.validation import validate_project_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects/{project_name}/schedules", tags=["schedules"])


def _handle_backend_error(e: Exception):
    """Convert backend exceptions to HTTP exceptions."""
    msg = str(e)
    if "not found" in msg.lower():
        raise HTTPException(status_code=404, detail=msg)
    if "exceeded" in msg.lower():
        raise HTTPException(status_code=400, detail=msg)
    logger.exception("Backend error")
    raise HTTPException(status_code=500, detail=f"Internal error: {msg}")


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(project_name: str):
    """List all schedules for a project."""
    try:
        backend = BackendFactory.get_backend()
        return backend.list_schedules(project_name)
    except Exception as e:
        _handle_backend_error(e)


@router.post("", response_model=ScheduleResponse)
async def create_schedule(project_name: str, schedule: ScheduleCreate):
    """Create a new schedule."""
    try:
        backend = BackendFactory.get_backend()
        
        # persistence
        created_schedule = backend.create_schedule(project_name, schedule)

        # Side effect: Add to scheduler
        if created_schedule.enabled:
            try:
                agent_scheduler.add_project_schedule(
                   project_name,
                   created_schedule.id,
                   created_schedule.start_time,
                   created_schedule.days_of_week
                )
            except Exception as e:
                logger.error(f"Failed to schedule job for {created_schedule.id}: {e}")

        return created_schedule
    except Exception as e:
        _handle_backend_error(e)


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(project_name: str, schedule_id: int):
    """Get a specific schedule."""
    try:
        backend = BackendFactory.get_backend()
        schedule = backend.get_schedule(project_name, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")
        return schedule
    except HTTPException:
        raise
    except Exception as e:
        _handle_backend_error(e)


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(project_name: str, schedule_id: int, update: ScheduleUpdate):
    """
    Update a schedule.
    Restart scheduler job if meaningful fields changed.
    """
    try:
        backend = BackendFactory.get_backend()
        
        # Update persistence
        updated_schedule = backend.update_schedule(project_name, schedule_id, update)
        
        # Side effect: Update scheduler
        agent_scheduler.remove_project_schedule(updated_schedule.id)
        
        if updated_schedule.enabled:
            agent_scheduler.add_project_schedule(
                project_name,
                updated_schedule.id,
                updated_schedule.start_time,
                updated_schedule.days_of_week
            )
            
        return updated_schedule
    except Exception as e:
        _handle_backend_error(e)


@router.delete("/{schedule_id}")
async def delete_schedule(project_name: str, schedule_id: int):
    """Delete a schedule."""
    try:
        backend = BackendFactory.get_backend()
        
        success = backend.delete_schedule(project_name, schedule_id)
        if not success:
             raise HTTPException(status_code=404, detail="Schedule not found")

        # Side effect: Remove from scheduler
        agent_scheduler.remove_project_schedule(schedule_id)

        return {"success": True, "message": "Schedule deleted"}
    except HTTPException:
        raise
    except Exception as e:
        _handle_backend_error(e)


@router.get("/{schedule_id}/next-run")
async def get_next_run(project_name: str, schedule_id: int):
    """
    Calculate the next scheduled run time.
    """
    try:
        # Check existence via backend first
        backend = BackendFactory.get_backend()
        schedule = backend.get_schedule(project_name, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
            
        if not schedule.enabled:
            return {"next_run": None, "reason": "Disabled"}

        # Query scheduler job
        job = agent_scheduler.get_job(str(schedule_id))
        
        if job and job.next_run_time:
            return {
                "next_run": job.next_run_time.isoformat(),
                "reason": "Scheduled"
            }
        
        return {"next_run": None, "reason": "No upcoming run scheduled"}
    except Exception as e:
        _handle_backend_error(e)
