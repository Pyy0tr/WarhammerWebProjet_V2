# Prob'Hammer

**Warhammer 40,000 10th Edition combat probability simulator.**

Pick a unit, configure the attack, and get the full damage distribution in under a second — no account required.

**[→ Open the simulator](https://40k.probhammer.com)**

---

## What it does

In Warhammer 40,000, every attack rolls through four sequential phases — Hit, Wound, Save, and Feel No Pain. Each phase introduces randomness, making it hard to know before you play whether your unit will wipe a squad or barely scratch it.

Prob'Hammer runs 1,000 Monte Carlo iterations through every phase and gives you the full probability distribution of the outcome: not just an average, but the realistic spread of what you can expect your attacks to actually do.

---

## Features

### Simulator
- Select any attacker unit and weapon from the full 10th Edition roster
- Configure the defender: Toughness, Save, Invulnerable Save, Feel No Pain, Wounds
- Set modifiers: number of attacking models, number of targets, keywords in effect
- Get instant results: damage histogram, mean, median, P10–P90 percentile band, kill probability

### Keyword support
All official 10th Edition weapon special rules are implemented:

| Keyword | Effect |
|---|---|
| **Torrent** | Bypasses Hit rolls — always hits |
| **Lethal Hits** | Critical hits auto-wound, skipping Wound roll |
| **Devastating Wounds** | Critical wounds bypass Armour Save |
| **Sustained Hits X** | Critical hits generate X additional hits |
| **Twin-Linked** | Re-roll all Wound rolls |
| **ANTI [keyword] X+** | Wound roll of X+ is always a Critical Wound vs matching targets |
| **Melta X** | Add X to Damage when targeting units within half range |
| **Blast** | Minimum 3 attacks vs units of 6+ models |
| **Rapid Fire X** | Add X × number of models to attacks at half range |
| **Lance** | +1 to Wound rolls on the turn the unit charged |
| **Heavy** | +1 to Hit rolls if unit Remained Stationary |
| **Assault** | No penalty to Hit rolls after Advancing |
| **Indirect Fire** | -1 to Hit rolls when firing indirectly |
| **Ignores Cover** | Target's Cover bonus is ignored |

### Unit browser
- Browse all 46 factions and their full rosters
- View unit datasheets: stats, weapons, abilities, points cost
- Search across 1,495 units and 5,406 weapons

### Army builder *(account required)*
- Create and save named army lists
- Add units directly from the browser or simulator
- Simulate straight from your saved roster

---

## Data

Unit data is parsed from [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e), an open-source community-maintained dataset that mirrors official Games Workshop rules.

Current dataset: **1,495 units · 5,406 weapons · 46 factions**

---

## Run locally

```bash
git clone git@github.com:Pyy0tr/WarhammerWebProjet_V2.git
cd WarhammerWebProjet_V2

# Install dependencies
bash scripts/setup.sh

# Start backend + database
docker compose up db backend --build
# API: http://localhost:8000  |  Docs: http://localhost:8000/docs

# Start frontend
cd frontend && npm run dev
# http://localhost:5173
```

Data files are bundled in `frontend/public/data/` — no pipeline run needed for local development.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Zustand + Recharts |
| Simulation engine | Monte Carlo, runs entirely in the browser |
| Backend | FastAPI (Python 3.12) — JWT auth + army lists CRUD |
| Database | PostgreSQL 17 |
| Data pipeline | Python — fetches, parses and builds JSON from BSData |
| Hosting | AWS CloudFront + S3 (frontend) · EC2 (backend) |

---

*Unofficial. Not affiliated with Games Workshop. Warhammer 40,000 © Games Workshop Ltd.*
