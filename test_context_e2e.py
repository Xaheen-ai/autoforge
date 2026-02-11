"""
E2E Tests for Project Context API
==================================

Tests the complete flow of context management including:
- Getting context data
- Analyzing codebase
- Updating notes
- Updating configuration
"""

import os
import json
import pytest
from pathlib import Path

# Set environment variable to allow test client connections
os.environ["XAHEEN_ALLOW_REMOTE"] = "1"

from fastapi.testclient import TestClient

# Import the app
from server.main import app

# Create test client
client = TestClient(app)


@pytest.fixture
def test_project_name():
    """Use the digilist project for testing."""
    return "digilist"


def test_get_context_initial_state(test_project_name):
    """Test getting context when no data exists yet."""
    response = client.get(f"/api/projects/{test_project_name}/context")
    
    assert response.status_code == 200
    data = response.json()
    
    # Should have all three keys
    assert "notes" in data
    assert "codebase_analysis" in data
    assert "config" in data
    
    # Notes should be empty initially (or contain previous test data)
    assert isinstance(data["notes"], str)
    
    # Analysis may be None or cached from previous run
    assert data["codebase_analysis"] is None or isinstance(data["codebase_analysis"], dict)
    
    # Default config
    config = data["config"]
    assert "include_codebase_structure" in config
    assert "include_dependencies" in config
    assert "include_recent_changes" in config
    assert "max_context_size" in config
    assert isinstance(config["max_context_size"], int)


def test_analyze_codebase(test_project_name):
    """Test codebase analysis endpoint."""
    response = client.post(f"/api/projects/{test_project_name}/context/analyze")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "analysis" in data
    
    analysis = data["analysis"]
    assert "analyzed_at" in analysis
    assert "total_files" in analysis
    assert "total_lines" in analysis
    assert "languages" in analysis
    assert "structure" in analysis
    
    # Should have found some files
    assert analysis["total_files"] > 0
    assert analysis["total_lines"] > 0
    
    # Should have identified languages
    assert len(analysis["languages"]) > 0
    
    # Structure should have directories and key files
    assert "directories" in analysis["structure"]
    assert "key_files" in analysis["structure"]


def test_update_notes(test_project_name):
    """Test updating project notes."""
    test_notes = """# Test Project Notes

This is a test note for the project.

## Architecture
- Component A
- Component B

## Important Decisions
- Decision 1
- Decision 2
"""
    
    response = client.put(
        f"/api/projects/{test_project_name}/context/notes",
        json={"notes": test_notes}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Notes updated"
    
    # Verify notes were saved
    response = client.get(f"/api/projects/{test_project_name}/context")
    assert response.status_code == 200
    context = response.json()
    assert context["notes"] == test_notes


def test_update_config(test_project_name):
    """Test updating context configuration."""
    new_config = {
        "include_codebase_structure": False,
        "include_dependencies": True,
        "include_recent_changes": True,
        "max_context_size": 5000
    }
    
    response = client.put(
        f"/api/projects/{test_project_name}/context/config",
        json=new_config
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Configuration updated"
    
    # Verify config was saved
    response = client.get(f"/api/projects/{test_project_name}/context")
    assert response.status_code == 200
    context = response.json()
    
    config = context["config"]
    assert config["include_codebase_structure"] is False
    assert config["include_dependencies"] is True
    assert config["include_recent_changes"] is True
    assert config["max_context_size"] == 5000


def test_update_partial_config(test_project_name):
    """Test updating only some config fields."""
    # First set a known state
    client.put(
        f"/api/projects/{test_project_name}/context/config",
        json={
            "include_codebase_structure": True,
            "include_dependencies": True,
            "include_recent_changes": False,
            "max_context_size": 10000
        }
    )
    
    # Now update only one field
    response = client.put(
        f"/api/projects/{test_project_name}/context/config",
        json={"include_recent_changes": True}
    )
    
    assert response.status_code == 200
    
    # Verify only that field changed
    response = client.get(f"/api/projects/{test_project_name}/context")
    context = response.json()
    config = context["config"]
    
    assert config["include_codebase_structure"] is True  # unchanged
    assert config["include_dependencies"] is True  # unchanged
    assert config["include_recent_changes"] is True  # changed
    assert config["max_context_size"] == 10000  # unchanged


def test_complete_workflow(test_project_name):
    """Test the complete context management workflow."""
    # 1. Get initial context
    response = client.get(f"/api/projects/{test_project_name}/context")
    assert response.status_code == 200
    
    # 2. Analyze codebase
    response = client.post(f"/api/projects/{test_project_name}/context/analyze")
    assert response.status_code == 200
    analysis = response.json()["analysis"]
    assert analysis["total_files"] > 0
    
    # 3. Add notes
    notes = "# Project Overview\n\nThis project has {} files.".format(analysis["total_files"])
    response = client.put(
        f"/api/projects/{test_project_name}/context/notes",
        json={"notes": notes}
    )
    assert response.status_code == 200
    
    # 4. Update config
    response = client.put(
        f"/api/projects/{test_project_name}/context/config",
        json={"include_codebase_structure": True}
    )
    assert response.status_code == 200
    
    # 5. Verify everything is saved
    response = client.get(f"/api/projects/{test_project_name}/context")
    assert response.status_code == 200
    context = response.json()
    
    assert context["notes"] == notes
    assert context["codebase_analysis"] is not None
    assert context["config"]["include_codebase_structure"] is True


def test_invalid_project():
    """Test with non-existent project."""
    response = client.get("/api/projects/nonexistent/context")
    assert response.status_code == 404


def test_empty_notes():
    """Test updating with empty notes."""
    response = client.put(
        "/api/projects/digilist/context/notes",
        json={"notes": ""}
    )
    assert response.status_code == 200
    
    response = client.get("/api/projects/digilist/context")
    context = response.json()
    assert context["notes"] == ""


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])
