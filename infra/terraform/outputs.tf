# =============================================================================
# Terraform Outputs
# =============================================================================

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.documents.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.documents.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.documents.region
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy for S3 access"
  value       = aws_iam_policy.s3_access.arn
}

# Only output in dev environment
output "app_access_key_id" {
  description = "Access key ID for the application (dev only)"
  value       = var.environment == "dev" ? aws_iam_access_key.app[0].id : null
  sensitive   = true
}

output "app_secret_access_key" {
  description = "Secret access key for the application (dev only)"
  value       = var.environment == "dev" ? aws_iam_access_key.app[0].secret : null
  sensitive   = true
}

# Environment variables to add to .env
output "env_config" {
  description = "Environment variables to add to .env file"
  value       = <<-EOT
    # Add these to your .env file:
    AWS_S3_BUCKET="${aws_s3_bucket.documents.id}"
    AWS_REGION="${var.aws_region}"
    ${var.environment == "dev" ? "# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY - run: terraform output -raw app_access_key_id" : "# Use IAM roles in production"}
  EOT
}
