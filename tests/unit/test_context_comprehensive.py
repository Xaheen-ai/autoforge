"""
Unit Tests for Enhanced Context Gathering
==========================================

Tests for the get_comprehensive_context() method in ContextManager.
"""

import json
import pytest
from pathlib import Path
from server.services.context_manager import ContextManager


class TestContextManager:
    """Test suite for ContextManager comprehensive context gathering."""
    
    def test_get_comprehensive_context_structure(self, tmp_path):
        """Test that comprehensive context returns expected structure."""
        # Create a test project directory
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()
        
        # Create README
        readme = project_dir / "README.md"
        readme.write_text("# Test Project\\n\\nThis is a test project for AutoForge.")
        
        # Create package.json
        package_json = project_dir / "package.json"
        package_json.write_text(json.dumps({
            "name": "test-project",
            "dependencies": {"react": "^18.0.0", "typescript": "^5.0.0"},
            "devDependencies": {"vite": "^5.0.0"}
        }))
        
        # Initialize context manager
        ctx_mgr = ContextManager(project_dir)
        context = ctx_mgr.get_comprehensive_context()
        
        # Verify structure
        assert 'project_name' in context
        assert 'project_structure' in context
        assert 'readme' in context
        assert 'dependencies' in context
        assert 'git_history' in context
        assert 'notes' in context
        
        assert context['project_name'] == "test_project"
        assert "Test Project" in context['readme']
    
    def test_get_comprehensive_context_with_dependencies(self, tmp_path):
        """Test dependency extraction from package.json."""
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()
        
        # Create package.json with dependencies
        package_json = project_dir / "package.json"
        package_json.write_text(json.dumps({
            "dependencies": {
                "react": "^18.0.0",
                "react-dom": "^18.0.0",
                "axios": "^1.0.0"
            },
            "devDependencies": {
                "vite": "^5.0.0",
                "typescript": "^5.0.0"
            }
        }))
        
        ctx_mgr = ContextManager(project_dir)
        context = ctx_mgr.get_comprehensive_context()
        
        # Verify dependencies
        assert 'node' in context['dependencies']
        assert 'react' in context['dependencies']['node']['dependencies']
        assert 'vite' in context['dependencies']['node']['devDependencies']
    
    def test_get_comprehensive_context_with_python_deps(self, tmp_path):
        """Test dependency extraction from requirements.txt."""
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()
        
        # Create requirements.txt
        requirements = project_dir / "requirements.txt"
        requirements.write_text("fastapi==0.100.0\\nuvicorn>=0.20.0\\npydantic==2.0.0")
        
        ctx_mgr = ContextManager(project_dir)
        context = ctx_mgr.get_comprehensive_context()
        
        # Verify Python dependencies
        assert 'python' in context['dependencies']
        assert 'fastapi' in context['dependencies']['python']
        assert 'uvicorn' in context['dependencies']['python']
        assert 'pydantic' in context['dependencies']['python']
    
    def test_get_comprehensive_context_without_readme(self, tmp_path):
        """Test context gathering when README doesn't exist."""
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()
        
        ctx_mgr = ContextManager(project_dir)
        context = ctx_mgr.get_comprehensive_context()
        
        # Should have fallback message
        assert context['readme'] == "No README found"
    
    def test_get_comprehensive_context_truncates_long_readme(self, tmp_path):
        """Test that long READMEs are truncated."""
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()
        
        # Create a very long README
        readme = project_dir / "README.md"
        long_content = "# Test\\n" + ("Lorem ipsum " * 500)  # > 2000 chars
        readme.write_text(long_content)
        
        ctx_mgr = ContextManager(project_dir)
        context = ctx_mgr.get_comprehensive_context()
        
        # Should be truncated
        assert len(context['readme']) <= 2050  # 2000 + truncation message
        assert "[README truncated...]" in context['readme']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
