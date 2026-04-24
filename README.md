# WarhammerWebProjet V2

Simulateur de probabilités de combat Warhammer 40K 10e édition.
Navigateur de factions/unités, gestion d'armées, graphiques de distributions.

---

## Stack

| Composant | Technologie |
|---|---|
| Frontend | **React 19** + Vite + Recharts + Zustand |
| Style | Inline styles uniquement (pas de Tailwind/CSS) |
| Simulation | Moteur **Monte Carlo JS** dans le browser (dice.js + simulation.js) |
| Auth + DB | **Supabase** (PostgreSQL + Auth JS SDK) |
| Données jeu | JSON statiques servis depuis `frontend/public/data/` |
| Hébergement | **Cloudflare Pages** (gratuit, bandwidth illimité) |
| Pipeline BSData | **GitHub Actions** (cron toutes les 12h) |
| Domaine | OVH / Namecheap (~10€/an) |
| **Coût total** | **~10€/an** |

Pas de backend serveur — tout tourne dans le navigateur.

---

## Avancement

### Phase 1 — Fondations ✅
- [x] Repo GitHub initialisé
- [x] Structure projet (frontend/, pipeline/, browser/)
- [x] Makefile, .gitignore, README, STRUCTURE

### Phase 2 — Pipeline données ✅
- [x] `pipeline/fetch_bsdata.py` — téléchargement zipball BSData (branche main) via GitHub API
- [x] `pipeline/parse_bsdata.py` — parser XML complet (8+ patterns résolus)
- [x] `pipeline/build_frontend_data.py` — slim format + déduplication armes avec id_aliases
- [x] `pipeline/audit.py` — audit qualité (0 erreur, ~16 warnings légitimes)
- [x] **1487 unités · 5372 armes · 46 factions · 33 règles universelles**
- [x] Pts scalables (squad size), multi-profils stats, invuln save, constraints min/max models
- [x] GitHub Actions cron (sync BSData automatique toutes les 12h)
- [x] Abilities complètes non tronquées (markup BSData `^^kw^^` conservé pour rendu frontend)

### Phase 3 — Moteur simulation ✅
- [x] Port Python → JS : `engine/dice.js` + `engine/simulation.js`
- [x] Monte Carlo 1000 itérations, toutes les phases (hit/wound/save/FNP)
- [x] Keywords : TORRENT, LETHAL_HITS, SUSTAINED_HITS, DEVASTATING_WOUNDS, TWIN_LINKED, HEAVY, LANCE, BLAST, RAPID_FIRE, MELTA, ANTI, IGNORES_COVER, INDIRECT_FIRE, EXTRA_ATTACKS, CRITICAL_HIT_ON
- [x] Buffs attaquant : reroll hits/wounds (ones/all)
- [x] Synergie Sustained Hits + Lethal Hits (vrais lancers de dés, pas auto-hits, pas de cascade)
- [x] CRITICAL_HIT_ON X+ (seuil de critique configurable, ex: 5+)

### Phase 4 — Frontend React ✅
- [x] Vite + Recharts + Zustand + React Router v7
- [x] Pages : Home, Factions, Simulator, Armies
- [x] Auth Supabase (email/password) + modal AuthModal
- [x] Gestion armées : création, renommage, suppression, ajout/suppression d'unités
- [x] Persistance : localStorage (anonyme) → Supabase PostgreSQL (connecté), migration automatique
- [x] Simulateur wizard 4 steps : Attack → Review → Defender → Results
- [x] AttackerPanel : Browse Units / From Army, keyword chip picker (Hit/Wound/Other), firing models, attacker abilities reroll
- [x] DefenderPanel : Browse Units / From Army, T/Sv/invuln/FNP/W/models/keywords
- [x] ResultsPanel : mean/median/std, histogramme dégâts, kill probabilities
- [x] FactionsPage : grille CSS uniforme par alliance, filtre All/Imperium/Chaos/Xenos, toggle dense/full, header "X factions · Y units", Library & Legends
- [x] UnitDetailView : stats, armes, abilities (markup BSData rendu en ACCENT+bold), Add to Army
- [x] UnitDrawer global : recherche unités + armes pour charger dans le simulateur
- [x] KeywordDefinitionPanel (fixed left) : définition WH40K au hover des keyword chips
- [x] UnitAbilitiesPanel (fixed right) : abilities de l'unité sélectionnée avec animations (stagger, scan, hover glow)
- [x] AbilityText.jsx : rendu markup BSData `^^kw^^` / `**kw**` / `**^^kw^^**` → ACCENT + bold
- [x] Dark theme — palette `#2FE0FF` sur fond `#0A1621`

### Phase 5 — Finitions
- [ ] Domaine custom
- [ ] Tests Vitest
- [ ] Déploiement Cloudflare Pages

---

## Lancer en local

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Données BSData (pipeline)
```bash
cd pipeline
pip install -r requirements.txt
python fetch_bsdata.py
python parse_bsdata.py
python build_frontend_data.py
# → génère frontend/public/data/{units,weapons,factions,faction_units}.json
```

---

## Moteur de simulation

Le moteur implémente les règles WH40K 10e en JavaScript :

```
Attaques (models × A ± modificateurs)
  → Hit rolls (BS, TORRENT, HEAVY, rerolls, crits, CRITICAL_HIT_ON)
      → Sustained Hits (vrais lancers supplémentaires, depth=1, pas de cascade)
      → Lethal Hits (crit → auto-wound)
  → Wound rolls (S vs T, TWIN_LINKED, LANCE, ANTI, Dev. Wounds → mortelles)
  → Save rolls (Sv vs AP, couvert, invuln, FNP)
  → Damage (D ± MELTA, FNP par point de dégât)
→ Résultat agrégé sur 1000 itérations
```

---

## Données (BSData main branch)

| Fichier | Contenu |
|---|---|
| `data/cache_stable/units.json` | 1487 unités complètes (abilities non tronquées) |
| `data/cache_stable/weapons.json` | 5372 armes |
| `data/cache_stable/factions.json` | 46 factions |
| `data/cache_stable/faction_units.json` | 42 factions jouables → unit_ids |
| `frontend/public/data/` | Slim format généré par build_frontend_data.py |

Source : [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e) (branche main, sync toutes les 12h)
