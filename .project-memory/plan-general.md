# Plan général — WarhammerWebProjet V2

_Dernière mise à jour : 2026-04-21_

---

## Objectif

Refonte complète de l'application de calcul de probabilités Warhammer 40K V10, avec :
- Stack moderne, simple à maintenir, accessible publiquement
- Hébergement gratuit (Cloudflare + Render + Supabase)
- Interface repensée, épurée, mobile-friendly
- Pipeline de données automatisé depuis BSData/wh40k-10e
- Compatibilité future V11 (même format .cat attendu)

---

## Stack technique cible

### Backend
| Composant | Choix | Raison |
|---|---|---|
| Framework | **FastAPI** (Python) | Async natif, auto-docs OpenAPI, plus rapide que Flask |
| Base de données | **Supabase** (PostgreSQL managé) | Gratuit, auth intégré, pas de gestion serveur |
| ORM | **SQLAlchemy 2.0** | Standard Python, compatible FastAPI |
| Auth | **Supabase Auth** | Évite JWT custom, sécurisé, gratuit jusqu'à 50k users |
| Moteur proba | **Réutilisé depuis V1** (regleCalcProba.py) + refactorisé | Déjà complet et correct |

### Frontend
| Composant | Choix | Raison |
|---|---|---|
| Framework | **React** (Vite) | Composants réutilisables, éco-système riche |
| Style | **Tailwind CSS** | Dark theme épuré, rapide à personnaliser |
| Graphiques | **Recharts** | Léger, compatible React, pour les distributions |
| State | **Zustand** | Simple, sans boilerplate Redux |

### Hébergement
| Service | Usage | Coût |
|---|---|---|
| **Render.com** | Backend FastAPI (auto-deploy GitHub) | Gratuit |
| **Cloudflare Pages** | Frontend React (bandwidth illimité) | Gratuit |
| **Cloudflare R2** | Assets statiques (images, animations) | Gratuit (10 GB, egress gratuit) |
| **Supabase** | PostgreSQL + Auth utilisateurs | Gratuit (500 MB, 50k users) |
| **GitHub Actions** | Pipeline sync BSData toutes les 12h | Gratuit |
| **Domaine custom** | OVH / Namecheap | ~10€/an |
| **Total** | | **~10€/an** |

### Pourquoi pas Azure
- App Service F1 : cold start 60s après 20 min d'inactivité → inutilisable
- App Service B1 payant : 13€/mois pour quasi zéro trafic
- Azure Blob : egress facturé (contrairement à Cloudflare R2)
- Azure Functions : plus complexe que GitHub Actions pour ce besoin
- Supabase remplace PostgreSQL Azure (~12€/mois) gratuitement

---

## Fonctionnalités

### Core (V2)
- Simulateur de combat (Monte Carlo, moteur V1 refactorisé)
- Navigateur factions/unités depuis données BSData
- Authentification utilisateur (Supabase Auth)
- Gestion armées attaquant/défenseur (state Zustand, localStorage)
- Tableau de comparaison armes × unités
- Graphiques distributions (hits, wounds, damage)

### Nouveau en V2
- Graphiques interactifs sur les résultats de simulation
- Comparaison multi-armes sur un même défenseur (side-by-side)
- Pipeline BSData automatisé (GitHub Actions, toutes les 12h)
- Interface mobile-friendly (Tailwind responsive)
- Assets (images factions) servis depuis Cloudflare R2

### Hors scope
- App mobile native
- Résultats pré-calculés en BDD (cache en mémoire suffit)
- Scripts de maintenance manuels (tout est automatisé)

---

## Architecture globale

```
BSData/wh40k-10e (GitHub)
        │
        ▼ GitHub Actions (cron toutes les 12h)
   pipeline/fetch_bsdata.py + parse_bsdata.py
        │
        ▼
   data/cache/*.json  (JSON stockés dans le repo ou Supabase Storage)
        │
        ▼
FastAPI Backend (Render.com) ←→ Supabase (users, armies)
        │
        ▼
React Frontend (Cloudflare Pages)
        │
   Assets (images) ← Cloudflare R2
        │
        ▼
Utilisateur
```

---

## Roadmap

### Phase 1 — Fondations ✓ TERMINÉE
- [x] Initialiser repo GitHub WarhammerWebProjet_V2
- [x] Structure projet (backend/, frontend/, pipeline/, browser/)
- [x] Makefile, .gitignore, README, STRUCTURE

### Phase 2 — Pipeline données ✓ TERMINÉE
- [x] fetch_bsdata.py — téléchargement zipball BSData via API GitHub
- [x] parse_bsdata.py — parser XML complet avec résolution multi-niveaux
- [x] 1349 unités, 4751 armes, 44 factions, 32 règles universelles
- [x] Mapping factions jouables → unit_ids (Library pattern)
- [x] 16 unités sans armes : 12 fortifications + 4 unités à dégâts via ability (correct)
- [x] Browser HTML local de vérification des données
- [ ] GitHub Actions cron (sync automatique toutes les 12h)

### Phase 3 — Backend FastAPI
- [ ] Setup venv + installer requirements.txt
- [ ] Tester les endpoints /factions, /units, /weapons en local
- [ ] Porter regleCalcProba.py → engine/simulation.py
- [ ] Intégrer Supabase Auth (remplace JWT custom)
- [ ] Déployer sur Render.com

### Phase 4 — Frontend React
- [ ] Initialiser Vite + Tailwind + Recharts + Zustand
- [ ] Pages : home, factions, unités, simulateur, résultats
- [ ] Graphiques distributions
- [ ] Comparaison multi-armes
- [ ] Déployer sur Cloudflare Pages

### Phase 5 — Assets & Pipeline auto
- [ ] Cloudflare R2 pour les images de factions
- [ ] GitHub Actions cron BSData (toutes les 12h)
- [ ] Domaine custom

### Phase 6 — Finitions
- [ ] Tests (pytest backend, Vitest frontend)
- [ ] Monitoring (Render logs + Supabase dashboard)
- [ ] Documentation API (FastAPI /docs auto-généré)
