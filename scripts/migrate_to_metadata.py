#!/usr/bin/env python3
"""
Metadata Migration Script
=========================

Migrates all existing projects to the new metadata structure by creating
.xaheen/ideation.md, context.json, roadmap.json, and kb/ directory.

Usage:
    python scripts/migrate_to_metadata.py [--dry-run] [--project PROJECT_NAME]

Options:
    --dry-run       Show what would be migrated without making changes
    --project NAME  Migrate only the specified project
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from registry import list_registered_projects, get_project_path


def create_metadata_files(project_dir: Path, dry_run: bool = False) -> list[str]:
    """
    Create metadata files for a project.
    
    Args:
        project_dir: Path to project directory
        dry_run: If True, don't actually create files
    
    Returns:
        List of created file paths (relative to project_dir)
    """
    xaheen_dir = project_dir / ".xaheen"
    created = []
    
    # Define metadata files and their default content
    files_to_create = {
        "ideation.md": "# Project Ideation\n\n## Initial Vision\n\n## Design Decisions\n\n## Future Ideas\n\n",
        "context.json": json.dumps({
            "techStack": {},
            "constraints": [],
            "conventions": {
                "fileNaming": "kebab-case",
                "componentStyle": "functional"
            }
        }, indent=2),
        "roadmap.json": json.dumps({
            "phases": [],
            "milestones": [],
            "currentPhase": None
        }, indent=2),
    }
    
    # Create .xaheen directory
    if not xaheen_dir.exists():
        if not dry_run:
            xaheen_dir.mkdir(parents=True, exist_ok=True)
        created.append(".xaheen/")
    
    # Create metadata files
    for filename, default_content in files_to_create.items():
        file_path = xaheen_dir / filename
        if not file_path.exists():
            if not dry_run:
                file_path.write_text(default_content, encoding="utf-8")
            created.append(f".xaheen/{filename}")
    
    # Create kb directory
    kb_dir = xaheen_dir / "kb"
    if not kb_dir.exists():
        if not dry_run:
            kb_dir.mkdir(parents=True, exist_ok=True)
            # Create initial KB files
            (kb_dir / "architecture.md").write_text(
                "# Architecture Decisions\n\n## Overview\n\n## Key Patterns\n\n",
                encoding="utf-8"
            )
            (kb_dir / "gotchas.md").write_text(
                "# Known Issues & Gotchas\n\n## Common Pitfalls\n\n## Workarounds\n\n",
                encoding="utf-8"
            )
        created.append(".xaheen/kb/")
        if not dry_run:
            created.append(".xaheen/kb/architecture.md")
            created.append(".xaheen/kb/gotchas.md")
    
    return created


def migrate_project(project_name: str, project_dir: Path, dry_run: bool = False) -> dict:
    """
    Migrate a single project.
    
    Returns:
        Dict with migration status and created files
    """
    print(f"{'[DRY RUN] ' if dry_run else ''}Migrating {project_name}...")
    
    try:
        created = create_metadata_files(project_dir, dry_run)
        
        if created:
            print(f"  ✓ Created {len(created)} items:")
            for item in created:
                print(f"    - {item}")
        else:
            print(f"  ℹ Already has metadata structure")
        
        return {
            "success": True,
            "project": project_name,
            "created": created
        }
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return {
            "success": False,
            "project": project_name,
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="Migrate projects to new metadata structure")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--project", type=str, help="Migrate only the specified project")
    args = parser.parse_args()
    
    print("=" * 60)
    print("AutoForge Metadata Migration")
    print("=" * 60)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN MODE - No files will be created\n")
    
    # Get projects to migrate
    all_projects = list_registered_projects()
    
    if args.project:
        if args.project not in all_projects:
            print(f"❌ Project '{args.project}' not found in registry")
            sys.exit(1)
        projects_to_migrate = {args.project: all_projects[args.project]}
    else:
        projects_to_migrate = all_projects
    
    print(f"Found {len(projects_to_migrate)} project(s) to migrate\n")
    
    # Migrate each project
    results = []
    for project_name, info in projects_to_migrate.items():
        project_dir = Path(info["path"])
        
        # Skip if path doesn't exist
        if not project_dir.exists():
            print(f"⚠️  Skipping {project_name}: directory not found at {project_dir}")
            continue
        
        result = migrate_project(project_name, project_dir, args.dry_run)
        results.append(result)
        print()
    
    # Summary
    print("=" * 60)
    print("Migration Summary")
    print("=" * 60)
    
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]
    
    print(f"✓ Successful: {len(successful)}")
    print(f"✗ Failed: {len(failed)}")
    
    if failed:
        print("\nFailed projects:")
        for result in failed:
            print(f"  - {result['project']}: {result['error']}")
    
    total_created = sum(len(r.get("created", [])) for r in successful)
    print(f"\nTotal items created: {total_created}")
    
    if args.dry_run:
        print("\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.")
    else:
        print("\n✅ Migration complete!")
    
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
