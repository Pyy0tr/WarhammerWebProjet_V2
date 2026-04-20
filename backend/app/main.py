"""
main.py — Point d'entrée FastAPI
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.data_loader import load_all
from app.routers import factions, units, weapons, simulator

app = FastAPI(
    title="WH40K Probability API",
    description="API de calcul de probabilités Warhammer 40K V10",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    load_all()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(factions.router, prefix="/factions", tags=["factions"])
app.include_router(units.router,    prefix="/units",    tags=["units"])
app.include_router(weapons.router,  prefix="/weapons",  tags=["weapons"])
app.include_router(simulator.router, prefix="/simulate", tags=["simulator"])
