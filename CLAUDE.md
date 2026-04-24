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
| `src/pages/SimulatorPage.jsx` | Wizard 4 étapes + KeywordDefinitionPanel + UnitAbilitiesPanel + ProgressTracker |
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

### Panels fixes (KeywordDefinitionPanel / UnitAbilitiesPanel / ProgressTracker)
Positionnement viewport-centré indépendant du scroll :
```js
position: 'fixed', top: '50%', transform: 'translateY(-50%)'
```
Symétrie gauche/droite autour du centre (560px) :
- Droite (UnitAbilitiesPanel) : `left: 'calc(50% + 280px + 24px)', right: '48px'`
- Gauche (ProgressTracker)    : `left: '32px', right: 'calc(50% + 280px + 24px)'`, `padding: '4px 8px 4px 20px'`
- z-index: ProgressTracker=5, KeywordDefinitionPanel=10 (keyword panel passe devant)

### ProgressTracker
Colonne gauche fixe, style git-log, 6 nœuds : Attacker Unit → Weapon → Abilities & Keywords → Attack Roster → Target → Simulate.
- Caché au step 4 (Results) pour ne pas superposer les graphes
- `hoveredKeyword !== null` → `opacity: 0.12` (keyword panel passe devant)
- Navigation rétroactive : clic nœud complété → `setStep(nav)`
- Auto-scroll du nœud actif via `ref.scrollIntoView`
- Animations : `trackerPulse` (double ripple), `trackerCompleteIn` (scale bounce), `trackerLabelScan`, `trackerNodeIn`
- `circleKeys` ref : détecte les transitions de statut pendant le render pour changer la `key` du cercle → remontage → replay animation. **Doit être calculé APRÈS `getStatus` (et ses dépendances `hasUnit`, `hasWeapon`, etc.) pour éviter TDZ ReferenceError.**
- Padding `18px` sur le container scrollable pour que les box-shadows du ripple restent dans le padding box et ne soient pas clippés par `overflow-y: auto`.

### UnitDrawer — mode Browse (attacker)
Le drawer ne fait plus la sélection d'arme. Il ferme dès la sélection d'unité (`onSelect(unit)` sans weapon).
La sélection d'arme se fait ensuite dans `AttackerPanel` via un picker inline (`getUnitWeapons(selectedUnit)` depuis dataStore).
3 états Browse : no unit → placeholder | unit sans arme → weapon picker inline | arme sélectionnée → config complète.

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

### Nombre de modèles par défaut à l'ajout d'une unité (armyStore.addUnit)
`min_models ?? 1` — les escouades ont toujours `min_models` renseigné dans les JSON ; les personnages/unités solo ont `min_models: null` et tombent sur le fallback 1.

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
