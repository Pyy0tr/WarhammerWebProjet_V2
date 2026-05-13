"""
fetch_gamedatacards.py
----------------------
Fetches faction data from game-datacards/datasources (10th edition, GDC format).
Groups stratagems and enhancements by detachment.
Output: frontend/public/data/gdc.json
"""

import json
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT     = Path(__file__).resolve().parents[1]
OUT      = ROOT / "frontend" / "public" / "data" / "gdc.json"
BASE_URL = "https://raw.githubusercontent.com/game-datacards/datasources/main/10th/gdc"
API_URL  = "https://api.github.com/repos/game-datacards/datasources/contents/10th/gdc"

SKIP = {"core.json", "enhancements.json", "unaligned.json", "titan.json"}


def fetch(url: str) -> dict | list:
    req = urllib.request.Request(
        url, headers={"User-Agent": "ProbHammer/1.0", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def slim_strat(s: dict) -> dict:
    return {
        "name":         s.get("name", ""),
        "cost":         s.get("cost", 1),
        "type":         s.get("type", ""),
        "turn":         s.get("turn", ""),
        "phase":        s.get("phase", []),
        "when":         s.get("when", ""),
        "target":       s.get("target", ""),
        "effect":       s.get("effect", ""),
        "restrictions": s.get("restrictions", ""),
    }


def slim_enh(e: dict) -> dict:
    return {
        "name":        e.get("name", ""),
        "cost":        e.get("cost", ""),
        "description": e.get("description", ""),
        "keywords":    e.get("keywords", []),
        "excludes":    e.get("excludes", []),
    }


def army_rules(rules_obj) -> list[dict]:
    if not rules_obj or not isinstance(rules_obj, dict):
        return []
    out = []
    for group in rules_obj.get("army", []):
        name = group.get("name", "")
        text = "\n\n".join(r.get("text", "") for r in group.get("rules", []) if r.get("text"))
        if name or text:
            out.append({"name": name, "text": text})
    return out


def process(data: dict) -> dict:
    detachments = data.get("detachments", [])
    strats_raw  = data.get("stratagems", [])
    enhs_raw    = data.get("enhancements", [])

    strat_by = {d["name"]: [] for d in detachments}
    enh_by   = {d["name"]: [] for d in detachments}

    for s in strats_raw:
        key = s.get("detachment", "")
        if key in strat_by:
            strat_by[key].append(slim_strat(s))

    for e in enhs_raw:
        key = e.get("detachment", "")
        if key in enh_by:
            enh_by[key].append(slim_enh(e))

    det_list = [
        {
            "name":         d["name"],
            "stratagems":   strat_by.get(d["name"], []),
            "enhancements": enh_by.get(d["name"], []),
        }
        for d in detachments
    ]

    return {
        "id":            data.get("id", ""),
        "name":          data.get("name", ""),
        "is_subfaction": data.get("is_subfaction", False),
        "parent_name":   data.get("parent_name"),
        "updated":       data.get("updated", ""),
        "army_rules":    army_rules(data.get("rules", {})),
        "detachments":   det_list,
    }


def main():
    print("[gdc] Fetching core stratagems...")
    core = fetch(f"{BASE_URL}/core.json")
    core_strats = [slim_strat(s) for s in core.get("stratagems", [])]
    print(f"[gdc] Core: {len(core_strats)} universal stratagems")

    print("[gdc] Fetching file list from GitHub API...")
    files = fetch(API_URL)
    faction_files = sorted(
        f["name"] for f in files
        if f["name"].endswith(".json") and f["name"] not in SKIP and f["name"] != "core.json"
    )
    print(f"[gdc] {len(faction_files)} faction files to process")

    factions = []
    for fname in faction_files:
        try:
            data    = fetch(f"{BASE_URL}/{fname}")
            faction = process(data)
            n_det   = len(faction["detachments"])
            n_str   = sum(len(d["stratagems"]) for d in faction["detachments"])
            n_enh   = sum(len(d["enhancements"]) for d in faction["detachments"])
            tag     = "[sub]" if faction["is_subfaction"] else "     "
            print(f"  {tag} {faction['name']:35} {n_det:2} det  {n_str:3} strats  {n_enh:3} enhs")
            factions.append(faction)
        except Exception as exc:
            print(f"  ERROR {fname}: {exc}")
        time.sleep(0.1)

    factions.sort(key=lambda f: (f["is_subfaction"], f["name"].lower()))

    output = {
        "fetched_at":      datetime.now(timezone.utc).isoformat(),
        "source_url":      "https://github.com/game-datacards/datasources",
        "core_stratagems": core_strats,
        "factions":        factions,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUT.stat().st_size / 1024
    print(f"[gdc] Wrote {OUT.name} ({size_kb:.0f} KB, {len(factions)} factions)")


if __name__ == "__main__":
    main()
