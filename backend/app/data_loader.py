"""
data_loader.py — Charge les JSON BSData en mémoire au démarrage de l'API.

Les données (~15 MB) sont lues une seule fois depuis data/cache/
et stockées dans des variables globales accessibles par tous les routers.
"""

import json
from pathlib import Path

UNITS: list[dict] = []
WEAPONS: list[dict] = []
FACTIONS: list[str] = []
FACTION_UNITS: dict[str, list[str]] = {}
RULES: list[dict] = []

# Index rapide par bsdata_id
UNITS_BY_ID: dict[str, dict] = {}
WEAPONS_BY_ID: dict[str, dict] = {}

CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "cache"


def load_all():
    global UNITS, WEAPONS, FACTIONS, FACTION_UNITS, RULES
    global UNITS_BY_ID, WEAPONS_BY_ID

    UNITS        = _load("units.json")
    WEAPONS      = _load("weapons.json")
    FACTIONS     = _load("factions.json")
    FACTION_UNITS = _load("faction_units.json")
    RULES        = _load("rules.json")

    UNITS_BY_ID   = {u["bsdata_id"]: u for u in UNITS}
    WEAPONS_BY_ID = {w["bsdata_id"]: w for w in WEAPONS if w.get("bsdata_id")}

    print(f"[data_loader] {len(UNITS)} unités | {len(WEAPONS)} armes | {len(FACTIONS)} factions")


def _load(filename: str) -> list | dict:
    path = CACHE_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"{path} introuvable — lance d'abord : python pipeline/parse_bsdata.py"
        )
    return json.loads(path.read_text(encoding="utf-8"))
