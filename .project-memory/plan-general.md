# Plan général — WarhammerWebProjet V2

_Dernière mise à jour : 2026-04-20_

---

## Objectif

Refonte complète de l'application de calcul de probabilités Warhammer 40K V10, avec :
- Stack moderne et scalable
- Hébergement Azure
- Interface repensée, épurée
- Pipeline de données automatisé depuis BSData/wh40k-10e
- Compatibilité future V11 (même format .cat attendu)

---

## Stack technique cible

### Backend
| Composant | Choix | Raison |
|---|---|---|
| Framework | **FastAPI** (Python) | Async natif, auto-docs OpenAPI, plus rapide que Flask |
| Base de données | **PostgreSQL** (Azure Database for PostgreSQL Flexible Server) | Scalable, remplace SQLite |
| ORM | **SQLAlchemy 2.0** + Alembic (migrations) | Standard Python, compatible FastAPI |
| Auth | **JWT** (python-jose) + bcrypt | Même logique V1, standardisé |
| Moteur proba | **Réutilisé depuis V1** (regleCalcProba.py) + refactorisé | Déjà complet et correct |

### Frontend
| Composant | Choix | Raison |
|---|---|---|
| Framework | **React** (Vite) | Composants réutilisables, éco-système riche |
| Style | **Tailwind CSS** | Dark theme épuré, rapide à personnaliser |
| Graphiques | **Recharts** | Léger, compatible React, pour les distributions |
| State | **Zustand** | Simple, sans boilerplate Redux |

### Hébergement Azure
| Service | Usage |
|---|---|
| **Azure App Service** (B1 ou F1 free tier) | Backend FastAPI (via gunicorn/uvicorn) |
| **Azure Static Web Apps** | Frontend React (CI/CD GitHub intégré) |
| **Azure Database for PostgreSQL Flexible Server** (Burstable B1ms) | Base de données |
| **Azure Blob Storage** | Assets statiques (images factions) |
| **Azure Functions** (Timer Trigger) | Pipeline sync BSData — toutes les 12h |
| **GitHub Actions** | CI/CD backend + frontend |

### Coût estimé Azure (tier minimal)
- App Service F1 : **gratuit**
- PostgreSQL Burstable B1ms : ~**12€/mois**
- Static Web Apps : **gratuit**
- Functions : **gratuit** (1M appels/mois)
- Blob Storage : **< 1€/mois**
- **Total estimé : ~12-15€/mois**

---

## Fonctionnalités à garder (scope V2)

### Oui (core)
- Simulateur de combat (Monte Carlo, moteur V1 refactorisé)
- Navigateur factions/unités depuis BDD
- Gestion armées attaquant/défenseur
- Authentification utilisateur
- Tableau de comparaison armes × unités
- Graphiques distributions (hits, wounds, damage)

### Non (supprimé pour simplifier)
- Endpoint API mobile/JWT séparé (on fait une seule API REST propre)
- `sim_results` pré-calculés en base (remplacé par cache Redis si besoin plus tard)
- Scripts de maintenance manuels (update_db.py, fix_wounds.py, etc.) → remplacés par pipeline automatisé

### Nouveau en V2
- Graphiques interactifs sur les résultats de simulation
- Comparaison multi-armes sur un même défenseur (side-by-side)
- Pipeline de mise à jour automatique BSData (Azure Functions, toutes les 12h)
- Interface mobile-friendly (Tailwind responsive)

---

## Architecture globale

```
GitHub BSData/wh40k-10e
        │
        ▼ (Azure Function Timer, toutes les 12h)
   Parser .cat (Python XML)
        │
        ▼
PostgreSQL (Azure)
        │
        ▼
FastAPI Backend (Azure App Service)
        │
        ▼
React Frontend (Azure Static Web Apps)
        │
        ▼
Utilisateur
```

---

## Roadmap

### Phase 1 — Fondations
- [x] Initialiser repo GitHub WarhammerWebProjet_V2
- [ ] Setup FastAPI + structure projet backend
- [ ] Porter regleCalcProba.py en module FastAPI
- [ ] CI/CD GitHub Actions basique

### Phase 2 — Pipeline données ✓ TERMINÉE
- [x] fetch_bsdata.py — téléchargement zipball BSData via API GitHub
- [x] parse_bsdata.py — parser XML complet avec résolution multi-niveaux
- [x] 1349 unités, 2809 armes, 44 factions, 0 erreur de stats
- [x] Mapping factions jouables → unit_ids (Library pattern)
- [ ] Azure Function Timer (sync automatique toutes les 12h) — pour plus tard

### Phase 3 — Frontend
- [ ] Setup React + Vite + Tailwind
- [ ] Pages : home, login, factions, unités, simulateur, résultats
- [ ] Graphiques Recharts sur les résultats
- [ ] Comparaison multi-armes

### Phase 4 — Déploiement Azure
- [ ] Provisionner ressources Azure
- [ ] Déployer backend App Service
- [ ] Déployer frontend Static Web Apps
- [ ] Configurer domaine custom (40k.probhammer.com)

### Phase 5 — Finitions
- [ ] Tests (pytest backend, Vitest frontend)
- [ ] Monitoring (Azure Application Insights)
- [ ] Documentation API (FastAPI auto-docs)
