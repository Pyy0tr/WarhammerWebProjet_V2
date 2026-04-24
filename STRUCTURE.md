# Structure du projet

```
WarhammerWebProjet_V2/
│
├── frontend/                          # React 19 + Vite (pas de backend)
│   ├── public/
│   │   └── data/                      # JSON slim générés par build_frontend_data.py
│   │       ├── units.json             # Unités slim (id, name, T, Sv, W, abilities[], weapons[], …)
│   │       ├── weapons.json           # Armes slim (id, name, A, BS, S, AP, D, kw[], users[])
│   │       ├── factions.json          # Factions (id, name, image_url)
│   │       └── faction_units.json     # faction_id → unit_ids[]
│   ├── src/
│   │   ├── main.jsx                   # Point d'entrée React + React Router
│   │   ├── App.jsx                    # Routes + layout global
│   │   ├── theme.js                   # Palette centralisée (BG, SURFACE, ACCENT, TEXT_*, …)
│   │   ├── lib/
│   │   │   └── supabase.js            # Client Supabase (Auth + PostgreSQL)
│   │   ├── engine/
│   │   │   ├── dice.js                # roll(), d6(), clamp(), woundThreshold()
│   │   │   └── simulation.js          # simulate(req) → Monte Carlo 1000 itérations
│   │   ├── store/
│   │   │   ├── simulatorStore.js      # État simulateur (attacker/defender/unit/hoveredKeyword/steps)
│   │   │   ├── armyStore.js           # Armées (localStorage anonyme ↔ Supabase connecté)
│   │   │   ├── authStore.js           # Session Supabase Auth (user, login, logout)
│   │   │   └── dataStore.js           # Données BSData (units, weapons, factions — chargé au mount)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx           # Landing page
│   │   │   ├── FactionsPage.jsx       # Navigateur factions → unités → détail (stats, armes, abilities)
│   │   │   │                          #   ├── AllianceSection (grille CSS uniforme par alliance)
│   │   │   │                          #   ├── FactionChip (hover arrow, alliance-tinted border)
│   │   │   │                          #   ├── UnitsView (filtre, tri, toggle Legends)
│   │   │   │                          #   └── UnitDetailView (stats, armes, abilities, Add to Army)
│   │   │   ├── SimulatorPage.jsx      # Simulateur wizard 4 étapes
│   │   │   │                          #   ├── KeywordDefinitionPanel (fixed left — def au hover)
│   │   │   │                          #   ├── UnitAbilitiesPanel (fixed right — abilities animées)
│   │   │   │                          #   ├── AttackStep / ReviewStep / DefenderStep / ResultsStep
│   │   │   │                          #   └── KEYWORD_DEFS (19 mots-clés avec règle + phase)
│   │   │   └── ArmiesPage.jsx         # Gestion armées (créer, renommer, supprimer, modèles)
│   │   └── components/
│   │       ├── AbilityText.jsx        # Rendu markup BSData (^^kw^^, **kw**, **^^kw^^**) → ACCENT+bold
│   │       ├── Navbar.jsx             # Barre de navigation + AuthModal trigger
│   │       ├── AuthModal.jsx          # Modal login/signup Supabase
│   │       ├── AttackerPanel.jsx      # Attaquant : Browse Units / From Army, keywords, firing models
│   │       │                          #   ├── ArmyPicker (armée → escouade → arme → firing models)
│   │       │                          #   └── KeywordPicker (chip grid par phase Hit/Wound/Other)
│   │       ├── DefenderPanel.jsx      # Défenseur : Browse Units / From Army, T/Sv/W/invuln/FNP
│   │       │                          #   └── DefenderArmyPicker
│   │       ├── ResultsPanel.jsx       # Résultats : mean/p10/p90, histogramme, kill probs
│   │       ├── UnitDrawer.jsx         # Drawer sélection unité+arme (recherche dans dataStore)
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
│   │                                  #   NB: descriptions abilities non tronquées (markup conservé)
│   ├── audit.py                       # Qualité des JSON (0 erreur cible)
│   └── requirements.txt
│
├── data/
│   ├── raw/                           # [gitignore] XML BSData (~100 MB)
│   ├── cache/                         # [gitignore] JSON complets générés par parse_bsdata.py
│   └── cache_stable/                  # [git] Snapshot de référence validé
│       ├── units.json                 # 1487 unités complètes (avec abilities complètes)
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
├── CLAUDE.md                          # Instructions Claude Code pour ce projet
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
- Palette centralisée dans `src/theme.js` — toujours importer depuis là
- Polices : `Space Mono, monospace` (UI technique/labels) + `Georgia, serif` (flavour text abilities)
- Tout le texte UI en **anglais**
- Injections CSS (keyframes, scrollbars) via `<style>` tag injecté dans `document.head` avec `useEffect`

---

## Palette couleurs (`src/theme.js`)

| Token | Valeur | Usage |
|---|---|---|
| `BG` | `#0A1621` | Fond principal |
| `SURFACE` | `#0F2230` | Panneaux, sidebars |
| `SURFACE_E` | `#143247` | Éléments élevés (dropdown, modal) |
| `BORDER` | `#1E3A4C` | Toutes les bordures |
| `TEXT` | `#E6F1FF` | Titres, valeurs clés |
| `TEXT_SEC` | `#9DB7C6` | Corps de texte |
| `TEXT_WEAK` | `#5F7C8A` | Labels, meta |
| `TEXT_OFF` | `#3E5A68` | Placeholders, désactivé |
| `ACCENT` | `#2FE0FF` | Interactions (boutons primaires, focus, actif) |
| `ERROR` | `#FF5C7A` | Erreurs |
| Alliance Imperium | `#C9A227` | Teinture boutons/headers Imperium |
| Alliance Chaos | `#CC3344` | Teinture boutons/headers Chaos |
| Alliance Xenos | `#2FE0FF` | (= ACCENT) |
