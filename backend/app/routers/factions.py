from fastapi import APIRouter
from app import data_loader as db

router = APIRouter()


@router.get("/")
def list_factions():
    return db.FACTIONS


@router.get("/{faction_name}/units")
def units_for_faction(faction_name: str):
    unit_ids = db.FACTION_UNITS.get(faction_name, [])
    units = [db.UNITS_BY_ID[uid] for uid in unit_ids if uid in db.UNITS_BY_ID]
    return units
