"""
Pre-Session Metadata Validation Hook
Ensures metadata files exist before agent starts work.
Auto-creates missing files with templates.
"""

from pathlib import Path
from typing import Dict, List
import json


def validate_metadata_exists(project_dir: Path) -> Dict[str, bool]:
    """
    Validate that required metadata files exist.
    Returns dict of {filename: exists}
    """
    xaheen_dir = project_dir / ".xaheen"
    
    required_files = {
        "ideation.md": xaheen_dir / "ideation.md",
        "context.json": xaheen_dir / "context.json",
        "roadmap.json": xaheen_dir / "roadmap.json",
        "kb/": xaheen_dir / "kb",
    }
    
    results = {}
    for name, path in required_files.items():
        results[name] = path.exists()
    
    return results


def create_missing_metadata(project_dir: Path) -> List[str]:
    """
    Auto-create missing metadata files with templates.
    Returns list of created files.
    """
    xaheen_dir = project_dir / ".xaheen"
    xaheen_dir.mkdir(parents=True, exist_ok=True)
    
    created = []
    
    # Create ideation.md if missing
    ideation_path = xaheen_dir / "ideation.md"
    if not ideation_path.exists():
        ideation_template = """# Project Ideation

## Vision
[Describe the project vision and goals]

## Key Ideas
- [Idea 1]
- [Idea 2]

## Design Decisions
- [Decision 1]
- [Decision 2]
"""
        ideation_path.write_text(ideation_template, encoding="utf-8")
        created.append("ideation.md")
    
    # Create context.json if missing
    context_path = xaheen_dir / "context.json"
    if not context_path.exists():
        context_template = {
            "techStack": {},
            "constraints": [],
            "conventions": {},
            "environment": {}
        }
        context_path.write_text(json.dumps(context_template, indent=2), encoding="utf-8")
        created.append("context.json")
    
    # Create roadmap.json if missing
    roadmap_path = xaheen_dir / "roadmap.json"
    if not roadmap_path.exists():
        roadmap_template = {
            "phases": [],
            "milestones": [],
            "currentPhase": None
        }
        roadmap_path.write_text(json.dumps(roadmap_template, indent=2), encoding="utf-8")
        created.append("roadmap.json")
    
    # Create kb/ directory if missing
    kb_dir = xaheen_dir / "kb"
    if not kb_dir.exists():
        kb_dir.mkdir(parents=True)
        # Create initial KB items
        (kb_dir / "architecture.md").write_text("# Architecture\n\n[Document system architecture]\n", encoding="utf-8")
        (kb_dir / "gotchas.md").write_text("# Common Gotchas\n\n[Document known issues and workarounds]\n", encoding="utf-8")
        created.append("kb/")
    
    return created


def pre_session_hook(project_dir: Path) -> bool:
    """
    Hook that runs before agent session starts.
    Returns True if session can proceed, False otherwise.
    """
    validation = validate_metadata_exists(project_dir)
    
    # Auto-create missing files
    missing = [k for k, v in validation.items() if not v]
    if missing:
        created = create_missing_metadata(project_dir)
        print(f"✓ Created missing metadata: {', '.join(created)}")
    
    # Always return True (we auto-create)
    return True
