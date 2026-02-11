"""
AI Assistant Service
====================

Provides AI-powered analysis and generation capabilities.
Now uses REAL AI providers (Anthropic Claude) instead of mock responses.
"""

from typing import Any, Dict, List, Optional, Callable
import os
from datetime import datetime, UTC
from pathlib import Path
import json
import sys

# Add root to path for registry import
ROOT_DIR = Path(__file__).parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from registry import get_setting, get_effective_sdk_env


class AIAssistant:
    """AI assistant for code analysis and suggestions using real AI providers."""
    
    def __init__(self, use_mock: bool = False, progress_callback: Optional[Callable[[str, int, str], None]] = None):
        """
        Initialize AI Assistant.
        
        Args:
            use_mock: If True, use mock responses instead of real AI
            progress_callback: Optional callback for progress updates (stage, progress, message)
        """
        self.use_mock = use_mock
        self.progress_callback = progress_callback

    
    def _call_ai(self, prompt: str, system: str = "", max_tokens: int = 4000) -> str:
        """
        Make a direct AI API call using HTTP requests.
        Works with any Anthropic-compatible API (Claude, GLM, etc.)
        
        Args:
            prompt: User prompt
            system: System prompt
            max_tokens: Maximum tokens to generate
            
        Returns:
            AI response text
        """
        if self.use_mock:
            return ""
        
        try:
            import json
            import urllib.request
            import urllib.error
            
            # Get SDK environment from registry
            sdk_env = get_effective_sdk_env()
            
            # Get API configuration
            api_key = sdk_env.get("ANTHROPIC_API_KEY") or sdk_env.get("ANTHROPIC_AUTH_TOKEN")
            base_url = sdk_env.get("ANTHROPIC_BASE_URL")
            model = sdk_env.get("ANTHROPIC_DEFAULT_OPUS_MODEL") or "claude-sonnet-4-20250514"
            
            if not api_key:
                print("⚠️  No API key configured. Using mock responses.")
                self.use_mock = True
                return ""
            
            if not base_url:
                print("⚠️  No API base URL configured. Using mock responses.")
                self.use_mock = True
                return ""
            
            # Construct API endpoint
            # Remove trailing slash and add /v1/messages
            endpoint = base_url.rstrip('/') + '/v1/messages'
            
            # Build request payload
            payload = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            if system:
                payload["system"] = system
            
            # Make HTTP request
            headers = {
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            }
            
            print(f"🔍 Making AI request to: {endpoint}")
            print(f"🔍 Model: {model}")
            
            request = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            with urllib.request.urlopen(request, timeout=60) as response:
                response_text = response.read().decode('utf-8')
                print(f"🔍 API Response (first 500 chars): {response_text[:500]}")
                
                result = json.loads(response_text)
                
                # Extract text from response
                if 'content' in result and len(result['content']) > 0:
                    return result['content'][0].get('text', '')
                
                print(f"⚠️  Unexpected response structure: {result.keys()}")
                return ""
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            print(f"⚠️  AI API call failed (HTTP {e.code}): {error_body}")
            print("   Falling back to mock response for this request.")
            return ""
        except urllib.error.URLError as e:
            print(f"⚠️  AI API call failed (Network error): {e.reason}")
            print("   Falling back to mock response for this request.")
            return ""
        except json.JSONDecodeError as e:
            print(f"⚠️  Failed to parse API response as JSON: {e}")
            print(f"   Response was: {response_text[:200] if 'response_text' in locals() else 'N/A'}")
            print("   Falling back to mock response for this request.")
            return ""
        except Exception as e:
            print(f"⚠️  AI API call failed: {e}")
            print("   Falling back to mock response for this request.")
            return ""
    
    def _extract_json_from_response(self, text: str) -> str:
        """
        Extract JSON from AI response, handling markdown code blocks.
        
        GLM and other models often wrap JSON in ```json ... ``` blocks.
        This function strips those markers to get clean JSON.
        
        Args:
            text: Raw AI response text
            
        Returns:
            Clean JSON string
        """
        if not text:
            return text
        
        # Remove markdown code blocks (```json ... ``` or ``` ... ```)
        import re
        
        # Pattern: ```json\n{...}\n``` or ```\n{...}\n```
        pattern = r'```(?:json)?\s*\n?(.*?)\n?```'
        match = re.search(pattern, text, re.DOTALL)
        
        if match:
            return match.group(1).strip()
        
        # If no code block, return as-is
        return text.strip()


    
    def analyze_codebase(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze codebase structure and provide insights.
        
        Args:
            analysis: Codebase analysis from ContextManager
            
        Returns:
            Dictionary with insights and recommendations
        """
        if self.use_mock:
            return self._mock_analyze_codebase(analysis)
        
        # Build prompt for AI
        prompt = f"""Analyze this codebase and provide insights:

Total Files: {analysis.get('total_files', 0)}
Languages: {', '.join(analysis.get('languages', []))}
Dependencies: {len(analysis.get('dependencies', []))}

Provide:
1. Overall assessment (1-2 sentences)
2. Key strengths (2-3 points)
3. Areas for improvement (2-3 points)
4. Recommended next steps (2-3 actions)

Format as JSON with keys: assessment, strengths (array), improvements (array), next_steps (array)"""

        system = "You are an expert software architect analyzing codebases. Provide concise, actionable insights."
        
        response_text = self._call_ai(prompt, system)
        
        if not response_text:
            # Fallback to mock if AI call failed
            return self._mock_analyze_codebase(analysis)
        
        # Extract JSON from response (handles markdown code blocks)
        json_text = self._extract_json_from_response(response_text)
        
        try:
            # Parse JSON response
            result = json.loads(json_text)
            return result
        except json.JSONDecodeError:
            # If not valid JSON, return structured fallback
            return {
                "assessment": response_text[:200],
                "strengths": [],
                "improvements": [],
                "next_steps": []
            }
    
    def generate_ideas(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate improvement ideas based on comprehensive project context.
        
        Args:
            context: Comprehensive project context from get_comprehensive_context()
            
        Returns:
            List of 10-15 idea dictionaries
        """
        if self.use_mock:
            return self._mock_generate_ideas(context)
        
        # Extract comprehensive context
        project_name = context.get('project_name', 'Unknown')
        project_structure = context.get('project_structure', {})
        languages = project_structure.get('languages', {})
        total_files = project_structure.get('total_files', 0)
        readme = context.get('readme', 'No README')[:500]  # Limit for prompt
        dependencies = context.get('dependencies', {})
        notes = context.get('notes', 'No notes')[:300]
        
        # Build rich context prompt
        lang_summary = ', '.join([f"{lang} ({count} files)" for lang, count in list(languages.items())[:5]])
        dep_summary = ''
        if dependencies.get('node'):
            node_deps = ', '.join(dependencies['node'].get('dependencies', [])[:10])
            dep_summary += f"\nNode.js: {node_deps}"
        if dependencies.get('python'):
            py_deps = ', '.join(dependencies['python'][:10])
            dep_summary += f"\nPython: {py_deps}"
        
        prompt = f"""Analyze this project and generate 10-15 specific, actionable improvement ideas.

## Project Context

**Project**: {project_name}
**Languages**: {lang_summary}
**Total Files**: {total_files}

**README Summary**:
{readme}

**Dependencies**:{dep_summary}

**Project Notes**:
{notes}

## Task

Generate 10-15 improvement ideas across these categories:
1. **Low-Hanging Fruit** (3-4 ideas): Quick wins that build on existing patterns
2. **UI/UX Improvements** (3-4 ideas): Visual and interaction enhancements
3. **High-Value Features** (4-6 ideas): Strategic features that serve target users
4. **Technical Debt** (2-3 ideas): Refactoring, optimization, or bug fixes

## Requirements

For each idea:
- **title**: Concise, actionable (max 60 chars)
- **description**: Clear explanation with specific details (2-3 sentences)
- **category**: One of [feature, refactor, optimization, bug-fix]
- **priority**: One of [high, medium, low] based on impact and urgency
- **effort**: One of [small, medium, large] based on implementation complexity

## Output Format

Return ONLY a JSON array of objects. Each object must have: title, description, category, priority, effort

Example:
[
  {{
    "title": "Add dark mode support",
    "description": "Implement dark mode theme with user preference persistence. Improves accessibility and reduces eye strain for users.",
    "category": "feature",
    "priority": "medium",
    "effort": "medium"
  }}
]"""

        system = """You are an expert software consultant with deep expertise in product development.
Analyze the project context carefully and generate specific, actionable ideas that:
1. Build on existing patterns and technologies
2. Address real user needs
3. Are technically feasible
4. Provide clear value

Be specific - avoid generic suggestions. Reference actual technologies, patterns, or features from the context."""
        
        response_text = self._call_ai(prompt, system, max_tokens=8000)
        
        if not response_text:
            print("⚠️  AI returned empty response, using mock ideas")
            return self._mock_generate_ideas()
        
        # Extract JSON from response (handles markdown code blocks)
        json_text = self._extract_json_from_response(response_text)
        
        try:
            # Parse JSON response
            ideas_raw = json.loads(json_text)
            
            # Validate minimum count
            if len(ideas_raw) < 5:
                print(f"⚠️  AI generated only {len(ideas_raw)} ideas, expected 10-15. Using mock fallback.")
                return self._mock_generate_ideas()
            
            # Add IDs and timestamps
            ideas = []
            for i, idea in enumerate(ideas_raw):
                ideas.append({
                    'id': f'idea_{datetime.now(UTC).timestamp()}_{i}',
                    'title': idea.get('title', 'Untitled'),
                    'description': idea.get('description', ''),
                    'category': idea.get('category', 'feature'),
                    'priority': idea.get('priority', 'medium'),
                    'effort': idea.get('effort', 'medium'),
                    'created_at': datetime.now(UTC).isoformat() + 'Z',
                    'saved': False
                })
            
            print(f"✅ Generated {len(ideas)} ideas")
            return ideas
            
        except json.JSONDecodeError as e:
            print(f"⚠️  Failed to parse AI response: {e}")
            return self._mock_generate_ideas(context)
    
    def generate_roadmap(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive project roadmap based on context.
        
        Args:
            context: Comprehensive project context from get_comprehensive_context()
            
        Returns:
            Roadmap dictionary with 10-15 features organized into quarterly milestones
        """
        if self.use_mock:
            return self._mock_generate_roadmap(context)
        
        # Extract comprehensive context
        project_name = context.get('project_name', 'Unknown')
        timeframe = context.get('timeframe', '6_months')
        project_structure = context.get('project_structure', {})
        languages = project_structure.get('languages', {})
        readme = context.get('readme', 'No README')[:600]
        dependencies = context.get('dependencies', {})
        notes = context.get('notes', 'No notes')[:300]
        
        # Build context summary
        lang_summary = ', '.join([f"{lang} ({count})" for lang, count in list(languages.items())[:5]])
        
        prompt = f"""Analyze this project and create a strategic {timeframe.replace('_', ' ')} roadmap.

## Project Context

**Project**: {project_name}
**Languages**: {lang_summary}
**README Summary**:
{readme}

**Project Notes**:
{notes}

## Task

Create a comprehensive roadmap with 10-15 features organized into quarterly milestones.

### Requirements:

1. **Milestones**: Organize features into quarterly milestones (Q1 2026, Q2 2026, etc.)
2. **Features per Milestone**: 3-5 features each
3. **Feature Details**:
   - **title**: Clear, actionable name (max 60 chars)
   - **description**: What it accomplishes and why it matters (2-3 sentences)
   - **effort**: One of [small, medium, large]
   - **priority**: One of [high, medium, low]
   - **dependencies**: Array of feature IDs this depends on (use empty array [] if none)

4. **Prioritization**: Use MoSCoW framework:
   - **Must Have**: Critical features for Q1
   - **Should Have**: Important features for Q2
   - **Could Have**: Nice-to-have features for Q3+

5. **Dependencies**: Map logical dependencies (e.g., "User Dashboard" depends on "User Authentication")

## Output Format

Return ONLY a JSON object with this structure:

{{
  "milestones": [
    {{
      "quarter": "Q1 2026",
      "features": [
        {{
          "title": "User Authentication System",
          "description": "Implement secure JWT-based authentication with email/password and OAuth providers. Foundation for all user-specific features.",
          "effort": "large",
          "priority": "high",
          "dependencies": []
        }}
      ]
    }}
  ]
}}

**IMPORTANT**: Generate 10-15 total features across all milestones."""

        system = """You are an expert product strategist and technical architect.
Create realistic, achievable roadmaps that:
1. Build features in logical dependency order
2. Balance quick wins with strategic initiatives
3. Consider technical constraints and existing architecture
4. Provide clear business value"""
        
        response_text = self._call_ai(prompt, system, max_tokens=8000)
        
        if not response_text:
            print("⚠️  AI returned empty response, using mock roadmap")
            return self._mock_generate_roadmap(context)
        
        # Extract JSON from response (handles markdown code blocks)
        json_text = self._extract_json_from_response(response_text)
        
        try:
            roadmap_data = json.loads(json_text)
            
            # Validate and add IDs
            total_features = 0
            for milestone in roadmap_data.get('milestones', []):
                for i, feature in enumerate(milestone.get('features', [])):
                    feature['id'] = f'roadmap_{datetime.now(UTC).timestamp()}_{total_features}'
                    feature['status'] = 'planned'
                    total_features += 1
            
            # Validate minimum feature count
            if total_features < 5:
                print(f"⚠️  AI generated only {total_features} features, expected 10-15. Using mock fallback.")
                return self._mock_generate_roadmap()
            
            print(f"✅ Generated roadmap with {total_features} features across {len(roadmap_data.get('milestones', []))} milestones")
            return roadmap_data
            
        except json.JSONDecodeError as e:
            print(f"⚠️  Failed to parse AI response: {e}")
            return self._mock_generate_roadmap(context)
    
    def prioritize_features(self, features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prioritize features using AI.
        
        Args:
            features: List of feature dictionaries
            
        Returns:
            Sorted list of features by priority
        """
        if self.use_mock:
            return self._mock_prioritize_features(features)
        
        # For now, use mock implementation
        # Real AI prioritization can be added later
        return self._mock_prioritize_features(features)
    
    # ========================================================================
    # Mock Implementations (fallback)
    # ========================================================================
    
    def _mock_analyze_codebase(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze codebase and provide insights (mock)."""
        insights = []
        
        total_files = analysis.get('total_files', 0)
        if total_files > 100:
            insights.append("Large codebase - consider modularization")
        
        languages = analysis.get('languages', [])
        if len(languages) > 3:
            insights.append("Multi-language project - ensure consistent patterns")
        
        return {
            'assessment': f"Project has {total_files} files across {len(languages)} languages",
            'strengths': ['Well-structured', 'Good separation of concerns'],
            'improvements': insights or ['Add more tests', 'Improve documentation'],
            'next_steps': ['Review architecture', 'Add CI/CD']
        }
    
    def _mock_generate_ideas(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate improvement ideas (mock)."""
        import random
        
        languages = context.get('languages', [])
        ideas = []
        
        # JavaScript/TypeScript ideas
        if 'JavaScript' in languages or 'TypeScript' in languages:
            ideas.extend([
                {
                    'id': f'idea_{random.randint(1000, 9999)}',
                    'title': 'Add unit tests with Jest',
                    'description': 'Implement comprehensive unit tests using Jest to improve code reliability and catch bugs early.',
                    'category': 'feature',
                    'priority': 'high',
                    'effort': 'medium',
                    'created_at': datetime.now(UTC).isoformat() + 'Z',
                    'saved': False
                },
                {
                    'id': f'idea_{random.randint(1000, 9999)}',
                    'title': 'Implement error boundaries',
                    'description': 'Add React error boundaries to gracefully handle component errors and improve user experience.',
                    'category': 'feature',
                    'priority': 'high',
                    'effort': 'small',
                    'created_at': datetime.now(UTC).isoformat() + 'Z',
                    'saved': False
                }
            ])
        
        # Python ideas
        if 'Python' in languages:
            ideas.extend([
                {
                    'id': f'idea_{random.randint(1000, 9999)}',
                    'title': 'Add type hints to Python code',
                    'description': 'Use Python type hints (PEP 484) to improve code documentation and enable static type checking.',
                    'category': 'refactor',
                    'priority': 'medium',
                    'effort': 'medium',
                    'created_at': datetime.now(UTC).isoformat() + 'Z',
                    'saved': False
                }
            ])
        
        # General ideas
        ideas.extend([
            {
                'id': f'idea_{random.randint(1000, 9999)}',
                'title': 'Add comprehensive logging',
                'description': 'Implement structured logging throughout the application for better debugging and monitoring.',
                'category': 'feature',
                'priority': 'medium',
                'effort': 'medium',
                'created_at': datetime.now(UTC).isoformat() + 'Z',
                'saved': False
            }
        ])
        
        return ideas[:10]  # Return up to 10 ideas
    
    def _mock_generate_roadmap(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate project roadmap (mock)."""
        return {
            'milestones': [
                {
                    'quarter': 'Q1 2026',
                    'features': [
                        {
                            'id': 'roadmap_1',
                            'title': 'User Authentication',
                            'description': 'Implement secure user authentication system',
                            'effort': 'medium',
                            'priority': 'high',
                            'status': 'planned',
                            'dependencies': []
                        }
                    ]
                }
            ]
        }
    
    def _mock_prioritize_features(self, features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize features (mock)."""
        # Simple priority-based sorting
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        return sorted(features, key=lambda f: priority_order.get(f.get('priority', 'medium'), 1))
