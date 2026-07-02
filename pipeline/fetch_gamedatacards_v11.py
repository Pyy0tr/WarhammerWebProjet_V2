"""
fetch_gamedatacards_v11.py
---------------------------
Fetches faction data from game-datacards/datasources (11th edition, GDC
format) — fork of fetch_gamedatacards.py for the V10 dataset.

Manual script for now (not wired into any CI workflow yet, same as the V10
version) — run once a good first result is confirmed, then it can be added
to sync_bsdata.yml like the BSData V11 fetch was.

Schema differences vs the V10 source, handled here:
  - Text fields (name, target, when, effect, restrictions, description) are
    locale-keyed objects ({"en": "...", "fr": "...", ...}) instead of plain
    strings — unwrapped via text() below, English only for now.
  - `is_subfaction` is gone (always null) — replaced by checking whether
    `parent_name` is set.
  - No 11th/gdc/core.json (404, confirmed) — the universal/core stratagems
    (Command Re-roll, Insane Bravery, etc.) are not published in this repo
    for V11 yet. core_stratagems ships as an empty list until they appear.
  - Text also carries inline HTML-ish markup (<k>, <b>, <i>, <u>, <ul><li>)
    on top of the **bold**/^^highlight^^ markdown BSData already uses.
    convert_markup() below folds it all into that one existing convention
    (frontend/src/components/AbilityText.jsx already renders it — see
    V11_CHANGES.md) instead of inventing a second rendering path.

Output: frontend/public/data/gdc_v11.json
"""

import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT     = Path(__file__).resolve().parents[1]
OUT      = ROOT / "frontend" / "public" / "data" / "gdc_v11.json"
BASE_URL = "https://raw.githubusercontent.com/game-datacards/datasources/main/11th/gdc"
API_URL  = "https://api.github.com/repos/game-datacards/datasources/contents/11th/gdc"

# Non-faction files sitting alongside the faction files at this path.
# (core/, combatpatrol/, layouts/, missions/ are directories — excluded
# automatically since we only process type == "file" entries.)
SKIP = {"keywords.json", "faqs.json", "titan.json"}  # titan.json has no stratagem data (checked: all empty)


def fetch(url: str) -> dict | list:
    req = urllib.request.Request(
        url, headers={"User-Agent": "ProbHammer/1.0", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def convert_markup(s: str) -> str:
    """
    Fold this source's HTML-ish markup into the **bold**/^^highlight^^/■
    convention BSData text already uses (and AbilityText.jsx already knows
    how to render) — one rendering path for both data sources instead of two.

    Order matters: inline tags first, so a <b>/<k> nested inside a <li>
    is already converted by the time the list is unwrapped into bullets.
    """
    if not s:
        return s

    s = re.sub(r"<k>(.*?)</k>", r"^^\1^^", s, flags=re.DOTALL)
    s = re.sub(r"<(?:b|i|u)>(.*?)</(?:b|i|u)>", r"**\1**", s, flags=re.DOTALL)

    def _list_to_bullets(m):
        items = re.findall(r"<li>(.*?)</li>", m.group(0), flags=re.DOTALL)
        return "\n" + "\n".join(f"■ {item.strip()}" for item in items)

    s = re.sub(r"<ul>.*?</ul>", _list_to_bullets, s, flags=re.DOTALL)

    # Safety net — never leak an unrecognised tag into the rendered text.
    s = re.sub(r"<[^>]+>", "", s)

    # Tidy up whitespace left behind by the list conversion.
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def text(field, default: str = "") -> str:
    """Unwrap a V11 GDC locale-object text field ({"en": "...", ...}); passes
    through plain strings unchanged for robustness against schema drift."""
    raw = field.get("en", default) if isinstance(field, dict) else (field or default)
    return convert_markup(raw)


def slim_strat(s: dict) -> dict:
    return {
        "name":         text(s.get("name")),
        "cost":         s.get("cost", 1),
        "type":         s.get("type", ""),
        "turn":         s.get("turn", ""),
        "phase":        s.get("phase", []),
        "when":         text(s.get("when")),
        "target":       text(s.get("target")),
        "effect":       text(s.get("effect")),
        "restrictions": text(s.get("restrictions")),
    }


def slim_enh(e: dict) -> dict:
    return {
        "name":        text(e.get("name")),
        "cost":        e.get("cost", ""),
        "description": text(e.get("description")),
        "keywords":    e.get("keywords", []),
        "excludes":    e.get("excludes", []),
    }


def army_rules(rules_obj) -> list[dict]:
    if not rules_obj or not isinstance(rules_obj, dict):
        return []
    out = []
    for group in rules_obj.get("army", []):
        name = text(group.get("name"))
        texts = [text(r.get("text")) for r in group.get("rules", [])]
        rule_text = "\n\n".join(t for t in texts if t)
        if name or rule_text:
            out.append({"name": name, "text": rule_text})
    return out


def process(data: dict) -> dict:
    detachments = data.get("detachments", [])
    strats_raw  = data.get("stratagems", [])
    enhs_raw    = data.get("enhancements", [])

    # Detachment names are locale objects here too — key stratagems/enhancements
    # by the unwrapped English name (matches s["detachment"], a plain string).
    det_names = [text(d.get("name")) for d in detachments]
    strat_by = {n: [] for n in det_names}
    enh_by   = {n: [] for n in det_names}

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
            "name":         n,
            "stratagems":   strat_by.get(n, []),
            "enhancements": enh_by.get(n, []),
        }
        for n in det_names
    ]

    parent_name = data.get("parent_name")

    return {
        "id":            data.get("id", ""),
        "name":          data.get("name", ""),
        "is_subfaction": bool(parent_name),
        "parent_name":   parent_name,
        "updated":       data.get("updated", ""),
        "army_rules":    army_rules(data.get("rules", {})),
        "detachments":   det_list,
    }


def main():
    print("[gdc-v11] No 11th/gdc/core.json in the source repo (checked, 404) —")
    print("[gdc-v11] universal/core stratagems are not published for V11 yet.")
    core_strats: list[dict] = []

    print("[gdc-v11] Fetching file list from GitHub API...")
    files = fetch(API_URL)
    faction_files = sorted(
        f["name"] for f in files
        if f["type"] == "file" and f["name"].endswith(".json") and f["name"] not in SKIP
    )
    print(f"[gdc-v11] {len(faction_files)} faction files to process")

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
        "edition":         "v11",
        "core_stratagems": core_strats,
        "factions":        factions,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUT.stat().st_size / 1024
    print(f"[gdc-v11] Wrote {OUT.name} ({size_kb:.0f} KB, {len(factions)} factions)")


if __name__ == "__main__":
    main()
