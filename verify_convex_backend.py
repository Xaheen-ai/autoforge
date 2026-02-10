
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, str(Path.cwd()))

from server.services.backend.convex import ConvexBackend
from server.schemas import FeatureCreate, ScheduleCreate, FeatureBulkCreate, FeatureUpdate

# Ensure env var is set (though script should inherit from shell if run correctly)
if not os.getenv("CONVEX_URL"):
    print("Error: CONVEX_URL not set")
    sys.exit(1)

def main():
    print("Starting ConvexBackend verification...")
    
    project_name = "convex-verification-proj"
    backend = ConvexBackend()
    
    print(f"Using backend: {type(backend)}")

    # CLEANUP BEFORE START (in case of previous failure)
    print("Cleaning up previous data...")
    _cleanup(backend, project_name)

    try:
        # 1. Create Feature
        print("Creating feature...")
        f1 = backend.create_feature(project_name, FeatureCreate(
            name="Convex Feature 1",
            category="Integration Test",
            description="Testing via script",
            steps=["Step A", "Step B"],
            priority=1
        ))
        print(f"Created: {f1.id} - {f1.name}")
        assert f1.name == "Convex Feature 1"
        assert f1.id > 0

        # 2. List Features
        print("Listing features...")
        features = backend.list_features(project_name)
        pending = features["pending"]
        print(f"Pending count: {len(pending)}")
        assert len(pending) == 1
        assert pending[0].id == f1.id

        # 3. Update Feature
        print("Updating feature...")
        f1_updated = backend.update_feature(project_name, f1.id, FeatureUpdate(
            description="Updated description"
        ))
        assert f1_updated.description == "Updated description"

        # 4. Bulk Create
        print("Bulk creating...")
        bulk = backend.create_features_bulk(project_name, FeatureBulkCreate(features=[
            FeatureCreate(name="Bulk 1", category="Bulk", description="d", steps=[]),
            FeatureCreate(name="Bulk 2", category="Bulk", description="d", steps=[])
        ]))
        print(f"Bulk created: {len(bulk)}")
        assert len(bulk) == 2

        # 5. Schedules
        print("Creating schedule...")
        s1 = backend.create_schedule(project_name, ScheduleCreate(
            start_time="12:00",
            duration_minutes=30,
            days_of_week=1,
            enabled=True,
            max_concurrency=1
        ))
        print(f"Schedule created: {s1.id}")
        
        schedules = backend.list_schedules(project_name)
        assert len(schedules) == 1
        assert schedules[0].id == s1.id

        print("\nVerification SUCCESS!")

    except Exception as e:
        print(f"\nFAILURE: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        print("\nCleaning up...")
        _cleanup(backend, project_name)

def _cleanup(backend, project_name):
    # Features
    features_dict = backend.list_features(project_name)
    all_features = features_dict["pending"] + features_dict["in_progress"] + features_dict["done"]
    for f in all_features:
        try:
            backend.delete_feature(project_name, f.id)
            print(f"Deleted feature {f.id}")
        except Exception as e:
            print(f"Failed to delete feature {f.id}: {e}")

    # Schedules
    schedules = backend.list_schedules(project_name)
    for s in schedules:
        try:
            backend.delete_schedule(project_name, s.id)
            print(f"Deleted schedule {s.id}")
        except Exception as e:
            print(f"Failed to delete schedule {s.id}: {e}")

if __name__ == "__main__":
    main()
