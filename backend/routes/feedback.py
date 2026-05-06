import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
from database import get_db
from rate_limiter import limiter
from auth import get_current_user
import models

ADMIN_USERNAME = "admin"

router = APIRouter(prefix="/feedback", tags=["feedback"])

optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _username_from_token(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET_KEY"], algorithms=["HS256"])
        return payload.get("username")
    except JWTError:
        return None


class FeedbackRequest(BaseModel):
    type:    str
    message: str
    email:   Optional[str] = None


class FeedbackResponse(BaseModel):
    id:         str
    type:       str
    message:    str
    email:      Optional[str]
    username:   Optional[str]
    is_read:    bool
    created_at: str

    class Config:
        from_attributes = True


def require_admin(current_user=Depends(get_current_user)):
    if current_user.username != ADMIN_USERNAME:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    return current_user


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/day")
def submit_feedback(
    request: Request,
    body: FeedbackRequest,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(optional_oauth2),
):
    if body.type not in ("bug", "suggestion", "other"):
        raise HTTPException(status_code=400, detail="Type invalide")
    if not body.message or len(body.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Message trop court (10 caractères min)")
    if len(body.message) > 2000:
        raise HTTPException(status_code=400, detail="Message trop long (2000 caractères max)")

    fb = models.Feedback(
        type     = body.type,
        message  = body.message.strip(),
        email    = body.email,
        username = _username_from_token(token),
    )
    db.add(fb)
    db.commit()

    return {"message": "Feedback reçu, merci !"}


@router.get("", response_model=list[FeedbackResponse])
def list_feedback(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    rows = db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).all()
    return [
        FeedbackResponse(
            id         = str(r.id),
            type       = r.type,
            message    = r.message,
            email      = r.email,
            username   = r.username,
            is_read    = r.is_read,
            created_at = r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.patch("/{feedback_id}/read", status_code=status.HTTP_200_OK)
def mark_read(
    feedback_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    fb = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback introuvable")
    fb.is_read = True
    db.commit()
    return {"ok": True}
