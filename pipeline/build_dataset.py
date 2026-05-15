"""
build_dataset.py
----------------
Agrège toutes les descriptions textuelles du jeu (stratagems, enhancements,
abilities d'unités) et applique un labelliseur automatique par regex.

Sortie : data/ml/dataset_raw.jsonl
         data/ml/stats.json

Chaque ligne JSONL :
{
  "id"          : str,
  "source_type" : "stratagem" | "enhancement" | "unit_ability",
  "source_id"   : str,
  "faction"     : str | null,
  "name"        : str,
  "text"        : str,          # texte principal pour le modèle
  "full_context": {...},        # champs bruts supplémentaires
  "labels"      : {
    "effects"    : [{"type": str, "value": int|str|null}, ...],
    "phase"      : ["shooting"|"fight"|"command"|"movement"|"any"],
    "conditions" : { "attacker_charged": bool|null, ... },
    "simulatable": bool,        # affect le simulateur ?
    "confidence" : float        # 0-1, confiance de l'auto-label
  },
  "human_verified": false       # sera mis à True lors de la review manuelle
}
"""

import json
import re
import uuid
from pathlib import Path

ROOT  = Path(__file__).resolve().parents[1]
GDC   = ROOT / "frontend" / "public" / "data" / "gdc.json"
UNITS = ROOT / "data" / "cache_stable" / "units.json"
OUT   = ROOT / "data" / "ml" / "dataset_raw.jsonl"
STATS = ROOT / "data" / "ml" / "stats.json"


# ── Regex helpers ─────────────────────────────────────────────────────────────

def _int(m, *groups):
    for g in groups:
        if m and m.group(g):
            return int(m.group(g))
    return None


def clean(text: str) -> str:
    """Retire le markdown WH40K (^^, **, crochets d'habiletés)."""
    text = re.sub(r'\^\^', '', text)
    text = re.sub(r'\*\*', '', text)
    text = re.sub(r'\\n', ' ', text)
    return text.strip()


# ── Extracteur de labels ──────────────────────────────────────────────────────

SIMULATOR_EFFECTS = {
    "HIT_MODIFIER", "WOUND_MODIFIER", "AP_MODIFIER", "DAMAGE_MODIFIER",
    "ATTACKS_MODIFIER", "STRENGTH_MODIFIER",
    "REROLL_HITS", "REROLL_WOUNDS", "REROLL_SAVES",
    "LETHAL_HITS", "SUSTAINED_HITS", "DEVASTATING_WOUNDS",
    "TWIN_LINKED", "TORRENT", "IGNORES_COVER",
    "INVULN_SAVE", "FEEL_NO_PAIN", "DAMAGE_REDUCTION",
    "CRITICAL_HIT_ON", "CRITICAL_WOUND_ON",
    "SET_ROLL_TO_6", "DEBUFF_HIT_ROLL",
}

TARGET_KEYWORDS = [
    "MONSTER", "VEHICLE", "INFANTRY", "FLY", "CHARACTER",
    "TITANIC", "CAVALRY", "BEAST", "SWARM", "WALKER",
]


def extract_labels(text: str) -> dict:
    t = text.lower()
    effects = []

    # ── Modificateurs de jet ─────────────────────────────────────────────────

    # HIT_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?hit roll', t)
    if m: effects.append({"type": "HIT_MODIFIER", "value": int(m.group(1))})
    m = re.search(r'subtract (\d+) from (?:the )?hit roll', t)
    if m: effects.append({"type": "HIT_MODIFIER", "value": -int(m.group(1))})
    m = re.search(r'\+(\d+) to (?:the )?hit roll', t)
    if m and not any(e["type"] == "HIT_MODIFIER" for e in effects):
        effects.append({"type": "HIT_MODIFIER", "value": int(m.group(1))})

    # WOUND_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?wound roll', t)
    if m: effects.append({"type": "WOUND_MODIFIER", "value": int(m.group(1))})
    m = re.search(r'subtract (\d+) from (?:the )?wound roll', t)
    if m: effects.append({"type": "WOUND_MODIFIER", "value": -int(m.group(1))})

    # SAVE_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?sav(?:e|ing) (?:throw|roll)', t)
    if m: effects.append({"type": "SAVE_MODIFIER", "value": int(m.group(1))})
    m = re.search(r'subtract (\d+) from (?:the )?sav(?:e|ing)', t)
    if m: effects.append({"type": "SAVE_MODIFIER", "value": -int(m.group(1))})

    # AP_MODIFIER
    m = re.search(r'improve(?:s)? (?:the )?(?:armour penetration|ap)(?: characteristic)? (?:of .+? )?by (\d+)', t)
    if m: effects.append({"type": "AP_MODIFIER", "value": -int(m.group(1))})
    elif re.search(r'improve(?:s)? (?:the )?(?:armour penetration|ap)(?: characteristic)?', t):
        effects.append({"type": "AP_MODIFIER", "value": -1})

    # DAMAGE_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?damage(?: characteristic)?', t)
    if m: effects.append({"type": "DAMAGE_MODIFIER", "value": int(m.group(1))})
    m = re.search(r'improve(?:s)? (?:the )?damage(?: characteristic)? (?:of .+? )?by (\d+)', t)
    if m and not any(e["type"] == "DAMAGE_MODIFIER" for e in effects):
        effects.append({"type": "DAMAGE_MODIFIER", "value": int(m.group(1))})

    # ATTACKS_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?attacks(?: characteristic)?', t)
    if m: effects.append({"type": "ATTACKS_MODIFIER", "value": int(m.group(1))})
    m = re.search(r'(\d+) additional attack', t)
    if m and not any(e["type"] == "ATTACKS_MODIFIER" for e in effects):
        effects.append({"type": "ATTACKS_MODIFIER", "value": int(m.group(1))})

    # STRENGTH_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?strength(?: characteristic)?', t)
    if m: effects.append({"type": "STRENGTH_MODIFIER", "value": int(m.group(1))})
    m = re.search(r'improve(?:s)? (?:the )?strength(?: characteristic)? (?:of .+? )?by (\d+)', t)
    if m and not any(e["type"] == "STRENGTH_MODIFIER" for e in effects):
        effects.append({"type": "STRENGTH_MODIFIER", "value": int(m.group(1))})

    # ── Re-rolls ─────────────────────────────────────────────────────────────

    if re.search(r"re-?roll.*?(?:unmodified )?hit roll.*?of 1|re-?roll (?:a )?1.*?hit roll", t):
        effects.append({"type": "REROLL_HITS", "value": "ones"})
    elif re.search(r"re-?roll.*?hit roll", t):
        effects.append({"type": "REROLL_HITS", "value": "all"})

    if re.search(r"re-?roll.*?(?:unmodified )?wound roll.*?of 1|re-?roll (?:a )?1.*?wound roll", t):
        effects.append({"type": "REROLL_WOUNDS", "value": "ones"})
    elif re.search(r"re-?roll.*?wound roll", t):
        effects.append({"type": "REROLL_WOUNDS", "value": "all"})

    if re.search(r"re-?roll.*?sav(?:e|ing)", t):
        val = "ones" if "of 1" in t else "all"
        effects.append({"type": "REROLL_SAVES", "value": val})

    # ── Abilities spéciales ───────────────────────────────────────────────────

    if re.search(r'\[lethal hits?\]|lethal hits?', t):
        effects.append({"type": "LETHAL_HITS"})

    m = re.search(r'\[sustained hits?\s*(\d+)\]|sustained hits?\s*(\d+)', t)
    if m:
        val = int(m.group(1) or m.group(2))
        effects.append({"type": "SUSTAINED_HITS", "value": val})
    elif re.search(r'\[sustained hits?\]|sustained hits?', t):
        effects.append({"type": "SUSTAINED_HITS", "value": 1})

    if re.search(r'\[devastating wounds?\]|devastating wounds?', t):
        effects.append({"type": "DEVASTATING_WOUNDS"})

    if re.search(r'\[twin.linked\]|twin.linked', t):
        effects.append({"type": "TWIN_LINKED"})

    if re.search(r'\[torrent\](?!\w)|(?<!\w)torrent(?!\w)', t):
        effects.append({"type": "TORRENT"})

    if re.search(r'\[ignores cover\]|ignores cover', t):
        effects.append({"type": "IGNORES_COVER"})

    if re.search(r'\[lance\](?!\w)|(?<!\w)lance(?!\w)', t):
        effects.append({"type": "LANCE"})

    if re.search(r'\[melta\s*\d+\]|melta \d+', t):
        m = re.search(r'melta\s*(\d+)', t)
        effects.append({"type": "MELTA", "value": int(m.group(1)) if m else 1})

    # Feel No Pain
    m = re.search(r'feel no pain\s*(\d)\+|(\d)\+\s*feel no pain', t)
    if m:
        effects.append({"type": "FEEL_NO_PAIN", "value": _int(m, 1, 2)})
    elif re.search(r'feel no pain', t):
        effects.append({"type": "FEEL_NO_PAIN", "value": None})

    # Mortal Wounds (infligés)
    m = re.search(r'(\d+) mortal wound|d(\d+) mortal wound', t)
    if m:
        effects.append({"type": "MORTAL_WOUNDS", "value": m.group(0)[:10]})
    elif re.search(r'mortal wound', t):
        effects.append({"type": "MORTAL_WOUNDS"})

    # SET_ROLL_TO_6  (changer un dé en 6 non modifié)
    if re.search(
        r'change (?:the )?result of (?:one|a) (?:hit|wound|damage) roll.*?(?:to )?(?:an )?unmodified 6'
        r'|set (?:one|a) (?:hit|wound|damage) (?:roll )?to (?:an )?(?:unmodified )?6'
        r'|(?:that|the) (?:hit|wound|damage) roll.*?(?:becomes?|is) (?:an )?(?:unmodified )?6',
        t
    ):
        effects.append({"type": "SET_ROLL_TO_6"})

    # ── Critical hit/wound seuil ─────────────────────────────────────────────

    # CRITICAL_HIT_ON  (crit hit sur X+ au lieu de 6)
    m = re.search(
        r'unmodified hit roll of (\d)\+.*?(?:scores? a )?critical hit'
        r'|critical hit.*?unmodified hit roll of (\d)\+'
        r'|(?:scores? a )?critical hit on (?:an? )?(?:unmodified )?(?:hit roll of )?(\d)\+',
        t
    )
    if m:
        val = int(next(g for g in m.groups() if g))
        if val < 6:  # 6+ est le défaut, pas besoin de le labelliser
            effects.append({"type": "CRITICAL_HIT_ON", "value": val})

    # CRITICAL_WOUND_ON  (crit wound sur X+ au lieu de 6)
    m = re.search(
        r'unmodified wound roll of (\d)\+.*?(?:scores? a )?critical wound'
        r'|critical wound.*?unmodified wound roll of (\d)\+'
        r'|(?:scores? a )?critical wound on (?:an? )?(?:unmodified )?(?:wound roll of )?(\d)\+',
        t
    )
    if m:
        val = int(next(g for g in m.groups() if g))
        if val < 6:
            effects.append({"type": "CRITICAL_WOUND_ON", "value": val})

    # ── Effets défenseurs ─────────────────────────────────────────────────────

    # INVULN_SAVE
    m = re.search(r'(\d)\+\s*invulnerable save|invulnerable save of (\d)\+|invulnerable save[\s:]+(\d)\+', t)
    if m:
        val = int(m.group(1) or m.group(2) or m.group(3))
        effects.append({"type": "INVULN_SAVE", "value": val})
    elif re.search(r'invulnerable save', t):
        effects.append({"type": "INVULN_SAVE", "value": None})

    # DAMAGE_REDUCTION  (-1 damage, min 1)
    if re.search(r'reduce(?:s)? (?:the )?damage (?:characteristic )?(?:suffered |inflicted )?by 1'
                 r'|subtract 1 from (?:the )?damage'
                 r'|damage.*?is reduced by 1'
                 r'|\-1 (?:to )?damage', t):
        effects.append({"type": "DAMAGE_REDUCTION", "value": 1})
    else:
        m = re.search(r'reduce(?:s)? (?:the )?damage (?:characteristic )?(?:by |of )?(\d+)', t)
        if m:
            effects.append({"type": "DAMAGE_REDUCTION", "value": int(m.group(1))})

    # DAMAGE_HALVED
    if re.search(r'halve(?:s)? (?:the )?damage|damage (?:characteristic )?is halved|divide(?:s)? (?:the )?damage by 2', t):
        effects.append({"type": "DAMAGE_HALVED"})

    # COVER  (bénéfice de couverture)
    if re.search(r'benefit of cover|count(?:s)? as (?:being )?in cover|gains? cover|in cover save', t):
        effects.append({"type": "COVER"})

    # BATTLESHOCK_IMMUNITY
    if re.search(r'auto(?:matically)? pass(?:es)? (?:the )?battle.shock'
                 r'|cannot be battle.shocked'
                 r'|immune to battle.shock'
                 r'|battle.shock (?:tests? )?(?:are )?automatically pass', t):
        effects.append({"type": "BATTLESHOCK_IMMUNITY"})

    # ── Effets utilitaires ────────────────────────────────────────────────────

    # MOVE_MODIFIER
    m = re.search(r'add (\d+)(?:"|") to (?:the )?move(?: characteristic)?'
                  r'|(?:the )?move(?: characteristic)? (?:is )?increased by (\d+)', t)
    if m:
        val = int(m.group(1) or m.group(2))
        effects.append({"type": "MOVE_MODIFIER", "value": val})

    # OC_MODIFIER
    m = re.search(r'add (\d+) to (?:the )?oc(?: characteristic)?'
                  r'|add (\d+) to (?:the )?objective control', t)
    if m:
        val = int(m.group(1) or m.group(2))
        effects.append({"type": "OC_MODIFIER", "value": val})

    # DEBUFF_HIT_ROLL  (defender ability: -1 to attacker's hit rolls)
    if re.search(
        r'subtract 1 from (?:the )?hit roll(?:s)? (?:made )?(?:for|by|against) (?:that|enemy|the attacking)'
        r'|(?:enemy|attacking) unit(?:s)? (?:must )?subtract(?:s)? 1 from (?:the )?hit roll'
        r'|-1 to (?:the )?hit roll(?:s)? of (?:the )?(?:enemy|attacking)'
        r'|each time (?:an? )?(?:enemy|attacking) (?:model|unit).{0,60}subtract 1 from (?:the )?hit',
        t
    ):
        if not any(e["type"] == "DEBUFF_HIT_ROLL" for e in effects):
            effects.append({"type": "DEBUFF_HIT_ROLL"})

    # ── Phase ────────────────────────────────────────────────────────────────

    phases = []
    if re.search(r'shooting phase|ranged attack|shoot', t):    phases.append("shooting")
    if re.search(r'fight phase|melee attack|close combat', t): phases.append("fight")
    if re.search(r'command phase', t):                         phases.append("command")
    if re.search(r'movement phase|advance move', t):           phases.append("movement")
    if not phases:
        phases = ["any"]

    # ── Conditions ───────────────────────────────────────────────────────────

    conditions = {}

    if re.search(r'\bcharged\b|charge move|declared a charge', t):
        conditions["attacker_charged"] = True
    if re.search(r'\badvanced\b|advance move|made an advance', t):
        conditions["attacker_moved"] = True
    if re.search(r'half range|within half|rapid fire range', t):
        conditions["half_range"] = True
    if re.search(r'in cover|benefit.*cover|cover.*benefit', t):
        conditions["target_in_cover"] = True

    target_kws = [kw for kw in TARGET_KEYWORDS if kw.lower() in t]
    if target_kws:
        conditions["target_keywords"] = target_kws

    # ── Simulatable & confidence ──────────────────────────────────────────────

    simulatable = any(e["type"] in SIMULATOR_EFFECTS for e in effects)
    confidence = round(0.9 if effects else 0.2, 2)

    # Baisse la confiance si plusieurs effets détectés (risque d'ambiguïté)
    if len(effects) > 3:
        confidence = round(confidence * 0.8, 2)

    return {
        "effects":    effects,
        "phase":      phases,
        "conditions": conditions,
        "simulatable": simulatable,
        "confidence":  confidence,
    }


# ── Collecteurs de données ────────────────────────────────────────────────────

def collect_stratagems(gdc: dict) -> list[dict]:
    examples = []

    # Core
    for s in gdc.get("core_stratagems", []):
        text = clean(s.get("effect", "") + " " + s.get("when", ""))
        examples.append({
            "id":           f"strat_core_{uuid.uuid4().hex[:8]}",
            "source_type":  "stratagem",
            "source_id":    s.get("name", ""),
            "faction":      "Core",
            "name":         s["name"],
            "text":         text,
            "full_context": {
                "cost": s.get("cost"),
                "type": s.get("type"),
                "when": s.get("when", ""),
                "target": s.get("target", ""),
                "effect": s.get("effect", ""),
                "restrictions": s.get("restrictions", ""),
            },
            "labels":         extract_labels(text),
            "human_verified": False,
        })

    # Per faction + detachment
    for faction in gdc.get("factions", []):
        fname = faction["name"]
        for det in faction.get("detachments", []):
            for s in det.get("stratagems", []):
                text = clean(s.get("effect", "") + " " + s.get("when", ""))
                examples.append({
                    "id":           f"strat_{faction['id'].lower()}_{uuid.uuid4().hex[:8]}",
                    "source_type":  "stratagem",
                    "source_id":    s.get("name", ""),
                    "faction":      fname,
                    "detachment":   det["name"],
                    "name":         s["name"],
                    "text":         text,
                    "full_context": {
                        "cost": s.get("cost"),
                        "type": s.get("type"),
                        "when": s.get("when", ""),
                        "target": s.get("target", ""),
                        "effect": s.get("effect", ""),
                        "restrictions": s.get("restrictions", ""),
                    },
                    "labels":         extract_labels(text),
                    "human_verified": False,
                })
    return examples


def collect_enhancements(gdc: dict) -> list[dict]:
    examples = []
    for faction in gdc.get("factions", []):
        fname = faction["name"]
        for det in faction.get("detachments", []):
            for e in det.get("enhancements", []):
                text = clean(e.get("description", ""))
                examples.append({
                    "id":           f"enh_{faction['id'].lower()}_{uuid.uuid4().hex[:8]}",
                    "source_type":  "enhancement",
                    "source_id":    e.get("name", ""),
                    "faction":      fname,
                    "detachment":   det["name"],
                    "name":         e["name"],
                    "text":         text,
                    "full_context": {
                        "cost":     e.get("cost"),
                        "keywords": e.get("keywords", []),
                        "excludes": e.get("excludes", []),
                    },
                    "labels":         extract_labels(text),
                    "human_verified": False,
                })
    return examples


def collect_abilities(units: list) -> list[dict]:
    examples = []
    seen = set()  # déduplique les abilities identiques
    for unit in units:
        for ab in unit.get("abilities", []):
            text = clean(ab.get("description", ""))
            if not text or text in seen:
                continue
            seen.add(text)
            examples.append({
                "id":           f"ability_{uuid.uuid4().hex[:8]}",
                "source_type":  "unit_ability",
                "source_id":    ab.get("name", ""),
                "faction":      unit.get("faction"),
                "unit_name":    unit.get("name"),
                "name":         ab["name"],
                "text":         text,
                "full_context": {},
                "labels":         extract_labels(text),
                "human_verified": False,
            })
    return examples


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("[dataset] Loading sources...")
    gdc   = json.loads(GDC.read_text())
    units = json.loads(UNITS.read_text())

    print("[dataset] Collecting examples...")
    examples = []
    strats  = collect_stratagems(gdc)
    enhs    = collect_enhancements(gdc)
    abils   = collect_abilities(units)
    examples = strats + enhs + abils

    # Statistiques
    simulatable = [e for e in examples if e["labels"]["simulatable"]]
    by_type     = {}
    for e in examples:
        by_type.setdefault(e["source_type"], 0)
        by_type[e["source_type"]] += 1

    effect_types = {}
    for e in examples:
        for ef in e["labels"]["effects"]:
            t = ef["type"]
            effect_types[t] = effect_types.get(t, 0) + 1

    stats = {
        "total":       len(examples),
        "by_type":     by_type,
        "simulatable": len(simulatable),
        "non_simulatable": len(examples) - len(simulatable),
        "effect_distribution": dict(sorted(effect_types.items(), key=lambda x: -x[1])),
        "avg_confidence": round(
            sum(e["labels"]["confidence"] for e in examples) / len(examples), 3
        ),
    }

    # Écriture
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    STATS.write_text(json.dumps(stats, indent=2, ensure_ascii=False))

    print(f"\n[dataset] {len(examples)} exemples générés")
    print(f"  Stratagems     : {by_type.get('stratagem', 0)}")
    print(f"  Enhancements   : {by_type.get('enhancement', 0)}")
    print(f"  Unit abilities : {by_type.get('unit_ability', 0)}")
    print(f"  Simulatables   : {len(simulatable)} ({100*len(simulatable)//len(examples)}%)")
    print(f"\n  Top effets détectés :")
    for etype, count in list(stats["effect_distribution"].items())[:10]:
        print(f"    {etype:30} {count:4}")
    print(f"\n[dataset] → {OUT}")
    print(f"[dataset] → {STATS}")


if __name__ == "__main__":
    main()
