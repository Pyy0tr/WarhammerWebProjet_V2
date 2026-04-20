# Pipeline données — BSData wh40k-10e

_Dernière mise à jour : 2026-04-20_

---

## Source

**Dépôt GitHub** : https://github.com/BSData/wh40k-10e  
**Format** : fichiers `.cat` (XML non compressé), ~50 fichiers par faction  
**Versioning** : sémantique `vX.Y.Z` (ex: v10.6.0), releases publiées par BSData-bot  
**Fréquence releases** : 2-3 par semaine  
**API releases** : `https://api.github.com/repos/BSData/wh40k-10e/releases/latest`

---

## Format des fichiers .cat

XML hiérarchique BattleScribe. Structure principale :

```xml
<catalogue>
  <profileTypes>        <!-- définition des colonnes de stats -->
  <sharedProfiles>      <!-- stats des unités/armes -->
  <sharedSelectionEntries>  <!-- unités réutilisables -->
  <sharedRules>         <!-- règles/abilities -->
  <rootSelectionEntries>    <!-- entrées racine -->
</catalogue>
```

### Attributs clés
- `revision` : s'incrémente à chaque modification — **utiliser pour détecter les changements**
- `id` : identifiant unique BSData (stable entre versions)
- `name` : nom affiché
- `type` : `unit` | `model` | `upgrade`
- `hidden` : true/false — **ignorer les entrées hidden=true**

### Extraction des stats d'unité
Les stats (M, T, SV, W, LD, OC) sont dans les `<profile>` de type "Unit" :
```xml
<profile name="Mon Unité" typeName="Unit">
  <characteristics>
    <characteristic name="M">6"</characteristic>
    <characteristic name="T">4</characteristic>
    <characteristic name="SV">3+</characteristic>
    <characteristic name="W">2</characteristic>
    <characteristic name="LD">6+</characteristic>
    <characteristic name="OC">1</characteristic>
  </characteristics>
</profile>
```

### Extraction des armes
Les armes sont dans les `<profile>` de type "Ranged Weapon" ou "Melee Weapon" :
```xml
<profile typeName="Ranged Weapon">
  <characteristics>
    <characteristic name="Range">24"</characteristic>
    <characteristic name="A">2</characteristic>
    <characteristic name="BS">3+</characteristic>
    <characteristic name="S">4</characteristic>
    <characteristic name="AP">-1</characteristic>
    <characteristic name="D">1</characteristic>
    <characteristic name="Keywords">RAPID FIRE 1</characteristic>
  </characteristics>
</profile>
```

---

## Stratégie de sync

### Méthode retenue : Azure Function Timer

```
Toutes les 12h :
1. GET https://api.github.com/repos/BSData/wh40k-10e/releases/latest
2. Comparer le tag avec la version en BDD (table `data_versions`)
3. Si nouvelle version → télécharger le zipball
4. Parser tous les .cat modifiés (comparer `revision` par fichier)
5. Upsert dans PostgreSQL (entries, weapons, abilities)
6. Mettre à jour `data_versions` avec le nouveau tag
```

### Table de suivi de version (PostgreSQL)
```sql
CREATE TABLE data_versions (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) DEFAULT 'bsdata-wh40k-10e',
    github_tag VARCHAR(20),          -- ex: v10.6.0
    applied_at TIMESTAMP DEFAULT NOW(),
    files_updated INTEGER,
    status VARCHAR(20)               -- 'success' | 'error'
);
```

### Compatibilité V11
- Le format .cat est stable et géré par BattleScribe/Battleforge
- Lors de la sortie V11 : vérifier le nom du nouveau repo BSData (ex: `wh40k-11e`)
- Le parser XML restera identique — seul le repo source change
- Prévoir une variable de config `BSDATA_REPO` pour switcher facilement

---

## Outils de parsing recommandés

| Outil | Langage | Notes |
|---|---|---|
| `xml.etree.ElementTree` (stdlib) | Python | Suffisant, pas de dépendance |
| `lxml` | Python | Plus rapide, XPath support |
| `WarHub.ArmouryModel` | .NET/C# | Officiel BSData mais hors-stack |
| `bs-xml-reshaper` | - | Utilitaire reshaping, usage ponctuel |

**Choix : `lxml` en Python** — cohérent avec la stack FastAPI, XPath facilite l'extraction.

---

## Points d'attention

- Certains fichiers ont `hidden="true"` → ignorer complètement
- Les stats peuvent être dans des `<infoLink>` (références à des profiles partagés) → résoudre les liens avant l'import
- Les keywords sont dans le champ `Keywords` de l'arme, séparés par des virgules ou espaces
- Les coûts en points sont dans `<costs><cost name="pts" value="X"/></costs>`
