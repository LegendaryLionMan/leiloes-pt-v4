# Multi-stage Dockerfile for leiloes-pt-v4
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy package files first (cache layer)
COPY package*.json ./
RUN npm ci

# Build frontend
COPY . .
RUN npm run build

# Stage 2: Python backend with frontend dist
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/ ./app/
COPY vendor/ ./vendor/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist ./dist

# Environment
ENV PORT=8001 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

EXPOSE 8001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/api/kpis').read()" || exit 1

# Run uvicorn
CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]