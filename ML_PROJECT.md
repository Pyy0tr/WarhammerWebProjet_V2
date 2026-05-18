# ProbHammer — Projet ML

Pipeline de classification automatique des effets simulables dans les règles WH40K 10e.

---

## Objectif

Classer chaque texte de règle (stratagem, enhancement, ability d'unité) en un vecteur multi-label de 30 classes d'effets simulables. Utilisé pour :
- Identifier automatiquement les combos simulables entre unités
- Alimenter le Combo Builder (ComboPage) avec des suggestions pertinentes
- Explorer la distribution des effets dans les données BSData

---

## Architecture

**Modèle** : DistilBERT (`distilbert-base-uncased`) fine-tuné en classification multi-label  
**Entrée** : texte nettoyé d'une règle (max 128 tokens)  
**Sortie** : sigmoid sur 30 logits → seuil 0.35 (label_tool) / 0.40 (train) pour prédiction positive  
**Loss** : BCEWithLogitsLoss (multi-label)  
**Checkpoint** : `data/ml/model/best/` (meilleur val_macro_f1 sur 5 epochs)

---

## Dataset

| Fichier | Description |
|---------|-------------|
| `data/ml/dataset_raw.jsonl` | 4587 exemples auto-labellisés par regex |
| `data/ml/dataset_verified.jsonl` | Exemples corrigés manuellement (human_verified=true) |
| `data/ml/stats.json` | Distribution des effets par classe |
| `data/ml/label_map.json` | effect_type → index (30 entrées) |

### Distribution

- Total : 4587 exemples
- Simulatables : 1432 (31%)
- Non simulatables : 3155 (69%)
- Sources : stratagems + enhancements (depuis `gdc.json`) + unit abilities (depuis `cache_stable/units.json`)

### Format JSONL

```json
{
  "id": "strat_core_a1b2c3d4",
  "source_type": "stratagem | enhancement | unit_ability",
  "source_id": "Nom de la règle",
  "faction": "Space Marines",
  "detachment": "Gladius Task Force",
  "name": "Nom de la règle",
  "text": "texte nettoyé pour le modèle",
  "full_context": { "cost": 1, "when": "...", "effect": "...", ... },
  "labels": {
    "effects": [{ "type": "REROLL_HITS", "value": "all" }],
    "phase": ["shooting"],
    "conditions": { "attacker_charged": true },
    "simulatable": true,
    "confidence": 0.9
  },
  "human_verified": false
}
```

---

## Classes — 30 effets

| Classe | F1 test | Support | Catégorie |
|--------|---------|---------|-----------|
| `HIT_MODIFIER` | 0.952 | 21 | Modificateur jet |
| `WOUND_MODIFIER` | 0.974 | 19 | Modificateur jet |
| `AP_MODIFIER` | 0.923 | 7 | Modificateur jet |
| `DAMAGE_MODIFIER` | 0.000 | 1 | Modificateur jet (rare) |
| `ATTACKS_MODIFIER` | 0.800 | 8 | Modificateur jet |
| `STRENGTH_MODIFIER` | 0.000 | 8 | Modificateur jet (texte ambigu) |
| `REROLL_HITS` | 1.000 | 13 | Re-roll |
| `REROLL_WOUNDS` | 1.000 | 10 | Re-roll |
| `REROLL_SAVES` | 0.000 | 0 | Re-roll (absent test set) |
| `LETHAL_HITS` | 0.909 | 6 | Keyword arme |
| `SUSTAINED_HITS` | 0.957 | 11 | Keyword arme |
| `DEVASTATING_WOUNDS` | 0.909 | 6 | Keyword arme |
| `TWIN_LINKED` | 0.000 | 0 | Keyword arme (absent test set) |
| `TORRENT` | 0.000 | 3 | Keyword arme (rare) |
| `IGNORES_COVER` | 1.000 | 7 | Keyword arme |
| `LANCE` | 0.000 | 0 | Keyword arme (absent test set) |
| `MELTA` | 0.000 | 0 | Keyword arme (absent test set) |
| `FEEL_NO_PAIN` | 1.000 | 10 | Défenseur |
| `MORTAL_WOUNDS` | 0.983 | 30 | Attaquant |
| `INVULN_SAVE` | 1.000 | 13 | Défenseur |
| `DAMAGE_REDUCTION` | 0.000 | 1 | Défenseur (rare) |
| `DAMAGE_HALVED` | 0.000 | 0 | Défenseur (absent test set) |
| `COVER` | 0.833 | 7 | Défenseur |
| `BATTLESHOCK_IMMUNITY` | 0.000 | 0 | Utilitaire (absent test set) |
| `MOVE_MODIFIER` | 0.000 | 3 | Utilitaire (rare) |
| `OC_MODIFIER` | 0.000 | 3 | Utilitaire (rare) |
| `CRITICAL_HIT_ON` | 0.000 | 4 | Seuil critique (rare) |
| `CRITICAL_WOUND_ON` | 0.000 | 0 | Seuil critique (absent test set) |
| `SET_ROLL_TO_6` | 0.000 | 0 | Manipulation dé (absent test set) |
| `DEBUFF_HIT_ROLL` | 0.000 | 0 | Debuff défenseur (1 exemple total) |

**Métriques globales** : macro_f1=0.4414, micro_f1=0.8983  
Le micro_f1 élevé reflète la dominance des classes fréquentes ; le macro_f1 est tiré vers le bas par les 11 classes à F1=0 (absentes ou quasi-absentes du dataset).

---

## Scripts

| Script | Commande | Sortie |
|--------|----------|--------|
| `pipeline/build_dataset.py` | `python3 pipeline/build_dataset.py` | `data/ml/dataset_raw.jsonl` + `data/ml/stats.json` |
| `pipeline/train_classifier.py` | `data/ml/venv/bin/python pipeline/train_classifier.py` | `data/ml/model/best/` + `data/ml/metrics.json` |
| `pipeline/label_tool.py` | `data/ml/venv/bin/python pipeline/label_tool.py` | `data/ml/dataset_verified.jsonl` |

### Hyperparamètres d'entraînement

| Param | Valeur |
|-------|--------|
| Modèle de base | `distilbert-base-uncased` |
| MAX_LEN | 128 tokens |
| BATCH_SIZE | 16 |
| EPOCHS | 5 |
| LR | 3e-5 |
| WARMUP | 10% des steps |
| Split | 80% train / 10% val / 10% test |
| Seuil inférence (train) | 0.40 |
| Seuil inférence (label_tool) | 0.35 |

### label_tool.py — options

```bash
# Tous les exemples non vérifiés
data/ml/venv/bin/python pipeline/label_tool.py

# Filtrer par source
data/ml/venv/bin/python pipeline/label_tool.py --source stratagem
data/ml/venv/bin/python pipeline/label_tool.py --source enhancement
data/ml/venv/bin/python pipeline/label_tool.py --source unit_ability

# Seulement les désaccords modèle ≠ auto-label
data/ml/venv/bin/python pipeline/label_tool.py --disagreements

# Seulement les exemples simulatables
data/ml/venv/bin/python pipeline/label_tool.py --only-simulatable
```

Commandes interactives : `Enter` (accepter prédiction) · `auto` (auto-label regex) · `none` (non simulable) · `HIT,WOUND,...` (manuel) · `s` (passer) · `q` (quitter)

---

## Workflow complet

```bash
# 1. Reconstruire le dataset (après mise à jour BSData ou règles regex)
python3 pipeline/build_dataset.py

# 2. Réentraîner le modèle
data/ml/venv/bin/python pipeline/train_classifier.py

# 3. Vérifier les désaccords manuellement
data/ml/venv/bin/python pipeline/label_tool.py --disagreements

# 4. (optionnel) Réentraîner avec dataset_verified.jsonl intégré
#    → modifier DATA_FILE dans train_classifier.py pour merger les deux fichiers
```

---

## Roadmap

| Phase | Description | Statut |
|-------|-------------|--------|
| 1 — Dataset | Build auto-label + split | ✓ Fait |
| 2 — Entraînement | DistilBERT multi-label 30 classes | ✓ Fait (macro_f1=0.44) |
| 3 — Label tool | Vérification manuelle des désaccords | En cours |
| 4 — Amélioration classes rares | Augmentation données MELTA/TWIN_LINKED/LANCE/SET_ROLL_TO_6/DEBUFF_HIT_ROLL | À faire |
| 5 — Graphe de combos | Détection automatique de synergies inter-unités | À faire |

### Classes prioritaires pour labeling manuel

| Classe | Exemples dataset | F1 actuel | Priorité |
|--------|-----------------|-----------|---------|
| `TWIN_LINKED` | ~6 | 0.0 | Haute |
| `LANCE` | ~30 | 0.0 | Haute |
| `TORRENT` | ~7 | 0.0 | Haute |
| `SET_ROLL_TO_6` | ~5 | 0.0 | Haute |
| `CRITICAL_HIT_ON` | ~4 | 0.0 | Moyenne |
| `MELTA` | ~2 | 0.0 | Basse (très rare) |
| `DEBUFF_HIT_ROLL` | 1 | 0.0 | Basse (très rare) |
