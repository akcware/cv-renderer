# Deployment Scripts

This directory contains scripts and configuration files for deploying the CV Rendering System to a VPS.

## Files

### Scripts

- **`setup-server.sh`** - Run this on your VPS to configure the server environment
  - Installs Bun, Nginx, Chromium
  - Creates application user and directories
  - Sets up systemd service
  - Configures Nginx reverse proxy
  - Interactive configuration prompts

- **`deploy.sh`** - Run this locally to deploy your application
  - Syncs files to server via rsync
  - Installs dependencies
  - Pre-builds all CVs
  - Restarts the service
  - Interactive configuration prompts

### Configuration Files

- **`cv-renderer.service`** - systemd service file template
  - Manages the Node.js/Bun application
  - Auto-restart on failure
  - Security hardening options

- **`nginx.conf.example`** - Nginx reverse proxy configuration template
  - HTTP and HTTPS examples
  - Proxy settings optimized for PDF generation
  - SSL configuration with Let's Encrypt

### Environment

- **`.env.example`** - Environment variable template (in project root)
  - Copy to `.env` and customize
  - Contains PORT, HOST, NODE_ENV settings

## Quick Start

### 1. Set Up Server

On your VPS:

```bash
# Copy script to server
scp scripts/setup-server.sh root@your-server.com:~

# Run setup
ssh root@your-server.com
sudo bash setup-server.sh
```

### 2. Deploy Application

From your local machine:

```bash
# Using npm/bun script
bun run deploy

# Or directly
bash scripts/deploy.sh
```

### 3. Manage Service

```bash
# Check status
ssh resume@your-server.com 'sudo systemctl status cv-renderer'

# View logs
ssh resume@your-server.com 'sudo journalctl -u cv-renderer -f'

# Restart service
ssh resume@your-server.com 'sudo systemctl restart cv-renderer'
```

## Environment Variables

### For setup-server.sh

```bash
export APP_USER=resume              # Application user (default: resume)
export APP_PATH=/var/www/resume     # Installation path (default: /var/www/resume)
export APP_PORT=3000                # Application port (default: 3000)
export DOMAIN=yourdomain.com        # Domain name (optional)
```

### For deploy.sh

```bash
export DEPLOY_USER=resume           # SSH user (default: resume)
export DEPLOY_HOST=your-server.com  # Server hostname or IP (required)
export DEPLOY_PATH=/var/www/resume  # Deployment path (default: /var/www/resume)
export SERVICE_NAME=cv-renderer     # Service name (default: cv-renderer)
```

## Manual Deployment

If you prefer manual deployment:

### 1. Copy Files

```bash
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'output' \
    --exclude '.git' \
    --exclude '.env' \
    ./ resume@your-server.com:/var/www/resume/
```

### 2. Install & Build

```bash
ssh resume@your-server.com << 'EOF'
cd /var/www/resume
bun install --production
bun run build:all
EOF
```

### 3. Restart Service

```bash
ssh resume@your-server.com 'sudo systemctl restart cv-renderer'
```

## Customization

### Change Port

Edit `.env` on server:
```bash
PORT=8080
```

Restart service:
```bash
sudo systemctl restart cv-renderer
```

### Change Service User

Edit `/etc/systemd/system/cv-renderer.service`:
```ini
[Service]
User=myuser
Group=myuser
WorkingDirectory=/path/to/app
ExecStart=/home/myuser/.bun/bin/bun src/index.ts
ReadWritePaths=/path/to/app/output
```

Reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart cv-renderer
```

### Custom Nginx Configuration

Copy example and modify:
```bash
sudo cp scripts/nginx.conf.example /etc/nginx/sites-available/mysite
sudo nano /etc/nginx/sites-available/mysite
sudo ln -s /etc/nginx/sites-available/mysite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Script Permission Denied

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### SSH Connection Failed

Check:
1. SSH key is set up: `ssh-copy-id user@server`
2. Server is reachable: `ping your-server.com`
3. Correct username: Try `ssh user@server` manually

### Service Won't Start

Check logs:
```bash
sudo journalctl -u cv-renderer -n 50
```

Common issues:
- Port in use: Change PORT in `.env`
- Bun not found: Check path in service file
- Permissions: `sudo chown -R resume:resume /var/www/resume`

### Deployment Fails

Check:
1. SSH connection works: `ssh resume@server exit`
2. Rsync installed: `which rsync`
3. Sufficient disk space: `df -h`

## See Also

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Complete deployment guide
- [CLAUDE.md](../CLAUDE.md) - Project overview and architecture
