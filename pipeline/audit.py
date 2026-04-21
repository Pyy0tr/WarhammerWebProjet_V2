"""
audit.py — Contrôle qualité des données parsées BSData
-------------------------------------------------------
Vérifie les anomalies dans data/cache/*.json :
  - Unités sans stats (M/T/SV/W/LD/OC)
  - Unités sans armes (hors fortifications et ability-based)
  - Unités sans points (hors cas légitimes)
  - Armes avec stats manquantes
  - Outliers statistiques (valeurs aberrantes)
  - Factions vides
  - Cohérence faction_units ↔ units

Usage :
    python pipeline/audit.py
    python pipeline/audit.py --json     # sortie JSON pour intégration CI
"""

import json
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"

# ---------------------------------------------------------------------------
# Chargement
# ---------------------------------------------------------------------------

def load():
    files = ["units.json", "weapons.json", "factions.json", "faction_units.json", "rules.json"]
    data = {}
    for f in files:
        path = CACHE_DIR / f
        if not path.exists():
            print(f"ERREUR : {path} introuvable — lance parse_bsdata.py d'abord")
            sys.exit(1)
        data[f.replace(".json", "")] = json.loads(path.read_text(encoding="utf-8"))
    return data

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

STAT_FIELDS = ["M", "T", "SV", "W", "LD", "OC"]
WEAPON_FIELDS = ["A", "BS_WS", "S", "AP", "D"]

FORTIFICATION_KW = "fortification"
ABILITY_DAMAGE_UNITS = {"Cyclops Demolition Vehicle", "Dreadnought Drop Pod",
                        "Mucolid Spores", "Spore Mines"}

def has_weapons_recursive(groups):
    for g in groups:
        if g.get("weapons"):
            return True
        if has_weapons_recursive(g.get("sub_groups", [])):
            return True
    return False

def count_weapons_recursive(groups):
    count = 0
    for g in groups:
        count += len(g.get("weapons", []))
        count += count_weapons_recursive(g.get("sub_groups", []))
    return count

def parse_numeric(val):
    """Extrait la valeur numérique d'un stat (ex: '3+' → 3, '5\"' → 5, '10' → 10)."""
    if not val or val == "-":
        return None
    m = re.search(r"(\d+)", str(val))
    return int(m.group(1)) if m else None

def is_fortification(unit):
    return any(FORTIFICATION_KW in kw.lower() for kw in unit.get("keywords", []))

def is_ability_damage(unit):
    return unit["name"] in ABILITY_DAMAGE_UNITS

def stat_missing(val):
    return not val or val == "-"

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def stat_missing_strict(val, field):
    """Pour M, "-" est valide (unité immobile). Pour les autres stats, "-" = manquant."""
    if not val:
        return True
    if val == "-":
        return field != "M"  # M="-" est OK (Drop Pod, fortifications, Sporocyst...)
    return False

def check_units_stats(units):
    issues = []
    for u in units:
        stats = u.get("stats", {})
        missing = [f for f in STAT_FIELDS if stat_missing_strict(stats.get(f), f)]
        if missing:
            issues.append({
                "unit": u["name"],
                "faction": u["faction"],
                "missing_stats": missing,
                "pts": u["pts"],
            })
    return issues

def check_units_weapons(units):
    no_weapons = []
    for u in units:
        has_w = u.get("weapons_default") or has_weapons_recursive(u.get("weapon_options", []))
        if not has_w:
            kw = [k.lower() for k in u.get("keywords", [])]
            category = (
                "fortification" if is_fortification(u)
                else "ability-based" if is_ability_damage(u)
                else "INATTENDU"
            )
            no_weapons.append({
                "unit": u["name"],
                "faction": u["faction"],
                "category": category,
                "pts": u["pts"],
                "keywords": u.get("keywords", [])[:5],
            })
    return no_weapons

def check_units_pts(units):
    """Unités avec 0 pts qui NE sont pas des fortifications ou composants."""
    issues = []
    for u in units:
        if u["pts"] == 0:
            if not is_fortification(u):
                issues.append({
                    "unit": u["name"],
                    "faction": u["faction"],
                    "keywords": u.get("keywords", [])[:5],
                })
    return issues

def weapon_stat_missing(val):
    """Pour les armes, '-' est une valeur valide (AP='-' = AP0, BS='-' = auto-hit)."""
    return not val  # seul None/'' est manquant, pas '-'

def check_weapons_stats(weapons):
    issues = []
    for w in weapons:
        missing = [f for f in WEAPON_FIELDS if weapon_stat_missing(w.get(f))]
        if missing:
            issues.append({
                "weapon": w["name"],
                "type": w.get("type"),
                "missing": missing,
            })
    return issues

def check_outliers_units(units):
    outliers = []
    for u in units:
        stats = u.get("stats", {})
        flags = []

        t = parse_numeric(stats.get("T"))
        w = parse_numeric(stats.get("W"))
        sv = parse_numeric(stats.get("SV"))
        ld = parse_numeric(stats.get("LD"))

        if t and t > 14:         flags.append(f"T={stats['T']} (très élevé)")
        if w and w > 40:         flags.append(f"W={stats['W']} (très élevé)")
        if sv and sv > 8:        flags.append(f"SV={stats['SV']} (invalide)")  # 8+ est valide (Blue Horrors etc.)
        if ld and ld > 10:       flags.append(f"LD={stats['LD']} (invalide)")
        if u["pts"] > 2000:      flags.append(f"pts={u['pts']} (très élevé)")
        if u["pts"] < 0:         flags.append(f"pts={u['pts']} (négatif)")

        if flags:
            outliers.append({
                "unit": u["name"],
                "faction": u["faction"],
                "flags": flags,
                "stats": stats,
                "pts": u["pts"],
            })
    return outliers

def check_outliers_weapons(weapons):
    outliers = []
    for w in weapons:
        flags = []
        a   = parse_numeric(w.get("A"))
        s   = parse_numeric(w.get("S"))
        d   = parse_numeric(w.get("D"))
        bsws = parse_numeric(w.get("BS_WS"))

        if a   and a   > 30:  flags.append(f"A={w['A']} (très élevé)")
        if s   and s   > 25:  flags.append(f"S={w['S']} (très élevé)")
        if d   and d   > 20:  flags.append(f"D={w['D']} (très élevé)")
        if bsws and bsws > 7: flags.append(f"BS/WS={w['BS_WS']} (invalide)")

        if flags:
            outliers.append({
                "weapon": w["name"],
                "type": w.get("type"),
                "flags": flags,
            })
    return outliers

LIBRARY_FACTIONS = {"Library", "Legends"}  # mots-clés identifiant des factions-bibliothèques non jouables

def is_library_faction(faction_name):
    """Les factions Library/Legends définissent des entrées partagées mais ne sont pas jouables."""
    return any(kw in faction_name for kw in LIBRARY_FACTIONS)

def check_factions(factions, faction_units, units_by_id):
    issues = []
    for faction in factions:
        unit_ids = faction_units.get(faction, [])
        # Vérifier les IDs qui pointent vers des unités inexistantes
        broken = [uid for uid in unit_ids if uid not in units_by_id]
        if broken:
            issues.append({
                "faction": faction,
                "broken_ids": broken,
            })
        # Les factions Library/Legends sont normalement vides dans faction_units — pas une erreur
        if not unit_ids and not is_library_faction(faction):
            issues.append({
                "faction": faction,
                "note": "faction sans unités dans faction_units.json",
            })
    return issues

def check_stats_distribution(units):
    """Résumé statistique global pour détecter les anomalies de masse."""
    t_vals, w_vals, pts_vals = [], [], []
    for u in units:
        stats = u.get("stats", {})
        t = parse_numeric(stats.get("T"))
        w = parse_numeric(stats.get("W"))
        if t: t_vals.append(t)
        if w: w_vals.append(w)
        if u["pts"] > 0: pts_vals.append(u["pts"])

    def stats_summary(vals, label):
        if not vals:
            return {}
        vals_sorted = sorted(vals)
        n = len(vals_sorted)
        return {
            "label": label,
            "count": n,
            "min": vals_sorted[0],
            "max": vals_sorted[-1],
            "median": vals_sorted[n // 2],
            "mean": round(sum(vals) / n, 1),
        }

    return [
        stats_summary(t_vals,   "Toughness (T)"),
        stats_summary(w_vals,   "Wounds (W)"),
        stats_summary(pts_vals, "Points (pts)"),
    ]

# ---------------------------------------------------------------------------
# Affichage
# ---------------------------------------------------------------------------

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def ok(msg):
    print(f"  ✅  {msg}")

def warn(msg):
    print(f"  ⚠   {msg}")

def err(msg):
    print(f"  ❌  {msg}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    args = parser.parse_args()

    data = load()
    units        = data["units"]
    weapons      = data["weapons"]
    factions     = data["factions"]
    faction_units = data["faction_units"]
    units_by_id  = {u["bsdata_id"]: u for u in units}

    report = {}

    # -----------------------------------------------------------------------
    # Vue d'ensemble
    # -----------------------------------------------------------------------
    section("VUE D'ENSEMBLE")
    print(f"  Unités       : {len(units)}")
    print(f"  Armes        : {len(weapons)}")
    print(f"  Factions     : {len(factions)}")
    print(f"  Factions map : {len(faction_units)}")

    report["overview"] = {
        "units": len(units),
        "weapons": len(weapons),
        "factions": len(factions),
        "faction_units_mapped": len(faction_units),
    }

    # -----------------------------------------------------------------------
    # Stats manquantes
    # -----------------------------------------------------------------------
    section("STATS MANQUANTES (M/T/SV/W/LD/OC)")
    stats_issues = check_units_stats(units)
    if not stats_issues:
        ok(f"Toutes les unités ont leurs stats complètes")
    else:
        err(f"{len(stats_issues)} unités avec stats incomplètes")
        for i in stats_issues[:20]:
            print(f"    [{i['faction'][:30]}] {i['name'] if 'name' in i else i['unit']} — manque : {i['missing_stats']}")
        if len(stats_issues) > 20:
            print(f"    ... et {len(stats_issues) - 20} autres")
    report["missing_stats"] = stats_issues

    # -----------------------------------------------------------------------
    # Armes manquantes
    # -----------------------------------------------------------------------
    section("ARMES MANQUANTES")
    no_weapons = check_units_weapons(units)
    unexpected = [u for u in no_weapons if u["category"] == "INATTENDU"]
    expected   = [u for u in no_weapons if u["category"] != "INATTENDU"]

    if not unexpected:
        ok(f"Aucune unité inattendue sans armes")
    else:
        err(f"{len(unexpected)} unités INATTENDUES sans armes")
        for u in unexpected:
            print(f"    [{u['faction'][:30]}] {u['unit']} ({u['pts']} pts) — kw: {u['keywords']}")

    warn(f"{len(expected)} unités légitimement sans armes :")
    by_cat = defaultdict(list)
    for u in expected:
        by_cat[u["category"]].append(u["unit"])
    for cat, names in by_cat.items():
        print(f"    {cat} ({len(names)}) : {', '.join(names[:5])}{'...' if len(names) > 5 else ''}")

    report["no_weapons"] = {"unexpected": unexpected, "expected": expected}

    # -----------------------------------------------------------------------
    # Points à 0
    # -----------------------------------------------------------------------
    section("UNITÉS À 0 PTS (hors fortifications)")
    zero_pts = check_units_pts(units)
    # Séparer les cas vraiment suspects des cas connus
    known_zero = {"Watcher in the Dark", "Heroic Kelbor-Hal"}  # exemples légitimes BSData
    suspect = [u for u in zero_pts if u["unit"] not in known_zero]

    if not suspect:
        ok(f"Aucune unité suspecte à 0 pts")
    else:
        warn(f"{len(suspect)} unités non-fortification à 0 pts")
        for u in suspect[:15]:
            print(f"    [{u['faction'][:30]}] {u['unit']} — kw: {u['keywords']}")
        if len(suspect) > 15:
            print(f"    ... et {len(suspect) - 15} autres")
    report["zero_pts"] = suspect

    # -----------------------------------------------------------------------
    # Armes avec stats manquantes
    # -----------------------------------------------------------------------
    section("ARMES AVEC STATS MANQUANTES")
    weapon_issues = check_weapons_stats(weapons)
    if not weapon_issues:
        ok(f"Toutes les armes ont leurs stats complètes")
    else:
        warn(f"{len(weapon_issues)} armes avec stats incomplètes")
        by_missing = defaultdict(list)
        for w in weapon_issues:
            key = ", ".join(w["missing"])
            by_missing[key].append(w["weapon"])
        for missing_key, names in list(by_missing.items())[:5]:
            print(f"    Manque [{missing_key}] : {', '.join(names[:3])}{'...' if len(names) > 3 else ''} ({len(names)} total)")
    report["weapon_issues"] = weapon_issues

    # -----------------------------------------------------------------------
    # Outliers unités
    # -----------------------------------------------------------------------
    section("OUTLIERS — UNITÉS (valeurs inhabituelles)")
    unit_outliers = check_outliers_units(units)
    if not unit_outliers:
        ok("Aucun outlier détecté")
    else:
        warn(f"{len(unit_outliers)} unités avec valeurs inhabituelles")
        for u in unit_outliers:
            print(f"    [{u['faction'][:25]}] {u['unit']} — {' | '.join(u['flags'])}")
    report["unit_outliers"] = unit_outliers

    # -----------------------------------------------------------------------
    # Outliers armes
    # -----------------------------------------------------------------------
    section("OUTLIERS — ARMES (valeurs inhabituelles)")
    weapon_outliers = check_outliers_weapons(weapons)
    if not weapon_outliers:
        ok("Aucun outlier détecté")
    else:
        warn(f"{len(weapon_outliers)} armes avec valeurs inhabituelles")
        for w in weapon_outliers[:15]:
            print(f"    [{w['type']}] {w['weapon']} — {' | '.join(w['flags'])}")
        if len(weapon_outliers) > 15:
            print(f"    ... et {len(weapon_outliers) - 15} autres")
    report["weapon_outliers"] = weapon_outliers

    # -----------------------------------------------------------------------
    # Factions
    # -----------------------------------------------------------------------
    section("FACTIONS — COHÉRENCE")
    faction_issues = check_factions(factions, faction_units, units_by_id)
    if not faction_issues:
        ok("Toutes les factions sont cohérentes")
    else:
        for i in faction_issues:
            err(str(i))
    report["faction_issues"] = faction_issues

    # -----------------------------------------------------------------------
    # Distribution statistique
    # -----------------------------------------------------------------------
    section("DISTRIBUTION STATISTIQUE")
    distributions = check_stats_distribution(units)
    for d in distributions:
        print(f"  {d['label']:<20} min={d['min']}  max={d['max']}  median={d['median']}  mean={d['mean']}  (n={d['count']})")
    report["distributions"] = distributions

    # -----------------------------------------------------------------------
    # Bilan final
    # -----------------------------------------------------------------------
    section("BILAN")
    errors   = len(stats_issues) + len(unexpected) + len(faction_issues)
    warnings = len(suspect) + len(weapon_issues) + len(unit_outliers) + len(weapon_outliers)
    print(f"  ❌ Erreurs   : {errors}")
    print(f"  ⚠  Warnings  : {warnings}")
    if errors == 0 and warnings == 0:
        print(f"  ✅ Données propres — pipeline OK")
    elif errors == 0:
        print(f"  ✅ Pas d'erreur critique — {warnings} points à vérifier manuellement")
    else:
        print(f"  ❌ {errors} erreurs à corriger dans le parser")

    report["summary"] = {"errors": errors, "warnings": warnings}

    if args.json:
        print("\n" + json.dumps(report, ensure_ascii=False, indent=2))

    sys.exit(1 if errors > 0 else 0)


if __name__ == "__main__":
    main()
