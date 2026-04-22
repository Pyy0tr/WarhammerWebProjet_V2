# Structure du projet

```
WarhammerWebProjet_V2/
│
├── frontend/                          # React 19 + Vite (pas de backend)
│   ├── public/
│   │   └── data/                      # JSON slim générés par build_frontend_data.py
│   │       ├── units.json             # Unités slim (id, name, T, Sv, W, min/max_models, weapons[])
│   │       ├── weapons.json           # Armes slim (id, name, A, BS, S, AP, D, kw[], users[])
│   │       ├── factions.json          # Factions (id, name, image_url)
│   │       └── faction_units.json     # faction_id → unit_ids[]
│   ├── src/
│   │   ├── main.jsx                   # Point d'entrée React + React Router
│   │   ├── App.jsx                    # Routes + layout global
│   │   ├── lib/
│   │   │   └── supabase.js            # Client Supabase (Auth + PostgreSQL)
│   │   ├── engine/
│   │   │   ├── dice.js                # roll(), d6(), clamp(), woundThreshold()
│   │   │   └── simulation.js          # simulate(req) → Monte Carlo 1000 itérations
│   │   ├── store/
│   │   │   ├── simulatorStore.js      # État simulateur (attacker/weapon/defender/context/result)
│   │   │   ├── armyStore.js           # Armées (localStorage anonyme ↔ Supabase connecté)
│   │   │   ├── authStore.js           # Session Supabase Auth (user, login, logout)
│   │   │   └── dataStore.js           # Données BSData (units, weapons, factions — chargé au mount)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx           # Landing page
│   │   │   ├── FactionsPage.jsx       # Navigateur factions → unités → "Add to Army"
│   │   │   ├── SimulatorPage.jsx      # Simulateur (AttackerPanel + DefenderPanel + ResultsPanel)
│   │   │   └── ArmiesPage.jsx         # Gestion armées (créer, renommer, supprimer, modèles)
│   │   └── components/
│   │       ├── Navbar.jsx             # Barre de navigation + AuthModal trigger
│   │       ├── AuthModal.jsx          # Modal login/signup Supabase
│   │       ├── AttackerPanel.jsx      # Attaquant : weapon, stats, keywords (chip picker), buffs
│   │       │                          #   └── ArmyPicker (From Army mode)
│   │       │                          #   └── KeywordPicker (chip grid par phase)
│   │       ├── DefenderPanel.jsx      # Défenseur : T, Sv, invuln, FNP, W, models, keywords
│   │       ├── ResultsPanel.jsx       # Résultats : mean/p10/p25/p75/p90, histogramme, kill probs
│   │       ├── UnitDrawer.jsx         # Drawer de sélection unité+arme (recherche dans dataStore)
│   │       ├── SearchInput.jsx        # Input search avec autocomplete dropdown
│   │       ├── StatInput.jsx          # Champ stat numérique avec label
│   │       └── Toggle.jsx             # Toggle button générique
│   ├── package.json
│   └── vite.config.js
│
├── pipeline/                          # Scripts BSData (exécutés par GitHub Actions)
│   ├── fetch_bsdata.py                # Télécharge la branche main BSData (zipball GitHub API)
│   ├── parse_bsdata.py                # Parse .cat/.gst → data/cache/*.json
│   ├── build_frontend_data.py         # cache/*.json → slim format frontend/public/data/
│   ├── audit.py                       # Qualité des JSON (0 erreur cible)
│   └── requirements.txt
│
├── data/
│   ├── raw/                           # [gitignore] XML BSData (~100 MB)
│   ├── cache/                         # [gitignore] JSON complets générés par parse_bsdata.py
│   └── cache_stable/                  # [git] Snapshot de référence validé
│       ├── units.json                 # 1487 unités complètes
│       ├── weapons.json               # 5372 armes
│       ├── factions.json              # 46 factions
│       └── faction_units.json         # 42 factions jouables → unit_ids
│
├── backend/                           # [non utilisé en prod] FastAPI Python (archive)
│   └── ...                            # Cold start Render ~50s → remplacé par moteur JS
│
├── browser/
│   └── index.html                     # Browser local de vérification des données BSData
│
├── .github/
│   └── workflows/
│       └── sync_bsdata.yml            # Cron GitHub Actions : fetch → parse → build → commit
│
├── .project-memory/                   # Notes internes projet (décisions, architecture, roadmap)
│
├── Makefile
├── .gitignore
├── README.md
└── STRUCTURE.md
```

---

## Flux de données

```
BSData/wh40k-10e (GitHub — branche main)
        │
        ▼ GitHub Actions cron (toutes les 12h)
   pipeline/fetch_bsdata.py          (zipball → data/raw/)
   pipeline/parse_bsdata.py          (XML → data/cache/*.json — format complet)
   pipeline/build_frontend_data.py   (cache/ → frontend/public/data/ — slim format)
        │
        ▼ servis comme assets statiques (Cloudflare Pages)
React Frontend
   ├── dataStore.js   ← charge units.json / weapons.json / factions.json au mount
   ├── armyStore.js   ← localStorage (anonyme) ou Supabase PostgreSQL (connecté)
   ├── authStore.js   ← Supabase Auth JS SDK
   └── engine/simulation.js  ← Monte Carlo dans le browser, zéro appel réseau
```

---

## Commandes

```bash
# Frontend (dev)
cd frontend && npm run dev          # → http://localhost:5173

# Pipeline données
cd pipeline
python fetch_bsdata.py             # Télécharge data/raw/ depuis BSData GitHub
python parse_bsdata.py             # Génère data/cache/*.json
python build_frontend_data.py      # Génère frontend/public/data/*.json (slim)
python audit.py                    # Vérifie qualité des données

# Browser de vérification
make browser                       # → http://localhost:8080/browser/index.html
```

---

## Conventions frontend

- **Pas de Tailwind / CSS classes** — tout en `style={{}}` inline
- Constantes couleur en haut de chaque fichier (`BLUE`, `BG`, `TEXT_MUTED`, `PANEL`, `BORDER`)
- Palette : fond `#041428`, accent `#09A2C4`, texte blanc/grisé
- Police : `Space Mono, monospace` (UI technique) + `Georgia, serif` (flavour text)
- Tout le texte UI en **anglais**
