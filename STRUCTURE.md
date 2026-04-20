# Structure du projet

```
WarhammerWebProjet_V2/
│
├── pipeline/                         # Scripts de récupération et parsing des données
│   ├── fetch_bsdata.py               # Télécharge le dernier release BSData via GitHub API
│   └── parse_bsdata.py               # Parse les .cat/.gst → fichiers JSON cache
│
├── data/
│   ├── raw/                          # Fichiers BSData bruts (non commités, ~100 MB)
│   │   ├── *.cat                     # 45 catalogues de factions (XML)
│   │   └── *.gst                     # 1 fichier système de jeu (XML)
│   ├── cache/                        # Données parsées, prêtes pour l'API
│   │   ├── units.json                # 1349 unités (stats, armes, abilities, pts, keywords)
│   │   ├── weapons.json              # 4751 armes dédupliquées
│   │   ├── factions.json             # 44 factions
│   │   ├── faction_units.json        # Mapping 41 factions jouables → unit_ids
│   │   └── rules.json                # 32 règles universelles (depuis le .gst)
│   └── version.json                  # Version BSData actuellement parsée (ex: v10.6.0)
│
├── browser/
│   └── index.html                    # Browser HTML local (single-file, sans dépendance)
│                                     # Usage : python -m http.server 8080
│                                     #         → http://localhost:8080/browser/index.html
│
├── backend/                          # (à créer) API FastAPI
│   ├── main.py                       # Point d'entrée FastAPI
│   ├── routers/
│   │   ├── units.py                  # GET /units, /units/{id}
│   │   ├── factions.py               # GET /factions
│   │   ├── weapons.py                # GET /weapons
│   │   └── simulator.py              # POST /simulate
│   ├── engine/
│   │   └── simulation.py             # Moteur Monte Carlo (regleCalcProba.py refactorisé)
│   ├── models/                       # Schemas Pydantic
│   └── db/                           # SQLite pour comptes utilisateurs et armées
│
├── frontend/                         # (à créer) React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Factions.tsx
│   │   │   ├── Units.tsx
│   │   │   ├── Simulator.tsx
│   │   │   └── Results.tsx
│   │   ├── components/
│   │   ├── store/                    # Zustand (state armées attaquant/défenseur)
│   │   └── api/                      # Appels FastAPI
│   └── public/
│
├── .project-memory/                  # Notes de projet (usage interne Claude)
│   ├── MEMORY.md                     # Index des notes
│   ├── plan-general.md               # Stack, architecture, roadmap
│   ├── pipeline-donnees.md           # Documentation complète du parser BSData
│   ├── decisions.md                  # Journal des décisions techniques
│   └── v1-bilan.md                   # Ce qui est réutilisable depuis la V1
│
├── .gitignore
├── README.md                         # Présentation du projet
└── STRUCTURE.md                      # Ce fichier
```

---

## Fichiers clés

### `pipeline/fetch_bsdata.py`
- Interroge l'API GitHub pour récupérer le dernier release de `BSData/wh40k-10e`
- Compare avec `data/version.json` — ne re-télécharge que si nouvelle version
- Télécharge le zipball (~100 MB) et extrait les `.cat` / `.gst` dans `data/raw/`
- Variable d'env : `GITHUB_TOKEN` (optionnel, évite le rate-limit)

### `pipeline/parse_bsdata.py`
- Charge tous les fichiers en une passe et construit un index global `{id → noeud XML}`
- Résout les `targetId` inter-fichiers (unité dans fichier A référencée par fichier B)
- Gère 8 patterns XML différents pour extraire stats, armes, abilities, options
- Détecte automatiquement les unités Legends (`[Legends]` dans le nom)
- Construit le mapping `faction jouable → unit_ids` pour les factions qui utilisent des Libraries
- Écrit les 5 fichiers JSON dans `data/cache/`

### `browser/index.html`
- Application HTML/CSS/JS en un seul fichier, zéro dépendance externe
- Charge les JSON depuis `data/cache/` via fetch
- Navigation : sidebar factions → liste unités → panneau détail
- Affiche stats, keywords, abilities, armes (tableau), options d'équipement (arborescence)
- Badge ⚠ sur les unités avec données incomplètes
- Recherche en temps réel (nom, faction, keyword)
- Toggle JSON brut pour debug

---

## Données non commitées (`.gitignore`)

```
data/raw/        # ~100 MB de XML BSData — regénérable via fetch_bsdata.py
data/cache/      # ~18 MB de JSON — regénérable via parse_bsdata.py
```

Les données sont toujours regénérables en relançant le pipeline.
