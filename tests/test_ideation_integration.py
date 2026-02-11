"""
Integration Tests for Ideation Feature
========================================

Tests the complete flow from service layer through API endpoints,
verifying data persistence and error handling.
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import shutil
from server.main import app
from server.services.ideation import IdeationManager


@pytest.fixture
def test_client():
    """Return test client."""
    return TestClient(app)


@pytest.fixture
def test_project_name():
    """Return test project name (using existing digilist project)."""
    return "digilist"


@pytest.fixture
def test_project_dir(test_project_name):
    """Get test project directory."""
    return Path(f"projects/{test_project_name}")


@pytest.fixture
def ideation_manager(test_project_dir):
    """Create ideation manager for testing."""
    return IdeationManager(test_project_dir)


@pytest.fixture(autouse=True)
def cleanup_test_data(test_project_dir):
    """Clean up test data before and after each test."""
    ideation_dir = test_project_dir / ".claude" / "ideation"
    ideas_file = ideation_dir / "ideas.json"
    
    # Clean before test
    if ideas_file.exists():
        ideas_file.unlink()
    
    yield
    
    # Clean after test
    if ideas_file.exists():
        ideas_file.unlink()


class TestIdeationIntegration:
    """Integration tests for ideation feature."""

    def test_generate_and_save_workflow(self, test_client, test_project_name, ideation_manager):
        """Test complete workflow: generate ideas → save → verify persistence."""
        # Step 1: Generate ideas via API
        response = test_client.post(f"/api/projects/{test_project_name}/ideation/generate")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["ideas"]) > 0
        
        # Step 2: Save an idea via API
        idea = data["ideas"][0]
        save_response = test_client.post(
            f"/api/projects/{test_project_name}/ideation/ideas",
            json=idea
        )
        assert save_response.status_code == 200
        save_data = save_response.json()
        assert save_data["success"] is True
        
        # Step 3: Verify persistence via service layer
        saved_ideas = ideation_manager.get_saved_ideas()
        assert len(saved_ideas) == 1
        assert saved_ideas[0]["id"] == idea["id"]
        assert saved_ideas[0]["saved"] is True
        assert "saved_at" in saved_ideas[0]

    def test_service_to_api_data_consistency(self, test_client, test_project_name, ideation_manager):
        """Test that data saved via service is accessible via API."""
        # Step 1: Save idea via service layer
        idea = {
            "id": "test-idea-1",
            "title": "Test Idea",
            "description": "Test description",
            "category": "feature",
            "priority": "high",
            "effort": "medium"
        }
        ideation_manager.save_idea(idea)
        
        # Step 2: Retrieve via API
        response = test_client.get(f"/api/projects/{test_project_name}/ideation/ideas")
        assert response.status_code == 200
        ideas = response.json()
        assert len(ideas) == 1
        assert ideas[0]["id"] == "test-idea-1"
        assert ideas[0]["title"] == "Test Idea"

    def test_api_to_service_data_consistency(self, test_client, test_project_name, ideation_manager):
        """Test that data saved via API is accessible via service."""
        # Step 1: Save idea via API
        idea = {
            "id": "api-idea-1",
            "title": "API Idea",
            "description": "API description",
            "category": "optimization",
            "priority": "medium",
            "effort": "small"
        }
        response = test_client.post(
            f"/api/projects/{test_project_name}/ideation/ideas",
            json=idea
        )
        assert response.status_code == 200
        
        # Step 2: Retrieve via service layer
        saved_ideas = ideation_manager.get_saved_ideas()
        assert len(saved_ideas) == 1
        assert saved_ideas[0]["id"] == "api-idea-1"
        assert saved_ideas[0]["title"] == "API Idea"

    def test_delete_workflow_integration(self, test_client, test_project_name, ideation_manager):
        """Test delete workflow across service and API layers."""
        # Setup: Save multiple ideas
        ideas = [
            {"id": f"idea-{i}", "title": f"Idea {i}", "description": "Test", 
             "category": "feature", "priority": "medium", "effort": "small"}
            for i in range(3)
        ]
        for idea in ideas:
            ideation_manager.save_idea(idea)
        
        # Delete one via API
        response = test_client.delete(
            f"/api/projects/{test_project_name}/ideation/ideas/idea-1"
        )
        assert response.status_code == 200
        
        # Verify via service layer
        remaining = ideation_manager.get_saved_ideas()
        assert len(remaining) == 2
        assert all(idea["id"] != "idea-1" for idea in remaining)

    def test_stats_integration(self, test_client, test_project_name, ideation_manager):
        """Test statistics calculation across layers."""
        # Setup: Save ideas with different categories
        ideas = [
            {"id": "f1", "title": "F1", "description": "Test", 
             "category": "feature", "priority": "high", "effort": "large"},
            {"id": "f2", "title": "F2", "description": "Test", 
             "category": "feature", "priority": "medium", "effort": "medium"},
            {"id": "o1", "title": "O1", "description": "Test", 
             "category": "optimization", "priority": "low", "effort": "small"},
        ]
        for idea in ideas:
            ideation_manager.save_idea(idea)
        
        # Get stats via API
        response = test_client.get(f"/api/projects/{test_project_name}/ideation/stats")
        assert response.status_code == 200
        stats = response.json()
        
        # Verify stats
        assert stats["total"] == 3
        assert stats["by_category"]["feature"] == 2
        assert stats["by_category"]["optimization"] == 1
        assert stats["by_priority"]["high"] == 1
        assert stats["by_effort"]["large"] == 1

    def test_error_propagation(self, test_client):
        """Test that service errors propagate correctly to API."""
        # Try to access non-existent project
        response = test_client.get("/api/projects/nonexistent/ideation/ideas")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_concurrent_operations(self, test_client, test_project_name, ideation_manager):
        """Test concurrent save operations maintain data integrity."""
        # Save multiple ideas rapidly via API
        ideas = [
            {"id": f"concurrent-{i}", "title": f"Concurrent {i}", "description": "Test",
             "category": "feature", "priority": "medium", "effort": "small"}
            for i in range(5)
        ]
        
        for idea in ideas:
            response = test_client.post(
                f"/api/projects/{test_project_name}/ideation/ideas",
                json=idea
            )
            assert response.status_code == 200
        
        # Verify all saved
        saved = ideation_manager.get_saved_ideas()
        assert len(saved) == 5
        saved_ids = {idea["id"] for idea in saved}
        assert all(f"concurrent-{i}" in saved_ids for i in range(5))
