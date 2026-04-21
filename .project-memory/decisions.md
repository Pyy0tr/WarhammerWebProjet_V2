# Journal des décisions

_Dernière mise à jour : 2026-04-21_

---

## 2026-04-21

### Hébergeur : Cloudflare + Render + Supabase (remplace Azure)
**Décision** : Abandonner Azure au profit d'une stack gratuite.  
**Raison** : Objectif = site accessible publiquement, coût minimal, zéro maintenance serveur.  
**Détail** :
- Azure App Service F1 : cold start 60s après inactivité, inutilisable en pratique
- Azure App Service B1 : 13€/mois pour quasi zéro trafic — injustifié
- Azure PostgreSQL : 12€/mois → remplacé par Supabase gratuit
- Azure Blob : egress facturé → remplacé par Cloudflare R2 (egress gratuit)
- Azure Functions → remplacé par GitHub Actions cron (gratuit, plus simple)

**Stack retenue** :
| Besoin | Service | Coût |
|---|---|---|
| Backend FastAPI | Render.com | 0€ |
| Frontend React | Cloudflare Pages | 0€ (bandwidth illimité) |
| Assets (images) | Cloudflare R2 | 0€ (10 GB, egress gratuit) |
| DB + Auth | Supabase | 0€ (500 MB, 50k users) |
| Pipeline auto | GitHub Actions cron | 0€ |
| Domaine | OVH / Namecheap | ~10€/an |

**Pourquoi Cloudflare Pages plutôt que Vercel** : Vercel gratuit limité à 100 GB/mois de bandwidth. Cloudflare Pages = bandwidth illimité, indispensable dès qu'on sert des images ou animations.

### Auth : Supabase Auth (remplace JWT custom)
**Décision** : Utiliser Supabase Auth à la place de python-jose + bcrypt custom.  
**Raison** : JWT custom est une source de failles de sécurité. Supabase Auth gère email/password, OAuth (Google...), tokens — zéro code d'auth à maintenir.  
**Impact** : Retirer python-jose et passlib de requirements.txt, adapter les routers FastAPI pour valider les tokens Supabase.

### Base de données : Supabase PostgreSQL (remplace SQLite local)
**Décision** : Supabase remplace SQLite pour les comptes utilisateurs et armées sauvegardées.  
**Raison** : SQLite sur Render.com = filesystem éphémère (données perdues à chaque redeploy). Supabase = PostgreSQL managé, persistant, gratuit.

### Pipeline sync : GitHub Actions cron (remplace Azure Functions)
**Décision** : Le pipeline BSData tourne via GitHub Actions sur un cron `0 */12 * * *`.  
**Raison** : Plus simple qu'Azure Functions, gratuit (2000 min/mois inclus), versionné dans le repo.  
**Méthode** : fetch_bsdata.py → parse_bsdata.py → commit les JSON dans le repo ou upload vers Supabase Storage.

---

## 2026-04-20

### Stack backend : FastAPI (Python) plutôt que Flask
**Décision** : Migrer de Flask vers FastAPI.  
**Raison** : Async natif, auto-documentation OpenAPI, validation Pydantic intégrée, plus performant.  
**Impact** : regleCalcProba.py reste en Python, portage direct.

### Frontend : React + Tailwind CSS
**Décision** : Remplacer Jinja2 par React (Vite) avec Tailwind CSS.  
**Raison** : Séparation claire front/back, composants réutilisables, dark theme épuré plus facile avec Tailwind.

### Parser XML : xml.etree.ElementTree (stdlib Python)
**Décision initiale** : `lxml`. **Décision finale** : `xml.etree.ElementTree` (stdlib).  
**Raison** : Suffisant pour la navigation hiérarchique BSData, 0 dépendance supplémentaire.  
**Impact** : Aucune installation requise, fonctionne partout.

### Données jeu : JSON cache en mémoire (pas de BDD)
**Décision** : Les données BSData (unités, armes, factions) sont stockées en JSON dans `data/cache/` et chargées en mémoire au démarrage de l'API.  
**Raison** : ~15 MB de JSON, peu d'utilisateurs, simplicité > performance.  
**BDD** : uniquement pour les comptes utilisateurs et armées sauvegardées (Supabase).

### Stratégie de téléchargement BSData : zipball (pas git clone)
**Décision** : Télécharger le zipball du dernier release GitHub via API.  
**Raison** : ~50-100 MB vs ~500 MB pour un clone complet. Pas besoin de l'historique git.

### État utilisateur : frontend uniquement
**Décision** : Les listes d'attaquants/défenseurs ne sont pas stockées en BDD.  
**Raison** : Simplifie le backend. Géré en state React (Zustand), persisté en localStorage.
