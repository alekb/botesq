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

## File Structure

```
infra/
├── terraform/
│   ├── main.tf              # Provider and backend config
│   ├── variables.tf         # Input variables
│   ├── s3.tf                # S3 bucket and security config
│   ├── iam.tf               # IAM policies and users
│   ├── outputs.tf           # Output values
│   └── environments/
│       ├── dev.tfvars       # Development environment
│       └── prod.tfvars      # Production environment
└── README.md                # This file
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
