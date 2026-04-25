# Phase 4 — Containers (Docker + Kubernetes)

---

## Concept

Le problème des déploiements classiques : "ça marche sur ma machine".
Un container encapsule l'application + ses dépendances dans une image portable.
La même image tourne en local, en CI, et en prod.

**Docker** : crée et run des containers sur une machine.
**Kubernetes** : orchestre des containers sur un cluster de machines.

---

## État d'avancement sur ProbHammer

| Élément | Statut |
|---|---|
| Dockerfile frontend | ❌ Pas encore |
| Dockerfile pipeline | ❌ Pas encore |
| docker-compose (dev local) | ❌ Pas encore |
| Déploiement Kubernetes | ❌ Pas encore |

---

## Installer Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin -y
sudo usermod -aG docker $USER   # évite de taper sudo à chaque fois
newgrp docker                   # applique sans redémarrer

docker --version
docker compose version
```

---

## Dockeriser ProbHammer

### Frontend — Dockerfile

Le frontend React se build en fichiers statiques, servis par nginx.

```dockerfile
# frontend/Dockerfile

# Étape 1 : Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                    # ci = install exact depuis package-lock.json
COPY . .
RUN npm run build             # génère dist/

# Étape 2 : Serve avec nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # React Router — toujours servir index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache agressif sur les assets buildés (hash dans le nom)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Pourquoi multi-stage build ?**
L'image finale ne contient que nginx + les fichiers buildés. Pas Node.js, pas
les sources, pas node_modules. Résultat : ~25MB au lieu de ~500MB.

### Pipeline Python — Dockerfile

```dockerfile
# pipeline/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "fetch_bsdata.py"]
```

---

## docker-compose pour le dev local

`docker-compose.yml` permet de lancer tous les services d'un coup.

```yaml
# docker-compose.yml (racine du projet)
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"         # http://localhost:3000
    volumes:
      - ./frontend/public/data:/usr/share/nginx/html/data  # JSON hot-reload

  pipeline:
    build:
      context: ./pipeline
      dockerfile: Dockerfile
    volumes:
      - ./data:/app/../data
      - ./frontend/public/data:/app/../frontend/public/data
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    profiles:
      - pipeline           # lancé seulement avec --profile pipeline
```

```bash
# Lancer le frontend conteneurisé
docker compose up frontend

# Lancer le pipeline manuellement
docker compose run --rm pipeline python fetch_bsdata.py

# Build + run complet
docker compose up --build

# Vérifier les containers
docker ps
docker logs probhammer-frontend-1
```

---

## Kubernetes — concepts appliqués à ProbHammer

Kubernetes (K8s) gère plusieurs replicas du container, restart auto, rolling updates.

**Objets K8s utilisés :**

```
Deployment    ← "je veux 2 replicas du frontend, toujours up"
Service       ← "expose le Deployment sur un port stable"
Ingress       ← "route le trafic HTTP externe vers les Services"
ConfigMap     ← "variables de config non-secrètes"
Secret        ← "variables secrètes (clés Supabase, etc.)"
```

### Exemple — déployer le frontend sur K8s

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: probhammer-frontend
  labels:
    app: probhammer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: probhammer-frontend
  template:
    metadata:
      labels:
        app: probhammer-frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/pyy0tr/probhammer-frontend:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: probhammer-frontend-svc
spec:
  selector:
    app: probhammer-frontend
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f k8s/frontend-deployment.yaml
kubectl get pods
kubectl get services
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Cluster local pour apprendre : minikube

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

minikube start
kubectl get nodes     # doit afficher le node minikube
```

### En production : AWS EKS

EKS (Elastic Kubernetes Service) = cluster K8s managé par AWS.
Créé via Terraform en Phase 3 + 4 combinées.

---

## Registry d'images — GHCR (GitHub Container Registry)

Les images Docker se stockent dans un registry. On utilise GHCR (gratuit, lié à GitHub).

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u Pyy0tr --password-stdin

# Build + tag
docker build -t ghcr.io/pyy0tr/probhammer-frontend:latest ./frontend

# Push
docker push ghcr.io/pyy0tr/probhammer-frontend:latest
```

---

## Actions à réaliser (checklist)

- [ ] Installer Docker
- [ ] Créer `frontend/Dockerfile` + `frontend/nginx.conf`
- [ ] `docker build -t probhammer-frontend ./frontend` — vérifier que ça build
- [ ] `docker run -p 3000:80 probhammer-frontend` — vérifier sur http://localhost:3000
- [ ] Créer `pipeline/Dockerfile`
- [ ] Créer `docker-compose.yml` à la racine
- [ ] Installer minikube
- [ ] Créer `k8s/frontend-deployment.yaml`
- [ ] `kubectl apply` et vérifier que les pods sont Running
- [ ] Push l'image sur GHCR
