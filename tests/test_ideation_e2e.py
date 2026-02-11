"""
E2E Tests for Ideation API
===========================

Tests the complete ideation workflow through API endpoints.
"""

import os
import pytest
from fastapi.testclient import TestClient

# Set environment variable to allow test client connections
os.environ["XAHEEN_ALLOW_REMOTE"] = "1"

from server.main import app

client = TestClient(app)


@pytest.fixture
def test_project_name():
    """Return test project name (using existing digilist project)."""
    return "digilist"


def test_generate_ideas(test_project_name):
    """Test generating ideas."""
    response = client.post(f"/api/projects/{test_project_name}/ideation/generate")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "ideas" in data
    assert isinstance(data["ideas"], list)
    assert len(data["ideas"]) > 0
    
    # Check idea structure
    idea = data["ideas"][0]
    assert "id" in idea
    assert "title" in idea
    assert "description" in idea
    assert "category" in idea
    assert "priority" in idea
    assert "effort" in idea


def test_get_saved_ideas_empty(test_project_name):
    """Test getting saved ideas when none exist."""
    response = client.get(f"/api/projects/{test_project_name}/ideation/ideas")
    
    assert response.status_code == 200
    data = response.json()
    assert "ideas" in data
    assert isinstance(data["ideas"], list)


def test_save_idea(test_project_name):
    """Test saving an idea."""
    # First generate ideas
    gen_response = client.post(f"/api/projects/{test_project_name}/ideation/generate")
    ideas = gen_response.json()["ideas"]
    idea_to_save = ideas[0]
    
    # Save the idea
    response = client.post(
        f"/api/projects/{test_project_name}/ideation/ideas",
        json={"idea": idea_to_save}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Idea saved"
    
    # Verify it was saved
    get_response = client.get(f"/api/projects/{test_project_name}/ideation/ideas")
    saved_ideas = get_response.json()["ideas"]
    assert len(saved_ideas) > 0
    assert any(i["id"] == idea_to_save["id"] for i in saved_ideas)


def test_delete_idea(test_project_name):
    """Test deleting a saved idea."""
    # Generate and save an idea
    gen_response = client.post(f"/api/projects/{test_project_name}/ideation/generate")
    idea = gen_response.json()["ideas"][0]
    
    client.post(
        f"/api/projects/{test_project_name}/ideation/ideas",
        json={"idea": idea}
    )
    
    # Delete the idea
    response = client.delete(
        f"/api/projects/{test_project_name}/ideation/ideas/{idea['id']}"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Idea deleted"
    
    # Verify it was deleted
    get_response = client.get(f"/api/projects/{test_project_name}/ideation/ideas")
    saved_ideas = get_response.json()["ideas"]
    assert not any(i["id"] == idea["id"] for i in saved_ideas)


def test_get_idea_stats(test_project_name):
    """Test getting idea statistics."""
    # Save some ideas first
    gen_response = client.post(f"/api/projects/{test_project_name}/ideation/generate")
    ideas = gen_response.json()["ideas"]
    
    for idea in ideas[:3]:
        client.post(
            f"/api/projects/{test_project_name}/ideation/ideas",
            json={"idea": idea}
        )
    
    # Get stats
    response = client.get(f"/api/projects/{test_project_name}/ideation/stats")
    
    assert response.status_code == 200
    stats = response.json()
    assert "total" in stats
    assert "by_category" in stats
    assert "by_priority" in stats
    assert "by_effort" in stats
    assert stats["total"] >= 3


def test_complete_ideation_workflow(test_project_name):
    """Test complete ideation workflow."""
    # 1. Generate ideas
    gen_response = client.post(f"/api/projects/{test_project_name}/ideation/generate")
    assert gen_response.status_code == 200
    ideas = gen_response.json()["ideas"]
    assert len(ideas) > 0
    
    # 2. Save multiple ideas
    for idea in ideas[:2]:
        save_response = client.post(
            f"/api/projects/{test_project_name}/ideation/ideas",
            json={"idea": idea}
        )
        assert save_response.status_code == 200
    
    # 3. Get saved ideas
    get_response = client.get(f"/api/projects/{test_project_name}/ideation/ideas")
    assert get_response.status_code == 200
    saved_ideas = get_response.json()["ideas"]
    assert len(saved_ideas) >= 2
    
    # 4. Get stats
    stats_response = client.get(f"/api/projects/{test_project_name}/ideation/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total"] >= 2
    
    # 5. Delete one idea
    delete_response = client.delete(
        f"/api/projects/{test_project_name}/ideation/ideas/{saved_ideas[0]['id']}"
    )
    assert delete_response.status_code == 200
    
    # 6. Verify deletion
    final_response = client.get(f"/api/projects/{test_project_name}/ideation/ideas")
    final_ideas = final_response.json()["ideas"]
    assert len(final_ideas) == len(saved_ideas) - 1


def test_invalid_project(test_project_name):
    """Test with non-existent project."""
    response = client.post("/api/projects/nonexistent-project/ideation/generate")
    assert response.status_code == 404


def test_save_invalid_idea(test_project_name):
    """Test saving idea with invalid data."""
    response = client.post(
        f"/api/projects/{test_project_name}/ideation/ideas",
        json={"idea": {}}  # Missing required fields
    )
    # Should fail validation
    assert response.status_code in [400, 422]
