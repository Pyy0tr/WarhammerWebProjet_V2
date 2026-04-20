# Journal des décisions

_Dernière mise à jour : 2026-04-20_

---

## 2026-04-20

### Stack backend : FastAPI (Python) plutôt que Flask
**Décision** : Migrer de Flask vers FastAPI.  
**Raison** : Async natif, auto-documentation OpenAPI, validation Pydantic intégrée, plus performant.  
**Impact** : regleCalcProba.py reste en Python, portage direct.

### Hébergeur : Microsoft Azure
**Décision** : Azure comme plateforme d'hébergement principale.  
**Services retenus** : App Service (backend), Static Web Apps (frontend), PostgreSQL Flexible Server, Azure Functions (pipeline data), Blob Storage (assets).  
**Coût estimé** : ~12-15€/mois.

### Frontend : React + Tailwind CSS
**Décision** : Remplacer Jinja2 par React (Vite) avec Tailwind CSS.  
**Raison** : Séparation claire front/back, composants réutilisables, dark theme épuré plus facile avec Tailwind.

### Base de données : PostgreSQL
**Décision** : Abandonner SQLite au profit de PostgreSQL.  
**Raison** : Production-ready, multi-utilisateurs, compatible Azure.

### Pipeline données : Azure Function Timer (toutes les 12h)
**Décision** : Sync automatique depuis BSData/wh40k-10e toutes les 12h.  
**Méthode** : Vérifier le tag GitHub → télécharger zipball si nouvelle version → parser XML → upsert PostgreSQL.  
**Compatibilité V11** : variable de config `BSDATA_REPO` pour switcher de repo facilement.

### État utilisateur : frontend uniquement
**Décision** : Les listes d'attaquants/défenseurs ne sont plus stockées en BDD.  
**Raison** : Simplifie le backend, réduit les requêtes. Géré en state React (Zustand), persisté en localStorage si besoin.

### Parser XML : lxml (Python)
**Décision** : Utiliser `lxml` pour parser les fichiers .cat.  
**Raison** : Cohérent avec la stack Python, supporte XPath pour navigation hiérarchique BSData.
