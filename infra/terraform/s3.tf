# =============================================================================
# S3 Bucket for Document Storage
# =============================================================================
# Security features:
# - Private by default (all public access blocked)
# - Server-side encryption (SSE-S3)
# - Versioning enabled for audit trail
# - Lifecycle rules for cost optimization
# - CORS configured for presigned URL uploads
# =============================================================================

resource "aws_s3_bucket" "documents" {
  bucket = local.bucket_name

  # Prevent accidental deletion of bucket with data
  force_destroy = var.environment == "dev" ? true : false

  tags = {
    Name        = local.bucket_name
    Description = "Document storage for BotEsq legal documents"
  }
}

# -----------------------------------------------------------------------------
# Block ALL public access
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# Enable versioning for audit trail and recovery
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# -----------------------------------------------------------------------------
# Server-side encryption (SSE-S3)
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# -----------------------------------------------------------------------------
# Lifecycle rules for cost optimization
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  # Transition current versions to cheaper storage tiers
  rule {
    id     = "transition-to-cheaper-storage"
    status = "Enabled"

    filter {
      prefix = "documents/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }

  # Clean up old versions after 90 days
  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    filter {
      prefix = "documents/"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }

  # Clean up incomplete multipart uploads
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Clean up expired delete markers
  rule {
    id     = "cleanup-delete-markers"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      expired_object_delete_marker = true
    }
  }
}

# -----------------------------------------------------------------------------
# CORS configuration for presigned URL uploads from browser
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = 3600
  }
}

# -----------------------------------------------------------------------------
# Bucket policy - enforce secure transport and deny unauthorized access
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "documents" {
  bucket = aws_s3_bucket.documents.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceHTTPS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.documents.arn,
          "${aws_s3_bucket.documents.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyIncorrectEncryptionHeader"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.documents.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      },
      {
        Sid       = "DenyUnencryptedObjectUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.documents.arn}/*"
        Condition = {
          Null = {
            "s3:x-amz-server-side-encryption" = "true"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.documents]
}

# -----------------------------------------------------------------------------
# Bucket ownership controls
# -----------------------------------------------------------------------------
resource "aws_s3_bucket_ownership_controls" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }

  depends_on = [aws_s3_bucket_public_access_block.documents]
}
