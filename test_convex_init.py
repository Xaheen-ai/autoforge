"""
Test script for Convex initialization endpoint.

This script creates a test project and triggers Convex initialization.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
root = Path(__file__).parent
sys.path.insert(0, str(root))

from server.services.convex_init import initialize_convex_for_project, check_convex_initialized


async def test_convex_init():
    """Test Convex initialization for a project."""
    test_project_path = Path("/tmp/test-convex-project")
    test_project_name = "test-convex"
    
    # Clean up if exists
    if test_project_path.exists():
        import shutil
        shutil.rmtree(test_project_path)
    
    # Create test project directory
    test_project_path.mkdir(parents=True)
    
    print(f"Testing Convex initialization for: {test_project_name}")
    print(f"Project path: {test_project_path}")
    print()
    
    # Check if already initialized
    is_initialized = await check_convex_initialized(test_project_path)
    print(f"Already initialized: {is_initialized}")
    
    if not is_initialized:
        print("\nInitializing Convex...")
        try:
            result = await initialize_convex_for_project(
                test_project_path,
                test_project_name,
                auto_approve=True
            )
            print("\n✅ Convex initialization successful!")
            print(f"CONVEX_URL: {result['convex_url']}")
            print(f"Deployment: {result['convex_deployment']}")
            print(f"Project ID: {result['project_id']}")
            
            # Verify files were created
            print("\nVerifying files:")
            convex_dir = test_project_path / "convex"
            env_local = test_project_path / ".env.local"
            env_file = test_project_path / ".env"
            
            print(f"  convex/ directory: {'✅' if convex_dir.exists() else '❌'}")
            print(f"  .env.local: {'✅' if env_local.exists() else '❌'}")
            print(f"  .env: {'✅' if env_file.exists() else '❌'}")
            
            if convex_dir.exists():
                schema_files = list(convex_dir.glob("*.ts"))
                print(f"  Schema files: {len(schema_files)}")
                for f in schema_files:
                    print(f"    - {f.name}")
            
        except Exception as e:
            print(f"\n❌ Convex initialization failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("Convex is already initialized for this project.")


if __name__ == "__main__":
    asyncio.run(test_convex_init())
