"""
Integration Tests for Roadmap Feature
=======================================

Tests the complete flow from service layer through API endpoints,
verifying data persistence, exports, and error handling.
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
from server.main import app
from server.services.roadmap import RoadmapManager


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
def roadmap_manager(test_project_dir):
    """Create roadmap manager for testing."""
    return RoadmapManager(test_project_dir)


@pytest.fixture(autouse=True)
def cleanup_test_data(test_project_dir):
    """Clean up test data before and after each test."""
    roadmap_dir = test_project_dir / ".claude" / "roadmap"
    roadmap_file = roadmap_dir / "roadmap.json"
    
    # Clean before test
    if roadmap_file.exists():
        roadmap_file.unlink()
    
    yield
    
    # Clean after test
    if roadmap_file.exists():
        roadmap_file.unlink()


class TestRoadmapIntegration:
    """Integration tests for roadmap feature."""

    def test_generate_and_retrieve_workflow(self, test_client, test_project_name, roadmap_manager):
        """Test complete workflow: generate roadmap → retrieve → verify persistence."""
        # Step 1: Generate roadmap via API
        response = test_client.post(f"/api/projects/{test_project_name}/roadmap/generate")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "roadmap" in data
        assert len(data["roadmap"]["features"]) > 0
        
        # Step 2: Retrieve via API
        get_response = test_client.get(f"/api/projects/{test_project_name}/roadmap")
        assert get_response.status_code == 200
        roadmap = get_response.json()
        assert len(roadmap["features"]) > 0
        
        # Step 3: Verify persistence via service layer
        service_roadmap = roadmap_manager.get_roadmap()
        assert len(service_roadmap["features"]) == len(roadmap["features"])
        assert service_roadmap["features"][0]["id"] == roadmap["features"][0]["id"]

    def test_service_to_api_data_consistency(self, test_client, test_project_name, roadmap_manager):
        """Test that roadmap saved via service is accessible via API."""
        # Step 1: Save roadmap via service layer
        roadmap = {
            "features": [
                {
                    "id": "f1",
                    "name": "Feature 1",
                    "description": "Test feature",
                    "status": "planned",
                    "priority": "high",
                    "estimated_days": 5
                }
            ],
            "milestones": [],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 5
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Step 2: Retrieve via API
        response = test_client.get(f"/api/projects/{test_project_name}/roadmap")
        assert response.status_code == 200
        api_roadmap = response.json()
        assert len(api_roadmap["features"]) == 1
        assert api_roadmap["features"][0]["id"] == "f1"
        assert api_roadmap["features"][0]["name"] == "Feature 1"

    def test_update_feature_status_integration(self, test_client, test_project_name, roadmap_manager):
        """Test feature status update across layers."""
        # Setup: Create roadmap with features
        roadmap = {
            "features": [
                {"id": "f1", "name": "F1", "description": "Test", "status": "planned", 
                 "priority": "high", "estimated_days": 3},
                {"id": "f2", "name": "F2", "description": "Test", "status": "planned",
                 "priority": "medium", "estimated_days": 5}
            ],
            "milestones": [],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 8
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Update status via API
        response = test_client.put(
            f"/api/projects/{test_project_name}/roadmap/features/f1/status",
            json={"status": "in-progress"}
        )
        assert response.status_code == 200
        
        # Verify via service layer
        updated_roadmap = roadmap_manager.get_roadmap()
        f1 = next(f for f in updated_roadmap["features"] if f["id"] == "f1")
        assert f1["status"] == "in-progress"
        assert "status_updated_at" in f1

    def test_update_feature_details_integration(self, test_client, test_project_name, roadmap_manager):
        """Test feature detail updates across layers."""
        # Setup
        roadmap = {
            "features": [
                {"id": "f1", "name": "Original", "description": "Original desc", 
                 "status": "planned", "priority": "low", "estimated_days": 2}
            ],
            "milestones": [],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 2
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Update via API
        response = test_client.put(
            f"/api/projects/{test_project_name}/roadmap/features/f1",
            json={
                "name": "Updated Name",
                "priority": "high",
                "estimated_days": 5
            }
        )
        assert response.status_code == 200
        
        # Verify via service layer
        updated_roadmap = roadmap_manager.get_roadmap()
        f1 = updated_roadmap["features"][0]
        assert f1["name"] == "Updated Name"
        assert f1["priority"] == "high"
        assert f1["estimated_days"] == 5
        assert f1["description"] == "Original desc"  # Unchanged
        assert "updated_at" in f1

    def test_export_markdown_integration(self, test_client, test_project_name, roadmap_manager):
        """Test markdown export across layers."""
        # Setup
        roadmap = {
            "features": [
                {"id": "f1", "name": "Feature 1", "description": "Desc 1",
                 "status": "completed", "priority": "high", "estimated_days": 3},
                {"id": "f2", "name": "Feature 2", "description": "Desc 2",
                 "status": "in-progress", "priority": "medium", "estimated_days": 5}
            ],
            "milestones": [{"name": "M1", "date": "2024-02-01", "description": "Milestone 1"}],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 8
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Export via API
        response = test_client.get(
            f"/api/projects/{test_project_name}/roadmap/export",
            params={"format": "markdown"}
        )
        assert response.status_code == 200
        markdown = response.text
        
        # Verify content
        assert "# Project Roadmap" in markdown
        assert "Feature 1" in markdown
        assert "Feature 2" in markdown
        assert "Milestone 1" in markdown
        assert "✅ completed" in markdown
        assert "🔄 in-progress" in markdown

    def test_export_json_integration(self, test_client, test_project_name, roadmap_manager):
        """Test JSON export integration."""
        # Setup
        roadmap = {
            "features": [{"id": "f1", "name": "F1", "description": "Test",
                         "status": "planned", "priority": "high", "estimated_days": 3}],
            "milestones": [],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 3
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Export via API
        response = test_client.get(
            f"/api/projects/{test_project_name}/roadmap/export",
            params={"format": "json"}
        )
        assert response.status_code == 200
        exported = response.json()
        
        # Verify structure
        assert len(exported["features"]) == 1
        assert exported["features"][0]["id"] == "f1"
        assert exported["total_estimated_days"] == 3

    def test_export_csv_integration(self, test_client, test_project_name, roadmap_manager):
        """Test CSV export integration."""
        # Setup
        roadmap = {
            "features": [
                {"id": "f1", "name": "Feature 1", "description": "Desc 1",
                 "status": "completed", "priority": "high", "estimated_days": 3},
                {"id": "f2", "name": "Feature 2", "description": "Desc 2",
                 "status": "planned", "priority": "low", "estimated_days": 2}
            ],
            "milestones": [],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 5
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Export via API
        response = test_client.get(
            f"/api/projects/{test_project_name}/roadmap/export",
            params={"format": "csv"}
        )
        assert response.status_code == 200
        csv_content = response.text
        
        # Verify CSV structure
        lines = csv_content.strip().split('\n')
        assert len(lines) == 3  # Header + 2 features
        assert "ID,Name,Description,Status,Priority,Estimated Days" in lines[0]
        assert "f1,Feature 1,Desc 1,completed,high,3" in lines[1]
        assert "f2,Feature 2,Desc 2,planned,low,2" in lines[2]

    def test_stats_integration(self, test_client, test_project_name, roadmap_manager):
        """Test statistics calculation across layers."""
        # Setup
        roadmap = {
            "features": [
                {"id": "f1", "name": "F1", "description": "Test", "status": "completed",
                 "priority": "high", "estimated_days": 3},
                {"id": "f2", "name": "F2", "description": "Test", "status": "in-progress",
                 "priority": "medium", "estimated_days": 5},
                {"id": "f3", "name": "F3", "description": "Test", "status": "planned",
                 "priority": "low", "estimated_days": 2}
            ],
            "milestones": [{"name": "M1", "date": "2024-02-01", "description": "Test"}],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 10
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Get stats via API
        response = test_client.get(f"/api/projects/{test_project_name}/roadmap/stats")
        assert response.status_code == 200
        stats = response.json()
        
        # Verify stats
        assert stats["total_features"] == 3
        assert stats["by_status"]["completed"] == 1
        assert stats["by_status"]["in-progress"] == 1
        assert stats["by_status"]["planned"] == 1
        assert stats["by_priority"]["high"] == 1
        assert stats["total_estimated_days"] == 10
        assert stats["total_milestones"] == 1

    def test_error_propagation(self, test_client):
        """Test that service errors propagate correctly to API."""
        # Try to access non-existent project
        response = test_client.get("/api/projects/nonexistent/roadmap")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_invalid_export_format(self, test_client, test_project_name, roadmap_manager):
        """Test error handling for invalid export format."""
        # Setup
        roadmap = {
            "features": [],
            "milestones": [],
            "generated_at": "2024-01-01T00:00:00Z",
            "total_estimated_days": 0
        }
        roadmap_manager.save_roadmap(roadmap)
        
        # Try invalid format
        response = test_client.get(
            f"/api/projects/{test_project_name}/roadmap/export",
            params={"format": "invalid"}
        )
        assert response.status_code == 400
        assert "format" in response.json()["detail"].lower()
