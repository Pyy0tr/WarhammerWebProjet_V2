# CLAUDE.md — ProbHammer / WarhammerWebProjet V2

Instructions pour Claude Code sur ce projet.

---

## Règles absolues

- **Inline styles uniquement** — jamais de classes Tailwind, CSS modules ou fichiers `.css` séparés (sauf `index.css` existant). Tout styling via `style={{}}`. Nouvelles couleurs = constantes en haut du fichier.
- **Palette centralisée** — toujours importer depuis `src/theme.js`. Ne jamais hardcoder des hex hors de `theme.js`.
- **UI en anglais** — tout texte visible dans l'interface (labels, boutons, placeholders, états vides, tooltips) doit être en anglais.
- **Ne pas lancer le serveur de dev** — l'utilisateur gère lui-même `npm run dev`.
- **Zéro backend** — pas de nouveaux endpoints serveur. Toute donnée passe par les JSON statiques dans `frontend/public/data/`.

---

## Stack

React 19 + Vite 8 · Zustand · React Router v7 · Recharts · Supabase Auth · Space Mono + Georgia

---

## Palette (`src/theme.js`)

```
BG        #0A1621   fond principal
SURFACE   #0F2230   panneaux
SURFACE_E #143247   éléments élevés (dropdown, modal)
BORDER    #1E3A4C   bordures
TEXT      #E6F1FF   titres / valeurs
TEXT_SEC  #9DB7C6   corps de texte
TEXT_WEAK #5F7C8A   labels, meta
TEXT_OFF  #3E5A68   placeholders, désactivé
ACCENT    #2FE0FF   interactions (boutons primaires, focus, actif)
ERROR     #FF5C7A
```

Alliances : Imperium `#C9A227` · Chaos `#CC3344` · Xenos `#2FE0FF`

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/theme.js` | Palette centralisée |
| `src/engine/simulation.js` | Moteur Monte Carlo |
| `src/store/simulatorStore.js` | État wizard + attackerUnit/defenderUnit/hoveredKeyword |
| `src/store/dataStore.js` | Données BSData (units, weapons, factions) + `getUnitById()` |
| `src/store/armyStore.js` | Armées (localStorage ↔ Supabase) |
| `src/components/AbilityText.jsx` | Rendu markup BSData (`^^kw^^`, `**kw**`) → ACCENT + bold |
| `src/pages/SimulatorPage.jsx` | Wizard 4 étapes + KeywordDefinitionPanel + UnitAbilitiesPanel |
| `src/pages/FactionsPage.jsx` | Grille factions → unités → détail |
| `pipeline/build_frontend_data.py` | Génère les JSON slim (abilities non tronquées) |

---

## Patterns à retenir

### Injections CSS (keyframes, scrollbars)
Les inline styles ne supportent pas `@keyframes`. Utiliser un tag `<style>` injecté via `useEffect` :
```js
useEffect(() => {
  if (document.getElementById('my-style-id')) return
  const s = document.createElement('style')
  s.id = 'my-style-id'
  s.textContent = `@keyframes fadeIn { ... }`
  document.head.appendChild(s)
}, [])
```

### Panels fixes (KeywordDefinitionPanel / UnitAbilitiesPanel)
Positionnement viewport-centré indépendant du scroll :
```js
position: 'fixed', top: '50%', transform: 'translateY(-50%)'
```
Pour remplir l'espace à droite du centre : `left: 'calc(50% + 280px + 24px)', right: '48px'`

### Markup BSData dans les abilities
Format dans les JSON : `**^^Keyword^^**` (nested). Toujours utiliser `<AbilityText text={ab.desc} />` pour le rendu.

### armyId dans les pickers (ArmyPicker / DefenderArmyPicker)
Les armées sont chargées de façon asynchrone. Ne **jamais** initialiser `armyId` avec `armies[0]?.id` directement dans `useState` — les armées sont vides au premier rendu. Pattern correct :
```js
const [armyId, setArmyId] = useState('')
useEffect(() => {
  if (!armyId && armies.length > 0) setArmyId(armies[0].id)
}, [armies])
```

### Données unité complète depuis une armée
`armyStore` ne stocke qu'un sous-ensemble. Pour les abilities : `dataStore.getUnitById(unit.unit_id)`.

---

## Simulateur — store keys importantes

```js
simulatorStore:
  attacker         { weapon, models, buffs }
  defender         { toughness, save, invuln, wounds, models, fnp, keywords }
  attackerUnit     // unité complète (avec abilities) — null si pas sélectionnée
  defenderUnit     // idem défenseur
  hoveredKeyword   // type string du chip survolé → KeywordDefinitionPanel
  attacks[]        // liste des attaques ajoutées (step Review)
  step             // 1-4
```
