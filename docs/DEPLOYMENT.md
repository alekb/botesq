# BotEsq Deployment Guide

## Overview

BotEsq uses GitHub Actions for CI/CD with deployments to EC2 instances running PM2 process manager behind Nginx reverse proxy.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  GitHub Actions │────▶│  EC2 Instance    │────▶│  PM2 Processes      │
│  (Build & SSH)  │     │  (Ubuntu/AL2023) │     │  - botesq-web       │
└─────────────────┘     └──────────────────┘     │  - botesq-mcp       │
                                                  └─────────────────────┘
```

## Environments

| Environment | URL                        | Branch | Trigger                  |
| ----------- | -------------------------- | ------ | ------------------------ |
| Staging     | https://staging.botesq.com | main   | Push to main (automatic) |
| Production  | https://botesq.com         | main   | Manual workflow dispatch |

## GitHub Actions Workflow

The deployment workflow is defined in `.github/workflows/deploy.yml`.

### Workflow Steps

1. **Build Job** (runs on GitHub-hosted runner)
   - Checkout code
   - Install pnpm and Node.js 20.x
   - Install dependencies (`pnpm install --frozen-lockfile`)
   - Generate Prisma client (`pnpm db:generate`)
   - Build all packages (`pnpm build`)
   - Upload artifacts (mcp-server/dist, web/.next)

2. **Deploy Job** (SSH to EC2)
   - Download build artifacts
   - SSH into target server
   - Pull latest code from GitHub
   - Install dependencies
   - Run database migrations
   - Build applications
   - Restart PM2 processes
   - Run health checks

### Triggering Deployments

#### Automatic (Staging)

Push to `main` branch automatically deploys to staging:

```bash
git push origin main
```

#### Manual (Production)

Use GitHub CLI or web interface:

```bash
# Deploy to production
gh workflow run deploy.yml -f environment=production

# Watch deployment progress
gh run watch
```

Or via GitHub web UI:

1. Go to Actions → Deploy workflow
2. Click "Run workflow"
3. Select `production` from dropdown
4. Click "Run workflow"

## Required GitHub Secrets

Configure these in Settings → Secrets and variables → Actions:

| Secret               | Description                           |
| -------------------- | ------------------------------------- |
| `STAGING_HOST`       | Staging server hostname/IP            |
| `STAGING_USER`       | SSH username (usually `ec2-user`)     |
| `STAGING_SSH_KEY`    | Private SSH key for staging server    |
| `PRODUCTION_HOST`    | Production server hostname/IP         |
| `PRODUCTION_USER`    | SSH username (usually `ec2-user`)     |
| `PRODUCTION_SSH_KEY` | Private SSH key for production server |

## Server Setup

### Prerequisites on EC2

The EC2 instance should have:

- Node.js 20.x (via NVM)
- pnpm 9.x
- PM2 (process manager)
- Nginx (reverse proxy)
- PostgreSQL 16 (local or RDS connection)
- Git with deploy key configured

### Deploy Key Setup

1. Generate deploy key on server:

   ```bash
   ssh-keygen -t ed25519 -C "botesq-deploy" -f ~/.ssh/github_deploy_key -N ""
   ```

2. Add to GitHub repository:
   - Go to Settings → Deploy keys
   - Add the public key (`~/.ssh/github_deploy_key.pub`)
   - Enable "Allow write access" if needed

3. Configure SSH on server:

   ```bash
   cat >> ~/.ssh/config << 'EOF'
   Host github.com
     HostName github.com
     User git
     IdentityFile ~/.ssh/github_deploy_key
     IdentitiesOnly yes
   EOF
   ```

4. Add GitHub to known hosts:
   ```bash
   ssh-keyscan github.com >> ~/.ssh/known_hosts
   ```

### Directory Structure on Server

```
/opt/botesq/
├── apps/
│   ├── mcp-server/
│   │   └── dist/           # Built MCP server
│   └── web/
│       └── .next/          # Built Next.js app
├── packages/
│   └── database/
│       └── prisma/         # Prisma schema & migrations
├── node_modules/
├── package.json
├── pnpm-lock.yaml
├── .env                    # Production environment variables
└── ecosystem.config.js     # PM2 configuration
```

### PM2 Configuration

The `ecosystem.config.js` file defines process configuration:

```javascript
module.exports = {
  apps: [
    {
      name: 'botesq-web',
      cwd: '/opt/botesq/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '400M',
    },
    {
      name: 'botesq-mcp',
      cwd: '/opt/botesq/apps/mcp-server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '400M',
    },
  ],
}
```

### PM2 Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs
pm2 logs botesq-web
pm2 logs botesq-mcp

# Restart processes
pm2 restart all
pm2 restart botesq-web
pm2 restart botesq-mcp

# Reload with zero downtime
pm2 reload all

# View process details
pm2 show botesq-web
```

## Database Migrations

### Development

```bash
pnpm db:migrate          # Creates migration and applies (interactive)
```

### Production

```bash
pnpm db:migrate:deploy   # Applies pending migrations (non-interactive)
```

The production deployment workflow:

1. Creates database backup: `pg_dump $DATABASE_URL > /tmp/backup-YYYYMMDD-HHMMSS.sql`
2. Runs migrations: `pnpm db:migrate:deploy`

## Health Checks

Both applications expose health endpoints:

| Service    | Endpoint      | Port |
| ---------- | ------------- | ---- |
| Web App    | `/api/health` | 3000 |
| MCP Server | `/health`     | 3001 |

The deployment verifies health after restart:

```bash
curl -f http://localhost:3000/api/health
curl -f http://localhost:3001/health
```

## Manual Deployment

If GitHub Actions fails, deploy manually via SSH:

```bash
# SSH to server
ssh -i ~/.ssh/botesq-key.pem ec2-user@botesq.com

# Navigate to app directory
cd /opt/botesq

# Pull latest changes
git fetch origin main
git reset --hard origin/main

# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma client
pnpm db:generate

# Run migrations (backup first!)
pg_dump $DATABASE_URL > /tmp/backup-$(date +%Y%m%d-%H%M%S).sql
pnpm db:migrate:deploy

# Build
pnpm build

# Restart with zero downtime
pm2 reload all

# Verify
pm2 list
curl -f http://localhost:3000/api/health
curl -f http://localhost:3001/health
```

## Rollback

### Quick Rollback (revert code)

```bash
# SSH to server
ssh -i ~/.ssh/botesq-key.pem ec2-user@botesq.com
cd /opt/botesq

# Find previous commit
git log --oneline -10

# Reset to previous commit
git reset --hard <commit-sha>

# Rebuild and restart
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pm2 reload all
```

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < /tmp/backup-YYYYMMDD-HHMMSS.sql
```

## Environment Variables

Production `.env` file location: `/opt/botesq/.env`

Required variables:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/botesq_prod"

# Authentication
SESSION_SECRET="<random-32-bytes>"
API_KEY_SALT="<random-32-bytes>"
TOTP_ENCRYPTION_KEY="<random-32-bytes>"

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AWS
AWS_REGION="us-east-1"
AWS_S3_BUCKET="botesq-documents-prod"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://botesq.com"
```

## Nginx Configuration

Nginx proxies requests to the Node.js applications:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

upstream web_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream mcp_server {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name botesq.com;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/botesq.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/botesq.com/privkey.pem;

    # Web app
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
    }

    # MCP API
    location /mcp/ {
        limit_req zone=api burst=10 nodelay;
        rewrite ^/mcp/(.*)$ /$1 break;
        proxy_pass http://mcp_server;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://web_app;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## SSL Certificates

SSL certificates are managed by Certbot (Let's Encrypt):

```bash
# Initial setup
sudo certbot --nginx -d botesq.com -d www.botesq.com

# Renewal (automatic via cron, but can be manual)
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## Troubleshooting

### Deployment Fails at SSH Step

- Verify GitHub secrets are correct
- Check SSH key permissions (should be 600)
- Verify deploy key is added to GitHub repo
- Check server security group allows SSH from GitHub Actions IPs

### Build Fails on Server

- Check disk space: `df -h`
- Check memory: `free -m`
- Clear pnpm cache: `pnpm store prune`
- Check for stray files: `git status`

### Health Check Fails

- Check PM2 processes: `pm2 list`
- Check logs: `pm2 logs`
- Verify ports are correct: `netstat -tlnp | grep -E '3000|3001'`
- Check environment variables: `pm2 env botesq-web`

### Database Migration Fails

- Check DATABASE_URL is correct
- Verify database connectivity: `psql $DATABASE_URL -c "SELECT 1"`
- Check migration status: `npx prisma migrate status`
- Review migration files for errors

### Out of Memory

- Check current usage: `free -m`
- Increase swap if needed
- Reduce PM2 `max_memory_restart` threshold
- Consider upgrading instance size

## Monitoring

### PM2 Monitoring

```bash
pm2 monit       # Real-time dashboard
pm2 plus        # PM2 cloud monitoring (optional)
```

### Log Locations

- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/`

### Useful Commands

```bash
# Check system resources
htop
df -h
free -m

# Check processes
pm2 list
pm2 show botesq-web

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check recent deployments
git log --oneline -10
```
