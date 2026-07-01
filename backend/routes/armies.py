from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any
from datetime import datetime
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/armies", tags=["armies"])


class ArmyOut(BaseModel):
    id: str
    name: str
    units: list[Any]
    edition: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_model(cls, a: models.Army):
        return cls(
            id=str(a.id),
            name=a.name,
            units=a.units or [],
            edition=a.edition,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )


class ArmyCreate(BaseModel):
    name: str = "New Army"
    edition: str = "v10"


class ArmyUpdate(BaseModel):
    name: str | None = None
    units: list[Any] | None = None
    # edition is intentionally absent — fixed for the lifetime of the army


@router.get("", response_model=list[ArmyOut])
def list_armies(edition: str | None = None, user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.Army).filter(models.Army.user_id == user.id)
    if edition:
        query = query.filter(models.Army.edition == edition)
    armies = query.order_by(models.Army.created_at.desc()).all()
    return [ArmyOut.from_orm_model(a) for a in armies]


@router.post("", response_model=ArmyOut, status_code=status.HTTP_201_CREATED)
def create_army(body: ArmyCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    army = models.Army(name=body.name, units=[], edition=body.edition, user_id=user.id)
    db.add(army)
    db.commit()
    db.refresh(army)
    return ArmyOut.from_orm_model(army)


@router.put("/{army_id}", response_model=ArmyOut)
def update_army(army_id: str, body: ArmyUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    army = db.query(models.Army).filter(models.Army.id == army_id, models.Army.user_id == user.id).first()
    if not army:
        raise HTTPException(status_code=404, detail="Armée introuvable")

    if body.name is not None:
        army.name = body.name
    if body.units is not None:
        army.units = body.units

    db.commit()
    db.refresh(army)
    return ArmyOut.from_orm_model(army)


@router.delete("/{army_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_army(army_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    army = db.query(models.Army).filter(models.Army.id == army_id, models.Army.user_id == user.id).first()
    if not army:
        raise HTTPException(status_code=404, detail="Armée introuvable")
    db.delete(army)
    db.commit()
