# Deployment Guide

This guide covers deploying the CV Rendering System to a VPS server.

## Prerequisites

### On Your VPS
- Ubuntu 20.04+ or Debian 11+ (recommended)
- Root or sudo access
- At least 1GB RAM
- 10GB available disk space

### On Your Local Machine
- SSH access to your VPS
- SSH key configured for passwordless login
- rsync installed

## Quick Start

### 1. Initial Server Setup

SSH into your VPS and run the setup script:

```bash
# Copy the setup script to your server
scp scripts/setup-server.sh root@your-server.com:~

# SSH into your server
ssh root@your-server.com

# Run the setup script
sudo bash setup-server.sh
```

The script will interactively ask for:
- **Application user** (default: `resume`)
- **Application path** (default: `/var/www/resume`)
- **Application port** (default: `3000`)
- **Domain name** (optional, leave empty to use IP)

The setup script will:
- ✅ Update system packages
- ✅ Install Bun runtime
- ✅ Install Chromium for PDF generation
- ✅ Create application user
- ✅ Configure systemd service
- ✅ Set up Nginx reverse proxy
- ✅ Create directory structure

### 2. Deploy Your Application

From your local machine:

```bash
bun run deploy
```

Or directly:

```bash
bash scripts/deploy.sh
```

The deploy script will interactively ask for:
- **SSH user** (default: `resume`)
- **Server hostname/IP**
- **Deployment path** (default: `/var/www/resume`)

The deployment will:
- ✅ Test SSH connection
- ✅ Sync application files
- ✅ Install dependencies
- ✅ Pre-build all CVs
- ✅ Restart the service

### 3. Verify Deployment

Check if the service is running:

```bash
ssh resume@your-server.com 'sudo systemctl status cv-renderer'
```

View the CV:
- If you configured a domain: `http://yourdomain.com`
- Otherwise: `http://your-server-ip`

## Configuration

### Environment Variables

Create or edit `.env` on your server at `/var/www/resume/.env`:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BASE_URL=https://yourdomain.com
PDF_TIMEOUT=30000
```

After changing environment variables, restart the service:

```bash
sudo systemctl restart cv-renderer
```

### Deployment Configuration

You can set environment variables to avoid interactive prompts:

```bash
# For setup script
export APP_USER=resume
export APP_PATH=/var/www/resume
export APP_PORT=3000
export DOMAIN=yourdomain.com

# For deploy script
export DEPLOY_USER=resume
export DEPLOY_HOST=your-server.com
export DEPLOY_PATH=/var/www/resume
export SERVICE_NAME=cv-renderer
```

## Service Management

### Start/Stop/Restart

```bash
# Start the service
sudo systemctl start cv-renderer

# Stop the service
sudo systemctl stop cv-renderer

# Restart the service
sudo systemctl restart cv-renderer

# Check status
sudo systemctl status cv-renderer
```

### View Logs

```bash
# Follow logs in real-time
sudo journalctl -u cv-renderer -f

# View last 100 lines
sudo journalctl -u cv-renderer -n 100

# View logs since last hour
sudo journalctl -u cv-renderer --since "1 hour ago"
```

### Enable/Disable Auto-start

```bash
# Enable auto-start on boot
sudo systemctl enable cv-renderer

# Disable auto-start
sudo systemctl disable cv-renderer
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

After initial setup with a domain:

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

The certificate will automatically renew via cron.

### Manual SSL Configuration

If you have your own SSL certificates:

1. Copy certificates to your server:
```bash
sudo cp fullchain.pem /etc/ssl/certs/resume-fullchain.pem
sudo cp privkey.pem /etc/ssl/private/resume-privkey.pem
sudo chmod 644 /etc/ssl/certs/resume-fullchain.pem
sudo chmod 600 /etc/ssl/private/resume-privkey.pem
```

2. Update Nginx configuration at `/etc/nginx/sites-available/yourdomain.com`:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/resume-fullchain.pem;
    ssl_certificate_key /etc/ssl/private/resume-privkey.pem;

    # ... rest of configuration
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

3. Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Updating Your CV

### Update CV Data

1. Edit `data/current.json` locally
2. Run deployment:
```bash
bun run deploy
```

The deploy script will:
- Sync updated JSON files
- Rebuild all CVs
- Restart the service

### Manual Update on Server

SSH into your server and:

```bash
cd /var/www/resume

# Edit CV
nano data/current.json

# Rebuild
bun run build:all

# Restart service
sudo systemctl restart cv-renderer
```

## Nginx Configuration

### Custom Configuration

Edit `/etc/nginx/sites-available/yourdomain.com` (or `default`):

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
sudo nginx -t
sudo systemctl reload nginx
```

### Common Customizations

**Increase upload size:**
```nginx
client_max_body_size 50M;
```

**Add caching:**
```nginx
location ~* \.(pdf)$ {
    expires 1h;
    add_header Cache-Control "public, immutable";
}
```

**Rate limiting:**
```nginx
limit_req_zone $binary_remote_addr zone=cvlimit:10m rate=10r/s;

server {
    location / {
        limit_req zone=cvlimit burst=20;
        # ... rest of config
    }
}
```

## Troubleshooting

### Service Won't Start

Check logs:
```bash
sudo journalctl -u cv-renderer -n 50
```

Common issues:
- Port already in use: Change `PORT` in `.env`
- Permission issues: Check file ownership with `ls -la /var/www/resume`
- Bun not found: Verify installation with `sudo -u resume /home/resume/.bun/bin/bun --version`

### PDF Generation Fails

Check Chromium installation:
```bash
which chromium-browser
chromium-browser --version
```

Install if missing:
```bash
sudo apt-get install -y chromium-browser
```

### Nginx Issues

Test configuration:
```bash
sudo nginx -t
```

Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Connection Refused

Check if service is running:
```bash
sudo systemctl status cv-renderer
```

Check if port is listening:
```bash
sudo netstat -tlnp | grep 3000
```

Check firewall:
```bash
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

## Performance Optimization

### Pre-generate PDFs

For better performance, pre-generate all PDFs:

```bash
cd /var/www/resume
bun run build:all
```

This creates PDFs upfront instead of on-demand.

### Increase Service Resources

Edit `/etc/systemd/system/cv-renderer.service`:

```ini
[Service]
# Increase memory limit
MemoryLimit=1G

# Increase file descriptor limit
LimitNOFILE=65535
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart cv-renderer
```

### Enable Nginx Caching

Add to Nginx configuration:

```nginx
proxy_cache_path /var/cache/nginx/cv-cache levels=1:2 keys_zone=cv_cache:10m max_size=100m;

server {
    location / {
        proxy_cache cv_cache;
        proxy_cache_valid 200 1h;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        # ... rest of proxy settings
    }
}
```

## Backup & Restore

### Backup CV Data

```bash
# On server
tar -czf resume-backup-$(date +%Y%m%d).tar.gz /var/www/resume/data

# Download to local
scp resume@your-server.com:~/resume-backup-*.tar.gz ./backups/
```

### Restore from Backup

```bash
# Upload backup
scp backups/resume-backup-20260119.tar.gz resume@your-server.com:~/

# On server
cd /var/www/resume
sudo tar -xzf ~/resume-backup-20260119.tar.gz --strip-components=3
sudo chown -R resume:resume data/
bun run build:all
sudo systemctl restart cv-renderer
```

## Security Best Practices

1. **Keep system updated:**
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

2. **Use SSH keys only:**
```bash
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

3. **Configure firewall:**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

4. **Regular backups:**
Set up automated backups with cron:
```bash
0 2 * * * tar -czf ~/backups/resume-$(date +\%Y\%m\%d).tar.gz /var/www/resume/data
```

5. **Monitor logs:**
```bash
# Check for suspicious activity
sudo journalctl -u cv-renderer --since today | grep -i error
```

## Uninstall

To completely remove the application:

```bash
# Stop and disable service
sudo systemctl stop cv-renderer
sudo systemctl disable cv-renderer

# Remove service file
sudo rm /etc/systemd/system/cv-renderer.service
sudo systemctl daemon-reload

# Remove application files
sudo rm -rf /var/www/resume

# Remove Nginx configuration
sudo rm /etc/nginx/sites-enabled/yourdomain.com
sudo rm /etc/nginx/sites-available/yourdomain.com
sudo systemctl reload nginx

# Optionally remove user
sudo userdel -r resume
```

## Support

For issues or questions:
- Check logs: `sudo journalctl -u cv-renderer -n 100`
- Review this documentation
- Check GitHub issues
