# Phase 1 — Linux, Bash scripting, Git

---

## État d'avancement sur ProbHammer

| Élément | Statut | Détail |
|---|---|---|
| Git installé et configuré | ✅ | Commits avec conventions feat/fix/docs/chore |
| SSH GitHub fonctionnel | ✅ | Clé ed25519 configurée |
| GitHub Actions (CI basique) | ✅ | sync_bsdata.yml — cron 12h |
| Node.js 22 LTS via nvm | ✅ | v22.22.2, npm v10.9.7 |
| App frontend opérationnelle | ✅ | npm install + npm run dev OK |
| Auth Supabase + reset password | ✅ | Forgot password flow implémenté |
| Scripts Bash dédiés | ❌ | Seulement des scripts Python, pas de Bash |
| Branching strategy | ❌ | Tout sur `main`, pas de branches feature/develop |
| .nvmrc (version Node fixée) | ❌ | Pas de version Node lockée dans le repo |

---

## Ce qu'il reste à faire

### 1. Branching strategy (Git Flow simplifié)

En industrie, on ne travaille jamais directement sur `main`.
Stratégie adoptée pour ProbHammer :

```
main        ← code en production uniquement, protégé
develop     ← branche d'intégration
feature/*   ← nouvelles fonctionnalités (ex: feature/docker-setup)
fix/*       ← corrections de bugs
chore/*     ← DevOps, infra, maintenance (ex: chore/add-dockerfile)
```

**Pourquoi pas Git Flow complet ?**
Git Flow avec `release/*` et `hotfix/*` est adapté aux équipes avec des cycles de release.
Pour un projet solo/apprentissage, `main + develop + feature/*` suffit et reste lisible.

Mettre en place :
```bash
git checkout -b develop
git push -u origin develop

# Protéger main sur GitHub :
# Settings → Branches → Add rule → main → Require PR before merging
```

### 2. Fichier .nvmrc (bonne pratique)

Fixe la version Node pour que tout le monde (et la CI) utilise la même.

```bash
echo "22" > frontend/.nvmrc
# Dans le frontend, nvm use se fait automatiquement si nvm est installé
```

### 3. Scripts Bash — remplacer les commandes manuelles

Actuellement le Makefile appelle Python directement. En industrie, on encapsule
les commandes dans des scripts Bash versionés.

Créer `scripts/setup.sh` :
```bash
#!/usr/bin/env bash
set -euo pipefail   # -e = stop on error, -u = no unset vars, -o pipefail

echo "=== Setup ProbHammer dev environment ==="

# Frontend
echo "[1/2] Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Pipeline Python
echo "[2/2] Setting up Python venv..."
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

echo "Done. Run: cd frontend && npm run dev"
```

Créer `scripts/data-refresh.sh` :
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Refreshing BSData ==="
cd pipeline
source .venv/bin/activate
python fetch_bsdata.py
python parse_bsdata.py
python build_frontend_data.py
python audit.py
echo "=== Done ==="
```

```bash
chmod +x scripts/*.sh
```

### 4. Conventions de commit (Conventional Commits)

Déjà pratiquées sur le projet. À documenter et à enforcer en CI.

Format : `<type>(<scope>): <description>`
- `feat` — nouvelle fonctionnalité
- `fix` — correction de bug
- `chore` — maintenance, DevOps, dépendances
- `docs` — documentation uniquement
- `ci` — changement GitHub Actions / pipeline CI
- `refactor` — refactoring sans changement de comportement

Exemples appliqués au projet :
```
feat(simulator): add keyword chip picker
fix(pipeline): handle missing weapon profiles in BSData
chore(ci): add build step to sync_bsdata workflow
ci(docker): add Dockerfile for frontend
```

---

## Linux fundamentals appliqués au projet

Commandes utiles à maîtriser dans le contexte ProbHammer :

```bash
# Navigation et fichiers
ls -la                          # lister avec permissions
find . -name "*.json" -maxdepth 3
grep -r "VITE_SUPABASE" .       # chercher dans les fichiers

# Permissions scripts
chmod +x scripts/setup.sh       # rendre exécutable
ls -la scripts/                 # vérifier les permissions

# Processus
ps aux | grep node              # voir le process npm dev
kill $(lsof -t -i:5173)        # tuer le port 5173

# Variables d'environnement
cat frontend/.env               # voir les variables
export NODE_ENV=production      # setter une var pour la session

# Logs
tail -f /var/log/syslog         # suivre les logs système
journalctl -u nginx -f          # logs d'un service systemd
```

---

## Actions à réaliser (checklist)

- [ ] Créer la branche `develop` et pusher sur GitHub
- [ ] Protéger `main` sur GitHub (require PR)
- [ ] Créer `frontend/.nvmrc` avec `22`
- [ ] Créer `scripts/setup.sh` et `scripts/data-refresh.sh`
- [ ] Tester `bash scripts/setup.sh` depuis zéro
- [ ] Ajouter un `CONTRIBUTING.md` avec les conventions de commit
