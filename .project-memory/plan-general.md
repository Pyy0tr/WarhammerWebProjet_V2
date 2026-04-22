# Plan général — WarhammerWebProjet V2

_Dernière mise à jour : 2026-04-22_

---

## Objectif

Refonte complète de l'application de calcul de probabilités Warhammer 40K 10e, avec :
- Stack moderne, simple à maintenir, accessible publiquement
- Hébergement gratuit (Cloudflare + Supabase)
- Interface épurée, dark theme
- Pipeline de données automatisé depuis BSData/wh40k-10e
- Compatibilité future V11 (même format .cat attendu)

---

## Stack technique

### Backend
**Supprimé** — le backend FastAPI/Render a été retiré (cold start ~50s en gratuit, inutilisable).
La simulation tourne en JavaScript dans le navigateur.
Auth + saves = Supabase JS SDK directement depuis le frontend.

### Frontend
| Composant | Choix | Note |
|---|---|---|
| Framework | **React 19** (Vite) | Composants réutilisables |
| Style | **Inline styles** (pas Tailwind) | Constantes couleur par fichier |
| Graphiques | **Recharts** | Distributions de dégâts |
| State | **Zustand** | simulatorStore, armyStore, authStore, dataStore |
| Router | **React Router v7** | Home, Factions, Simulator, Armies |

### Hébergement
| Service | Usage | Coût |
|---|---|---|
| **Cloudflare Pages** | Frontend React + JSON statiques (bandwidth illimité) | Gratuit |
| **Cloudflare R2** | Images factions | Gratuit (10 GB, egress gratuit) |
| **Supabase** | PostgreSQL (armées) + Auth (email/password) | Gratuit |
| **GitHub Actions** | Pipeline sync BSData toutes les 12h | Gratuit |
| **Domaine custom** | OVH / Namecheap | ~10€/an |
| **Total** | | **~10€/an** |

---

## Fonctionnalités livrées

### Simulateur
- Monte Carlo 1000 itérations, moteur JS dans le browser
- Phases : Hit → Wound → Save → FNP
- Mode Manuel : recherche arme, stats éditables, keyword chip picker
- Mode From Army : sélection armée → escouade → arme → firing models
- Keywords par phase (chip grid) : TORRENT, LETHAL_HITS, SUSTAINED_HITS, DEVASTATING_WOUNDS, TWIN_LINKED, HEAVY, LANCE, BLAST, RAPID_FIRE, MELTA, ANTI, IGNORES_COVER, INDIRECT_FIRE, EXTRA_ATTACKS, CRITICAL_HIT_ON
- Buffs attaquant : reroll hit 1s, reroll failed hits, reroll wound 1s, reroll failed wounds
- Synergie Sustained Hits + Lethal Hits + Critical Hit On X+ (toutes compatibles)
- Résultats : mean/median/std, percentiles p10/p25/p75/p90, histogramme, kill probabilities

### Armées
- Création / renommage / suppression d'armées
- Ajout d'unités depuis FactionsPage ("Add to Army")
- Ajustement du nombre de modèles par unité (min/max respectés)
- Persistance localStorage (anonyme) → Supabase PostgreSQL (connecté)
- Migration automatique localStorage → Supabase à la connexion

### Données
- 1487 unités · 5372 armes · 46 factions
- Slim format JSON servi en statique (`frontend/public/data/`)
- Déduplication armes avec `id_aliases` (100% des weapon lookups résolus)

---

## Roadmap

### Phase 1 — Fondations ✅ TERMINÉE
### Phase 2 — Pipeline données ✅ TERMINÉE
### Phase 3 — Moteur simulation ✅ TERMINÉE
### Phase 4 — Frontend React ✅ TERMINÉE

### Phase 5 — Finitions
- [ ] Domaine custom
- [ ] Tests Vitest
- [ ] Déploiement Cloudflare Pages
- [ ] Comparaison multi-armes (side-by-side)
