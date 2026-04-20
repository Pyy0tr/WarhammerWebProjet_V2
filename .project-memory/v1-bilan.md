# V1 — Bilan & acquis réutilisables

_Dernière mise à jour : 2026-04-20_

---

## Ce qui est directement réutilisable

### Moteur de probabilités (`regleCalcProba.py`)
**Fichier** : `/home/pyyotr/projects/perso/WarhammerWebProjet/regleCalcProba.py` (617 lignes)

Complet et correct. Implémente les règles V10 :
- Phases : Hit → Wound → Save → FNP
- Dice notation : `D6`, `2D3+1`, `D6+2`...
- Keywords : LETHAL HITS, DEVASTATING WOUNDS, SUSTAINED HITS X, ANTI X+, TWIN-LINKED, HEAVY, LANCE, BLAST, RAPID FIRE, MELTA, CRITICAL HIT 5+
- FNP 5+ et FNP 6+ (Feel No Pain)
- Monte Carlo 1000 itérations
- Résultat : SimulationResult (hits, wounds, failed_saves, damage, dice_rolls, damage_rolls)

**Action V2** : porter comme module Python indépendant, exposer via endpoint FastAPI.

### Schéma BDD (SQLite → PostgreSQL)
Tables à migrer :
- `entries` (unités) — garder tel quel
- `weapons` — garder tel quel
- `abilities` — garder tel quel
- `unit_keywords` — garder tel quel
- `submodels` — garder tel quel
- `users` — garder (adapter hash bcrypt si besoin)

Tables à **supprimer** en V2 :
- `attackers`, `defenders`, `current_weapon`, `current_defender` → géré côté frontend (state React)
- `sim_results`, `weapon_effectiveness` → recalculé à la demande, pas de pré-calcul en BDD
- `classification` → non utilisée

### Images factions
`static/images/` — ~30 logos de factions → migrer vers Azure Blob Storage.

### Logique d'authentification
- bcrypt pour les mots de passe → garder
- JWT pour les tokens → garder (python-jose en V2)
- Validation password (8+ chars, upper, lower, digit) → garder

---

## Ce qui est refondu

| V1 | V2 |
|---|---|
| Flask (WSGI, sync) | FastAPI (ASGI, async) |
| SQLite (fichier local) | PostgreSQL (Azure) |
| HTML/CSS/JS vanilla | React + Tailwind CSS |
| Templates Jinja2 | API REST → frontend React |
| Scripts manuels (update_db.py, fix_wounds.py) | Azure Function automatisée |
| Déploiement Render.com | Azure App Service |
| Session-based auth + JWT séparé | JWT uniquement (API REST) |
| Résultats texte brut | Graphiques Recharts (distributions) |

---

## Points faibles V1 à corriger

1. **Pas d'environnement isolé** — dépendances installées globalement (résolu en V2 avec venv/docker)
2. **SQLite** — pas adapté à la production multi-utilisateurs concurrents
3. **État utilisateur en BDD** — attaquants/défenseurs stockés en base → lourd, migrer en state frontend
4. **Pas de CI/CD** — déploiement manuel sur Render
5. **Frontend monolithique** — Jinja2 templates, pas de séparation front/back
6. **Pas de tests** — aucun test unitaire ou d'intégration
