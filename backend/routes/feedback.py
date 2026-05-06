from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from rate_limiter import limiter
from auth import get_current_user
import models

ADMIN_USERNAME = "Pyy0tr"

router = APIRouter(prefix="/feedback", tags=["feedback"])


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
):
    if body.type not in ("bug", "suggestion", "other"):
        raise HTTPException(status_code=400, detail="Type invalide")
    if not body.message or len(body.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Message trop court (10 caractères min)")
    if len(body.message) > 2000:
        raise HTTPException(status_code=400, detail="Message trop long (2000 caractères max)")

    # Identify sender: prefer logged-in user if token present
    sender_username = None
    sender_email    = body.email
    token = request.headers.get("Authorization", "")
    if token.startswith("Bearer "):
        try:
            from auth import get_current_user as _gcu
            from database import get_db as _gdb
            from jose import jwt
            import os
            payload = jwt.decode(token[7:], os.environ["JWT_SECRET_KEY"], algorithms=["HS256"])
            sender_username = payload.get("username")
        except Exception:
            pass

    fb = models.Feedback(
        type     = body.type,
        message  = body.message.strip(),
        email    = sender_email,
        username = sender_username,
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
