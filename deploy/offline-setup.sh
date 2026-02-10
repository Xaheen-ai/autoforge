#!/usr/bin/env bash
# =============================================================================
# AutoForge Offline Setup Script
# =============================================================================
# Pre-downloads all dependencies for air-gapped/offline VPS operation.
#
# Run this script ONCE while connected to the internet, then copy the entire
# AutoForge directory to your offline VPS.
#
# Usage:
#   chmod +x deploy/offline-setup.sh
#   ./deploy/offline-setup.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "=========================================="
echo "  AutoForge Offline Preparation"
echo "=========================================="
echo ""

# Step 1: Download Python wheels
log_info "Downloading Python packages..."
mkdir -p "$ROOT_DIR/offline/wheels"
pip download \
    -r "$ROOT_DIR/requirements-prod.txt" \
    -d "$ROOT_DIR/offline/wheels" \
    --no-cache-dir
log_ok "Python packages saved to offline/wheels/"

# Step 2: Install Playwright MCP globally (pinned version)
log_info "Installing Playwright MCP (pinned version)..."
npm install -g @playwright/mcp@0.0.30
log_ok "Playwright MCP installed globally"

# Step 3: Download Playwright browsers
log_info "Downloading Playwright browsers..."
npx playwright install --with-deps chromium
log_ok "Playwright browsers downloaded"

# Step 4: Install npm dependencies for UI
log_info "Installing UI npm dependencies..."
cd "$ROOT_DIR/ui"
npm ci --production=false
log_ok "UI npm dependencies installed"

# Step 5: Build frontend
log_info "Building React frontend..."
npm run build
cd "$ROOT_DIR"
log_ok "Frontend built to ui/dist/"

# Step 6: Create Python venv and install from local wheels
log_info "Setting up Python virtual environment from local wheels..."
python3 -m venv "$ROOT_DIR/venv"
"$ROOT_DIR/venv/bin/pip" install --upgrade pip
"$ROOT_DIR/venv/bin/pip" install \
    --no-index \
    --find-links="$ROOT_DIR/offline/wheels" \
    -r "$ROOT_DIR/requirements-prod.txt"
log_ok "Python venv ready (offline-compatible)"

echo ""
echo "=========================================="
echo "  Offline Preparation Complete!"
echo "=========================================="
echo ""
echo "  Your AutoForge installation is ready for offline use."
echo ""
echo "  To deploy on an offline VPS:"
echo "  1. Copy this entire directory to the VPS"
echo "  2. Set AUTOFORGE_OFFLINE_MODE=1 in .env"
echo "  3. Run: python start_ui.py --host 0.0.0.0"
echo ""
echo "  Offline pip install (on VPS):"
echo "    pip install --no-index --find-links=offline/wheels -r requirements-prod.txt"
echo ""
