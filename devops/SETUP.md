# Part Zero — Setup local dev (poste de développement)

> Ce document décrit l'environnement minimal pour travailler sur ProbHammer
> en local avant d'attaquer la pipeline DevOps.

---

## Contexte

ProbHammer V1 est l'application cobaye sur laquelle toute la pipeline DevOps sera construite.
Elle est composée de :
- Un **frontend React** (Vite) — tourne dans le navigateur
- Un **pipeline Python** — génère les JSON de données depuis BSData
- Des **données statiques JSON** — servies comme assets

Pas de backend en production (supprimé, cold start trop long).
Auth + saves = Supabase (optionnel en dev local).

---

## Prérequis à installer

### 1. Git
```bash
sudo apt install git -y
git --version  # 2.x.x attendu

# Configurer son identité
git config --global user.name "Pyy0tr"
git config --global user.email "pierre45240@gmail.com"

# Vérifier
git config --list
```

### 2. Node.js (via nvm — recommandé)
nvm permet de changer de version Node facilement, indispensable en équipe.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 22             # installe Node 22 LTS
nvm use 22
nvm alias default 22       # version par défaut à chaque session
node --version             # v22.22.2 ✅
npm --version              # 10.9.7 ✅
```

**Pourquoi nvm et pas apt ?**
`apt install nodejs` donne une version ancienne (v18 sur Ubuntu 24). nvm donne la LTS actuelle
et permet de switcher de version par projet avec un fichier `.nvmrc`.

### 3. Python 3 + pip + venv
```bash
sudo apt install python3-pip python3-venv -y
python3 --version   # 3.12.x attendu
pip3 --version
```

### 4. Clé SSH GitHub
```bash
# Vérifier si une clé existe déjà
ls ~/.ssh/id_ed25519.pub

# Tester la connexion GitHub
ssh -T git@github.com
# Attendu : "Hi Pyy0tr! You've successfully authenticated"
```

Si la clé n'existe pas :
```bash
ssh-keygen -t ed25519 -C "pierre45240@gmail.com"
cat ~/.ssh/id_ed25519.pub  # copier sur github.com → Settings → SSH keys
```

---

## Cloner le projet

```bash
mkdir -p ~/projets
cd ~/projets
git clone git@github.com:Pyy0tr/WarhammerWebProjet_V2.git
cd WarhammerWebProjet_V2
```

---

## Lancer le frontend

```bash
cd frontend
npm install
cp .env.example .env
# Éditer .env avec les clés Supabase (optionnel en dev)
npm run dev
# → http://localhost:5173
```

Les JSON de données sont déjà dans `frontend/public/data/` (versionnés).
Le frontend démarre sans avoir à relancer le pipeline Python.

---

## Relancer le pipeline données (optionnel)

Uniquement si les données BSData sont obsolètes ou manquantes.

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python fetch_bsdata.py          # télécharge ~100MB XML depuis BSData/wh40k-10e
python parse_bsdata.py          # parse XML → data/cache/*.json
python build_frontend_data.py   # slim format → frontend/public/data/*.json
python audit.py                 # vérifie la qualité (cible : 0 erreur)
```

---

## Ce qui est gitignore (ne pas s'inquiéter si absent)

| Chemin | Raison |
|---|---|
| `data/raw/` | XML BSData, ~100MB, régénérable |
| `data/cache/` | JSON intermédiaires, régénérables |
| `frontend/node_modules/` | Dépendances npm, `npm install` suffit |
| `frontend/.env` | Secrets Supabase |
| `.venv/` | Environnement Python virtuel |

---

## Vérification rapide

```bash
# Tout est en place si ces commandes ne renvoient pas d'erreur
node --version
npm --version
python3 --version
git status
ssh -T git@github.com
```
