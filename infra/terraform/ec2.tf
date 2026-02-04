# =============================================================================
# EC2 Instance for BotEsq Application
# =============================================================================
# Deploys a t4g.small (ARM/Graviton) instance running Amazon Linux 2023 with:
# - Node.js 20.x
# - PostgreSQL 16 (local)
# - pm2 for process management
# - nginx as reverse proxy
# - Let's Encrypt SSL via certbot
# =============================================================================

variable "enable_ec2" {
  description = "Enable EC2 instance deployment"
  type        = bool
  default     = false
}

variable "ec2_instance_type" {
  description = "EC2 instance type (t4g.small recommended for cost savings)"
  type        = string
  default     = "t4g.small"
}

variable "ec2_use_arm" {
  description = "Use ARM-based (Graviton) instance - 20% cheaper"
  type        = bool
  default     = true
}

variable "ec2_key_name" {
  description = "Name of the SSH key pair for EC2 access"
  type        = string
  default     = ""
}

variable "ec2_allowed_ssh_cidrs" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = []
}

variable "domain_name" {
  description = "Domain name for the application (e.g., botesq.io)"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Data sources
# -----------------------------------------------------------------------------

# x86_64 AMI
data "aws_ami" "amazon_linux_2023_x86" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ARM64 (Graviton) AMI - 20% cheaper instances
data "aws_ami" "amazon_linux_2023_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  ec2_ami = var.ec2_use_arm ? data.aws_ami.amazon_linux_2023_arm.id : data.aws_ami.amazon_linux_2023_x86.id
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "app" {
  count       = var.enable_ec2 ? 1 : 0
  name        = "${var.project_name}-app-sg-${var.environment}"
  description = "Security group for BotEsq application server"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH (restricted)
  dynamic "ingress" {
    for_each = length(var.ec2_allowed_ssh_cidrs) > 0 ? [1] : []
    content {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = var.ec2_allowed_ssh_cidrs
    }
  }

  # All outbound
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app-sg-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# IAM Role for EC2 (allows S3 access, SSM, CloudWatch)
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ec2_app" {
  count = var.enable_ec2 ? 1 : 0
  name  = "${var.project_name}-ec2-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ec2-role-${var.environment}"
  }
}

resource "aws_iam_instance_profile" "ec2_app" {
  count = var.enable_ec2 ? 1 : 0
  name  = "${var.project_name}-ec2-profile-${var.environment}"
  role  = aws_iam_role.ec2_app[0].name
}

# Attach S3 access policy
resource "aws_iam_role_policy_attachment" "ec2_s3" {
  count      = var.enable_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_app[0].name
  policy_arn = aws_iam_policy.s3_access.arn
}

# Attach SSM for remote management
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  count      = var.enable_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_app[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach CloudWatch for logs
resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  count      = var.enable_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_app[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# -----------------------------------------------------------------------------
# EC2 Instance
# -----------------------------------------------------------------------------
resource "aws_instance" "app" {
  count = var.enable_ec2 ? 1 : 0

  ami                    = local.ec2_ami
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name != "" ? var.ec2_key_name : null
  vpc_security_group_ids = [aws_security_group.app[0].id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_app[0].name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = true
    delete_on_termination = true
  }

  user_data = base64encode(templatefile("${path.module}/scripts/user-data.sh", {
    node_version = "20"
    environment  = var.environment
    project_name = var.project_name
  }))

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 1
    http_endpoint               = "enabled"
  }

  tags = {
    Name = "${var.project_name}-app-${var.environment}"
  }

  lifecycle {
    ignore_changes = [ami] # Don't recreate on AMI updates
  }
}

# -----------------------------------------------------------------------------
# Elastic IP
# -----------------------------------------------------------------------------
resource "aws_eip" "app" {
  count    = var.enable_ec2 ? 1 : 0
  instance = aws_instance.app[0].id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = var.enable_ec2 ? aws_eip.app[0].public_ip : null
}

output "ec2_instance_id" {
  description = "Instance ID of the EC2 instance"
  value       = var.enable_ec2 ? aws_instance.app[0].id : null
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = var.enable_ec2 ? aws_eip.app[0].public_dns : null
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = var.enable_ec2 && var.ec2_key_name != "" ? "ssh -i ~/.ssh/${var.ec2_key_name}.pem ec2-user@${aws_eip.app[0].public_ip}" : null
}

output "setup_instructions" {
  description = "Next steps after EC2 is provisioned"
  value       = var.enable_ec2 ? <<-EOT

    EC2 instance provisioned successfully!

    Instance: ${var.ec2_instance_type} (${var.ec2_use_arm ? "ARM/Graviton" : "x86"})
    Estimated cost: ~$12-15/month

    Next steps:
    1. SSH into the instance:
       ssh -i ~/.ssh/${var.ec2_key_name}.pem ec2-user@${aws_eip.app[0].public_ip}

    2. Generate secure secrets:
       openssl rand -base64 32  # Run 3x for SESSION_SECRET, API_KEY_SALT, TOTP_ENCRYPTION_KEY

    3. Configure environment variables:
       sudo cp /opt/botesq/.env.example /opt/botesq/.env
       sudo nano /opt/botesq/.env

    4. Change the PostgreSQL password (recommended):
       sudo -u postgres psql -c "ALTER USER botesq WITH PASSWORD 'your-secure-password';"
       # Then update DATABASE_URL in .env

    5. Run the deployment script:
       sudo /opt/botesq/deploy.sh

    6. Set up SSL (after DNS is configured):
       sudo certbot --nginx -d ${var.domain_name} -d www.${var.domain_name}

    7. Start the application:
       cd /opt/botesq && pm2 start ecosystem.config.js --env production

    PostgreSQL is running locally on this instance.
    Databases: botesq_dev, botesq_prod

  EOT : null
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost"
  value       = var.enable_ec2 ? "~$12-15/month (${var.ec2_instance_type} + EIP + storage)" : null
}
