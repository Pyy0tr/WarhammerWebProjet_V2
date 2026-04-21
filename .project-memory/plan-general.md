# Plan général — WarhammerWebProjet V2

_Dernière mise à jour : 2026-04-21_

---

## Objectif

Refonte complète de l'application de calcul de probabilités Warhammer 40K 10e, avec :
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
- Pipeline BSData automatisé (GitHub Actions, toutes les 12h, branche main)
- Pts scalables par taille de squad (pts_options)
- Multi-profils stats par unité (ex: Grimaldus + Cenobyte Servitor)
- Interface mobile-friendly (Tailwind responsive)
- Assets (images factions) servis depuis Cloudflare R2

### Hors scope
- App mobile native
- Résultats pré-calculés en BDD (cache en mémoire suffit)
- Scripts de maintenance manuels (tout est automatisé)

---

## Architecture globale

```
BSData/wh40k-10e (GitHub — branche main)
        │
        ▼ GitHub Actions (cron toutes les 12h)
   pipeline/fetch_bsdata.py + parse_bsdata.py + audit.py
        │
        ▼
   data/cache/*.json  +  data/cache_stable/  (snapshot versionné)
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

### Phase 1 — Fondations ✅ TERMINÉE
- [x] Initialiser repo GitHub WarhammerWebProjet_V2
- [x] Structure projet (backend/, frontend/, pipeline/, browser/)
- [x] Makefile, .gitignore, README, STRUCTURE

### Phase 2 — Pipeline données ✅ TERMINÉE
- [x] fetch_bsdata.py — téléchargement zipball BSData branche main via GitHub API
- [x] parse_bsdata.py — parser XML complet (8+ patterns résolus)
- [x] audit.py — contrôle qualité (0 erreur, ~16 warnings légitimes)
- [x] **1487 unités, 5372 armes, 46 factions, 33 règles universelles**
- [x] Pts scalables par taille de squad (pts_options) — ~200+ unités concernées
- [x] Multi-profils stats (model_profiles) — 6 unités avec 2 blocs de stats
- [x] Résolution entryLink pts (Legends, nouveaux persos) — link_pts patch
- [x] Mapping factions jouables → unit_ids (Library pattern)
- [x] Filtrage sous-composants (type="model" sans faction_unit_map)
- [x] Browser HTML local de vérification des données
- [x] GitHub Actions cron (sync automatique toutes les 12h)
- [x] cache_stable/ — snapshot versionné du parse de référence

### Phase 3 — Backend FastAPI
- [ ] Porter regleCalcProba.py → engine/simulation.py
- [ ] Endpoint POST /simulate fonctionnel
- [ ] Modèles Pydantic (schemas/)
- [ ] Intégrer Supabase Auth (valider tokens côté FastAPI)
- [ ] Déployer sur Render.com

### Phase 4 — Frontend React
- [ ] Initialiser Vite + Tailwind + Recharts + Zustand
- [ ] Pages : home, factions, unités, simulateur, résultats
- [ ] Graphiques distributions (hits, wounds, damage)
- [ ] Comparaison multi-armes
- [ ] Déployer sur Cloudflare Pages

### Phase 5 — Assets & Finitions
- [ ] Cloudflare R2 pour les images de factions
- [ ] Domaine custom
- [ ] Tests (pytest backend, Vitest frontend)
- [ ] Monitoring (Render logs + Supabase dashboard)
- [ ] Documentation API (FastAPI /docs auto-généré)
