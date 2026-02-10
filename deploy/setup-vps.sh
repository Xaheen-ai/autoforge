#!/usr/bin/env bash
# =============================================================================
# Xaheen VPS Setup Script
# =============================================================================
# Automates the setup of Xaheen on a fresh Ubuntu/Debian VPS.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/.../setup-vps.sh | bash
#   # Or download and run:
#   chmod +x setup-vps.sh && ./setup-vps.sh
#
# What this script does:
#   1. Installs system dependencies (Python 3.12, Node.js 20, git, nginx)
#   2. Clones Xaheen repository
#   3. Sets up Python virtual environment and installs dependencies
#   4. Builds the React frontend
#   5. Creates a systemd service for Xaheen
#   6. Configures nginx reverse proxy
#   7. Enables and starts the service
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="${XAHEEN_INSTALL_DIR:-/opt/xaheen}"
XAHEEN_USER="${XAHEEN_USER:-xaheen}"
XAHEEN_PORT="${XAHEEN_PORT:-8888}"
XAHEEN_REPO="${XAHEEN_REPO:-https://github.com/Xaheen-ai/xaheen.git}"

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (sudo)"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Xaheen VPS Setup"
echo "=========================================="
echo ""

# Step 1: System dependencies
log_info "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq \
    python3.12 python3.12-venv python3-pip \
    git curl wget nginx certbot python3-certbot-nginx \
    build-essential libffi-dev \
    > /dev/null 2>&1
log_ok "System dependencies installed"

# Install Node.js 20 (if not present)
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
    log_ok "Node.js $(node --version) installed"
else
    log_ok "Node.js $(node --version) already installed"
fi

# Step 2: Create service user
if ! id "$XAHEEN_USER" &>/dev/null; then
    log_info "Creating service user '$XAHEEN_USER'..."
    useradd --system --create-home --shell /bin/bash "$XAHEEN_USER"
    log_ok "User '$XAHEEN_USER' created"
else
    log_ok "User '$XAHEEN_USER' already exists"
fi

# Step 3: Clone or update Xaheen
if [ -d "$INSTALL_DIR/.git" ]; then
    log_info "Updating Xaheen..."
    cd "$INSTALL_DIR"
    sudo -u "$XAHEEN_USER" git pull --ff-only
    log_ok "Xaheen updated"
else
    log_info "Cloning Xaheen..."
    git clone "$XAHEEN_REPO" "$INSTALL_DIR"
    chown -R "$XAHEEN_USER:$XAHEEN_USER" "$INSTALL_DIR"
    log_ok "Xaheen cloned to $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Step 4: Python virtual environment
log_info "Setting up Python environment..."
sudo -u "$XAHEEN_USER" python3.12 -m venv "$INSTALL_DIR/venv"
sudo -u "$XAHEEN_USER" "$INSTALL_DIR/venv/bin/pip" install -q --upgrade pip
sudo -u "$XAHEEN_USER" "$INSTALL_DIR/venv/bin/pip" install -q -r requirements-prod.txt
log_ok "Python dependencies installed"

# Step 5: Build frontend
log_info "Building React frontend..."
cd "$INSTALL_DIR/ui"
sudo -u "$XAHEEN_USER" npm ci --production=false --silent
sudo -u "$XAHEEN_USER" npm run build
cd "$INSTALL_DIR"
log_ok "Frontend built"

# Step 6: Install Playwright MCP (pinned)
log_info "Installing Playwright MCP..."
sudo -u "$XAHEEN_USER" npm install -g @playwright/mcp@0.0.30
sudo -u "$XAHEEN_USER" npx playwright install --with-deps chromium > /dev/null 2>&1
log_ok "Playwright MCP installed"

# Step 7: Create .env if it doesn't exist
if [ ! -f "$INSTALL_DIR/.env" ]; then
    log_info "Creating .env from template..."
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    chown "$XAHEEN_USER:$XAHEEN_USER" "$INSTALL_DIR/.env"
    chmod 600 "$INSTALL_DIR/.env"
    log_warn "Edit $INSTALL_DIR/.env to set your API keys!"
fi

# Step 8: Create projects directory
mkdir -p /data/xaheen/projects
chown -R "$XAHEEN_USER:$XAHEEN_USER" /data/xaheen

# Step 9: systemd service
log_info "Creating systemd service..."
cat > /etc/systemd/system/xaheen.service << EOF
[Unit]
Description=Xaheen Autonomous Coding Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$XAHEEN_USER
Group=$XAHEEN_USER
WorkingDirectory=$INSTALL_DIR
Environment=PATH=$INSTALL_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=XAHEEN_ALLOW_REMOTE=1
Environment=PLAYWRIGHT_HEADLESS=true
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port $XAHEEN_PORT
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=xaheen

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=$INSTALL_DIR /data/xaheen
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF
log_ok "systemd service created"

# Step 10: nginx config
log_info "Configuring nginx..."
cp "$INSTALL_DIR/deploy/nginx.conf" /etc/nginx/sites-available/xaheen
ln -sf /etc/nginx/sites-available/xaheen /etc/nginx/sites-enabled/xaheen

# Test nginx config
if nginx -t > /dev/null 2>&1; then
    log_ok "nginx configuration valid"
else
    log_error "nginx configuration invalid — check /etc/nginx/sites-available/xaheen"
fi

# Step 11: Enable and start services
log_info "Starting services..."
systemctl daemon-reload
systemctl enable xaheen
systemctl restart xaheen
systemctl restart nginx
log_ok "Services started"

# Final status check
sleep 2
if systemctl is-active --quiet xaheen; then
    log_ok "Xaheen is running!"
else
    log_error "Xaheen failed to start. Check: journalctl -u xaheen -f"
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "  Xaheen is running at: http://$(hostname -I | awk '{print $1}'):80"
echo ""
echo "  Next steps:"
echo "  1. Edit $INSTALL_DIR/.env with your API keys"
echo "  2. Restart: systemctl restart xaheen"
echo "  3. (Optional) Set up SSL: certbot --nginx"
echo ""
echo "  Useful commands:"
echo "    journalctl -u xaheen -f    # View logs"
echo "    systemctl status xaheen    # Check status"
echo "    systemctl restart xaheen   # Restart"
echo ""
