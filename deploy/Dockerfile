# AutoForge VPS Deployment
# ========================
# Multi-stage build: Node.js for frontend, Python for backend

FROM node:20-slim AS frontend-builder

WORKDIR /build/ui
COPY ui/package*.json ./
RUN npm ci --production=false
COPY ui/ ./
RUN npm run build

# ============================================================================

FROM python:3.12-slim AS runtime

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (needed for Playwright MCP and project dev servers)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright MCP globally (pinned version for offline reliability)
RUN npm install -g @playwright/mcp@0.0.30

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Set up app directory
WORKDIR /app

# Install Python dependencies (production only)
COPY requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application code
COPY *.py ./
COPY server/ ./server/
COPY skills/ ./skills/
COPY templates/ ./templates/

# Copy pre-built frontend
COPY --from=frontend-builder /build/ui/dist ./ui/dist

# Create projects directory
RUN mkdir -p /data/projects /data/db

# Environment defaults
ENV AUTOFORGE_ALLOW_REMOTE=1
ENV PLAYWRIGHT_HEADLESS=true
ENV AUTOFORGE_DB_PATH=/data/db/autoforge.db
ENV PYTHONUNBUFFERED=1

EXPOSE 8888

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8888/api/health || exit 1

CMD ["python", "-m", "uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8888"]
