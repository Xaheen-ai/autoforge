"""
Roadmap Manager Service
========================

Manages AI-generated project roadmaps and feature tracking.
"""

from pathlib import Path
from typing import List, Dict, Any
import json
from datetime import datetime, UTC


class RoadmapManager:
    """Manages project roadmap and feature planning."""
    
    def __init__(self, project_dir: Path):
        """
        Initialize roadmap manager.
        
        Args:
            project_dir: Path to project directory
        """
        self.project_dir = project_dir
        self.roadmap_dir = project_dir / ".claude" / "roadmap"
        self.roadmap_file = self.roadmap_dir / "roadmap.json"
        
        # Ensure directory exists
        self.roadmap_dir.mkdir(parents=True, exist_ok=True)
    
    def get_roadmap(self) -> Dict[str, Any]:
        """
        Get current roadmap.
        
        Returns:
            Roadmap dictionary with features and milestones
        """
        if not self.roadmap_file.exists():
            return {
                'features': [],
                'milestones': [],
                'generated_at': None,
                'total_estimated_days': 0
            }
        
        try:
            with open(self.roadmap_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {
                'features': [],
                'milestones': [],
                'generated_at': None,
                'total_estimated_days': 0
            }
    
    def save_roadmap(self, roadmap: Dict[str, Any]) -> bool:
        """
        Save roadmap.
        
        Args:
            roadmap: Roadmap dictionary to save
            
        Returns:
            True if successful
        """
        try:
            roadmap['updated_at'] = datetime.now(UTC).isoformat() + 'Z'
            
            with open(self.roadmap_file, 'w', encoding='utf-8') as f:
                json.dump(roadmap, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving roadmap: {e}")
            return False
    
    def update_feature_status(self, feature_id: str, status: str) -> bool:
        """
        Update feature status.
        
        Args:
            feature_id: ID of feature to update
            status: New status ('planned', 'in-progress', 'completed')
            
        Returns:
            True if successful
        """
        try:
            roadmap = self.get_roadmap()
            
            for feature in roadmap.get('features', []):
                if feature['id'] == feature_id:
                    feature['status'] = status
                    feature['status_updated_at'] = datetime.now(UTC).isoformat() + 'Z'
                    break
            
            return self.save_roadmap(roadmap)
        except Exception as e:
            print(f"Error updating feature status: {e}")
            return False
    
    def update_feature(self, feature_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update feature details.
        
        Args:
            feature_id: ID of feature to update
            updates: Dictionary of fields to update
            
        Returns:
            True if successful
        """
        try:
            roadmap = self.get_roadmap()
            
            for feature in roadmap.get('features', []):
                if feature['id'] == feature_id:
                    feature.update(updates)
                    feature['updated_at'] = datetime.now(UTC).isoformat() + 'Z'
                    break
            
            return self.save_roadmap(roadmap)
        except Exception as e:
            print(f"Error updating feature: {e}")
            return False
    
    def add_feature(self, feature: Dict[str, Any]) -> bool:
        """
        Add a new feature to roadmap.
        
        Args:
            feature: Feature dictionary to add
            
        Returns:
            True if successful
        """
        try:
            roadmap = self.get_roadmap()
            
            feature['created_at'] = datetime.now(UTC).isoformat() + 'Z'
            roadmap['features'].append(feature)
            
            # Recalculate total estimated days
            roadmap['total_estimated_days'] = sum(
                f.get('estimated_days', 0) for f in roadmap['features']
            )
            
            return self.save_roadmap(roadmap)
        except Exception as e:
            print(f"Error adding feature: {e}")
            return False
    
    def delete_feature(self, feature_id: str) -> bool:
        """
        Delete a feature from roadmap.
        
        Args:
            feature_id: ID of feature to delete
            
        Returns:
            True if successful
        """
        try:
            roadmap = self.get_roadmap()
            
            roadmap['features'] = [
                f for f in roadmap['features'] if f['id'] != feature_id
            ]
            
            # Recalculate total estimated days
            roadmap['total_estimated_days'] = sum(
                f.get('estimated_days', 0) for f in roadmap['features']
            )
            
            return self.save_roadmap(roadmap)
        except Exception as e:
            print(f"Error deleting feature: {e}")
            return False
    
    def get_roadmap_stats(self) -> Dict[str, Any]:
        """
        Get roadmap statistics.
        
        Returns:
            Dictionary with roadmap statistics
        """
        roadmap = self.get_roadmap()
        features = roadmap.get('features', [])
        
        stats = {
            'total_features': len(features),
            'by_status': {
                'planned': 0,
                'in-progress': 0,
                'completed': 0
            },
            'by_effort': {
                'small': 0,
                'medium': 0,
                'large': 0
            },
            'total_estimated_days': roadmap.get('total_estimated_days', 0),
            'milestones': len(roadmap.get('milestones', []))
        }
        
        for feature in features:
            status = feature.get('status', 'planned')
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            
            effort = feature.get('effort', 'medium')
            stats['by_effort'][effort] = stats['by_effort'].get(effort, 0) + 1
        
        return stats
    
    def export_roadmap(self, format: str = 'markdown') -> str:
        """
        Export roadmap in specified format.
        
        Args:
            format: Export format ('markdown', 'json', 'csv')
            
        Returns:
            Formatted roadmap string
        """
        roadmap = self.get_roadmap()
        
        if format == 'json':
            return json.dumps(roadmap, indent=2)
        
        elif format == 'markdown':
            return self._export_markdown(roadmap)
        
        elif format == 'csv':
            return self._export_csv(roadmap)
        
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _export_markdown(self, roadmap: Dict[str, Any]) -> str:
        """Export roadmap as markdown."""
        lines = [
            "# Project Roadmap",
            "",
            f"Generated: {roadmap.get('generated_at', 'N/A')}",
            f"Total Estimated Days: {roadmap.get('total_estimated_days', 0)}",
            "",
            "## Milestones",
            ""
        ]
        
        for milestone in roadmap.get('milestones', []):
            lines.append(f"### {milestone['name']} - {milestone['target_date']}")
            lines.append(f"Features: {milestone['features']}")
            lines.append("")
        
        lines.extend(["", "## Features", ""])
        
        for feature in roadmap.get('features', []):
            status_emoji = {
                'planned': '📋',
                'in-progress': '🚧',
                'completed': '✅'
            }.get(feature.get('status', 'planned'), '📋')
            
            lines.append(f"### {status_emoji} {feature['title']}")
            lines.append(f"**Status**: {feature.get('status', 'planned')}")
            lines.append(f"**Priority**: {feature.get('priority', 'N/A')}")
            lines.append(f"**Effort**: {feature.get('effort', 'N/A')}")
            lines.append(f"**Estimated Days**: {feature.get('estimated_days', 0)}")
            lines.append(f"**Milestone**: {feature.get('milestone', 'N/A')}")
            lines.append("")
            lines.append(feature.get('description', ''))
            lines.append("")
        
        return "\n".join(lines)
    
    def _export_csv(self, roadmap: Dict[str, Any]) -> str:
        """Export roadmap as CSV."""
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'ID', 'Title', 'Description', 'Status', 'Priority',
            'Effort', 'Estimated Days', 'Milestone'
        ])
        
        # Features
        for feature in roadmap.get('features', []):
            writer.writerow([
                feature.get('id', ''),
                feature.get('title', ''),
                feature.get('description', ''),
                feature.get('status', 'planned'),
                feature.get('priority', ''),
                feature.get('effort', ''),
                feature.get('estimated_days', 0),
                feature.get('milestone', '')
            ])
        
        return output.getvalue()
