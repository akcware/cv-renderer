#!/bin/bash
set -e

# CV Rendering System - VPS Deployment Script
# This script helps deploy the application to a VPS server

echo "🚀 Starting deployment..."
echo ""

# Interactive configuration
if [ -z "$DEPLOY_USER" ]; then
    read -p "Enter SSH user for deployment [resume]: " DEPLOY_USER
    DEPLOY_USER="${DEPLOY_USER:-resume}"
fi

if [ -z "$DEPLOY_HOST" ]; then
    read -p "Enter server hostname or IP address: " DEPLOY_HOST
    if [ -z "$DEPLOY_HOST" ]; then
        echo "❌ Server hostname is required"
        exit 1
    fi
fi

if [ -z "$DEPLOY_PATH" ]; then
    read -p "Enter deployment path [/var/www/resume]: " DEPLOY_PATH
    DEPLOY_PATH="${DEPLOY_PATH:-/var/www/resume}"
fi

if [ -z "$SERVICE_NAME" ]; then
    SERVICE_NAME="cv-renderer"
fi

echo ""
echo "📋 Deployment Configuration:"
echo "   User: ${DEPLOY_USER}"
echo "   Host: ${DEPLOY_HOST}"
echo "   Path: ${DEPLOY_PATH}"
echo "   Service: ${SERVICE_NAME}"
echo ""
read -p "Continue with deployment? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi
echo ""

# Check if SSH connection works
echo "📡 Testing SSH connection to ${DEPLOY_USER}@${DEPLOY_HOST}..."
if ! ssh -q "${DEPLOY_USER}@${DEPLOY_HOST}" exit; then
    echo "❌ Cannot connect to server. Please check your SSH configuration."
    echo "Make sure you have:"
    echo "  1. SSH key set up (~/.ssh/id_rsa or ~/.ssh/id_ed25519)"
    echo "  2. Correct DEPLOY_USER and DEPLOY_HOST environment variables"
    exit 1
fi

echo "✅ SSH connection successful"

# Create deployment directory if it doesn't exist
echo "📁 Creating deployment directory..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p ${DEPLOY_PATH}"

# Sync files (excluding node_modules, output, and git)
echo "📦 Syncing files to server..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'output' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '*.log' \
    ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

# Install dependencies and build on server
echo "📥 Installing dependencies on server..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "cd ${DEPLOY_PATH} && bun install --production"

# Pre-build all CVs
echo "🔨 Pre-building all CVs..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "cd ${DEPLOY_PATH} && bun run build:all"

# Restart the service
echo "🔄 Restarting service..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo systemctl restart ${SERVICE_NAME}"

# Check service status
echo "🔍 Checking service status..."
if ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo systemctl is-active --quiet ${SERVICE_NAME}"; then
    echo "✅ Service is running"
else
    echo "⚠️  Service may not be running. Check logs with:"
    echo "   ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'sudo journalctl -u ${SERVICE_NAME} -n 50'"
fi

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "  • View logs: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'sudo journalctl -u ${SERVICE_NAME} -f'"
echo "  • Check status: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'sudo systemctl status ${SERVICE_NAME}'"
echo "  • Visit your site: http://${DEPLOY_HOST}"
