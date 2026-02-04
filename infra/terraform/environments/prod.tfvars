environment = "prod"
aws_region  = "us-east-1"

allowed_origins = [
  "https://botesq.io",
  "https://www.botesq.io"
]

# EC2 Configuration
enable_ec2            = true
ec2_instance_type     = "t3.medium"
ec2_key_name          = ""  # Set to your SSH key pair name
ec2_allowed_ssh_cidrs = []  # Set to your IP: ["YOUR.IP.ADDRESS/32"]
domain_name           = "botesq.io"

tags = {
  CostCenter = "production"
}
