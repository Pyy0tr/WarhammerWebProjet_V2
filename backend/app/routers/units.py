from fastapi import APIRouter, HTTPException, Query
from app import data_loader as db

router = APIRouter()


@router.get("/")
def list_units(
    faction: str | None = Query(None),
    search:  str | None = Query(None),
    legends: bool | None = Query(None),
):
    units = db.UNITS
    if faction:
        units = [u for u in units if u["faction"] == faction or faction in u.get("playable_in", [])]
    if search:
        q = search.lower()
        units = [u for u in units if q in u["name"].lower()]
    if legends is not None:
        units = [u for u in units if u["is_legends"] == legends]
    return units


@router.get("/{unit_id}")
def get_unit(unit_id: str):
    unit = db.UNITS_BY_ID.get(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unité introuvable")
    return unit
