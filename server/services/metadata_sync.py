"""
Background Metadata Sync Service
Syncs metadata from file system to Convex for cross-project analytics.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional
import time

from convex import ConvexClient


class MetadataSyncService:
    """Background service for syncing metadata to Convex."""
    
    def __init__(self, convex_url: str, projects_dir: Path):
        self.client = ConvexClient(convex_url)
        self.projects_dir = projects_dir
        self.sync_interval = 60  # seconds
        
    async def sync_project(self, project_name: str, project_path: Path) -> dict:
        """Sync all metadata for a single project."""
        xaheen_dir = project_path / ".xaheen"
        if not xaheen_dir.exists():
            return {"skipped": True, "reason": "no .xaheen directory"}
        
        results = {}
        
        # Sync ideation
        ideation_path = xaheen_dir / "ideation.md"
        if ideation_path.exists():
            content = ideation_path.read_text(encoding="utf-8")
            last_modified = int(ideation_path.stat().st_mtime * 1000)
            
            await self.client.mutation(
                "metadata:syncIdeation",
                {
                    "projectName": project_name,
                    "content": content,
                    "lastModified": last_modified,
                }
            )
            results["ideation"] = "synced"
        
        # Sync context
        context_path = xaheen_dir / "context.json"
        if context_path.exists():
            context = json.loads(context_path.read_text(encoding="utf-8"))
            last_modified = int(context_path.stat().st_mtime * 1000)
            
            await self.client.mutation(
                "metadata:syncContext",
                {
                    "projectName": project_name,
                    "context": context,
                    "lastModified": last_modified,
                }
            )
            results["context"] = "synced"
        
        # Sync roadmap
        roadmap_path = xaheen_dir / "roadmap.json"
        if roadmap_path.exists():
            roadmap = json.loads(roadmap_path.read_text(encoding="utf-8"))
            last_modified = int(roadmap_path.stat().st_mtime * 1000)
            
            await self.client.mutation(
                "metadata:syncRoadmap",
                {
                    "projectName": project_name,
                    "roadmap": roadmap,
                    "lastModified": last_modified,
                }
            )
            results["roadmap"] = "synced"
        
        # Sync knowledge base
        kb_dir = xaheen_dir / "kb"
        if kb_dir.exists() and kb_dir.is_dir():
            kb_items = []
            for md_file in kb_dir.glob("*.md"):
                content = md_file.read_text(encoding="utf-8")
                last_modified = int(md_file.stat().st_mtime * 1000)
                
                await self.client.mutation(
                    "metadata:syncKnowledgeItem",
                    {
                        "projectName": project_name,
                        "filename": md_file.name,
                        "content": content,
                        "lastModified": last_modified,
                    }
                )
                kb_items.append(md_file.name)
            
            results["knowledge"] = kb_items
        
        return results
    
    async def sync_all_projects(self) -> dict:
        """Sync metadata for all projects."""
        if not self.projects_dir.exists():
            return {"error": "projects directory not found"}
        
        results = {}
        for project_dir in self.projects_dir.iterdir():
            if project_dir.is_dir() and not project_dir.name.startswith('.'):
                try:
                    project_results = await self.sync_project(project_dir.name, project_dir)
                    results[project_dir.name] = project_results
                except Exception as e:
                    results[project_dir.name] = {"error": str(e)}
        
        return results
    
    async def run_continuous_sync(self):
        """Run continuous background sync."""
        print(f"[MetadataSync] Starting continuous sync (interval: {self.sync_interval}s)")
        
        while True:
            try:
                start_time = time.time()
                results = await self.sync_all_projects()
                elapsed = time.time() - start_time
                
                synced_count = sum(1 for r in results.values() if not r.get("skipped") and not r.get("error"))
                print(f"[MetadataSync] Synced {synced_count} projects in {elapsed:.2f}s")
                
            except Exception as e:
                print(f"[MetadataSync] Error during sync: {e}")
            
            await asyncio.sleep(self.sync_interval)


async def main():
    """Run the metadata sync service."""
    convex_url = os.getenv("CONVEX_URL")
    if not convex_url:
        print("Error: CONVEX_URL environment variable not set")
        return
    
    projects_dir = Path(__file__).parent.parent / "projects"
    service = MetadataSyncService(convex_url, projects_dir)
    
    await service.run_continuous_sync()


if __name__ == "__main__":
    asyncio.run(main())
