"""
build_frontend_data.py
----------------------
Generates lightweight JSON files for the frontend from cache_stable/.
Output: frontend/public/data/units.json (~200KB) + weapons.json (~300KB)
"""

import json
import re
from pathlib import Path

ROOT     = Path(__file__).resolve().parents[1]
CACHE    = ROOT / "data" / "cache_stable"
OUT_DIR  = ROOT / "frontend" / "public" / "data"


def parse_int(s: str, fallback: int = 0) -> int:
    """'3+' → 3, '2+' → 2, '-1' → -1, '5' → 5"""
    m = re.search(r"-?\d+", str(s))
    return int(m.group()) if m else fallback


def extract_invuln(unit: dict) -> int | None:
    """Try to find invulnerable save value from abilities."""
    for ab in unit.get("abilities", []):
        desc = ab.get("description", "").lower()
        name = ab.get("name", "").lower()
        if "invulnerable" in name or "invulnerable" in desc:
            m = re.search(r"(\d)\+\s*invuln", desc)
            if m:
                return int(m.group(1))
            m = re.search(r"invuln\w*\s+\w*\s*(\d)\+", desc)
            if m:
                return int(m.group(1))
            m = re.search(r"(\d)\+", desc)
            if m:
                return int(m.group(1))
    return None


def slim_weapon(w: dict) -> dict:
    return {
        "id":   w["bsdata_id"],
        "name": w["name"],
        "type": w.get("type", "Ranged"),
        "A":    w.get("A", "1"),
        "BS":   parse_int(w.get("BS_WS", "4+")),
        "S":    parse_int(w.get("S", "4")),
        "AP":   parse_int(w.get("AP", "0")),
        "D":    w.get("D", "1"),
        "kw":   w.get("keywords", []),
    }


def collect_weapons(u: dict, id_aliases: dict[str, str]) -> list[dict]:
    """Collect all weapon refs (default + options) as flat deduped list of {id, name}.
    Uses id_aliases to resolve bsdata_ids to their canonical dedup id."""
    seen, result = set(), []

    def add(w: dict):
        raw_id = w.get("bsdata_id")
        if not raw_id:
            return
        canonical = id_aliases.get(raw_id, raw_id)  # fallback to raw if not in aliases
        if canonical not in seen:
            seen.add(canonical)
            result.append({"id": canonical, "name": w["name"]})

    for w in u.get("weapons_default", []):
        add(w)
    for wo in u.get("weapon_options", []):
        if "bsdata_id" in wo:
            add(wo)
        for sub_w in wo.get("weapons", []):
            add(sub_w)
        for sg in wo.get("sub_groups", []):
            for sub_w in sg.get("weapons", []):
                add(sub_w)
            for ssg in sg.get("sub_groups", []):
                for sub_w in ssg.get("weapons", []):
                    add(sub_w)
    return result


def slim_unit(u: dict, id_aliases: dict[str, str]) -> dict:
    stats       = u.get("stats", {}) or {}
    invuln      = extract_invuln(u)
    constraints = u.get("constraints", {}) or {}
    weapons     = collect_weapons(u, id_aliases)

    # Keywords — strip BSData internal "Faction:" prefixes for the UI
    useful_kw = [k for k in u.get("keywords", []) if not k.startswith("Faction:")]

    # Abilities — name + truncated description (enough to understand the rule)
    abilities = []
    for ab in (u.get("abilities", []) or [])[:10]:
        name = ab.get("name", "").strip()
        desc = (ab.get("description", "") or "").strip()
        if name:
            abilities.append({"name": name, "desc": desc})

    return {
        "id":         u["bsdata_id"],
        "name":       u["name"],
        "faction":    u.get("faction", ""),
        "is_legends": bool(u.get("is_legends", False)),
        "pts":        u.get("pts"),
        "M":          stats.get("M", ""),
        "T":          parse_int(stats.get("T", "4")),
        "Sv":         parse_int(stats.get("SV", "4+")),
        "W":          parse_int(stats.get("W", "1")),
        "LD":         stats.get("LD", ""),
        "OC":         stats.get("OC", ""),
        "invuln":     invuln,
        "kw":         useful_kw,
        "abilities":  abilities,
        "min_models": constraints.get("min_models"),
        "max_models": constraints.get("max_models"),
        "weapons":    weapons,
        "factions":   u.get("playable_in", []),
    }


def build_weapon_users(units_raw: list) -> dict[str, list[str]]:
    """Build mapping: weapon bsdata_id → list of unit names that use it."""
    w2u: dict[str, list[str]] = {}

    def _add(wid: str, uname: str):
        users = w2u.setdefault(wid, [])
        if uname not in users:
            users.append(uname)

    for u in units_raw:
        name = u["name"]
        for w in u.get("weapons_default", []):
            if "bsdata_id" in w:
                _add(w["bsdata_id"], name)
        for wo in u.get("weapon_options", []):
            if "bsdata_id" in wo:
                _add(wo["bsdata_id"], name)
            for sub_w in wo.get("weapons", []):
                if "bsdata_id" in sub_w:
                    _add(sub_w["bsdata_id"], name)
            for sg in wo.get("sub_groups", []):
                for sub_w in sg.get("weapons", []):
                    if "bsdata_id" in sub_w:
                        _add(sub_w["bsdata_id"], name)
    return w2u


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load raw data
    weapons_raw = json.loads((CACHE / "weapons.json").read_text())
    units_raw   = json.loads((CACHE / "units.json").read_text())

    # Build weapon → users map
    w2u = build_weapon_users(units_raw)

    # Weapons — deduplicate by (name, A, BS, S, AP, D, keywords) and merge users
    # Also build id_aliases: original bsdata_id → canonical id (first occurrence kept)
    seen: dict[str, dict] = {}       # dedup key → merged weapon
    id_aliases: dict[str, str] = {}  # bsdata_id → canonical id

    for w in weapons_raw:
        sw = slim_weapon(w)
        kw_key = ",".join(sorted(sw["kw"]))
        dedup_key = f"{sw['name']}|{sw['A']}|{sw['BS']}|{sw['S']}|{sw['AP']}|{sw['D']}|{kw_key}"

        users = w2u.get(w["bsdata_id"], [])

        if dedup_key in seen:
            canonical_id = seen[dedup_key]["id"]
            id_aliases[w["bsdata_id"]] = canonical_id
            # Merge users into existing entry (cap at 3 examples)
            existing = seen[dedup_key]
            for u in users:
                if u not in existing["users"] and len(existing["users"]) < 3:
                    existing["users"].append(u)
        else:
            id_aliases[w["bsdata_id"]] = sw["id"]   # maps to itself (canonical)
            sw["users"] = users[:3]
            seen[dedup_key] = sw

    weapons = list(seen.values())
    (OUT_DIR / "weapons.json").write_text(json.dumps(weapons, separators=(",", ":")))
    print(f"[build] {len(weapons)} weapons (deduped from {len(weapons_raw)}) → {(OUT_DIR / 'weapons.json').stat().st_size // 1024} KB")

    # Units — pass id_aliases so weapon refs use canonical ids
    units = [slim_unit(u, id_aliases) for u in units_raw]
    (OUT_DIR / "units.json").write_text(json.dumps(units, separators=(",", ":")))
    print(f"[build] {len(units)} units → {(OUT_DIR / 'units.json').stat().st_size // 1024} KB")

    # Factions (already small)
    factions = json.loads((CACHE / "factions.json").read_text())
    (OUT_DIR / "factions.json").write_text(json.dumps(factions, separators=(",", ":")))
    print(f"[build] {len(factions)} factions")


if __name__ == "__main__":
    main()
