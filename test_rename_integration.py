import asyncio
import os
import shutil
import sys
from pathlib import Path

# Add project root to path
ROOT = Path("/Volumes/Laravel/Xaheen/autoforge")
sys.path.insert(0, str(ROOT))

# Setup environment variables for testing
os.environ["XAHEEN_ROOT"] = str(ROOT)

from server.routers.projects import create_project, rename_project_endpoint, delete_project
from server.schemas import ProjectCreate, ProjectRename

async def test_rename():
    print("Starting rename test...")
    
    # 1. Setup paths
    src_name = "test-rename-src"
    dst_name = "test-rename-dst"
    
    # Use home directory to avoid blocked paths (like /Volumes or /tmp which are restricted)
    base_dir = Path.home() / "xaheen_test_projects"
    base_dir.mkdir(exist_ok=True)
    
    src_path = base_dir / src_name
    dst_path = base_dir / dst_name
    
    # Cleanup previous runs
    print("Cleaning up previous runs...")
    from server.routers.projects import _get_registry_functions, _init_imports
    _init_imports()
    (_, unregister_project, _, _, _, _, _, _) = _get_registry_functions()
    unregister_project(src_name)
    unregister_project(dst_name)

    if src_path.exists(): shutil.rmtree(src_path)
    if dst_path.exists(): shutil.rmtree(dst_path)
    
    # 2. Create Project
    print(f"Creating project: {src_name}")
    try:
        await create_project(ProjectCreate(name=src_name, path=str(src_path)))
        
        from api.database import create_database, dispose_engine, get_database_url
        create_database(src_path)
        
        # Insert a dummy schedule to verify rename updates it
        from sqlalchemy import create_engine as create_engine_sqla, text
        db_url = get_database_url(src_path)
        engine = create_engine_sqla(db_url)
        with engine.connect() as conn:
            conn.execute(
                text("INSERT INTO schedules (project_name, start_time, duration_minutes, days_of_week, enabled, yolo_mode, max_concurrency, crash_count, created_at) VALUES (:name, '09:00', 60, 127, 1, 0, 3, 0, '2023-01-01')"),
                {"name": src_name}
            )
            conn.commit()
        engine.dispose()
        
        # We must dispose the engine to release locks before rename
        dispose_engine(src_path)
        
    except Exception as e:
        # Ignore already exists if cleanup failed
        print(f"Create/Init warning: {e}")

    # 3. Rename Project
    print(f"Renaming {src_name} -> {dst_name}")
    try:
        result = await rename_project_endpoint(src_name, ProjectRename(new_name=dst_name))
        print("Rename result:", result)
    except Exception as e:
        print(f"Rename FAILED: {e}")
        return

    # 4. Verify Filesystem
    if not dst_path.exists():
        print("FAIL: Destination path does not exist")
        return
    if src_path.exists():
        print("FAIL: Source path still exists")
        return
    print("Filesystem verification: PASS")

    # 5. Verify Internal DB (Schedules Table)
    from api.database import get_database_url
    from sqlalchemy import create_engine, text
    
    db_url = get_database_url(dst_path)
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT project_name FROM schedules")).scalar()
        if result == dst_name:
            print(f"DB verification: PASS (project_name={result})")
        else:
            print(f"DB verification: FAIL (project_name={result}, expected={dst_name})")
    engine.dispose()

    # 6. Cleanup
    print("Cleaning up...")
    await delete_project(dst_name, delete_files=True)
    print("Done.")

if __name__ == "__main__":
    asyncio.run(test_rename())
