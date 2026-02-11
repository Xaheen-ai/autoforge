"""
Pytest configuration and fixtures for E2E tests.
"""

import os
import pytest
from fastapi.testclient import TestClient

# Set environment variable to allow test client connections
os.environ["XAHEEN_ALLOW_REMOTE"] = "1"

from server.main import app


@pytest.fixture
def test_client():
    """Return test client."""
    return TestClient(app)


@pytest.fixture
def test_project_name():
    """Return test project name.
    
    Using 'digilist' which is an existing project in the registry.
    """
    return "digilist"
