# Prob'Hammer

Warhammer 40,000 10th Edition combat probability simulator.

Pick a unit, configure the attack, and get the full damage distribution in under a second — no account required.

---

## Features

- **Monte Carlo simulation** — 1,000 iterations, all phases (Hit → Wound → Save → FNP)
- **1,487 units · 5,372 weapons · 46 factions** — data synced from [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e) every 12h
- **Full keyword support** — Lethal Hits, Devastating Wounds, Sustained Hits, ANTI, Melta, Twin-Linked, Torrent, Blast, Rapid Fire, Lance, Heavy, Ignores Cover, Indirect Fire
- **Army builder** — create and save army lists, simulate from your roster
- **Results** — damage histogram, mean, median, P10–P90 percentiles, kill probabilities

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Zustand + Recharts |
| Simulation | Monte Carlo engine in the browser (zero backend) |
| Auth & saves | Supabase (email/password, localStorage fallback) |
| Data | Static JSON served as assets |
| Data pipeline | Python + GitHub Actions (cron every 12h) |
| Hosting | Cloudflare Pages |

---

## Run locally

```bash
git clone git@github.com:Pyy0tr/WarhammerWebProjet_V2.git
cd WarhammerWebProjet_V2

# Install all dependencies (frontend + pipeline)
bash scripts/setup.sh

# Configure Supabase (optional — auth disabled without it)
cp frontend/.env.example frontend/.env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
cd frontend && npm run dev
# → http://localhost:5173
```

Data files are already included (`frontend/public/data/`). No need to run the pipeline for local development.

---

## Data pipeline (optional)

Regenerates game data from BSData source:

```bash
cd pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python fetch_bsdata.py
python parse_bsdata.py
python build_frontend_data.py
python audit.py
```

Or use the helper script:
```bash
bash scripts/data-refresh.sh
```

---

## Data source

Game data is parsed from [BSData/wh40k-10e](https://github.com/BSData/wh40k-10e), an open-source community-maintained dataset.
Synced automatically via GitHub Actions every 12 hours.

---

*Warhammer 40,000 © Games Workshop. This project is unofficial and not affiliated with Games Workshop.*
