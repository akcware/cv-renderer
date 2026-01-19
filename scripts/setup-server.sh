#!/bin/bash
set -e

# CV Rendering System - Server Setup Script
# Run this script on your VPS to set up the environment

echo "🔧 CV Renderer Server Setup"
echo "============================"
echo ""

# Interactive configuration
if [ -z "$APP_USER" ]; then
    read -p "Enter application user [resume]: " APP_USER
    APP_USER="${APP_USER:-resume}"
fi

if [ -z "$APP_PATH" ]; then
    read -p "Enter application path [/var/www/resume]: " APP_PATH
    APP_PATH="${APP_PATH:-/var/www/resume}"
fi

if [ -z "$APP_PORT" ]; then
    read -p "Enter application port [3000]: " APP_PORT
    APP_PORT="${APP_PORT:-3000}"
fi

if [ -z "$DOMAIN" ]; then
    read -p "Enter domain name (leave empty for none): " DOMAIN
fi

echo ""
echo "📋 Setup Configuration:"
echo "   User: ${APP_USER}"
echo "   Path: ${APP_PATH}"
echo "   Port: ${APP_PORT}"
echo "   Domain: ${DOMAIN:-none (will use IP)}"
echo ""
read -p "Continue with setup? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled"
    exit 0
fi
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  This script requires sudo privileges"
    echo "Please run with: sudo bash setup-server.sh"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "📥 Installing dependencies..."
apt-get install -y curl unzip nginx

# Install Bun
if ! command -v bun &> /dev/null; then
    echo "📥 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.38"

    # Make bun available system-wide
    ln -sf /root/.bun/bin/bun /usr/local/bin/bun
else
    echo "✅ Bun already installed"
fi

# Install Chromium for PDF generation
echo "📥 Installing Chromium for PDF generation..."
apt-get install -y chromium-browser

# Create application user if doesn't exist
if ! id "$APP_USER" &>/dev/null; then
    echo "👤 Creating application user: ${APP_USER}"
    useradd -r -m -d "/home/${APP_USER}" -s /bin/bash "$APP_USER"
else
    echo "✅ User ${APP_USER} already exists"
fi

# Install Bun for the app user
echo "📥 Installing Bun for ${APP_USER}..."
sudo -u "$APP_USER" bash -c 'curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.38"'

# Create application directory
echo "📁 Creating application directory: ${APP_PATH}"
mkdir -p "$APP_PATH"
chown -R "${APP_USER}:${APP_USER}" "$APP_PATH"

# Create .env file
echo "📝 Creating .env file..."
cat > "${APP_PATH}/.env" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0
BASE_URL=${DOMAIN:+https://${DOMAIN}}
EOF
chown "${APP_USER}:${APP_USER}" "${APP_PATH}/.env"

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/cv-renderer.service <<EOF
[Unit]
Description=CV Renderer - Resume/CV web service
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_PATH}
Environment="NODE_ENV=production"
Environment="PORT=${APP_PORT}"
Environment="HOST=0.0.0.0"
ExecStart=/home/${APP_USER}/.bun/bin/bun src/index.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cv-renderer

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_PATH}/output

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
if [ -n "$DOMAIN" ]; then
    echo "🌐 Configuring Nginx for domain: ${DOMAIN}"
    cat > "/etc/nginx/sites-available/${DOMAIN}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Increase timeouts for PDF generation
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
    }

    # Increase client body size for file uploads
    client_max_body_size 10M;
}
EOF

    # Enable site
    ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"

    echo ""
    echo "📝 To enable SSL with Let's Encrypt, run:"
    echo "   apt-get install -y certbot python3-certbot-nginx"
    echo "   certbot --nginx -d ${DOMAIN}"
else
    echo "🌐 Configuring Nginx for IP access..."
    cat > "/etc/nginx/sites-available/default" <<EOF
server {
    listen 80 default_server;

    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Increase timeouts for PDF generation
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
    }

    client_max_body_size 10M;
}
EOF
fi

# Test and reload Nginx
echo "🔄 Testing Nginx configuration..."
nginx -t && systemctl reload nginx

# Enable and start services
echo "🚀 Enabling services..."
systemctl daemon-reload
systemctl enable nginx
systemctl enable cv-renderer

echo ""
echo "✅ Server setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Deploy your application:"
echo "      On your local machine, run: bash scripts/deploy.sh"
echo ""
echo "   2. Manage the service:"
echo "      sudo systemctl start cv-renderer    # Start the service"
echo "      sudo systemctl stop cv-renderer     # Stop the service"
echo "      sudo systemctl restart cv-renderer  # Restart the service"
echo "      sudo systemctl status cv-renderer   # Check status"
echo ""
echo "   3. View logs:"
echo "      sudo journalctl -u cv-renderer -f  # Follow logs"
echo ""
if [ -n "$DOMAIN" ]; then
    echo "   4. Your site will be available at: http://${DOMAIN}"
    echo "      (Configure SSL with certbot for HTTPS)"
else
    echo "   4. Your site will be available at: http://YOUR_SERVER_IP"
fi
echo ""
