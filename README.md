# WarhammerWebProjet V2

Refonte complète de l'application de calcul de probabilités Warhammer 40K V10.  
Simulateur de combat, navigateur de factions/unités, gestion d'armées, graphiques de distributions.

---

## Objectif

Remplacer la V1 (Flask + SQLite + Jinja2) par une stack moderne, hébergée sur Azure, avec :
- Un pipeline de données automatisé depuis [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e)
- Une API REST FastAPI
- Un frontend React + Tailwind CSS
- Un moteur de simulation Monte Carlo (réutilisé et refactorisé depuis la V1)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | FastAPI (Python), SQLAlchemy 2.0, SQLite (users) |
| Frontend | React + Vite, Tailwind CSS, Recharts, Zustand |
| Données jeu | JSON cache (~15 MB, chargé en mémoire) |
| Hébergement | Azure App Service + Static Web Apps |
| Pipeline data | Azure Function Timer (sync BSData toutes les 12h) |

---

## Avancement

### Phase 1 — Fondations
- [x] Initialisation du repo GitHub
- [ ] Setup FastAPI + structure backend
- [ ] Porter le moteur de simulation (regleCalcProba.py) en module FastAPI
- [ ] CI/CD GitHub Actions basique

### Phase 2 — Pipeline données ✅ TERMINÉE
- [x] `pipeline/fetch_bsdata.py` — téléchargement du dernier release BSData (zipball, pas git clone)
- [x] `pipeline/parse_bsdata.py` — parser XML complet, résolution multi-niveaux
- [x] 1349 unités, 4751 armes, 44 factions, 32 règles universelles
- [x] Mapping factions jouables → unités (pattern Library)
- [x] Browser HTML local pour vérifier les données (`browser/index.html`)
- [ ] Azure Function Timer (sync automatique) — pour plus tard

### Phase 3 — Frontend
- [ ] Setup React + Vite + Tailwind
- [ ] Pages : home, factions, unités, simulateur, résultats
- [ ] Graphiques Recharts sur les distributions (hits, wounds, damage)
- [ ] Comparaison multi-armes sur un même défenseur

### Phase 4 — Déploiement Azure
- [ ] Provisionner les ressources Azure
- [ ] Déployer le backend (App Service)
- [ ] Déployer le frontend (Static Web Apps)
- [ ] Configurer le domaine custom

### Phase 5 — Finitions
- [ ] Tests (pytest backend, Vitest frontend)
- [ ] Monitoring (Azure Application Insights)
- [ ] Documentation API (FastAPI auto-docs)

---

## Lancer en local

### Données BSData (à faire une fois)

```bash
python pipeline/fetch_bsdata.py   # télécharge data/raw/ (~100 MB)
python pipeline/parse_bsdata.py   # génère data/cache/*.json
```

### Browser de données

```bash
python -m http.server 8080
# ouvrir http://localhost:8080/browser/index.html
```

---

## Données parsées (v10.6.0)

| Fichier | Contenu |
|---|---|
| `data/cache/units.json` | 1349 unités (stats, armes, abilities, keywords, pts) |
| `data/cache/weapons.json` | 4751 armes dédupliquées |
| `data/cache/factions.json` | 44 factions |
| `data/cache/faction_units.json` | 41 factions jouables → unit_ids |
| `data/cache/rules.json` | 32 règles universelles |

Source : [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e) — mise à jour automatique prévue toutes les 12h via Azure Functions.

---

## Coût Azure estimé

| Service | Coût |
|---|---|
| App Service F1 (backend) | Gratuit |
| Static Web Apps (frontend) | Gratuit |
| Azure Functions (pipeline) | Gratuit (< 1M appels/mois) |
| Blob Storage (assets) | < 1 €/mois |
| **Total** | **< 2 €/mois** (sans base de données dédiée) |
