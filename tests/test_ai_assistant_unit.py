"""
Unit Tests for AI Assistant
============================

Tests the AIAssistant service with mock responses.
"""

import pytest
from server.services.ai_assistant import AIAssistant


@pytest.fixture
def ai_assistant():
    """Create an AIAssistant instance with mock enabled."""
    return AIAssistant(use_mock=True)


@pytest.fixture
def sample_codebase_analysis():
    """Create sample codebase analysis."""
    return {
        'total_files': 75,
        'languages': {
            'Python': 30,
            'TypeScript': 25,
            'JavaScript': 15,
            'CSS': 5
        },
        'structure': {
            'directories': ['src', 'server', 'tests'],
            'key_files': [
                {'path': 'README.md', 'language': 'Markdown', 'lines': 100}
            ]
        }
    }


@pytest.fixture
def sample_context(sample_codebase_analysis):
    """Create sample project context."""
    return {
        'codebase_analysis': sample_codebase_analysis,
        'notes': 'Test project notes',
        'config': {
            'include_codebase_structure': True,
            'include_dependencies': True
        }
    }


def test_analyze_codebase(ai_assistant, sample_codebase_analysis):
    """Test codebase analysis."""
    result = ai_assistant.analyze_codebase(sample_codebase_analysis)
    
    assert 'insights' in result
    assert 'analyzed_at' in result
    assert isinstance(result['insights'], list)


def test_analyze_codebase_large_project(ai_assistant):
    """Test analysis of large project."""
    analysis = {
        'total_files': 150,
        'languages': {'Python': 100, 'TypeScript': 50}
    }
    
    result = ai_assistant.analyze_codebase(analysis)
    insights = result['insights']
    
    # Should suggest modularization for large projects
    assert any('modularization' in insight.get('description', '').lower() 
               for insight in insights)


def test_generate_ideas(ai_assistant, sample_context):
    """Test idea generation."""
    ideas = ai_assistant.generate_ideas(sample_context)
    
    assert isinstance(ideas, list)
    assert len(ideas) > 0
    
    # Check idea structure
    for idea in ideas:
        assert 'id' in idea
        assert 'title' in idea
        assert 'description' in idea
        assert 'category' in idea
        assert 'priority' in idea
        assert 'effort' in idea
        assert 'created_at' in idea
        assert 'saved' in idea


def test_generate_ideas_typescript_project(ai_assistant):
    """Test idea generation for TypeScript project."""
    context = {
        'codebase_analysis': {
            'languages': {'TypeScript': 50, 'JavaScript': 20}
        }
    }
    
    ideas = ai_assistant.generate_ideas(context)
    
    # Should include TypeScript-specific ideas
    assert any('TypeScript' in idea['title'] or 'TypeScript' in idea['description']
               for idea in ideas)


def test_generate_ideas_python_project(ai_assistant):
    """Test idea generation for Python project."""
    context = {
        'codebase_analysis': {
            'languages': {'Python': 80}
        }
    }
    
    ideas = ai_assistant.generate_ideas(context)
    
    # Should include Python-specific ideas
    assert any('Python' in idea['title'] or 'type hints' in idea['description'].lower()
               for idea in ideas)


def test_generate_roadmap(ai_assistant, sample_context):
    """Test roadmap generation."""
    roadmap = ai_assistant.generate_roadmap(sample_context)
    
    assert 'features' in roadmap
    assert 'milestones' in roadmap
    assert 'generated_at' in roadmap
    assert 'total_estimated_days' in roadmap
    
    assert isinstance(roadmap['features'], list)
    assert isinstance(roadmap['milestones'], list)
    assert len(roadmap['features']) > 0
    assert len(roadmap['milestones']) > 0


def test_roadmap_feature_structure(ai_assistant, sample_context):
    """Test roadmap feature structure."""
    roadmap = ai_assistant.generate_roadmap(sample_context)
    
    for feature in roadmap['features']:
        assert 'id' in feature
        assert 'title' in feature
        assert 'description' in feature
        assert 'priority' in feature
        assert 'effort' in feature
        assert 'status' in feature
        assert 'dependencies' in feature
        assert 'milestone' in feature
        assert 'estimated_days' in feature


def test_roadmap_milestone_structure(ai_assistant, sample_context):
    """Test roadmap milestone structure."""
    roadmap = ai_assistant.generate_roadmap(sample_context)
    
    for milestone in roadmap['milestones']:
        assert 'name' in milestone
        assert 'target_date' in milestone
        assert 'features' in milestone


def test_prioritize_features(ai_assistant):
    """Test feature prioritization."""
    features = [
        {'id': '1', 'priority': 3, 'effort': 'large'},
        {'id': '2', 'priority': 1, 'effort': 'small'},
        {'id': '3', 'priority': 2, 'effort': 'medium'},
    ]
    
    prioritized = ai_assistant.prioritize_features(features)
    
    assert len(prioritized) == 3
    # Should be sorted by priority
    assert prioritized[0]['priority'] <= prioritized[1]['priority']


def test_real_api_not_implemented(ai_assistant):
    """Test that real API raises NotImplementedError."""
    ai_assistant.use_mock = False
    
    with pytest.raises(NotImplementedError):
        ai_assistant.generate_ideas({})
    
    with pytest.raises(NotImplementedError):
        ai_assistant.generate_roadmap({})
    
    with pytest.raises(NotImplementedError):
        ai_assistant.analyze_codebase({})
