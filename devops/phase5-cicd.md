# Phase 5 — CI/CD (GitHub Actions + Jenkins)

---

## Concept

CI/CD = Continuous Integration / Continuous Deployment.

**CI** : à chaque push, on vérifie automatiquement que le code est correct.
(tests, lint, build, sécurité)

**CD** : si la CI passe, on déploie automatiquement en production.

L'objectif : zéro déploiement manuel. Un `git push` sur `main` = déploiement en prod.

---

## État d'avancement sur ProbHammer

| Élément | Statut | Détail |
|---|---|---|
| GitHub Actions | ⚠️ | sync_bsdata.yml existe mais incomplet |
| Tests automatisés | ❌ | Pas de tests (Vitest prévu) |
| Build automatique | ❌ | Pas de build frontend en CI |
| Déploiement automatique | ❌ | Pas de deploy en CI |
| Jenkins | ❌ | Pas encore |
| SonarQube | ❌ | Pas encore |
| Monitoring (Grafana/Prometheus) | ❌ | Pas encore |

---

## GitHub Actions — pipeline complète

### Problème identifié dans sync_bsdata.yml

Le workflow actuel ne lance pas `build_frontend_data.py` et commit dans
`data/cache/` qui est gitignore. À corriger.

### Nouveau workflow CI — `.github/workflows/ci.yml`

Déclenché sur chaque PR et push sur `main` / `develop`.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend:
    name: Build & Lint Frontend
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: frontend/.nvmrc
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Lint
        run: npm run lint
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist/
          retention-days: 1

  pipeline-python:
    name: Validate Python Pipeline
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r requirements.txt
        working-directory: pipeline

      - name: Audit data quality
        run: python audit.py
        working-directory: pipeline
```

### Workflow CD — `.github/workflows/deploy.yml`

Déclenché uniquement sur push vers `main` (après merge d'une PR).

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    name: Build & Deploy Frontend
    runs-on: ubuntu-latest
    needs: []   # ajouter le job CI ici quand il existe

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: frontend/.nvmrc
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install & Build
        run: npm ci && npm run build
        working-directory: frontend
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist/ s3://probhammer-assets/ \
            --delete \
            --cache-control "max-age=31536000,immutable" \
            --exclude "index.html"
          aws s3 cp frontend/dist/index.html s3://probhammer-assets/index.html \
            --cache-control "no-cache"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: eu-west-3

  deploy-docker:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Push
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/pyy0tr/probhammer-frontend:latest
            ghcr.io/pyy0tr/probhammer-frontend:${{ github.sha }}
```

### Workflow BSData corrigé — `.github/workflows/sync_bsdata.yml`

```yaml
name: Sync BSData

on:
  schedule:
    - cron: "0 */12 * * *"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install requests
        working-directory: pipeline

      - name: Fetch BSData
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: python pipeline/fetch_bsdata.py

      - name: Parse BSData
        run: python pipeline/parse_bsdata.py

      - name: Build frontend data
        run: python pipeline/build_frontend_data.py    # manquait

      - name: Audit
        run: python pipeline/audit.py

      - name: Commit updated data
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/cache_stable/ data/version.json frontend/public/data/
          if git diff --cached --quiet; then
            echo "Aucun changement."
          else
            git commit -m "chore: sync BSData [$(date -u '+%Y-%m-%d %H:%M UTC')]"
            git push
          fi
```

---

## Jenkins — alternative à GitHub Actions

Jenkins tourne sur l'EC2 (Phase 2) et offre plus de contrôle sur les runners.

### Installer Jenkins sur EC2

```bash
# Sur l'EC2
sudo apt update
sudo apt install openjdk-17-jdk -y
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt update && sudo apt install jenkins -y
sudo systemctl start jenkins
```

Accéder sur `http://<EC2-IP>:8080`

### Jenkinsfile (équivalent du workflow GitHub Actions)

```groovy
// Jenkinsfile (racine du projet)
pipeline {
    agent any

    environment {
        REGISTRY = 'ghcr.io/pyy0tr'
        IMAGE_NAME = 'probhammer-frontend'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Lint') {
            steps {
                dir('frontend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Docker Build & Push') {
            when { branch 'main' }
            steps {
                sh "docker build -t ${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT} ./frontend"
                sh "docker push ${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT}"
            }
        }

        stage('Deploy') {
            when { branch 'main' }
            steps {
                sh "kubectl set image deployment/probhammer-frontend frontend=${REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT}"
            }
        }
    }

    post {
        failure {
            echo "Pipeline failed — notifier Slack/email ici"
        }
    }
}
```

---

## SonarQube — qualité de code

SonarQube analyse la qualité du code : duplication, complexité, vulnérabilités.

```yaml
# Ajouter dans ci.yml
  sonarqube:
    name: SonarQube Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

---

## Monitoring — Prometheus + Grafana

Prometheus scrape les métriques de l'app, Grafana les affiche.

Pour ProbHammer (frontend statique + nginx) :
- Métriques nginx : requêtes/s, latence, codes HTTP
- Métriques EC2 : CPU, mémoire, disque
- Alertes : si CPU > 80% pendant 5 min → notification

```yaml
# docker-compose monitoring (sur EC2)
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## Actions à réaliser (checklist)

- [ ] Corriger `sync_bsdata.yml` (ajouter build_frontend_data.py, corriger git add)
- [ ] Créer `.github/workflows/ci.yml` (lint + build)
- [ ] Ajouter les secrets GitHub (VITE_SUPABASE_URL, AWS_ACCESS_KEY_ID, etc.)
- [ ] Créer `.github/workflows/deploy.yml` (S3 + Docker)
- [ ] Installer Jenkins sur EC2 (Phase 2 prérequis)
- [ ] Créer `Jenkinsfile` à la racine
- [ ] Configurer SonarQube (optionnel, instance cloud gratuite sur sonarcloud.io)
- [ ] Déployer Prometheus + Grafana sur EC2
- [ ] Créer un dashboard Grafana avec les métriques nginx
