variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "botesq"
}

variable "allowed_origins" {
  description = "Allowed origins for CORS (presigned URL uploads)"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
