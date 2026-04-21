# Pipeline données — BSData wh40k-10e

_Dernière mise à jour : 2026-04-21_

---

## Statut : TERMINÉ ✅

Scripts livrés et fonctionnels :
- `pipeline/fetch_bsdata.py` — téléchargement zipball BSData (branche main)
- `pipeline/parse_bsdata.py` — parsing complet → JSON cache
- `pipeline/audit.py` — contrôle qualité des JSON (0 erreur cible)

Exécution automatique via **GitHub Actions** (`.github/workflows/sync_bsdata.yml`), toutes les 12h.

---

## Source

**Dépôt GitHub** : https://github.com/BSData/wh40k-10e  
**Format** : fichiers `.cat` (XML non compressé) + 1 fichier `.gst` (système de jeu)  
**Versioning** : suivi par SHA de commit (branche main, plus précis que les releases taguées)  
**Fréquence mises à jour** : plusieurs fois par semaine  
**Dernière version parsée** : commit `fabfc3f1` du 2026-04-20

---

## fetch_bsdata.py — récupération des données

**Stratégie** : téléchargement du zipball de la branche **main** (pas le dernier release tagué).

**Pourquoi main et pas les releases taguées** :
- Le dernier release tagué était v10.6.0 (mars 2025) — soit ~1 an de retard
- La branche main est continuellement mise à jour (corrections, nouvelles unités)
- Même BSData-bot pousse directement sur main entre les releases formelles

**Pourquoi le zipball et pas git clone** :
- On n't pas besoin de l'historique git
- ~50-100 MB vs ~500 MB pour un clone complet

**Suivi de version** : `data/version.json` — SHA complet + SHA court + date + message du commit  
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
5. Résolution entryLink pts (link_pts) — patch unités à 0pts
6. Filtrage sous-composants (type="model" non présents dans faction_unit_map)
7. Construire le mapping factions jouables → unit_ids
8. Ajouter playable_in sur chaque unité
9. Écrire les JSON dans data/cache/
```

### Index global multi-fichiers

**Principe critique** : tous les `targetId` dans les `infoLink`/`entryLink` pointent vers
un noeud qui peut être dans n'importe quel fichier (même .cat, autre .cat, ou .gst).
On construit donc un index `{bsdata_id: ET.Element}` en chargeant TOUS les fichiers avant
de commencer la résolution.

### Pts — 3 patterns

**Pattern standard** : `<cost name="pts" typeId="51b2-306e-1021-d207" value="X"/>` direct dans la selectionEntry.

**Pattern pts scalables** : pts via `<modifier type="set" field="51b2-306e-1021-d207" value="X">` conditionnel sur la taille de squad. Stocké dans `pts_options` :
```json
"pts_options": [
  {"n_models": 1, "pts": 105, "condition": "exact"},
  {"n_models": 5, "pts": 130, "condition": "atLeast"}
]
```
~200+ unités concernées (Sword Brethren, Crusader Squad, Intercessors...).

**Pattern entryLink pts** : certaines unités (Legends, nouveaux personnages) ont leurs pts sur l'`entryLink` plutôt que sur la `selectionEntry`. Résolu via `link_pts` collectés dans `build_faction_unit_map()` et patchés en post-processing. Exemples : Kravek Morne 120pts, Aveline 45pts, Land Speeder Storm 70pts.

### Stats — 5 patterns de localisation

Les stats d'unité (M/T/SV/W/LD/OC) peuvent se trouver à différents niveaux selon la faction :

**Pattern 1** — Profil direct dans la `selectionEntry` :
```
selectionEntry type="model"
  profiles/ → profile typeName="Unit"
```

**Pattern 2** — Stats dans un sous-modèle (selectionEntries) :
```
selectionEntry type="unit"
  selectionEntries/ → selectionEntry type="model"
    profiles/ → profile typeName="Unit"  (ex: Wraithguard)
```

**Pattern 3** — Stats dans selectionEntryGroups → selectionEntries :
```
selectionEntry type="unit"
  selectionEntryGroups/ → selectionEntryGroup
    selectionEntries/ → selectionEntry type="model"
      profiles/ → profile typeName="Unit"  (ex: Dire Avengers)
```

**Pattern 4** — Stats via infoLink d'un sous-modèle :
```
selectionEntry type="unit"
  selectionEntryGroups/ → selectionEntries/ → selectionEntry type="model"
    infoLinks/ → infoLink → profile typeName="Unit"  (ex: Windriders)
```

**Pattern 5** — Stats 5 niveaux via entryLinks :
```
selectionEntry type="unit"
  selectionEntryGroups/ "Unit Composition"
    selectionEntries/ → selectionEntry type="upgrade"
      entryLinks/ → selectionEntry type="model"
        infoLinks/ → profile typeName="Unit"  (ex: Cadian Shock Troops)
```

**Solution** : `_find_stats_recursive()` descend jusqu'à depth=6 dans tout le sous-arbre.

### Multi-profils stats

Certaines unités ont plusieurs blocs de stats (ex: Grimaldus + ses 3 Cenobyte Servitors).
Le premier profil est dans `stats`, les suivants dans `model_profiles` :
```json
"model_profiles": [
  {"name": "Cenobyte Servitor", "stats": {"M": "6\"", "T": "3", ...}}
]
```

### Pattern factions Library vs factions jouables

Certaines factions (Craftworlds, Drukhari, Astra Militarum, Chaos Daemons...) ne définissent
PAS leurs propres unités. Elles ont uniquement des `entryLinks` racine pointant vers des unités
définies dans une Library associée.

```
Aeldari - Aeldari Library.cat  → définit les unités (sharedSelectionEntries)
Aeldari - Craftworlds.cat      → entryLinks vers la Library
Aeldari - Drukhari.cat         → entryLinks vers la Library
```

Les Library factions sont exclues des checks "faction sans unités" dans audit.py.

### Filtrage sous-composants

Les `selectionEntry type="model"` non référencés dans `faction_unit_map` sont des
composants internes (ex: Jakhal dans Jakhals, Burna Boy dans Burna Boyz) — filtrés en
post-processing dans `main()` après construction du `faction_unit_ids` set.

### Legends

Le tag `[Legends]` est dans le `name` de l'entryLink ou de la selectionEntry.
Stocké comme booléen `is_legends`, le nom est nettoyé (sans `[Legends]`).

### Invulnerable Save

Pas de champ XML dédié. C'est un profil `Abilities` nommé `"Invulnerable Save"` avec la valeur
dans `Description`. Stocké avec `is_invuln_save: true` et `invuln_value: "4+"`.

### Patterns d'armes — 3 patterns complexes supplémentaires

**Pattern A** — armes dans selectionEntries imbriquées du sous-model (ex: Plaguebearers, Flamers)
**Pattern B** — armes dans SEGs internes d'un sub-model dans un SEG (ex: Deathwing Knights)
**Pattern C** — armes via entryLink type=selectionEntryGroup depuis un sub-model (ex: Deathwatch Terminator)

---

## audit.py — contrôle qualité

Vérifie :
- Unités sans stats (hors fortifications et unités à dégâts via ability)
- Unités avec SV invalide (> 8+) — seuil 8 car Blue Horrors ont SV 8+
- Armes avec stats manquantes — AP="-" est valide (= AP 0)
- Unités avec M="-" — valide pour les unités immobiles (Drop Pod, Tarantula...)
- Factions sans unités — Library factions exclues du check
- Unités à 0 pts (hors unités sans pts légitimes)

**Résultat attendu** : 0 erreur, ~16 warnings légitimes (Titans outliers, fortifications sans armes).

---

## Sortie — fichiers JSON cache

| Fichier | Contenu | Taille approx. |
|---|---|---|
| `data/cache/units.json` | 1487 unités complètes | ~17 MB |
| `data/cache/weapons.json` | 5372 armes dédupliquées | ~3 MB |
| `data/cache/factions.json` | 46 factions | < 1 KB |
| `data/cache/faction_units.json` | 42 factions jouables → unit_ids | ~50 KB |
| `data/cache/rules.json` | 33 règles universelles (.gst) | ~50 KB |

### Structure d'une unité JSON

```json
{
  "bsdata_id": "1d56-1cc3-de57-10e2",
  "name": "Grimaldus",
  "faction": "Imperium - Black Templars",
  "is_legends": false,
  "pts": 110,
  "pts_options": [],
  "stats": {"M": "6\"", "T": "4", "SV": "3+", "W": "5", "LD": "5+", "OC": "1"},
  "model_profiles": [
    {"name": "Cenobyte Servitor", "stats": {"M": "6\"", "T": "3", "SV": "4+", "W": "1", "LD": "7+", "OC": "1"}}
  ],
  "keywords": ["Character", "Infantry", "Chaplain", "Grimaldus"],
  "abilities": [
    {"name": "Litanies of Hate", "description": "...", "is_invuln_save": false, "invuln_value": null},
    {"name": "Invulnerable Save", "description": "4+", "is_invuln_save": true, "invuln_value": "4+"}
  ],
  "weapons_default": [...],
  "weapon_options": [...],
  "transport": null,
  "playable_in": ["Imperium - Black Templars"],
  "constraints": {"min_models": null, "max_models": 1},
  "is_epic_hero": true
}
```

---

## Compatibilité V11

- Format .cat identique attendu
- Changer `BSDATA_REPO=BSData/wh40k-11e` dans `fetch_bsdata.py` (ou variable d'env)
- Le parser XML reste inchangé
- Seules les règles de combat pourraient nécessiter des ajustements dans le moteur de simulation

---

## Choix techniques

- **Parser XML** : `xml.etree.ElementTree` (stdlib Python) — suffisant, 0 dépendance
- **Stratégie données** : JSON en cache (pas de BDD pour les données jeu) → chargé en mémoire par l'API
- **BDD** : uniquement pour les comptes utilisateurs et armées sauvegardées (Supabase)
