# Phase 2 — Compute & Storage (AWS)

---

## État d'avancement sur ProbHammer

| Élément | Statut | Détail |
|---|---|---|
| Hébergement frontend | ❌ | Cloudflare Pages prévu, pas encore déployé |
| Stockage données | ⚠️ | JSON dans le repo git (ok pour l'instant) |
| Base de données | ⚠️ | Supabase (managé, pas AWS) |
| Compute (serveur) | ❌ | Pas encore, tout tourne en local |
| AWS account | ❓ | À confirmer |

---

## Concepts fondamentaux

### Compute
Un serveur virtuel dans le cloud. AWS l'appelle **EC2** (Elastic Compute Cloud).
C'est une VM Linux dans un datacenter AWS sur laquelle on installe ce qu'on veut.

Types utilisés en pratique :
- `t3.micro` — gratuit (Free Tier 12 mois), 1 vCPU, 1 GB RAM → suffisant pour ProbHammer
- `t3.small` — 2 GB RAM → pour Jenkins ou builds Docker

### Storage
Plusieurs types sur AWS :
- **S3** (Simple Storage Service) — stockage de fichiers/objets. Pas un disque, une URL par fichier.
  Parfait pour : JSON statiques, images factions, assets frontend buildés.
- **EBS** (Elastic Block Store) — disque dur attaché à une EC2. C'est le `/` de la VM.
- **RDS** (Relational Database Service) — PostgreSQL/MySQL managé. Remplace Supabase.

### Réseau
- **VPC** (Virtual Private Cloud) — réseau privé isolé dans AWS
- **Security Group** — firewall de la VM (quels ports sont ouverts)
- **Elastic IP** — IP publique fixe attachée à une EC2

---

## Architecture cible pour ProbHammer (Phase 2)

```
Internet
    │
    ▼
[CloudFront / S3]          ← frontend buildé (React) + JSON statiques
    │
    │  (API calls si besoin futur)
    ▼
[EC2 t3.micro]             ← Jenkins, scripts, pipeline Python
    │
    ▼
[RDS PostgreSQL]           ← armées utilisateurs (remplace Supabase)
    │
[S3 bucket]                ← images factions, backups JSON
```

**Pourquoi S3 pour le frontend et pas EC2 ?**
Servir des fichiers statiques depuis une EC2 c'est du gaspillage. S3 + CloudFront
est conçu pour ça : scalable, CDN mondial, ~0€ pour un petit trafic.

---

## Ce qu'il faut faire

### Étape 1 — Créer un compte AWS

- Aller sur aws.amazon.com
- Créer un compte (carte bancaire requise mais Free Tier = 0€ pour 12 mois)
- **Ne jamais utiliser le compte root** pour travailler : créer un utilisateur IAM

```
IAM → Users → Create user
- Username : probhammer-dev
- Permissions : AdministratorAccess (pour apprendre, à restreindre plus tard)
- Créer une Access Key → télécharger le CSV
```

### Étape 2 — Installer AWS CLI

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

aws --version  # aws-cli/2.x.x attendu
```

Configurer avec les clés IAM :
```bash
aws configure
# AWS Access Key ID: [depuis le CSV]
# AWS Secret Access Key: [depuis le CSV]
# Default region: eu-west-3   (Paris)
# Default output format: json
```

### Étape 3 — Créer un bucket S3 pour les assets

```bash
# Créer le bucket
aws s3 mb s3://probhammer-assets --region eu-west-3

# Uploader les JSON de données
aws s3 sync frontend/public/data/ s3://probhammer-assets/data/ --delete

# Vérifier
aws s3 ls s3://probhammer-assets/data/
```

### Étape 4 — Lancer une EC2 (pour Jenkins en Phase 5)

Via la console AWS (pour comprendre) puis via Terraform (Phase 3).

```
EC2 → Launch Instance
- AMI : Ubuntu 24.04 LTS
- Type : t3.micro (Free Tier)
- Key pair : créer une paire SSH → télécharger le .pem
- Security Group :
    - port 22 (SSH) depuis votre IP uniquement
    - port 8080 (Jenkins) depuis votre IP
    - port 80/443 (HTTP/HTTPS) depuis partout
```

Se connecter :
```bash
chmod 400 ~/probhammer-key.pem
ssh -i ~/probhammer-key.pem ubuntu@<EC2-IP-publique>
```

---

## Bonnes pratiques importantes

**IAM — Principle of Least Privilege**
Ne jamais donner plus de droits que nécessaire. En production :
un utilisateur pour déployer le frontend, un autre pour la base de données.

**Jamais de clés AWS dans le code**
Les Access Keys ne vont JAMAIS dans git. Toujours via :
- `aws configure` en local
- Variables d'environnement (`AWS_ACCESS_KEY_ID`)
- Rôles IAM sur EC2 (la bonne façon en prod)

**Tags sur toutes les ressources**
```
Name: probhammer-xxx
Project: probhammer
Environment: dev / prod
```
Permet de retrouver et nettoyer ses ressources facilement.

---

## Actions à réaliser (checklist)

- [ ] Créer compte AWS + utilisateur IAM probhammer-dev
- [ ] Installer et configurer AWS CLI
- [ ] Créer bucket S3 `probhammer-assets`
- [ ] Uploader les JSON de `frontend/public/data/` vers S3
- [ ] Lancer une EC2 t3.micro manuellement (via console) pour comprendre l'interface
- [ ] Se connecter en SSH à l'EC2
- [ ] Installer Node.js sur l'EC2 (même procédure que en local)
- [ ] Arrêter l'EC2 après les tests (facturation à l'heure)
