"""
E2E Tests for Roadmap API
==========================

Tests the complete roadmap workflow through API endpoints.
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


def test_generate_roadmap(test_project_name):
    """Test generating roadmap."""
    response = client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "roadmap" in data
    
    roadmap = data["roadmap"]
    assert "features" in roadmap
    assert "milestones" in roadmap
    assert "generated_at" in roadmap
    assert "total_estimated_days" in roadmap
    assert len(roadmap["features"]) > 0


def test_get_roadmap(test_project_name):
    """Test getting roadmap."""
    # Generate roadmap first
    client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    # Get roadmap
    response = client.get(f"/api/projects/{test_project_name}/roadmap")
    
    assert response.status_code == 200
    roadmap = response.json()
    assert "features" in roadmap
    assert "milestones" in roadmap


def test_update_feature_status(test_project_name):
    """Test updating feature status."""
    # Generate roadmap
    gen_response = client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    roadmap = gen_response.json()["roadmap"]
    feature_id = roadmap["features"][0]["id"]
    
    # Update status
    response = client.put(
        f"/api/projects/{test_project_name}/roadmap/features/{feature_id}/status",
        json={"status": "in-progress"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify update
    get_response = client.get(f"/api/projects/{test_project_name}/roadmap")
    roadmap = get_response.json()
    feature = next(f for f in roadmap["features"] if f["id"] == feature_id)
    assert feature["status"] == "in-progress"


def test_update_feature(test_project_name):
    """Test updating feature details."""
    # Generate roadmap
    gen_response = client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    roadmap = gen_response.json()["roadmap"]
    feature_id = roadmap["features"][0]["id"]
    
    # Update feature
    response = client.put(
        f"/api/projects/{test_project_name}/roadmap/features/{feature_id}",
        json={
            "title": "Updated Feature Title",
            "estimated_days": 20
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify update
    get_response = client.get(f"/api/projects/{test_project_name}/roadmap")
    roadmap = get_response.json()
    feature = next(f for f in roadmap["features"] if f["id"] == feature_id)
    assert feature["title"] == "Updated Feature Title"
    assert feature["estimated_days"] == 20


def test_export_roadmap_markdown(test_project_name):
    """Test exporting roadmap as markdown."""
    # Generate roadmap
    client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    # Export as markdown
    response = client.get(
        f"/api/projects/{test_project_name}/roadmap/export?format=markdown"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["format"] == "markdown"
    assert "# Project Roadmap" in data["content"]


def test_export_roadmap_json(test_project_name):
    """Test exporting roadmap as JSON."""
    # Generate roadmap
    client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    # Export as JSON
    response = client.get(
        f"/api/projects/{test_project_name}/roadmap/export?format=json"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["format"] == "json"
    
    # Verify JSON content is valid
    import json
    roadmap = json.loads(data["content"])
    assert "features" in roadmap


def test_export_roadmap_csv(test_project_name):
    """Test exporting roadmap as CSV."""
    # Generate roadmap
    client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    # Export as CSV
    response = client.get(
        f"/api/projects/{test_project_name}/roadmap/export?format=csv"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["format"] == "csv"
    assert "ID,Title,Description" in data["content"]


def test_get_roadmap_stats(test_project_name):
    """Test getting roadmap statistics."""
    # Generate roadmap
    client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    # Get stats
    response = client.get(f"/api/projects/{test_project_name}/roadmap/stats")
    
    assert response.status_code == 200
    stats = response.json()
    assert "total_features" in stats
    assert "by_status" in stats
    assert "by_effort" in stats
    assert "total_estimated_days" in stats
    assert "milestones" in stats
    assert stats["total_features"] > 0


def test_complete_roadmap_workflow(test_project_name):
    """Test complete roadmap workflow."""
    # 1. Generate roadmap
    gen_response = client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    assert gen_response.status_code == 200
    roadmap = gen_response.json()["roadmap"]
    assert len(roadmap["features"]) > 0
    
    # 2. Get roadmap
    get_response = client.get(f"/api/projects/{test_project_name}/roadmap")
    assert get_response.status_code == 200
    
    # 3. Update feature status
    feature_id = roadmap["features"][0]["id"]
    status_response = client.put(
        f"/api/projects/{test_project_name}/roadmap/features/{feature_id}/status",
        json={"status": "completed"}
    )
    assert status_response.status_code == 200
    
    # 4. Update feature details
    update_response = client.put(
        f"/api/projects/{test_project_name}/roadmap/features/{feature_id}",
        json={"title": "Completed Feature"}
    )
    assert update_response.status_code == 200
    
    # 5. Get stats
    stats_response = client.get(f"/api/projects/{test_project_name}/roadmap/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["by_status"]["completed"] >= 1
    
    # 6. Export roadmap
    export_response = client.get(
        f"/api/projects/{test_project_name}/roadmap/export?format=markdown"
    )
    assert export_response.status_code == 200
    assert "Completed Feature" in export_response.json()["content"]


def test_invalid_project(test_project_name):
    """Test with non-existent project."""
    response = client.post("/api/projects/nonexistent-project/roadmap/generate")
    assert response.status_code == 404


def test_invalid_export_format(test_project_name):
    """Test exporting with invalid format."""
    # Generate roadmap first
    client.post(f"/api/projects/{test_project_name}/roadmap/generate")
    
    response = client.get(
        f"/api/projects/{test_project_name}/roadmap/export?format=invalid"
    )
    assert response.status_code == 400


def test_update_nonexistent_feature(test_project_name):
    """Test updating a feature that doesn't exist."""
    response = client.put(
        f"/api/projects/{test_project_name}/roadmap/features/nonexistent/status",
        json={"status": "completed"}
    )
    # Should succeed but not update anything
    assert response.status_code in [200, 404]
