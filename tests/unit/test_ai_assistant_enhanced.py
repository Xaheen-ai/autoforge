"""
Unit Tests for Enhanced AI Assistant
====================================

Tests for the enhanced generate_ideas() and generate_roadmap() methods.
"""

import pytest
from server.services.ai_assistant import AIAssistant


class TestAIAssistantEnhanced:
    """Test suite for enhanced AI Assistant functionality."""
    
    def test_generate_ideas_with_comprehensive_context(self):
        """Test that generate_ideas uses comprehensive context."""
        ai = AIAssistant(use_mock=True)  # Use mock for testing
        
        context = {
            'project_name': 'test-project',
            'project_structure': {
                'total_files': 50,
                'languages': {'Python': 20, 'TypeScript': 30}
            },
            'readme': '# Test Project\\n\\nA test project for AutoForge.',
            'dependencies': {
                'node': {
                    'dependencies': ['react', 'typescript'],
                    'devDependencies': ['vite']
                }
            },
            'notes': 'Test notes',
            'git_history': 'Recent commits...'
        }
        
        ideas = ai.generate_ideas(context)
        
        # Verify ideas structure
        assert isinstance(ideas, list)
        assert len(ideas) >= 5  # Should generate at least 5 ideas
        
        # Verify each idea has required fields
        for idea in ideas:
            assert 'id' in idea
            assert 'title' in idea
            assert 'description' in idea
            assert 'category' in idea
            assert 'priority' in idea
            assert 'effort' in idea
            assert 'created_at' in idea
            assert 'saved' in idea
    
    def test_generate_roadmap_with_comprehensive_context(self):
        """Test that generate_roadmap uses comprehensive context."""
        ai = AIAssistant(use_mock=True)
        
        context = {
            'project_name': 'test-project',
            'timeframe': '6_months',
            'project_structure': {
                'total_files': 50,
                'languages': {'Python': 20, 'TypeScript': 30}
            },
            'readme': '# Test Project\\n\\nA test project.',
            'dependencies': {},
            'notes': 'Test notes'
        }
        
        roadmap = ai.generate_roadmap(context)
        
        # Verify roadmap structure
        assert isinstance(roadmap, dict)
        assert 'milestones' in roadmap
        assert isinstance(roadmap['milestones'], list)
        assert len(roadmap['milestones']) > 0
        
        # Verify milestone structure
        for milestone in roadmap['milestones']:
            assert 'quarter' in milestone
            assert 'features' in milestone
            assert isinstance(milestone['features'], list)
            
            # Verify feature structure
            for feature in milestone['features']:
                assert 'id' in feature
                assert 'title' in feature
                assert 'description' in feature
                assert 'effort' in feature
                assert 'priority' in feature
                assert 'status' in feature
                assert 'dependencies' in feature
    
    def test_generate_ideas_validation(self):
        """Test that generate_ideas validates minimum output."""
        ai = AIAssistant(use_mock=True)
        
        context = {
            'project_name': 'test',
            'project_structure': {'total_files': 10, 'languages': {}},
            'readme': 'Test',
            'dependencies': {},
            'notes': ''
        }
        
        ideas = ai.generate_ideas(context)
        
        # Mock should always return at least 5 ideas
        assert len(ideas) >= 5
    
    def test_generate_roadmap_validation(self):
        """Test that generate_roadmap validates minimum output."""
        ai = AIAssistant(use_mock=True)
        
        context = {
            'project_name': 'test',
            'timeframe': '6_months',
            'project_structure': {'total_files': 10, 'languages': {}},
            'readme': 'Test',
            'dependencies': {},
            'notes': ''
        }
        
        roadmap = ai.generate_roadmap(context)
        
        # Count total features
        total_features = sum(len(m['features']) for m in roadmap.get('milestones', []))
        
        # Mock should return at least 5 features
        assert total_features >= 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
