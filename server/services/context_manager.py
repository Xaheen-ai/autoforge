"""
Context Manager Service
=======================

Manages project-specific context including notes, codebase analysis, and configuration.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime


class ContextManager:
    """Manages project context data."""
    
    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.context_dir = project_dir / ".claude" / "context"
        self.notes_file = self.context_dir / "notes.md"
        self.analysis_file = self.context_dir / "codebase_analysis.json"
        self.config_file = self.context_dir / "config.json"
        
        # Ensure context directory exists
        self.context_dir.mkdir(parents=True, exist_ok=True)
    
    def get_notes(self) -> str:
        """Read project notes."""
        if self.notes_file.exists():
            return self.notes_file.read_text(encoding="utf-8")
        return ""
    
    def save_notes(self, notes: str) -> None:
        """Save project notes."""
        self.notes_file.write_text(notes, encoding="utf-8")
    
    def get_analysis(self) -> Optional[Dict]:
        """Get codebase analysis results."""
        if self.analysis_file.exists():
            try:
                return json.loads(self.analysis_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                return None
        return None
    
    def save_analysis(self, analysis: Dict) -> None:
        """Save codebase analysis results."""
        self.analysis_file.write_text(
            json.dumps(analysis, indent=2),
            encoding="utf-8"
        )
    
    def get_config(self) -> Dict:
        """Get context configuration."""
        default_config = {
            "include_codebase_structure": True,
            "include_dependencies": True,
            "include_recent_changes": False,
            "max_context_size": 10000
        }
        
        if self.config_file.exists():
            try:
                config = json.loads(self.config_file.read_text(encoding="utf-8"))
                # Merge with defaults to ensure all keys exist
                return {**default_config, **config}
            except json.JSONDecodeError:
                return default_config
        return default_config
    
    def update_config(self, config: Dict) -> None:
        """Update context configuration."""
        current_config = self.get_config()
        current_config.update(config)
        self.config_file.write_text(
            json.dumps(current_config, indent=2),
            encoding="utf-8"
        )
    
    def analyze_codebase(self) -> Dict:
        """Analyze project codebase structure."""
        # Directories to exclude from analysis
        exclude_dirs = {
            'node_modules', '.git', 'dist', 'build', '__pycache__',
            '.next', '.venv', 'venv', 'env', '.env', 'coverage',
            '.pytest_cache', '.mypy_cache', '.tox', 'htmlcov'
        }
        
        # File extensions to language mapping
        language_map = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.py': 'Python',
            '.md': 'Markdown',
            '.json': 'JSON',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.go': 'Go',
            '.rs': 'Rust',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.sh': 'Shell',
        }
        
        total_files = 0
        total_lines = 0
        languages: Dict[str, int] = {}
        directories: List[str] = []
        key_files: List[Dict] = []
        
        # Key file patterns to identify important files
        key_patterns = {
            'package.json', 'requirements.txt', 'go.mod', 'Cargo.toml',
            'main.py', 'main.ts', 'main.js', 'index.ts', 'index.js',
            'app.py', 'server.py', 'README.md', 'Makefile', 'Dockerfile'
        }
        
        def should_exclude(path: Path) -> bool:
            """Check if path should be excluded."""
            parts = path.parts
            return any(excluded in parts for excluded in exclude_dirs)
        
        # Walk the project directory
        for item in self.project_dir.rglob('*'):
            if should_exclude(item):
                continue
            
            if item.is_dir():
                rel_path = item.relative_to(self.project_dir)
                directories.append(str(rel_path))
            elif item.is_file():
                total_files += 1
                ext = item.suffix.lower()
                
                # Count language usage
                if ext in language_map:
                    lang = language_map[ext]
                    languages[lang] = languages.get(lang, 0) + 1
                
                # Count lines for text files
                try:
                    if ext in language_map or ext in ['.txt', '.yaml', '.yml', '.toml']:
                        lines = len(item.read_text(encoding='utf-8').splitlines())
                        total_lines += lines
                        
                        # Check if it's a key file
                        if item.name in key_patterns:
                            key_files.append({
                                'path': str(item.relative_to(self.project_dir)),
                                'lines': lines,
                                'language': language_map.get(ext, 'Text'),
                                'description': self._get_file_description(item.name)
                            })
                except (UnicodeDecodeError, PermissionError):
                    # Skip binary or unreadable files
                    pass
        
        analysis = {
            'analyzed_at': datetime.utcnow().isoformat() + 'Z',
            'total_files': total_files,
            'total_lines': total_lines,
            'languages': languages,
            'structure': {
                'directories': sorted(directories)[:50],  # Limit to top 50
                'key_files': key_files
            }
        }
        
        # Save analysis
        self.save_analysis(analysis)
        
        return analysis
    
    def _get_file_description(self, filename: str) -> str:
        """Get description for known file types."""
        descriptions = {
            'package.json': 'Node.js dependencies and scripts',
            'requirements.txt': 'Python dependencies',
            'go.mod': 'Go module definition',
            'Cargo.toml': 'Rust dependencies',
            'main.py': 'Python entry point',
            'main.ts': 'TypeScript entry point',
            'main.js': 'JavaScript entry point',
            'index.ts': 'TypeScript index file',
            'index.js': 'JavaScript index file',
            'app.py': 'Application entry point',
            'server.py': 'Server entry point',
            'README.md': 'Project documentation',
            'Makefile': 'Build automation',
            'Dockerfile': 'Container configuration'
        }
        return descriptions.get(filename, 'Project file')
    
    def get_comprehensive_context(self) -> Dict:
        """
        Get comprehensive project context for AI generation.
        
        Gathers:
        - Project structure and languages
        - README content
        - Dependencies (package.json, requirements.txt)
        - Git history summary
        - Existing features/notes
        
        Returns:
            Dictionary with comprehensive project context
        """
        context = {}
        
        # 1. Get codebase analysis
        analysis = self.get_analysis()
        if not analysis:
            analysis = self.analyze_codebase()
        
        context['project_structure'] = {
            'total_files': analysis.get('total_files', 0),
            'total_lines': analysis.get('total_lines', 0),
            'languages': analysis.get('languages', {}),
            'key_files': analysis.get('structure', {}).get('key_files', [])
        }
        
        # 2. Get README content
        readme_paths = ['README.md', 'readme.md', 'README.txt']
        readme_content = None
        for readme_name in readme_paths:
            readme_file = self.project_dir / readme_name
            if readme_file.exists():
                try:
                    readme_content = readme_file.read_text(encoding='utf-8')
                    # Limit README to first 2000 chars to avoid token overflow
                    if len(readme_content) > 2000:
                        readme_content = readme_content[:2000] + "\\n\\n[README truncated...]"
                    break
                except (UnicodeDecodeError, PermissionError):
                    pass
        
        context['readme'] = readme_content or "No README found"
        
        # 3. Get dependencies
        dependencies = {}
        
        # Node.js dependencies
        package_json = self.project_dir / 'package.json'
        if package_json.exists():
            try:
                pkg_data = json.loads(package_json.read_text(encoding='utf-8'))
                dependencies['node'] = {
                    'dependencies': list(pkg_data.get('dependencies', {}).keys())[:20],
                    'devDependencies': list(pkg_data.get('devDependencies', {}).keys())[:20]
                }
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        
        # Python dependencies
        requirements_txt = self.project_dir / 'requirements.txt'
        if requirements_txt.exists():
            try:
                reqs = requirements_txt.read_text(encoding='utf-8').strip().split('\\n')
                # Extract package names (before ==, >=, etc.)
                dependencies['python'] = [
                    req.split('==')[0].split('>=')[0].split('<=')[0].strip()
                    for req in reqs if req.strip() and not req.startswith('#')
                ][:20]
            except (UnicodeDecodeError, PermissionError):
                pass
        
        context['dependencies'] = dependencies
        
        # 4. Get git history summary (if available)
        git_dir = self.project_dir / '.git'
        if git_dir.exists():
            try:
                import subprocess
                # Get recent commits (last 10)
                result = subprocess.run(
                    ['git', 'log', '--oneline', '-10'],
                    cwd=self.project_dir,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    context['git_history'] = result.stdout.strip()
                else:
                    context['git_history'] = "Git history unavailable"
            except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
                context['git_history'] = "Git history unavailable"
        else:
            context['git_history'] = "Not a git repository"
        
        # 5. Get project notes
        context['notes'] = self.get_notes() or "No project notes"
        
        # 6. Get project name
        context['project_name'] = self.project_dir.name
        
        return context
    
    def get_all_context(self) -> Dict:
        """Get all context data."""
        return {
            'notes': self.get_notes(),
            'codebase_analysis': self.get_analysis(),
            'config': self.get_config()
        }

