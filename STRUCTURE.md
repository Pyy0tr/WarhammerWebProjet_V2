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
│   │   │   └── simulator.py          # POST /simulate  [TODO Phase 3]
│   │   ├── schemas/                  # Modèles Pydantic  [TODO Phase 3]
│   │   └── engine/
│   │       └── simulation.py         # Moteur Monte Carlo  [TODO Phase 3 — port depuis V1]
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                         # React + Vite + Tailwind  [TODO Phase 4]
│   └── .gitkeep
│
├── pipeline/                         # Scripts BSData (exécutés par GitHub Actions)
│   ├── fetch_bsdata.py               # Télécharge la branche main BSData via GitHub API
│   ├── parse_bsdata.py               # Parse .cat/.gst → JSON cache (1487 unités, 5372 armes)
│   ├── audit.py                      # Vérifie la qualité des JSON générés (0 erreur cible)
│   └── requirements.txt              # requests uniquement
│
├── data/
│   ├── raw/                          # [gitignore] Fichiers BSData XML (~100 MB)
│   ├── cache/                        # [gitignore] JSON générés par parse_bsdata.py
│   │   ├── units.json                # 1487 unités
│   │   ├── weapons.json              # 5372 armes
│   │   ├── factions.json             # 46 factions
│   │   ├── faction_units.json        # 42 factions jouables → unit_ids
│   │   └── rules.json                # 33 règles universelles
│   ├── cache_stable/                 # [git] Snapshot validé du cache (sauvegarde référence)
│   └── version.json                  # SHA du dernier commit BSData parsé
│
├── browser/
│   └── index.html                    # Browser local single-file pour vérifier les données
│                                     # → make browser (http://localhost:8080/browser/index.html)
│
├── .github/
│   └── workflows/
│       └── sync_bsdata.yml           # Cron GitHub Actions : fetch → parse → audit → commit
│
├── .project-memory/                  # Notes internes projet (architecture, décisions, roadmap)
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

make data            # fetch + parse + audit BSData en une fois
make data-fetch      # Télécharge data/raw/ depuis GitHub BSData (branche main)
make data-parse      # Génère data/cache/*.json depuis data/raw/
make data-audit      # Vérifie la qualité des données

make browser         # Lance le browser local sur :8080

make backend-install # Crée le venv et installe les dépendances
make backend-dev     # Lance FastAPI en mode dev sur :8000
```

---

## Flux de données

```
BSData/wh40k-10e (GitHub — branche main)
        ↓  GitHub Actions cron (toutes les 12h)
        ↓  pipeline/fetch_bsdata.py  (télécharge le zipball main)
   data/raw/*.cat + *.gst    (XML, ~100 MB, gitignored)
        ↓  pipeline/parse_bsdata.py
   data/cache/*.json          (JSON, ~18 MB, gitignored)
        ↓  pipeline/audit.py  (0 erreur cible, ~16 warnings légitimes)
        ↓  git commit → data/cache_stable/ (snapshot versionné)
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
