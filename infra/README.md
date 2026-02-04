# BotEsq Infrastructure

This directory contains infrastructure-as-code for BotEsq AWS resources.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.5.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- Appropriate AWS permissions to create S3 buckets and IAM resources

## S3 Bucket Security Features

The Terraform configuration creates an S3 bucket with the following security features:

| Feature                | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| Private Access         | All public access is blocked                                  |
| Encryption             | Server-side encryption with AES-256 (SSE-S3)                  |
| Versioning             | Enabled for audit trail and recovery                          |
| HTTPS Only             | Bucket policy denies non-HTTPS requests                       |
| Encryption Enforcement | Bucket policy requires encryption headers on uploads          |
| Lifecycle Rules        | Transition to IA (90d), Glacier (365d), version cleanup (90d) |
| CORS                   | Configured for presigned URL uploads                          |
| Ownership Controls     | BucketOwnerEnforced prevents ACL issues                       |

## Usage

### 1. Initialize Terraform

```bash
cd infra/terraform
terraform init
```

### 2. Deploy to Development

```bash
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

### 3. Get Credentials (Dev Only)

```bash
# Get the access key ID
terraform output -raw app_access_key_id

# Get the secret access key (sensitive)
terraform output -raw app_secret_access_key
```

### 4. Update Environment Variables

Add the following to your `.env.local`:

```bash
AWS_S3_BUCKET="botesq-documents-dev"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="<from terraform output>"
AWS_SECRET_ACCESS_KEY="<from terraform output>"
```

### 5. Deploy to Production

For production, use IAM roles instead of access keys:

```bash
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

Then attach the IAM policy (`botesq-s3-access-prod`) to your EC2 instance role.

## ClamAV Virus Scanning

### Local Development

Use Docker Compose to run ClamAV locally:

```bash
# Start ClamAV (takes ~2 minutes to load virus definitions)
docker compose up -d clamav

# Check status
docker compose logs -f clamav

# Test connection
echo "PING" | nc localhost 3310
```

Then enable in `.env.local`:

```bash
CLAMAV_ENABLED="true"
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT="3310"
```

### Production Deployment

Deploy ClamAV as an ECS Fargate service:

```bash
# Enable ClamAV in tfvars
echo 'enable_clamav = true' >> environments/prod.tfvars

# Deploy
terraform apply -var-file=environments/prod.tfvars

# Get connection details
terraform output clamav_env_config
```

The service uses:

- ECS Fargate for serverless container hosting
- EFS for persistent virus definition storage
- Service Discovery for internal DNS (`clamav.botesq.local:3310`)
- CloudWatch Logs for monitoring

## EC2 Production Deployment

### Prerequisites

1. **SSH Key Pair**: Create an SSH key pair in AWS EC2 console
2. **Your IP Address**: Get your public IP for SSH access

### Deploy EC2 Instance

1. Update `environments/prod.tfvars`:

```hcl
enable_ec2            = true
ec2_instance_type     = "t3.medium"
ec2_key_name          = "your-key-pair-name"
ec2_allowed_ssh_cidrs = ["YOUR.PUBLIC.IP/32"]
domain_name           = "botesq.io"
```

2. Deploy:

```bash
cd infra/terraform
terraform init
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

3. Get connection info:

```bash
terraform output ssh_command
terraform output ec2_public_ip
```

### Configure the Server

1. SSH into the instance:

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<EC2_PUBLIC_IP>
```

2. Configure environment variables:

```bash
sudo cp /opt/botesq/.env.example /opt/botesq/.env
sudo nano /opt/botesq/.env
# Fill in production values (DATABASE_URL, STRIPE_SECRET_KEY, etc.)
```

3. Deploy the application:

```bash
sudo /opt/botesq/deploy.sh
```

4. Set up SSL (after DNS is configured):

```bash
sudo certbot --nginx -d botesq.io -d www.botesq.io
```

### What Gets Installed

The EC2 user-data script automatically installs:

- Node.js 20.x via NVM
- pnpm package manager
- pm2 process manager
- nginx reverse proxy
- certbot for SSL
- PostgreSQL client

### PM2 Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs

# Restart all
pm2 restart all

# Restart specific app
pm2 restart botesq-web
pm2 restart botesq-mcp
```

## File Structure

```
infra/
├── terraform/
│   ├── main.tf              # Provider and backend config
│   ├── variables.tf         # Input variables
│   ├── s3.tf                # S3 bucket and security config
│   ├── iam.tf               # IAM policies and users
│   ├── ec2.tf               # EC2 instance and security group
│   ├── clamav.tf            # ClamAV ECS service
│   ├── outputs.tf           # Output values
│   ├── scripts/
│   │   └── user-data.sh     # EC2 bootstrap script
│   └── environments/
│       ├── dev.tfvars       # Development environment
│       └── prod.tfvars      # Production environment
├── README.md                # This file
└── ../docker-compose.yml    # Local development services
```

## Remote State (Production)

For team use, uncomment the backend configuration in `main.tf` and create the state bucket:

```bash
# Create state bucket (one-time setup)
aws s3api create-bucket \
  --bucket botesq-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket botesq-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket botesq-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name botesq-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Destroying Resources

```bash
# WARNING: This will delete all documents in the bucket (dev only)
terraform destroy -var-file=environments/dev.tfvars
```

Production buckets have `force_destroy = false` to prevent accidental deletion.
