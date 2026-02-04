# =============================================================================
# ClamAV Virus Scanning Infrastructure
# =============================================================================
# Deploys ClamAV as an ECS Fargate service for production virus scanning.
# The service runs the ClamAV daemon and exposes it on the internal network.
# =============================================================================

variable "enable_clamav" {
  description = "Enable ClamAV deployment"
  type        = bool
  default     = false
}

variable "clamav_cpu" {
  description = "CPU units for ClamAV task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "clamav_memory" {
  description = "Memory for ClamAV task in MB (minimum 2GB recommended)"
  type        = number
  default     = 2048
}

# -----------------------------------------------------------------------------
# ECS Cluster (shared with other services)
# -----------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  count = var.enable_clamav ? 1 : 0
  name  = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = var.environment == "prod" ? "enabled" : "disabled"
  }

  tags = {
    Name = "${var.project_name}-cluster-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for ClamAV
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "clamav" {
  count             = var.enable_clamav ? 1 : 0
  name              = "/ecs/${var.project_name}-clamav-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.project_name}-clamav-logs-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# ECS Task Definition for ClamAV
# -----------------------------------------------------------------------------
resource "aws_ecs_task_definition" "clamav" {
  count                    = var.enable_clamav ? 1 : 0
  family                   = "${var.project_name}-clamav-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.clamav_cpu
  memory                   = var.clamav_memory
  execution_role_arn       = aws_iam_role.ecs_execution[0].arn

  container_definitions = jsonencode([
    {
      name      = "clamav"
      image     = "clamav/clamav:stable"
      essential = true

      portMappings = [
        {
          containerPort = 3310
          hostPort      = 3310
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "CLAMAV_NO_MILTERD"
          value = "true"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.clamav[0].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "clamav"
        }
      }

      healthCheck = {
        command     = ["CMD", "clamdscan", "--ping", "1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 180 # ClamAV needs time to load definitions
      }

      mountPoints = [
        {
          sourceVolume  = "clamav-data"
          containerPath = "/var/lib/clamav"
          readOnly      = false
        }
      ]
    }
  ])

  volume {
    name = "clamav-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.clamav[0].id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.clamav[0].id
        iam             = "ENABLED"
      }
    }
  }

  tags = {
    Name = "${var.project_name}-clamav-task-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# EFS for ClamAV virus definitions (persistent storage)
# -----------------------------------------------------------------------------
resource "aws_efs_file_system" "clamav" {
  count          = var.enable_clamav ? 1 : 0
  creation_token = "${var.project_name}-clamav-efs-${var.environment}"
  encrypted      = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = {
    Name = "${var.project_name}-clamav-efs-${var.environment}"
  }
}

resource "aws_efs_access_point" "clamav" {
  count          = var.enable_clamav ? 1 : 0
  file_system_id = aws_efs_file_system.clamav[0].id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/clamav"

    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }

  tags = {
    Name = "${var.project_name}-clamav-ap-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# Security Group for ClamAV
# -----------------------------------------------------------------------------
resource "aws_security_group" "clamav" {
  count       = var.enable_clamav ? 1 : 0
  name        = "${var.project_name}-clamav-sg-${var.environment}"
  description = "Security group for ClamAV service"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "ClamAV daemon port"
    from_port   = 3310
    to_port     = 3310
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    description = "Allow all outbound (for virus definition updates)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-clamav-sg-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# ECS Service for ClamAV
# -----------------------------------------------------------------------------
resource "aws_ecs_service" "clamav" {
  count           = var.enable_clamav ? 1 : 0
  name            = "${var.project_name}-clamav-${var.environment}"
  cluster         = aws_ecs_cluster.main[0].id
  task_definition = aws_ecs_task_definition.clamav[0].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.clamav[0].id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.clamav[0].arn
  }

  tags = {
    Name = "${var.project_name}-clamav-service-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# Service Discovery for internal DNS
# -----------------------------------------------------------------------------
resource "aws_service_discovery_private_dns_namespace" "main" {
  count       = var.enable_clamav ? 1 : 0
  name        = "${var.project_name}.local"
  description = "Private DNS namespace for ${var.project_name}"
  vpc         = data.aws_vpc.default.id

  tags = {
    Name = "${var.project_name}-dns-namespace-${var.environment}"
  }
}

resource "aws_service_discovery_service" "clamav" {
  count = var.enable_clamav ? 1 : 0
  name  = "clamav"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main[0].id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# -----------------------------------------------------------------------------
# IAM Role for ECS Task Execution
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ecs_execution" {
  count = var.enable_clamav ? 1 : 0
  name  = "${var.project_name}-ecs-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-execution-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  count      = var.enable_clamav ? 1 : 0
  role       = aws_iam_role.ecs_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# -----------------------------------------------------------------------------
# Data sources for VPC (uses default VPC for simplicity)
# -----------------------------------------------------------------------------
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "clamav_service_endpoint" {
  description = "Internal DNS endpoint for ClamAV service"
  value       = var.enable_clamav ? "clamav.${var.project_name}.local:3310" : null
}

output "clamav_env_config" {
  description = "Environment variables for ClamAV configuration"
  value = var.enable_clamav ? <<-EOT
    # ClamAV configuration (add to .env)
    CLAMAV_ENABLED="true"
    CLAMAV_MODE="daemon"
    CLAMAV_HOST="clamav.${var.project_name}.local"
    CLAMAV_PORT="3310"
  EOT : null
}
