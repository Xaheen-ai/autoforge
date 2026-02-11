# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Autonomous coding agent system (npm package: `xaheen`) with a React UI. Uses the Claude Agent SDK to build complete applications via a two-agent pattern:

1. **Initializer Agent** - First session reads an app spec and creates features in a SQLite database
2. **Coding Agent** - Subsequent sessions implement features one by one, marking them as passing

**Prerequisites:** Python 3.11+, Node.js 20+, Claude Code CLI

## Commands

### Running the Server

```bash
# From source (development)
./start_ui.sh                    # macOS/Linux - builds UI + starts FastAPI server
python start_ui.py --dev         # Dev mode with Vite hot reload

# Direct server (after venv setup)
uvicorn server.main:app --reload --port 8888

# npm global install (end-user mode)
xaheen                           # Start server (auto-provisions venv at ~/.xaheen/venv/)
xaheen --repair                  # Recreate venv from scratch
```

### Running the Agent

```bash
python autonomous_agent_demo.py --project-dir my-app
python autonomous_agent_demo.py --project-dir my-app --yolo          # Skip testing
python autonomous_agent_demo.py --project-dir my-app --parallel --max-concurrency 3
python autonomous_agent_demo.py --project-dir my-app --batch-size 3
```

### React UI Development

```bash
cd ui && npm install
npm run dev          # Vite dev server with hot reload
npm run build        # TypeScript check + production build (required for start_ui.sh)
npm run lint         # ESLint
```

## Testing

### Python

```bash
ruff check .                                   # Lint
mypy .                                         # Type check
python test_security.py                        # Security unit tests
python test_security_integration.py            # Security integration tests
python -m pytest test_client.py                # Client tests
python -m pytest test_dependency_resolver.py   # Dependency resolver tests
python -m pytest test_rate_limit_utils.py      # Rate limit tests

# Run a single test by name
python -m pytest test_client.py -k "test_name"
```

### React UI

```bash
cd ui
npm run lint          # ESLint
npm run build         # Type check + build (Vite 7)
npm run test:e2e      # Playwright end-to-end tests
npm run test:e2e:ui   # Playwright tests with interactive UI
```

### CI (GitHub Actions)

Runs on push/PR to master (`.github/workflows/ci.yml`):
- **Python**: ruff lint + security tests
- **UI**: ESLint + TypeScript build

### Code Quality Config (`pyproject.toml`)

- ruff: line-length 120, Python 3.11, rules E/F/I/W, ignores E501/E402/E712
- mypy: strict return types, ignores missing imports

## Architecture

### Two-Layer System

**npm CLI** (`bin/xaheen.js`, `lib/cli.js`) - Node.js wrapper that manages Python venv at `~/.xaheen/venv/`, starts uvicorn, handles `.env` from `~/.xaheen/.env`. Published to npm as `xaheen`.

**Python Backend** - FastAPI server (`server/main.py`) + agent runtime. The server provides REST/WebSocket APIs consumed by the React UI.

### Core Agent Pipeline

`autonomous_agent_demo.py` → `agent.py` (session loop) → `client.py` (ClaudeSDKClient with security hooks + MCP servers) → Claude Agent SDK

Key modules:
- `xaheen_paths.py` - Central path resolution with dual-path backward compatibility (`.xaheen/` vs legacy root-level files)
- `prompts.py` - Prompt template loading with fallback: project-specific `.xaheen/prompts/{name}.md` → `.claude/templates/{name}.template.md`
- `security.py` - Hierarchical bash command allowlist (hardcoded blocklist > org config > global allowlist > project allowlist)
- `registry.py` - Project name → path mapping via SQLite at `~/.xaheen/registry.db`
- `parallel_orchestrator.py` - Concurrent agent execution (max 5 coding + 5 testing agents)
- `rate_limit_utils.py` - Rate limit detection with exponential backoff and jitter

### Server API (`server/`)

FastAPI app in `server/main.py`. Routers in `server/routers/`, services in `server/services/`.

Key routers: `projects.py` (CRUD + registry), `features.py`, `agent.py` (start/stop/pause/resume), `terminal.py` (PTY via WebSocket), `schedules.py`, `settings.py`

Key services: `process_manager.py` (agent lifecycle), `terminal_manager.py` (PTY sessions), `scheduler_service.py` (APScheduler), `dev_server_manager.py`

### Feature Management

Features stored in SQLite (`features.db`) via SQLAlchemy (`api/database.py`). The agent interacts with features through an MCP server (`mcp_server/feature_mcp.py`) that exposes tools like `feature_get_ready`, `feature_claim_and_get`, `feature_mark_passing`, `feature_create_bulk`, etc.

Dependency resolution uses Kahn's algorithm + DFS for cycle detection (`api/dependency_resolver.py`).

### React UI (`ui/`)

Tech stack: React 19, TypeScript, Vite 7, TanStack Query, Tailwind CSS v4, Radix UI, @xyflow/react (graph), xterm.js (terminal)

- `src/App.tsx` - Main app: project selection, kanban board, agent controls
- `src/hooks/useWebSocket.ts` - Real-time updates via WebSocket
- `src/hooks/useProjects.ts` - React Query hooks
- `src/lib/api.ts` - REST API client
- `src/lib/types.ts` - TypeScript types

### Real-time Updates

WebSocket at `/ws/projects/{project_name}` sends: `progress`, `agent_status`, `log`, `feature_update`, `agent_update`

### Generated Project Structure

Each managed project contains:
- `.xaheen/prompts/app_spec.txt` - App specification (XML format)
- `.xaheen/prompts/initializer_prompt.md` / `coding_prompt.md` - Agent prompts
- `.xaheen/features.db` - Feature database
- `.xaheen/allowed_commands.yaml` - Optional project-specific bash allowlist

Legacy projects with root-level files are auto-migrated to `.xaheen/` on next agent start.

### Security Model

Defense-in-depth in `client.py`: OS sandbox → filesystem restriction to project dir → bash command allowlist. Command hierarchy (highest priority first): hardcoded blocklist (`security.py`) → org blocklist (`~/.xaheen/config.yaml`) → org allowlist → global allowlist → project allowlist (`.xaheen/allowed_commands.yaml`). See `examples/` for config templates.

### Design System

Neobrutalism design with Tailwind CSS v4. Theme variables in `ui/src/styles/globals.css` via `@theme`. Color tokens: `--color-neo-pending` (yellow), `--color-neo-progress` (cyan), `--color-neo-done` (green). Custom animations: `animate-slide-in`, `animate-pulse-neo`, `animate-shimmer`.

## Claude Code Integration

**Slash commands** (`.claude/commands/`): `/create-spec`, `/expand-project`, `/gsd-to-xaheen-spec`, `/check-code`, `/checkpoint`, `/review-pr`

**Custom agents** (`.claude/agents/`): `coder.md` (code implementation), `code-review.md` (quality review), `deep-dive.md` (analysis/debugging)

**Skills** (`.claude/skills/`): `frontend-design` (production-grade UI), `gsd-to-autoforge-spec` (GSD → app_spec conversion)

**Templates** (`.claude/templates/`): Prompt templates copied to new projects on creation
