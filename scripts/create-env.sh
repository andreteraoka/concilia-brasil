#!/bin/bash

# Create .env file for GitHub Actions build
# This script should be run before deploying to production

cat > .env << 'EOF'
# Build-time environment variables for GitHub Actions
# Production values should be configured in Azure App Service

NODE_ENV=production
APP_NAME=concilia-brasil

# Database (set in Azure App Service)
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/concilia"

# Security
JWT_SECRET="build-time-secret-temporary"

# Storage
STORAGE_PROVIDER=local

# AI
AI_PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF

echo ".env file created for build"
