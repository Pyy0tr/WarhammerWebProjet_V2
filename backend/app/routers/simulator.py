from fastapi import APIRouter
from engine.schemas import SimRequest, SimResult
from engine.simulation import simulate

router = APIRouter()


@router.post("/", response_model=SimResult)
def run_simulation(req: SimRequest) -> SimResult:
    return simulate(req)
