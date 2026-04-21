# WarhammerWebProjet V2

Simulateur de probabilités de combat Warhammer 40K V10.  
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
- [x] `pipeline/fetch_bsdata.py` — téléchargement zipball BSData via API GitHub
- [x] `pipeline/parse_bsdata.py` — parser XML complet (8 patterns résolus)
- [x] 1349 unités · 4751 armes · 44 factions · 32 règles universelles
- [x] Browser HTML local de vérification (`browser/index.html`)
- [ ] GitHub Actions cron (sync BSData automatique toutes les 12h)

### Phase 3 — Backend FastAPI
- [ ] Setup venv + tester les endpoints en local
- [ ] Porter le moteur Monte Carlo (regleCalcProba.py → engine/simulation.py)
- [ ] Intégrer Supabase Auth
- [ ] Déployer sur Render.com

### Phase 4 — Frontend React
- [ ] Init Vite + Tailwind + Recharts + Zustand
- [ ] Pages : home, factions, unités, simulateur, résultats
- [ ] Graphiques distributions (hits, wounds, damage)
- [ ] Comparaison multi-armes
- [ ] Déployer sur Cloudflare Pages

### Phase 5 — Assets & Pipeline auto
- [ ] Cloudflare R2 pour les images de factions
- [ ] GitHub Actions cron BSData (toutes les 12h)
- [ ] Domaine custom

### Phase 6 — Finitions
- [ ] Tests (pytest + Vitest)
- [ ] Monitoring
- [ ] Documentation API (/docs auto-généré par FastAPI)

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

## Données parsées (BSData v10.6.0)

| Fichier | Contenu |
|---|---|
| `data/cache/units.json` | 1349 unités (stats, armes, abilities, pts, keywords) |
| `data/cache/weapons.json` | 4751 armes dédupliquées |
| `data/cache/factions.json` | 44 factions |
| `data/cache/faction_units.json` | 41 factions jouables → unit_ids |
| `data/cache/rules.json` | 32 règles universelles |

Source : [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e)
