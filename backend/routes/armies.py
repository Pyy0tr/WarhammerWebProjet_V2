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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_model(cls, a: models.Army):
        return cls(
            id=str(a.id),
            name=a.name,
            units=a.units or [],
            created_at=a.created_at,
            updated_at=a.updated_at,
        )


class ArmyCreate(BaseModel):
    name: str = "New Army"


class ArmyUpdate(BaseModel):
    name: str | None = None
    units: list[Any] | None = None


@router.get("", response_model=list[ArmyOut])
def list_armies(user=Depends(get_current_user), db: Session = Depends(get_db)):
    armies = db.query(models.Army).filter(models.Army.user_id == user.id).order_by(models.Army.created_at.desc()).all()
    return [ArmyOut.from_orm_model(a) for a in armies]


@router.post("", response_model=ArmyOut, status_code=status.HTTP_201_CREATED)
def create_army(body: ArmyCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    army = models.Army(name=body.name, units=[], user_id=user.id)
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
