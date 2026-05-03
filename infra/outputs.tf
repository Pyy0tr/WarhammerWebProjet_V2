output "ec2_public_ip" {
  description = "IP publique de l'instance EC2 (dynamique — préférer l'EIP)"
  value       = aws_instance.backend.public_ip
}

output "ec2_eip" {
  description = "IP statique du backend EC2 (Elastic IP — ne change jamais)"
  value       = aws_eip.backend.public_ip
}

output "ec2_instance_id" {
  description = "ID de l'instance EC2 (pour SSM deploy)"
  value       = aws_instance.backend.id
}

output "rds_endpoint" {
  description = "Endpoint de connexion RDS"
  value       = aws_db_instance.postgres.address
}

output "s3_data_bucket" {
  description = "Nom du bucket S3 data pipeline"
  value       = aws_s3_bucket.data_pipeline.bucket
}

output "s3_frontend_bucket" {
  description = "Nom du bucket S3 frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_url" {
  description = "URL publique du frontend via CloudFront (HTTPS)"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID de la distribution CloudFront (pour l'invalidation de cache en CI/CD)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "eks_cluster_name" {
  description = "Nom du cluster EKS"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint API du cluster EKS"
  value       = aws_eks_cluster.main.endpoint
}
