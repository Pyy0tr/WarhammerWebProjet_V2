# Journal des décisions

_Dernière mise à jour : 2026-04-23_

---

## 2026-04-23

### Refonte palette couleurs — `src/theme.js` comme source unique
**Décision** : Créer `frontend/src/theme.js` exportant toutes les constantes couleur. Tous les fichiers importent depuis ce module, les constantes locales `BLUE/BG/TEXT_H/TEXT_BODY/TEXT_MUTED/PANEL` sont supprimées.
**Raison** : L'ancienne palette (`#09A2C4`, fond `#041428`) manquait de lisibilité. Les constantes dupliquées dans 14 fichiers rendaient tout changement de couleur laborieux.
**Nouvelle palette** :
- `BG #0A1621` / `SURFACE #0F2230` / `SURFACE_E #143247` / `BORDER #1E3A4C`
- `TEXT #E6F1FF` / `TEXT_SEC #9DB7C6` / `TEXT_WEAK #5F7C8A` / `TEXT_OFF #3E5A68`
- `ACCENT #2FE0FF` (interactions uniquement) · `SUCCESS #3DDC97` · `WARNING #FFB547` · `ERROR #FF5C7A` · `HIGHLIGHT #C28F85`
- Boutons primaires : fond `ACCENT` + texte `BG`. Boutons secondaires : fond transparent + bordure `BORDER` + texte `ACCENT`.

### Simulateur — Wizard 4 étapes
**Décision** : Refondre `SimulatorPage.jsx` en wizard 4 étapes (`StepBar` + state `step` dans Zustand).
**Étapes** : Step 1 Sélection arme (par nom, browse unit, ou depuis armée) → Step 2 Review (résumé attaques + "Add another" ou "Next") → Step 3 Défenseur → Step 4 Résultats.
**Raison** : L'ancienne page présentait tout en même temps — peu lisible, ajout de plusieurs armes non guidé.
**Fix moteur** : `runSimulation` utilisait `s.attacker.weapon` + `s.attacks` (doublon). Corrigé pour n'utiliser que `s.attacks`.

---

## 2026-04-22

### Keyword picker : chip grid par phase (remplace dropdown + Add)
**Décision** : Remplacer le sélecteur dropdown (select + bouton Add) par un grid de chips cliquables regroupées par phase de jeu (Hit / Wound / Other).
**Raison** : Le dropdown cachait les options disponibles et nécessitait deux interactions. Les chips montrent tout d'un coup, togglables en un clic.
**Implémentation** : `KeywordPicker` component dans `AttackerPanel.jsx` — lit/écrit directement dans `useSimulatorStore`. Keywords valued (Sustained Hits, Rapid Fire, Melta, Extra Attacks) affichent un champ inline quand actifs. ANTI affiche target + threshold inline.

### Critical Hit On X+ exposé dans le picker
**Décision** : Ajouter `CRITICAL_HIT_ON` dans les weapon keywords du chip picker (Hit phase), valued, default 5.
**Raison** : Synergie avec Sustained Hits (les crits déclenchent les hits supplémentaires) — si le seuil de critique est 5+, Sustained Hits se déclenche sur 5 et 6. La règle existait dans le moteur mais n'était pas accessible via l'UI.

### Reroll abilities dans AttackerPanel (Attacker abilities section)
**Décision** : 4 chips toujours visibles sous l'AttackerPanel — reroll hit 1s / failed hits / wound 1s / failed wounds. Mutuellement exclusifs par catégorie (ones vs all).
**Raison** : Les rerolls sont des capacités d'unité (buffs), pas des weapon keywords. Ils s'appliquent à toutes les armes de l'unité.

---

## 2026-04-21 (mise à jour)

### Suppression du backend Render — moteur porté en JS
**Décision** : Supprimer le backend FastAPI / Render.com. Le moteur de simulation tourne désormais dans le navigateur (JavaScript).
**Raison** : Render.com gratuit = cold start ~50s après inactivité → UX inacceptable.
**Impact** :
- `frontend/src/engine/dice.js` + `simulation.js` — port exact de `backend/engine/`
- `frontend/src/api/simulate.js` supprimé (plus d'appel HTTP)
- Le store Zustand appelle directement `simulate()` en local
- Render.com retiré de la stack
- Supabase reste pour Auth + saves utilisateur (SDK JS, pas besoin de backend)

**Stack finale** :
| Besoin | Solution | Coût |
|---|---|---|
| Simulation | JS dans le browser | 0€ |
| Données BSData | JSON statiques Cloudflare Pages | 0€ |
| Auth + comptes | Supabase JS SDK | 0€ |
| Saves | Supabase PostgreSQL + RLS | 0€ |
| Hébergement front | Cloudflare Pages | 0€ |
| Pipeline BSData | GitHub Actions | 0€ |

### Sustained Hits — vrais lancers (pas auto-hits)
**Décision** : Sustained Hits génère X vrais lancers de dés à la même BS, pas X auto-hits.
**Raison** : Règle officielle WH40K 10e. Les lancers supplémentaires peuvent eux-mêmes être des critiques (→ Lethal Hits), mais ne déclenchent pas d'autres Sustained Hits (pas de cascade).
**Implémentation** : `resolveHit(die, sustainedDepth)` avec `depth=1` pour les lancers secondaires.

### Armées : persistance localStorage → Supabase avec migration
**Décision** : armyStore gère les deux modes : localStorage pour les anonymes, Supabase PostgreSQL pour les connectés. À la connexion, les armées locales migrent automatiquement vers Supabase.
**Raison** : Pas de perte de données à la connexion. Tracking `_loadedFor` évite le double-chargement.

### FactionsPage : "Add to Army" remplace ATT→ / CIB→
**Décision** : Le bouton pour charger une unité dans le simulateur est remplacé par "Add to [Army Name]" dans la page Factions. La navigation directe vers le simulateur est supprimée.
**Raison** : Workflow plus naturel — d'abord on compose son armée, ensuite on simule depuis From Army.

---

## 2026-04-21

### Hébergeur : Cloudflare + Supabase (remplace Azure)
**Décision** : Abandonner Azure au profit d'une stack gratuite.
**Raison** : Azure App Service F1 cold start 60s, Azure App Service B1 13€/mois, Azure PostgreSQL 12€/mois.

---

## 2026-04-20

### Style frontend : inline styles uniquement (pas Tailwind)
**Décision** : Tout le style en `style={{}}` React avec constantes couleur en haut de chaque fichier. Pas de classes Tailwind ni fichiers CSS séparés.
**Raison** : Cohérence visuelle garantie, palette centralisée, pas de purge / config Tailwind à maintenir.
**Palette** : fond `#041428`, accent `#09A2C4`, texte `#FFFFFF` / `rgba(184,210,228,0.45)`, panel `#071e38`.

### Données jeu : slim format JSON statique
**Décision** : `build_frontend_data.py` produit un format slim depuis le cache BSData. Servi en statique avec les assets frontend.
**Raison** : Pas besoin d'API pour les données jeu. Chargé une seule fois au mount dans `dataStore`.
**Déduplication** : `id_aliases` dict pour mapper tous les bsdata_ids variantes vers l'id canonique — résout 100% des weapon lookups.

### Parser XML : xml.etree.ElementTree (stdlib Python)
**Décision** : `xml.etree.ElementTree` (stdlib), pas lxml.
**Raison** : Suffisant, 0 dépendance supplémentaire.

### Simulation : moteur JS dans le browser, zéro appel réseau
**Décision** : Monte Carlo tourne entièrement côté client.
**Raison** : Latence nulle, pas de backend, pas de coût serveur.
