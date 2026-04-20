# Pipeline données — BSData wh40k-10e

_Dernière mise à jour : 2026-04-20_

---

## Statut : TERMINÉ ✓

Scripts livrés et fonctionnels :
- `pipeline/fetch_bsdata.py` — téléchargement du dernier release BSData
- `pipeline/parse_bsdata.py` — parsing complet → JSON cache

---

## Source

**Dépôt GitHub** : https://github.com/BSData/wh40k-10e  
**Format** : fichiers `.cat` (XML non compressé) + 1 fichier `.gst` (système de jeu)  
**Versioning** : sémantique `vX.Y.Z` (ex: v10.6.0), releases publiées par BSData-bot  
**Fréquence releases** : 2-3 par semaine  
**API releases** : `https://api.github.com/repos/BSData/wh40k-10e/releases/latest`  
**Version parsée** : v10.6.0 (45 fichiers, 335 000 lignes XML)

---

## fetch_bsdata.py — récupération des données

**Stratégie** : téléchargement du zipball du dernier release GitHub (pas de clone git).

**Pourquoi le zipball et pas git clone** :
- On n'a pas besoin de l'historique git
- ~50-100 MB vs ~500 MB pour un clone complet
- C'est exactement ce qu'on utilisera en production (Azure Function)
- Le script vérifie la version locale (`data/version.json`) et ne re-télécharge que si un nouveau release existe

**Sortie** : 45 fichiers `.cat` + 1 `.gst` dans `data/raw/`  
**Suivi de version** : `data/version.json` (tag GitHub + date de publication)  
**Variable d'env** : `BSDATA_REPO` (défaut: `BSData/wh40k-10e`) — à changer pour V11  
**Variable d'env** : `GITHUB_TOKEN` (optionnel, évite le rate-limit API)

---

## parse_bsdata.py — parsing XML

### Architecture globale

```
1. Charger .gst en premier (règles universelles)
2. Charger tous les .cat dans l'index global {id → noeud XML}
3. Extraire les règles universelles depuis le .gst
4. Pour chaque .cat : extraire les unités depuis sharedSelectionEntries
5. Construire le mapping factions jouables → unit_ids
6. Ajouter playable_in sur chaque unité
7. Écrire les JSON dans data/cache/
```

### Index global multi-fichiers

**Principe critique** : tous les `targetId` dans les `infoLink`/`entryLink` pointent vers
un noeud qui peut être dans n'importe quel fichier (même .cat, autre .cat, ou .gst).
On construit donc un index `{bsdata_id: ET.Element}` en chargeant TOUS les fichiers avant
de commencer la résolution.

### Structure XML réelle — 5 patterns de stats

Les stats d'unité (M/T/SV/W/LD/OC) peuvent se trouver à différents niveaux selon la faction :

**Pattern 1** — Profil direct dans la `selectionEntry` :
```
selectionEntry type="model"
  profiles/
    profile typeName="Unit"  ← stats ici
```

**Pattern 2** — Stats dans un sous-modèle (selectionEntries) :
```
selectionEntry type="unit"
  selectionEntries/
    selectionEntry type="model"
      profiles/
        profile typeName="Unit"  ← stats ici (ex: Wraithguard)
```

**Pattern 3** — Stats dans selectionEntryGroups → selectionEntries :
```
selectionEntry type="unit"
  selectionEntryGroups/
    selectionEntryGroup name="4-9 Dire Avengers and 1 Exarch"
      selectionEntries/
        selectionEntry type="model"
          profiles/
            profile typeName="Unit"  ← stats ici (ex: Dire Avengers)
```

**Pattern 4** — Stats dans un infoLink d'un sous-modèle :
```
selectionEntry type="unit"
  selectionEntryGroups/
    selectionEntryGroup name="Windriders"
      selectionEntries/
        selectionEntry type="model"
          infoLinks/
            infoLink → profile typeName="Unit"  ← stats ici (ex: Windriders)
```

**Pattern 5** — Stats 5 niveaux de profondeur via entryLinks :
```
selectionEntry type="unit"
  selectionEntryGroups/
    selectionEntryGroup "Unit Composition"
      selectionEntries/
        selectionEntry type="upgrade" "1 Sergeant and 9 Troopers"
          entryLinks/
            entryLink → selectionEntry type="model" "Shock Trooper Sergeant"
              infoLinks/
                infoLink → profile typeName="Unit"  ← stats ici (ex: Cadian Shock Troops)
```

**Solution** : fonction `_find_stats_recursive()` qui descend jusqu'à depth=6 dans tout le sous-arbre.

### Pattern factions Library vs factions jouables

Certaines factions (Craftworlds, Drukhari, Astra Militarum, Chaos Daemons...) ne définissent
PAS leurs propres unités. Elles ont uniquement des `entryLinks` racine pointant vers des unités
définies dans une Library associée.

```
Aeldari - Aeldari Library.cat     → définit 120 unités (sharedSelectionEntries)
Aeldari - Craftworlds.cat         → 96 entryLinks vers la Library + catalogueLink
Aeldari - Drukhari.cat            → 37 entryLinks vers la Library + catalogueLink
Aeldari - Ynnari.cat              → X entryLinks vers la Library + catalogueLink
```

**Solution** : `build_faction_unit_map()` lit les entryLinks racine de chaque .cat et construit
un mapping `{faction_name: [bsdata_id, ...]}`. Chaque unité reçoit un champ `playable_in`
listant les factions qui peuvent l'utiliser.

### Legends

Le tag `[Legends]` n'est pas un attribut XML — il est dans le `name` de l'entryLink ou
de la selectionEntry (ex: `name="Assault Squad [Legends]"`).  
**Solution** : regex sur le nom, stocké comme booléen `is_legends: true/false`.  
Le nom nettoyé (sans `[Legends]`) est stocké dans `name`.

### Invulnerable Save

Pas de champ dédié. C'est un profil de type `Abilities` nommé `"Invulnerable Save"`
avec comme `Description` la valeur (`"4+"`, `"5+"`...).  
**Solution** : détection sur le nom, stocké avec `is_invuln_save: true` et `invuln_value: "4+"`.

### Composants de squad filtrés

Les `selectionEntry type="model"` sans stats et 0 pts sont des composants internes
(ex: Jakhal dans Jakhals, Burna Boy dans Burna Boyz). Ils sont ignorés.  
**Règle** : `not stats AND pts == 0` → ignoré.

### Patterns d'armes — 3 niveaux de complexité supplémentaires

**Pattern A — armes dans selectionEntries imbriquées du sous-model** (ex: Plaguebearers, Flamers) :
```
unit → selectionEntries → model → selectionEntries → upgrade → profiles[weapon]
```
**Solution** : dans step 3b de `extract_unit`, après `collect_weapon_options(sub_model)`,
itérer aussi les `selectionEntries` directes du sub-model et appeler
`_extract_weapon_from_entry(nested_se, index, 1)`.

**Pattern B — armes dans SEGs internes d'un sub-model dans un SEG** (ex: Deathwing Knights, Lychguard, Genestealers) :
```
unit → SEG → selectionEntries → model → selectionEntryGroups → upgrade → profiles[weapon]
```
**Solution** : dans `collect_weapon_options`, pour chaque SE dans un SEG, appeler
en plus `collect_weapon_options(se, index, depth+1)` pour capturer les SEGs internes du SE.

**Pattern C — armes via entryLink type=selectionEntryGroup depuis un sub-model** (ex: Deathwatch Terminator Squad - Legends) :
```
unit → SEG → selectionEntries → model → entryLinks[type=SEG] → target_SEG → selectionEntries → upgrade → profiles[weapon]
```
**Solution** : dans `_collect_entry_links`, quand le target est un `selectionEntryGroup`,
traiter ses `selectionEntries` directes en plus des SEGs imbriqués (via `_extract_weapon_from_entry`
+ `collect_weapon_options` pour chaque SE).

---

## Sortie — fichiers JSON cache

| Fichier | Contenu | Taille |
|---|---|---|
| `data/cache/units.json` | 1349 unités complètes | ~15 MB |
| `data/cache/weapons.json` | 4751 armes dédupliquées | ~3 MB |
| `data/cache/factions.json` | 44 factions | < 1 KB |
| `data/cache/faction_units.json` | 41 factions → unit_ids | ~50 KB |
| `data/cache/rules.json` | 32 règles universelles (.gst) | ~50 KB |

### Bilan extraction des armes

- **1349 unités** parsées
- **16 sans armes** au total :
  - 12 **fortifications** (Webway Gate, Skull Altar, Battle Sanctum, Aegis Defence Line...) — correct, elles n'ont pas de profils d'armes dans le XML
  - 4 **unités à dégâts via ability** (Cyclops Demolition Vehicle, Dreadnought Drop Pod, Mucolid Spores, Spore Mines) — damage via capacités spéciales, pas de profils d'armes dans le XML
- **4751 armes uniques** dédupliquées (y compris les variantes, ex: ➤ Plasma Cannon - Standard / Supercharge)

### Structure d'une unité JSON

```json
{
  "bsdata_id": "1d56-1cc3-de57-10e2",
  "name": "Captain in Gravis Armour",
  "faction": "Imperium - Space Marines",
  "is_legends": false,
  "pts": 80,
  "stats": { "M": "5\"", "T": "6", "SV": "3+", "W": "6", "LD": "6+", "OC": "1" },
  "keywords": ["Character", "Infantry", "Captain", "Imperium", "Faction: Adeptus Astartes", "Gravis"],
  "abilities": [
    { "name": "Refuse to Yield", "description": "...", "is_invuln_save": false, "invuln_value": null },
    { "name": "Invulnerable Save", "description": "4+", "is_invuln_save": true, "invuln_value": "4+" }
  ],
  "weapons_default": [],
  "weapon_options": [
    {
      "group_name": "Wargear",
      "min_select": 1,
      "max_select": 1,
      "weapons": [
        {
          "bsdata_id": "1581-69b-5b7b-d849",
          "name": "Master-crafted Heavy Bolt Rifle",
          "type": "Ranged",
          "range": "30\"",
          "A": "2", "BS_WS": "2+", "S": "5", "AP": "-1", "D": "3",
          "keywords": ["Assault", "Heavy"]
        }
      ],
      "sub_groups": []
    }
  ],
  "transport": null,
  "playable_in": ["Imperium - Space Marines"],
  "constraints": { "min_models": null, "max_models": 3 }
}
```

---

## Compatibilité V11

- Format .cat identique attendu
- Changer `BSDATA_REPO=BSData/wh40k-11e` dans fetch_bsdata.py
- Le parser XML reste inchangé
- Seules les règles de combat pourraient nécessiter des ajustements dans le moteur de simulation

---

## Choix techniques

- **Parser XML** : `xml.etree.ElementTree` (stdlib Python) — suffisant, 0 dépendance supplémentaire
- **Stratégie données** : JSON en cache (pas de BDD pour les données jeu) → chargé en mémoire par l'API
- **Pas de BDD pour les données jeu** : suffisant pour le volume (~15 MB JSON), évite PostgreSQL pour cette partie
- **BDD utilisateurs** : SQLite (comptes, armées sauvegardées) — décidé séparément
