from fastapi import APIRouter, HTTPException, Query
from app import data_loader as db

router = APIRouter()


@router.get("/")
def list_weapons(
    type: str | None = Query(None, description="Ranged | Melee"),
    search: str | None = Query(None),
):
    weapons = db.WEAPONS
    if type:
        weapons = [w for w in weapons if w.get("type") == type]
    if search:
        q = search.lower()
        weapons = [w for w in weapons if q in w["name"].lower()]
    return weapons


@router.get("/{weapon_id}")
def get_weapon(weapon_id: str):
    weapon = db.WEAPONS_BY_ID.get(weapon_id)
    if not weapon:
        raise HTTPException(status_code=404, detail="Arme introuvable")
    return weapon
