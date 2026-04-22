# ProbHammer — Frontend

Simulateur de probabilités Warhammer 40K 10th Edition. Moteur Monte Carlo entièrement dans le navigateur, zéro backend.

## Stack

- **React 19** + **Vite 8**
- **Zustand** — state management (simulatorStore, dataStore, authStore)
- **React Router v7** — navigation SPA
- **Recharts** — histogramme des dégâts
- **Supabase Auth** — authentification email/mdp
- **Tailwind v4** (installé, non utilisé — inline styles uniquement)

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — pitch + diagramme combat + compteurs |
| `/factions` | Grille factions → liste unités → détail unité |
| `/simulator` | Simulateur attaquant / défenseur + résultats Monte Carlo |

## Architecture

```
frontend/
├── public/data/
│   ├── units.json          # 1 487 unités (BSData)
│   ├── weapons.json        # 3 531 armes
│   ├── factions.json       # 46 factions
│   └── unit_images.json    # 1 409 URLs CDN (Fandom wiki, 95% coverage)
├── src/
│   ├── engine/             # Moteur Monte Carlo (dice.js + simulation.js)
│   ├── store/
│   │   ├── dataStore.js    # Chargement données JSON
│   │   ├── simulatorStore.js
│   │   └── authStore.js    # Supabase Auth
│   ├── lib/supabase.js     # Client Supabase
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── AuthModal.jsx   # Login / Register modal
│   │   ├── AttackerPanel.jsx
│   │   ├── DefenderPanel.jsx
│   │   ├── ResultsPanel.jsx
│   │   └── UnitDrawer.jsx  # Sélection unité slide-in
│   └── pages/
│       ├── HomePage.jsx
│       ├── FactionsPage.jsx
│       └── SimulatorPage.jsx
```

## Lancer en local

```bash
cd frontend
npm install
cp .env.example .env   # remplir VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev -- --port 8000
```

## Pipeline données

```bash
# Générer les fichiers JSON depuis les sources BSData
python3 pipeline/build_frontend_data.py

# Fetcher les images (URLs CDN Fandom wiki, ~25 min pour 1487 unités)
python3 pipeline/fetch_unit_images.py

# Optionnel : télécharger en WebP local (nécessite Pillow)
python3 pipeline/fetch_unit_images.py --download
```

## Auth (Supabase)

- Email + mot de passe uniquement
- Email de confirmation obligatoire
- 50 000 MAU inclus sur le free tier
- Rate limiting configurable dans Supabase → Authentication → Rate Limits
- Variables d'env requises : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Ne jamais commiter `.env` — utiliser `.env.example` comme référence

## Palette couleurs

```
BLUE       = '#09A2C4'   — accents, bordures, interactifs
BG         = '#041428'   — fond principal
TEXT_H     = '#FFFFFF'   — titres, noms, chiffres
TEXT_BODY  = '#C8DCE8'   — corps de texte
TEXT_MUTED = rgba(184,210,228,0.5)  — labels, captions
```

---

*Données BSData Community — Warhammer 40,000 © Games Workshop*
