variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "project" {
  description = "Prefix utilisé pour nommer toutes les ressources"
  type        = string
  default     = "probhammer"
}

variable "my_ip" {
  description = "Ton IP publique pour l'accès SSH (format CIDR, ex: 1.2.3.4/32)"
  type        = string
}

variable "db_password" {
  description = "Mot de passe du compte admin RDS"
  type        = string
  sensitive   = true
}

variable "ec2_instance_type" {
  description = "Type d'instance EC2"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "Classe d'instance RDS"
  type        = string
  default     = "db.t3.micro"
}
