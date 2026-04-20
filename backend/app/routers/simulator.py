from fastapi import APIRouter
from pydantic import BaseModel
from app.engine.simulation import simulate

router = APIRouter()


class SimRequest(BaseModel):
    attacker_weapon_id: str
    attacker_bs_ws: str          # ex: "3+"
    defender_toughness: int
    defender_save: str           # ex: "3+"
    defender_invuln: str | None  # ex: "4+" ou None
    defender_wounds: int
    n_simulations: int = 1000


@router.post("/")
def run_simulation(req: SimRequest):
    result = simulate(req.model_dump())
    return result
