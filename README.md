# WarhammerWebProjet V2

Simulateur de probabilités de combat Warhammer 40K 10e édition.  
Navigateur de factions/unités, gestion d'armées, graphiques de distributions.

---

## Stack

| Composant | Technologie |
|---|---|
| Backend | **FastAPI** (Python) |
| Frontend | **React** + Vite + Tailwind CSS + Recharts |
| Auth + DB | **Supabase** (PostgreSQL + Auth) |
| Hébergement backend | **Render.com** (gratuit) |
| Hébergement frontend | **Cloudflare Pages** (gratuit, bandwidth illimité) |
| Assets (images) | **Cloudflare R2** (gratuit, egress gratuit) |
| Pipeline BSData | **GitHub Actions** (cron toutes les 12h) |
| Domaine | OVH / Namecheap (~10€/an) |
| **Coût total** | **~10€/an** |

---

## Avancement

### Phase 1 — Fondations ✅
- [x] Repo GitHub initialisé
- [x] Structure projet (backend/, frontend/, pipeline/, browser/)
- [x] Makefile, .gitignore, README, STRUCTURE

### Phase 2 — Pipeline données ✅
- [x] `pipeline/fetch_bsdata.py` — téléchargement zipball BSData (branche main) via GitHub API
- [x] `pipeline/parse_bsdata.py` — parser XML complet (8+ patterns résolus)
- [x] `pipeline/audit.py` — audit qualité des données parsées (0 erreur, ~16 warnings légitimes)
- [x] **1487 unités · 5372 armes · 46 factions · 33 règles universelles**
- [x] Pts scalables (squad size) et multi-profils stats capturés
- [x] Browser HTML local de vérification (`browser/index.html`)
- [x] GitHub Actions cron (sync BSData automatique toutes les 12h)

### Phase 3 — Backend FastAPI
- [ ] Porter le moteur Monte Carlo (regleCalcProba.py → engine/simulation.py)
- [ ] Endpoints /simulate fonctionnels
- [ ] Intégrer Supabase Auth
- [ ] Déployer sur Render.com

### Phase 4 — Frontend React
- [ ] Init Vite + Tailwind + Recharts + Zustand
- [ ] Pages : home, factions, unités, simulateur, résultats
- [ ] Graphiques distributions (hits, wounds, damage)
- [ ] Comparaison multi-armes
- [ ] Déployer sur Cloudflare Pages

### Phase 5 — Assets & Finitions
- [ ] Cloudflare R2 pour les images de factions
- [ ] Domaine custom
- [ ] Tests (pytest + Vitest)
- [ ] Monitoring

---

## Lancer en local

### Données BSData (une fois, ou à chaque nouvelle version)
```bash
make data
```

### Browser de vérification des données
```bash
make browser
# → http://localhost:8080/browser/index.html
```

### Backend FastAPI
```bash
make backend-install   # crée le venv + installe les dépendances
cp backend/.env.example backend/.env
make backend-dev
# → http://localhost:8000/docs
```

---

## Données parsées (BSData main branch)

| Fichier | Contenu |
|---|---|
| `data/cache/units.json` | 1487 unités (stats, armes, abilities, pts, pts_options, model_profiles, keywords) |
| `data/cache/weapons.json` | 5372 armes dédupliquées |
| `data/cache/factions.json` | 46 factions |
| `data/cache/faction_units.json` | 42 factions jouables → unit_ids |
| `data/cache/rules.json` | 33 règles universelles |
| `data/version.json` | SHA du dernier commit BSData parsé |

Source : [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e) (branche main, sync toutes les 12h)
