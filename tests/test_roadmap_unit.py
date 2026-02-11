"""
Unit Tests for Roadmap Manager
================================

Tests the RoadmapManager service in isolation.
"""

import pytest
import json
from pathlib import Path
from datetime import datetime
from server.services.roadmap import RoadmapManager


@pytest.fixture
def temp_project_dir(tmp_path):
    """Create a temporary project directory."""
    project_dir = tmp_path / "test_project"
    project_dir.mkdir()
    return project_dir


@pytest.fixture
def roadmap_manager(temp_project_dir):
    """Create a RoadmapManager instance."""
    return RoadmapManager(temp_project_dir)


@pytest.fixture
def sample_roadmap():
    """Create a sample roadmap."""
    return {
        'features': [
            {
                'id': 'feature_1',
                'title': 'User Authentication',
                'description': 'Add JWT auth',
                'priority': 1,
                'effort': 'large',
                'status': 'planned',
                'dependencies': [],
                'milestone': 'Q1 2026',
                'estimated_days': 10
            },
            {
                'id': 'feature_2',
                'title': 'Admin Dashboard',
                'description': 'Build admin UI',
                'priority': 2,
                'effort': 'medium',
                'status': 'planned',
                'dependencies': ['feature_1'],
                'milestone': 'Q1 2026',
                'estimated_days': 7
            }
        ],
        'milestones': [
            {
                'name': 'Q1 2026',
                'target_date': '2026-03-31',
                'features': 2
            }
        ],
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'total_estimated_days': 17
    }


def test_roadmap_directory_created(roadmap_manager, temp_project_dir):
    """Test that roadmap directory is created."""
    assert (temp_project_dir / ".claude" / "roadmap").exists()


def test_get_roadmap_empty(roadmap_manager):
    """Test getting roadmap when none exists."""
    roadmap = roadmap_manager.get_roadmap()
    assert roadmap['features'] == []
    assert roadmap['milestones'] == []
    assert roadmap['generated_at'] is None
    assert roadmap['total_estimated_days'] == 0


def test_save_roadmap(roadmap_manager, sample_roadmap):
    """Test saving a roadmap."""
    success = roadmap_manager.save_roadmap(sample_roadmap)
    assert success is True
    
    # Verify roadmap was saved
    roadmap = roadmap_manager.get_roadmap()
    assert len(roadmap['features']) == 2
    assert len(roadmap['milestones']) == 1
    assert 'updated_at' in roadmap


def test_update_feature_status(roadmap_manager, sample_roadmap):
    """Test updating feature status."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    success = roadmap_manager.update_feature_status('feature_1', 'in-progress')
    assert success is True
    
    roadmap = roadmap_manager.get_roadmap()
    feature = next(f for f in roadmap['features'] if f['id'] == 'feature_1')
    assert feature['status'] == 'in-progress'
    assert 'status_updated_at' in feature


def test_update_feature(roadmap_manager, sample_roadmap):
    """Test updating feature details."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    updates = {
        'title': 'Updated Title',
        'estimated_days': 15
    }
    success = roadmap_manager.update_feature('feature_1', updates)
    assert success is True
    
    roadmap = roadmap_manager.get_roadmap()
    feature = next(f for f in roadmap['features'] if f['id'] == 'feature_1')
    assert feature['title'] == 'Updated Title'
    assert feature['estimated_days'] == 15
    assert 'updated_at' in feature


def test_add_feature(roadmap_manager, sample_roadmap):
    """Test adding a new feature."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    new_feature = {
        'id': 'feature_3',
        'title': 'New Feature',
        'description': 'Test feature',
        'priority': 3,
        'effort': 'small',
        'status': 'planned',
        'dependencies': [],
        'milestone': 'Q2 2026',
        'estimated_days': 5
    }
    
    success = roadmap_manager.add_feature(new_feature)
    assert success is True
    
    roadmap = roadmap_manager.get_roadmap()
    assert len(roadmap['features']) == 3
    assert roadmap['total_estimated_days'] == 22  # 17 + 5
    
    feature = next(f for f in roadmap['features'] if f['id'] == 'feature_3')
    assert 'created_at' in feature


def test_delete_feature(roadmap_manager, sample_roadmap):
    """Test deleting a feature."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    success = roadmap_manager.delete_feature('feature_1')
    assert success is True
    
    roadmap = roadmap_manager.get_roadmap()
    assert len(roadmap['features']) == 1
    assert roadmap['total_estimated_days'] == 7  # Only feature_2 remains


def test_get_roadmap_stats(roadmap_manager, sample_roadmap):
    """Test getting roadmap statistics."""
    # Modify sample to have different statuses
    sample_roadmap['features'][0]['status'] = 'completed'
    sample_roadmap['features'][1]['status'] = 'in-progress'
    roadmap_manager.save_roadmap(sample_roadmap)
    
    stats = roadmap_manager.get_roadmap_stats()
    assert stats['total_features'] == 2
    assert stats['by_status']['completed'] == 1
    assert stats['by_status']['in-progress'] == 1
    assert stats['by_status']['planned'] == 0
    assert stats['by_effort']['large'] == 1
    assert stats['by_effort']['medium'] == 1
    assert stats['total_estimated_days'] == 17
    assert stats['milestones'] == 1


def test_export_markdown(roadmap_manager, sample_roadmap):
    """Test exporting roadmap as markdown."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    markdown = roadmap_manager.export_roadmap('markdown')
    assert '# Project Roadmap' in markdown
    assert 'User Authentication' in markdown
    assert 'Admin Dashboard' in markdown
    assert 'Q1 2026' in markdown


def test_export_json(roadmap_manager, sample_roadmap):
    """Test exporting roadmap as JSON."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    json_str = roadmap_manager.export_roadmap('json')
    data = json.loads(json_str)
    assert len(data['features']) == 2
    assert len(data['milestones']) == 1


def test_export_csv(roadmap_manager, sample_roadmap):
    """Test exporting roadmap as CSV."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    csv = roadmap_manager.export_roadmap('csv')
    lines = csv.strip().split('\n')
    assert len(lines) == 3  # Header + 2 features
    assert 'ID,Title,Description' in lines[0]
    assert 'feature_1' in csv
    assert 'feature_2' in csv


def test_export_invalid_format(roadmap_manager, sample_roadmap):
    """Test exporting with invalid format."""
    roadmap_manager.save_roadmap(sample_roadmap)
    
    with pytest.raises(ValueError):
        roadmap_manager.export_roadmap('invalid_format')


def test_roadmap_persistence(temp_project_dir, sample_roadmap):
    """Test that roadmap persists across manager instances."""
    # Save roadmap with first manager
    manager1 = RoadmapManager(temp_project_dir)
    manager1.save_roadmap(sample_roadmap)
    
    # Load with new manager
    manager2 = RoadmapManager(temp_project_dir)
    roadmap = manager2.get_roadmap()
    
    assert len(roadmap['features']) == 2
    assert len(roadmap['milestones']) == 1
