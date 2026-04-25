# Phase 3 — Infrastructure as Code (Terraform)

---

## Concept

L'infra AWS créée manuellement en Phase 2 est fragile : si la VM meurt ou
si on change de région, tout est à refaire à la main.

L'IaC (Infrastructure as Code) résout ça : l'infra est décrite dans des fichiers
versionés dans git. Un `terraform apply` recrée tout en 2 minutes.

**Terraform vs Pulumi**
- **Terraform** : HCL (langage déclaratif), standard de l'industrie, open-source (HashiCorp)
- **Pulumi** : infra en Python/TypeScript/Go, plus flexible mais moins répandu

→ On commence par Terraform (obligatoire à connaître), Pulumi en complément.

---

## État d'avancement sur ProbHammer

| Élément | Statut |
|---|---|
| Fichiers Terraform | ❌ Pas encore |
| State backend S3 | ❌ Pas encore |
| Modules Terraform | ❌ Pas encore |

---

## Structure Terraform pour ProbHammer

```
infra/
└── terraform/
    ├── main.tf           ← ressources AWS principales
    ├── variables.tf      ← variables paramétrables
    ├── outputs.tf        ← valeurs exportées (IP EC2, URL S3...)
    ├── providers.tf      ← configuration AWS provider
    └── modules/
        ├── networking/   ← VPC, subnets, security groups
        ├── compute/      ← EC2
        └── storage/      ← S3, RDS
```

---

## Installer Terraform

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform -y
terraform --version
```

---

## Exemple — infra ProbHammer en Terraform

### providers.tf
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State stocké dans S3 (pas en local)
  backend "s3" {
    bucket = "probhammer-tfstate"
    key    = "terraform.tfstate"
    region = "eu-west-3"
  }
}

provider "aws" {
  region = var.aws_region
}
```

### variables.tf
```hcl
variable "aws_region" {
  default = "eu-west-3"
}

variable "environment" {
  default = "dev"
}

variable "project" {
  default = "probhammer"
}
```

### main.tf (EC2 + S3)
```hcl
# Bucket S3 pour les assets frontend
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-assets-${var.environment}"

  tags = {
    Name        = "${var.project}-assets"
    Project     = var.project
    Environment = var.environment
  }
}

# EC2 pour Jenkins / CI
resource "aws_instance" "ci" {
  ami           = "ami-0c55b159cbfafe1f0"  # Ubuntu 24.04 eu-west-3
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  vpc_security_group_ids = [aws_security_group.ci.id]

  tags = {
    Name        = "${var.project}-ci"
    Project     = var.project
    Environment = var.environment
  }
}

# Security Group
resource "aws_security_group" "ci" {
  name = "${var.project}-ci-sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # restreindre à votre IP en prod
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### outputs.tf
```hcl
output "ec2_public_ip" {
  value = aws_instance.ci.public_ip
}

output "s3_assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}
```

---

## Commandes Terraform

```bash
cd infra/terraform

terraform init      # télécharge les providers, initialise le backend
terraform plan      # montre ce qui va être créé/modifié/détruit
terraform apply     # applique les changements (demande confirmation)
terraform destroy   # détruit toute l'infra (attention)

terraform fmt       # formate les fichiers .tf
terraform validate  # vérifie la syntaxe
```

**Workflow type :**
```bash
terraform fmt && terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

---

## State Terraform

Le state (`terraform.tfstate`) est le registre de ce qui existe en prod.
**Ne jamais le mettre dans git** (contient des secrets).

En équipe/CI, il est stocké dans S3 avec locking DynamoDB :
```bash
# Créer le bucket state AVANT d'init terraform
aws s3 mb s3://probhammer-tfstate --region eu-west-3
aws dynamodb create-table \
  --table-name probhammer-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-3
```

---

## Actions à réaliser (checklist)

- [ ] Installer Terraform
- [ ] Créer `infra/terraform/` avec la structure ci-dessus
- [ ] Créer le bucket S3 pour le tfstate
- [ ] `terraform init` → `terraform plan` → `terraform apply`
- [ ] Vérifier que l'EC2 et le bucket S3 apparaissent dans la console AWS
- [ ] `terraform destroy` pour nettoyer (éviter les frais)
- [ ] Versionner les fichiers `.tf` dans git (jamais le `.tfstate`)
