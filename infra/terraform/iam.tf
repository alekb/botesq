# =============================================================================
# IAM Policy for Application Access to S3
# =============================================================================
# Creates a minimal-privilege IAM policy for the application to access S3.
# This policy should be attached to the IAM user or role used by the app.
# =============================================================================

# -----------------------------------------------------------------------------
# IAM policy document for S3 access
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "s3_access" {
  # Allow listing bucket contents (for admin operations if needed)
  statement {
    sid    = "ListBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation"
    ]
    resources = [aws_s3_bucket.documents.arn]
  }

  # Allow CRUD operations on objects
  statement {
    sid    = "ObjectOperations"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObjectVersion",
      "s3:DeleteObjectVersion"
    ]
    resources = ["${aws_s3_bucket.documents.arn}/*"]
  }

  # Allow getting object metadata
  statement {
    sid    = "HeadObject"
    effect = "Allow"
    actions = [
      "s3:GetObjectAttributes"
    ]
    resources = ["${aws_s3_bucket.documents.arn}/*"]
  }
}

# -----------------------------------------------------------------------------
# Create the IAM policy
# -----------------------------------------------------------------------------
resource "aws_iam_policy" "s3_access" {
  name        = "${var.project_name}-s3-access-${var.environment}"
  description = "Allows BotEsq application to access the documents S3 bucket"
  policy      = data.aws_iam_policy_document.s3_access.json

  tags = {
    Name = "${var.project_name}-s3-access-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# Create IAM user for application (optional - use roles in production)
# -----------------------------------------------------------------------------
resource "aws_iam_user" "app" {
  count = var.environment == "dev" ? 1 : 0
  name  = "${var.project_name}-app-${var.environment}"

  tags = {
    Name        = "${var.project_name}-app-${var.environment}"
    Description = "Service account for BotEsq application"
  }
}

resource "aws_iam_user_policy_attachment" "app_s3" {
  count      = var.environment == "dev" ? 1 : 0
  user       = aws_iam_user.app[0].name
  policy_arn = aws_iam_policy.s3_access.arn
}

# -----------------------------------------------------------------------------
# Create access key for dev environment (store securely!)
# -----------------------------------------------------------------------------
resource "aws_iam_access_key" "app" {
  count = var.environment == "dev" ? 1 : 0
  user  = aws_iam_user.app[0].name
}
