# Structure du projet

```
WarhammerWebProjet_V2/
│
├── backend/                          # API FastAPI (Python)
│   ├── app/
│   │   ├── main.py                   # Point d'entrée — app FastAPI, CORS, routers
│   │   ├── data_loader.py            # Charge les JSON BSData en mémoire au démarrage
│   │   ├── routers/
│   │   │   ├── factions.py           # GET /factions, /factions/{name}/units
│   │   │   ├── units.py              # GET /units, /units/{id}
│   │   │   ├── weapons.py            # GET /weapons, /weapons/{id}
│   │   │   └── simulator.py          # POST /simulate
│   │   ├── schemas/                  # Modèles Pydantic (à remplir)
│   │   └── engine/
│   │       └── simulation.py         # Moteur Monte Carlo (à porter depuis V1)
│   ├── requirements.txt              # Dépendances Python backend
│   └── .env.example                  # Variables d'environnement (copier en .env)
│
├── frontend/                         # React + Vite + Tailwind (à initialiser)
│   └── .gitkeep                      # npm create vite@latest . -- --template react-ts
│
├── pipeline/                         # Scripts BSData (Python stdlib uniquement)
│   ├── fetch_bsdata.py               # Télécharge le dernier release BSData via GitHub API
│   ├── parse_bsdata.py               # Parse .cat/.gst → JSON cache (1349 unités, 4751 armes)
│   └── requirements.txt              # Aucune dépendance externe (stdlib only)
│
├── data/
│   ├── raw/                          # [gitignore] Fichiers BSData XML (~100 MB)
│   ├── cache/                        # [gitignore] JSON générés par parse_bsdata.py
│   │   ├── units.json                # 1349 unités
│   │   ├── weapons.json              # 4751 armes
│   │   ├── factions.json             # 44 factions
│   │   ├── faction_units.json        # 41 factions jouables → unit_ids
│   │   └── rules.json                # 32 règles universelles
│   └── version.json                  # Version BSData parsée (ex: v10.6.0)
│
├── browser/
│   └── index.html                    # Browser local single-file pour vérifier les données
│                                     # → make browser (http://localhost:8080/browser/index.html)
│
├── .project-memory/                  # Notes internes Claude (non pertinent pour les devs)
│
├── Makefile                          # Commandes courantes (make help)
├── .gitignore
├── README.md
└── STRUCTURE.md
```

---

## Commandes

```bash
make help            # Liste toutes les commandes disponibles

make data            # fetch + parse BSData en une fois
make data-fetch      # Télécharge data/raw/ depuis GitHub BSData
make data-parse      # Génère data/cache/*.json depuis data/raw/

make browser         # Lance le browser local sur :8080

make backend-install # Crée le venv et installe les dépendances
make backend-dev     # Lance FastAPI en mode dev sur :8000
```

---

## Flux de données

```
BSData GitHub (releases)
        ↓  pipeline/fetch_bsdata.py
   data/raw/*.cat + *.gst    (XML, ~100 MB, gitignored)
        ↓  pipeline/parse_bsdata.py
   data/cache/*.json          (JSON, ~18 MB, gitignored)
        ↓  backend/app/data_loader.py
   Mémoire API                (chargé au startup, ~15 MB)
        ↓  backend/app/routers/
   REST API FastAPI            (:8000)
        ↓
   Frontend React              (:5173)
```

---

## Démarrage rapide

```bash
# 1. Données (une seule fois, ou à chaque nouvelle version BSData)
make data

# 2. Backend
make backend-install
cp backend/.env.example backend/.env
make backend-dev
# → http://localhost:8000/docs  (Swagger auto-généré)

# 3. Browser de vérification des données
make browser
# → http://localhost:8080/browser/index.html
```
