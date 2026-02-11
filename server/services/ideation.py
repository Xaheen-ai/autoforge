"""
Ideation Manager Service
=========================

Manages saved ideas with CRUD operations.
"""

from pathlib import Path
from typing import List, Dict, Any
import json
from datetime import datetime, UTC


class IdeationManager:
    """Manages project ideation and improvement suggestions."""
    
    def __init__(self, project_dir: Path):
        """
        Initialize ideation manager.
        
        Args:
            project_dir: Path to project directory
        """
        self.project_dir = project_dir
        self.ideation_dir = project_dir / ".claude" / "ideation"
        self.ideas_file = self.ideation_dir / "ideas.json"
        
        # Ensure directory exists
        self.ideation_dir.mkdir(parents=True, exist_ok=True)
    
    def get_saved_ideas(self) -> List[Dict[str, Any]]:
        """
        Get all saved ideas.
        
        Returns:
            List of saved idea dictionaries
        """
        if not self.ideas_file.exists():
            return []
        
        try:
            with open(self.ideas_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('ideas', [])
        except Exception:
            return []
    
    def save_idea(self, idea: Dict[str, Any]) -> bool:
        """
        Save an idea.
        
        Args:
            idea: Idea dictionary to save
            
        Returns:
            True if successful
        """
        try:
            # Get existing ideas
            ideas = self.get_saved_ideas()
            
            # Mark as saved and add timestamp
            idea['saved'] = True
            idea['saved_at'] = datetime.now(UTC).isoformat() + 'Z'
            
            # Check for duplicates by ID or title+description
            idea_title = idea.get('title', '').lower().strip()
            idea_desc = idea.get('description', '').lower().strip()
            
            for existing in ideas:
                # Check by ID
                if existing.get('id') == idea.get('id'):
                    print(f"⚠️  Skipping duplicate idea (same ID): {idea.get('title')}")
                    return True
                
                # Check by title and description similarity
                existing_title = existing.get('title', '').lower().strip()
                existing_desc = existing.get('description', '').lower().strip()
                
                if idea_title == existing_title and idea_desc == existing_desc:
                    print(f"⚠️  Skipping duplicate idea (same content): {idea.get('title')}")
                    return True
            
            # Add new idea
            ideas.append(idea)
            
            # Save to file
            with open(self.ideas_file, 'w', encoding='utf-8') as f:
                json.dump({'ideas': ideas}, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving idea: {e}")
            return False
    
    def delete_idea(self, idea_id: str) -> bool:
        """
        Delete a saved idea.
        
        Args:
            idea_id: ID of idea to delete
            
        Returns:
            True if successful
        """
        try:
            ideas = self.get_saved_ideas()
            ideas = [i for i in ideas if i['id'] != idea_id]
            
            with open(self.ideas_file, 'w', encoding='utf-8') as f:
                json.dump({'ideas': ideas}, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error deleting idea: {e}")
            return False
    
    def update_idea(self, idea_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update an existing idea.
        
        Args:
            idea_id: ID of idea to update
            updates: Dictionary of fields to update
            
        Returns:
            True if successful
        """
        try:
            ideas = self.get_saved_ideas()
            
            for idea in ideas:
                if idea['id'] == idea_id:
                    idea.update(updates)
                    idea['updated_at'] = datetime.now(UTC).isoformat() + 'Z'
                    break
            
            with open(self.ideas_file, 'w', encoding='utf-8') as f:
                json.dump({'ideas': ideas}, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error updating idea: {e}")
            return False
    
    def get_idea_stats(self) -> Dict[str, Any]:
        """
        Get statistics about saved ideas.
        
        Returns:
            Dictionary with idea statistics
        """
        ideas = self.get_saved_ideas()
        
        stats = {
            'total': len(ideas),
            'by_category': {},
            'by_priority': {},
            'by_effort': {}
        }
        
        for idea in ideas:
            # Count by category
            category = idea.get('category', 'unknown')
            stats['by_category'][category] = stats['by_category'].get(category, 0) + 1
            
            # Count by priority
            priority = idea.get('priority', 'unknown')
            stats['by_priority'][priority] = stats['by_priority'].get(priority, 0) + 1
            
            # Count by effort
            effort = idea.get('effort', 'unknown')
            stats['by_effort'][effort] = stats['by_effort'].get(effort, 0) + 1
        
        return stats
