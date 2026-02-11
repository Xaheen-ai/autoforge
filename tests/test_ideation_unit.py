"""
Unit Tests for Ideation Manager
=================================

Tests the IdeationManager service in isolation.
"""

import pytest
import json
from pathlib import Path
from datetime import datetime
from server.services.ideation import IdeationManager


@pytest.fixture
def temp_project_dir(tmp_path):
    """Create a temporary project directory."""
    project_dir = tmp_path / "test_project"
    project_dir.mkdir()
    return project_dir


@pytest.fixture
def ideation_manager(temp_project_dir):
    """Create an IdeationManager instance."""
    return IdeationManager(temp_project_dir)


@pytest.fixture
def sample_idea():
    """Create a sample idea."""
    return {
        'id': 'idea_1234',
        'title': 'Add TypeScript types',
        'description': 'Improve type safety',
        'category': 'refactor',
        'priority': 'medium',
        'effort': 'medium',
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'saved': False
    }


def test_ideation_directory_created(ideation_manager, temp_project_dir):
    """Test that ideation directory is created."""
    assert (temp_project_dir / ".claude" / "ideation").exists()


def test_get_saved_ideas_empty(ideation_manager):
    """Test getting ideas when none exist."""
    ideas = ideation_manager.get_saved_ideas()
    assert ideas == []


def test_save_idea(ideation_manager, sample_idea):
    """Test saving an idea."""
    success = ideation_manager.save_idea(sample_idea)
    assert success is True
    
    # Verify idea was saved
    ideas = ideation_manager.get_saved_ideas()
    assert len(ideas) == 1
    assert ideas[0]['id'] == sample_idea['id']
    assert ideas[0]['saved'] is True
    assert 'saved_at' in ideas[0]


def test_save_duplicate_idea(ideation_manager, sample_idea):
    """Test that saving the same idea twice doesn't create duplicates."""
    ideation_manager.save_idea(sample_idea)
    ideation_manager.save_idea(sample_idea)
    
    ideas = ideation_manager.get_saved_ideas()
    assert len(ideas) == 1


def test_delete_idea(ideation_manager, sample_idea):
    """Test deleting an idea."""
    ideation_manager.save_idea(sample_idea)
    
    success = ideation_manager.delete_idea(sample_idea['id'])
    assert success is True
    
    ideas = ideation_manager.get_saved_ideas()
    assert len(ideas) == 0


def test_delete_nonexistent_idea(ideation_manager):
    """Test deleting an idea that doesn't exist."""
    success = ideation_manager.delete_idea('nonexistent_id')
    assert success is True  # Should succeed without error


def test_update_idea(ideation_manager, sample_idea):
    """Test updating an idea."""
    ideation_manager.save_idea(sample_idea)
    
    updates = {'priority': 'high', 'title': 'Updated title'}
    success = ideation_manager.update_idea(sample_idea['id'], updates)
    assert success is True
    
    ideas = ideation_manager.get_saved_ideas()
    assert ideas[0]['priority'] == 'high'
    assert ideas[0]['title'] == 'Updated title'
    assert 'updated_at' in ideas[0]


def test_get_idea_stats_empty(ideation_manager):
    """Test getting stats when no ideas exist."""
    stats = ideation_manager.get_idea_stats()
    assert stats['total'] == 0
    assert stats['by_category'] == {}
    assert stats['by_priority'] == {}
    assert stats['by_effort'] == {}


def test_get_idea_stats(ideation_manager):
    """Test getting idea statistics."""
    ideas = [
        {
            'id': 'idea_1',
            'title': 'Idea 1',
            'description': 'Test',
            'category': 'feature',
            'priority': 'high',
            'effort': 'small',
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'saved': True
        },
        {
            'id': 'idea_2',
            'title': 'Idea 2',
            'description': 'Test',
            'category': 'feature',
            'priority': 'medium',
            'effort': 'large',
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'saved': True
        },
        {
            'id': 'idea_3',
            'title': 'Idea 3',
            'description': 'Test',
            'category': 'refactor',
            'priority': 'high',
            'effort': 'small',
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'saved': True
        }
    ]
    
    for idea in ideas:
        ideation_manager.save_idea(idea)
    
    stats = ideation_manager.get_idea_stats()
    assert stats['total'] == 3
    assert stats['by_category']['feature'] == 2
    assert stats['by_category']['refactor'] == 1
    assert stats['by_priority']['high'] == 2
    assert stats['by_priority']['medium'] == 1
    assert stats['by_effort']['small'] == 2
    assert stats['by_effort']['large'] == 1


def test_ideas_persistence(temp_project_dir, sample_idea):
    """Test that ideas persist across manager instances."""
    # Save idea with first manager
    manager1 = IdeationManager(temp_project_dir)
    manager1.save_idea(sample_idea)
    
    # Load with new manager
    manager2 = IdeationManager(temp_project_dir)
    ideas = manager2.get_saved_ideas()
    
    assert len(ideas) == 1
    assert ideas[0]['id'] == sample_idea['id']
