#!/usr/bin/env python3
"""
GitHub Service Tests
====================

Tests for the GitHub service module (server/services/github_service.py).
Run with: python test_github_service.py
"""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from server.services.github_service import (
    GitError,
    GIT_URL_PATTERN,
    GITHUB_URL_PATTERN,
    _build_authenticated_url,
    _run_git,
    clone_repo,
    get_github_token,
    get_repo_info,
    init_repo,
    is_github_url,
    setup_remote,
    validate_git_url,
)


class TestGitUrlValidation(unittest.TestCase):
    """Tests for URL validation functions."""

    def test_valid_github_https_url(self):
        self.assertTrue(validate_git_url("https://github.com/user/repo.git"))

    def test_valid_github_https_url_no_git(self):
        self.assertTrue(validate_git_url("https://github.com/user/repo"))

    def test_valid_github_ssh_url(self):
        self.assertTrue(validate_git_url("git@github.com:user/repo.git"))

    def test_valid_gitlab_url(self):
        self.assertTrue(validate_git_url("https://gitlab.com/user/repo.git"))

    def test_valid_custom_git_url(self):
        self.assertTrue(validate_git_url("https://git.example.com/user/repo.git"))

    def test_invalid_url_no_host(self):
        self.assertFalse(validate_git_url("not-a-url"))

    def test_invalid_url_ftp(self):
        self.assertFalse(validate_git_url("ftp://github.com/user/repo.git"))

    def test_empty_url(self):
        self.assertFalse(validate_git_url(""))

    def test_is_github_url_true(self):
        self.assertTrue(is_github_url("https://github.com/Xaheen-ai/xaheen.git"))

    def test_is_github_url_false(self):
        self.assertFalse(is_github_url("https://gitlab.com/user/repo.git"))


class TestAuthenticatedUrl(unittest.TestCase):
    """Tests for URL authentication injection."""

    def test_https_with_token(self):
        result = _build_authenticated_url(
            "https://github.com/user/repo.git", "my-token"
        )
        self.assertEqual(
            result, "https://x-access-token:my-token@github.com/user/repo.git"
        )

    def test_https_without_token(self):
        result = _build_authenticated_url("https://github.com/user/repo.git", None)
        self.assertEqual(result, "https://github.com/user/repo.git")

    def test_ssh_with_token_unchanged(self):
        original = "git@github.com:user/repo.git"
        result = _build_authenticated_url(original, "my-token")
        self.assertEqual(result, original)


class TestInitRepo(unittest.TestCase):
    """Tests for init_repo function."""

    def test_init_creates_git_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            init_repo(project_dir)
            self.assertTrue((project_dir / ".git").exists())
            self.assertTrue((project_dir / ".gitignore").exists())

    def test_init_idempotent(self):
        """Calling init_repo twice should not fail."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            init_repo(project_dir)
            init_repo(project_dir)  # Should not raise
            self.assertTrue((project_dir / ".git").exists())

    def test_init_nonexistent_dir(self):
        with self.assertRaises(ValueError):
            init_repo(Path("/nonexistent/path"))

    def test_init_preserves_existing_gitignore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            gitignore = project_dir / ".gitignore"
            gitignore.write_text("custom_content\n")
            init_repo(project_dir)
            self.assertEqual(gitignore.read_text(), "custom_content\n")


class TestGetRepoInfo(unittest.TestCase):
    """Tests for get_repo_info function."""

    def test_no_git_repo(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            info = get_repo_info(Path(tmpdir))
            self.assertFalse(info["initialized"])

    def test_initialized_repo(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            init_repo(project_dir)
            info = get_repo_info(project_dir)
            self.assertTrue(info["initialized"])
            self.assertEqual(info["branch"], "main")
            self.assertFalse(info["has_commits"])
            self.assertEqual(info["remotes"], {})


class TestGetGitHubToken(unittest.TestCase):
    """Tests for get_github_token function."""

    def setUp(self):
        self._orig_github = os.environ.get("GITHUB_TOKEN")
        self._orig_gh = os.environ.get("GH_TOKEN")

    def tearDown(self):
        for key, orig in [("GITHUB_TOKEN", self._orig_github), ("GH_TOKEN", self._orig_gh)]:
            if orig is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = orig

    def test_github_token_env(self):
        os.environ["GITHUB_TOKEN"] = "ghp_test123"
        os.environ.pop("GH_TOKEN", None)
        self.assertEqual(get_github_token(), "ghp_test123")

    def test_gh_token_fallback(self):
        os.environ.pop("GITHUB_TOKEN", None)
        os.environ["GH_TOKEN"] = "gh_fallback"
        self.assertEqual(get_github_token(), "gh_fallback")

    def test_no_token(self):
        os.environ.pop("GITHUB_TOKEN", None)
        os.environ.pop("GH_TOKEN", None)
        self.assertIsNone(get_github_token())

    def test_github_token_takes_precedence(self):
        os.environ["GITHUB_TOKEN"] = "primary"
        os.environ["GH_TOKEN"] = "secondary"
        self.assertEqual(get_github_token(), "primary")


class TestCloneRepo(unittest.TestCase):
    """Tests for clone_repo validation (without network calls)."""

    def test_invalid_url_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with self.assertRaises(ValueError):
                clone_repo("not-a-url", Path(tmpdir) / "output")

    def test_nonempty_target_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            target = Path(tmpdir)
            (target / "existing_file.txt").write_text("content")
            with self.assertRaises(ValueError):
                clone_repo("https://github.com/user/repo.git", target)


class TestSetupRemote(unittest.TestCase):
    """Tests for setup_remote validation."""

    def test_invalid_url_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            init_repo(project_dir)
            with self.assertRaises(ValueError):
                setup_remote(project_dir, "not-a-url")

    def test_no_git_repo_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with self.assertRaises(ValueError):
                setup_remote(
                    Path(tmpdir), "https://github.com/user/repo.git"
                )

    def test_setup_remote_adds_origin(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)
            init_repo(project_dir)
            setup_remote(project_dir, "https://github.com/user/repo.git")
            info = get_repo_info(project_dir)
            self.assertIn("origin", info["remotes"])


if __name__ == "__main__":
    unittest.main()
