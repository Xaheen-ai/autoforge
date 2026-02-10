
import asyncio
import os
import shutil
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path.cwd()))

from server.services.backend.factory import BackendFactory
from server.schemas import FeatureCreate, ScheduleCreate, FeatureBulkCreate, ProjectCreate
from registry import register_project, unregister_project
from api.database import create_database, dispose_engine, Feature, Schedule

async def main():
    print("Starting backend adapter verification...")
    
    project_name = "backend-test-proj"
    project_path = Path.home() / "xaheen_test_projects" / project_name
    
    # Cleanup
    if project_path.exists():
        dispose_engine(project_path)
        shutil.rmtree(project_path)
    
    # Register project
    print(f"Creating project: {project_name}")
    try:
        if not project_path.exists():
            project_path.mkdir(parents=True)
            
        register_project(project_name, project_path)
    except Exception as e:
        print(f"Project creation failed (might already exist in registry): {e}")
        # Ideally we unregister first but let's see.
        
    # Initialize DB (create_project might not do it fully if logic is lazy)
    create_database(project_path)
    
    # Get Backend
    backend = BackendFactory.get_backend()
    print(f"Backend type: {type(backend)}")
    
    # 1. Create Feature
    print("Creating feature...")
    f = backend.create_feature(project_name, FeatureCreate(
        name="Test Feature 1",
        category="backend",
        description="Testing backend adapter",
        steps=["Step 1", "Step 2"]
    ))
    print(f"Feature created: {f.id} - {f.name}")
    assert f.name == "Test Feature 1"
    
    # 2. List Features
    print("Listing features...")
    features = backend.list_features(project_name)
    print(f"Pending: {len(features['pending'])}")
    assert len(features['pending']) == 1
    assert features['pending'][0].id == f.id
    
    # 3. Create Bulk
    print("Bulk creating...")
    bulk_res = backend.create_features_bulk(project_name, FeatureBulkCreate(features=[
        FeatureCreate(name="F2", category="cat", description="desc", steps=[]),
        FeatureCreate(name="F3", category="cat", description="desc", steps=[])
    ]))
    print(f"Bulk created: {len(bulk_res)}")
    assert len(bulk_res) == 2
    
    # 4. Schedules
    print("Creating schedule...")
    s = backend.create_schedule(project_name, ScheduleCreate(
        start_time="10:00",
        duration_minutes=60,
        days_of_week=127,
        enabled=True,
        max_concurrency=3
    ))
    print(f"Schedule created: {s.id} - {s.start_time}")
    
    schedules = backend.list_schedules(project_name)
    print(f"Schedules count: {len(schedules)}")
    assert len(schedules) == 1
    assert schedules[0].id == s.id

    print("Verification SUCCESS!")
    
    # Cleanup
    dispose_engine(project_path)
    # shutil.rmtree(project_path) # Optional cleanup

if __name__ == "__main__":
    asyncio.run(main())
