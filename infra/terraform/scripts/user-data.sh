#!/bin/bash
# =============================================================================
# BotEsq EC2 User Data Script
# =============================================================================
# This script runs on first boot to configure the EC2 instance
# =============================================================================

set -euo pipefail

# Variables from Terraform
NODE_VERSION="${node_version}"
ENVIRONMENT="${environment}"
PROJECT_NAME="${project_name}"

# Logging
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting BotEsq setup at $(date)"

# -----------------------------------------------------------------------------
# System Updates
# -----------------------------------------------------------------------------
echo "Updating system packages..."
dnf update -y

# -----------------------------------------------------------------------------
# Configure Swap (important for 2GB RAM instances)
# -----------------------------------------------------------------------------
echo "Configuring swap space..."
if [ ! -f /swapfile ]; then
    dd if=/dev/zero of=/swapfile bs=128M count=16  # 2GB swap
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

# Tune swappiness for server workload
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p

# -----------------------------------------------------------------------------
# Install Dependencies
# -----------------------------------------------------------------------------
echo "Installing dependencies..."
dnf install -y \
  git \
  nginx \
  postgresql16-server \
  postgresql16 \
  jq \
  htop \
  tmux

# -----------------------------------------------------------------------------
# Configure PostgreSQL (Local)
# -----------------------------------------------------------------------------
echo "Setting up PostgreSQL..."

# Initialize PostgreSQL
postgresql-setup --initdb

# Configure PostgreSQL for local connections
cat > /var/lib/pgsql/data/pg_hba.conf << 'PG_HBA'
# PostgreSQL Client Authentication Configuration
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
PG_HBA

# Optimize PostgreSQL for low-memory environment (2GB RAM)
cat >> /var/lib/pgsql/data/postgresql.conf << 'PG_CONF'

# Memory settings for t4g.small (2GB RAM)
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 8MB
wal_buffers = 8MB

# Checkpoint settings
checkpoint_completion_target = 0.9
max_wal_size = 256MB
min_wal_size = 64MB

# Connection settings
max_connections = 50
PG_CONF

# Start PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql << 'PGSQL'
CREATE USER botesq WITH PASSWORD 'botesq_local_dev';
CREATE DATABASE botesq_dev OWNER botesq;
CREATE DATABASE botesq_prod OWNER botesq;
GRANT ALL PRIVILEGES ON DATABASE botesq_dev TO botesq;
GRANT ALL PRIVILEGES ON DATABASE botesq_prod TO botesq;
PGSQL

echo "PostgreSQL setup complete - databases: botesq_dev, botesq_prod"

# -----------------------------------------------------------------------------
# Install Node.js via NVM
# -----------------------------------------------------------------------------
echo "Installing Node.js $NODE_VERSION..."
export HOME=/root
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source /root/.nvm/nvm.sh
nvm install $NODE_VERSION
nvm alias default $NODE_VERSION
nvm use default

# Make node available system-wide
ln -sf /root/.nvm/versions/node/v$NODE_VERSION.*/bin/node /usr/local/bin/node
ln -sf /root/.nvm/versions/node/v$NODE_VERSION.*/bin/npm /usr/local/bin/npm
ln -sf /root/.nvm/versions/node/v$NODE_VERSION.*/bin/npx /usr/local/bin/npx

# Install pnpm
npm install -g pnpm
ln -sf /root/.nvm/versions/node/v$NODE_VERSION.*/bin/pnpm /usr/local/bin/pnpm

# Install pm2
npm install -g pm2
ln -sf /root/.nvm/versions/node/v$NODE_VERSION.*/bin/pm2 /usr/local/bin/pm2

# Configure pm2 to start on boot
pm2 startup systemd -u ec2-user --hp /home/ec2-user
env PATH=$PATH:/usr/local/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# -----------------------------------------------------------------------------
# Install Certbot for SSL
# -----------------------------------------------------------------------------
echo "Installing Certbot..."
dnf install -y certbot python3-certbot-nginx

# -----------------------------------------------------------------------------
# Create Application Directory
# -----------------------------------------------------------------------------
echo "Creating application directory..."
mkdir -p /opt/$PROJECT_NAME
chown ec2-user:ec2-user /opt/$PROJECT_NAME

# -----------------------------------------------------------------------------
# Configure Nginx
# -----------------------------------------------------------------------------
echo "Configuring Nginx..."
cat > /etc/nginx/conf.d/$PROJECT_NAME.conf << 'NGINX_CONF'
# BotEsq Nginx Configuration

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# Upstream for Next.js web app
upstream web_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Upstream for MCP server
upstream mcp_server {
    server 127.0.0.1:3001;
    keepalive 64;
}

# HTTP server (redirects to HTTPS when SSL is configured)
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Health check endpoint (no rate limit)
    location /health {
        proxy_pass http://web_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # For now, proxy to app (will change to redirect after SSL)
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://web_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # MCP API endpoint
    location /mcp/ {
        limit_req zone=api burst=10 nodelay;
        rewrite ^/mcp/(.*)$ /$1 break;
        proxy_pass http://mcp_server;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # API routes
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://web_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://web_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com; frame-ancestors 'self';" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
}
NGINX_CONF

# Create certbot webroot
mkdir -p /var/www/certbot

# Test nginx config
nginx -t

# Enable and start nginx
systemctl enable nginx
systemctl start nginx

# -----------------------------------------------------------------------------
# Create Deployment Script
# -----------------------------------------------------------------------------
echo "Creating deployment script..."
cat > /opt/$PROJECT_NAME/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -euo pipefail

APP_DIR="/opt/botesq"
REPO_URL="${REPO_URL:-git@github.com:alekb/botesq.git}"
BRANCH="${BRANCH:-main}"

echo "=== BotEsq Deployment Script ==="
echo "Deploying branch: $BRANCH"

cd $APP_DIR

# Pull latest code (or clone if first time)
if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
else
    echo "Cloning repository..."
    git clone -b $BRANCH $REPO_URL .
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
echo "Generating Prisma client..."
pnpm db:generate

# Run database migrations
echo "Running database migrations..."
pnpm db:migrate

# Build applications
echo "Building applications..."
pnpm build

# Restart applications
echo "Restarting applications..."
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

# Save pm2 process list
pm2 save

echo "=== Deployment complete ==="
DEPLOY_SCRIPT

chmod +x /opt/$PROJECT_NAME/deploy.sh

# -----------------------------------------------------------------------------
# Create PM2 Ecosystem File
# -----------------------------------------------------------------------------
echo "Creating PM2 ecosystem file..."
cat > /opt/$PROJECT_NAME/ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [
    {
      name: 'botesq-web',
      cwd: '/opt/botesq/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,           // Single instance for t4g.small
      exec_mode: 'fork',      // Fork mode for lower memory
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '400M',
      error_file: '/var/log/botesq/web-error.log',
      out_file: '/var/log/botesq/web-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'botesq-mcp',
      cwd: '/opt/botesq/apps/mcp-server',
      script: 'dist/index.js',
      instances: 1,           // Single instance for t4g.small
      exec_mode: 'fork',      // Fork mode for lower memory
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      max_memory_restart: '400M',
      error_file: '/var/log/botesq/mcp-error.log',
      out_file: '/var/log/botesq/mcp-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
PM2_CONFIG

# Create log directory
mkdir -p /var/log/$PROJECT_NAME
chown ec2-user:ec2-user /var/log/$PROJECT_NAME

# -----------------------------------------------------------------------------
# Create Environment Template
# -----------------------------------------------------------------------------
echo "Creating environment template..."
cat > /opt/$PROJECT_NAME/.env.example << 'ENV_TEMPLATE'
# =============================================================================
# BotEsq Production Environment Variables
# =============================================================================

# Database (Local PostgreSQL)
DATABASE_URL="postgresql://botesq:botesq_local_dev@localhost:5432/botesq_prod"

# Authentication (generate with: openssl rand -base64 32)
SESSION_SECRET="CHANGE_ME_generate-with-openssl-rand-base64-32"
API_KEY_SALT="CHANGE_ME_generate-with-openssl-rand-base64-32"
TOTP_ENCRYPTION_KEY="CHANGE_ME_generate-with-openssl-rand-base64-32"

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AWS (uses IAM role, but can override)
AWS_REGION="us-east-1"
AWS_S3_BUCKET="botesq-documents-prod"

# ClamAV (disabled by default - enable later if needed)
CLAMAV_ENABLED="false"
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT="3310"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://botesq.io"

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="noreply@botesq.io"
ENV_TEMPLATE

# Set ownership
chown -R ec2-user:ec2-user /opt/$PROJECT_NAME

# -----------------------------------------------------------------------------
# Configure Firewall
# -----------------------------------------------------------------------------
echo "Configuring firewall..."
# Amazon Linux 2023 uses firewalld
if command -v firewall-cmd &> /dev/null; then
    systemctl enable firewalld
    systemctl start firewalld
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
fi

# -----------------------------------------------------------------------------
# Final Setup
# -----------------------------------------------------------------------------
echo "Setting up SSH key for ec2-user..."
# Copy authorized_keys to ec2-user if exists
if [ -f /root/.ssh/authorized_keys ]; then
    mkdir -p /home/ec2-user/.ssh
    cp /root/.ssh/authorized_keys /home/ec2-user/.ssh/
    chown -R ec2-user:ec2-user /home/ec2-user/.ssh
    chmod 700 /home/ec2-user/.ssh
    chmod 600 /home/ec2-user/.ssh/authorized_keys
fi

# Add nvm to ec2-user's bashrc
cat >> /home/ec2-user/.bashrc << 'BASHRC'

# Node Version Manager
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
BASHRC

echo "=== BotEsq setup complete at $(date) ==="
echo "Next steps:"
echo "1. Configure /opt/$PROJECT_NAME/.env with production values"
echo "2. Run: sudo /opt/$PROJECT_NAME/deploy.sh"
echo "3. Set up SSL: sudo certbot --nginx -d yourdomain.com"
