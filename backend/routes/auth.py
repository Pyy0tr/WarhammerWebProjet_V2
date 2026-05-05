import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
import auth as auth_utils
from email_utils import send_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if len(body.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if db.query(models.User).filter(models.User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (8 characters min)")
    if body.email:
        if db.query(models.User).filter(models.User.email == body.email).first():
            raise HTTPException(status_code=400, detail="Email already used")

    user = models.User(
        username  = body.username,
        hashed_pw = auth_utils.hash_password(body.password),
        email     = body.email or None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_utils.create_access_token(str(user.id), user.username)
    return AuthResponse(access_token=token, user_id=str(user.id), username=user.username)


@router.post("/login", response_model=AuthResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form.username).first()
    if not user or not auth_utils.verify_password(form.password, user.hashed_pw):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = auth_utils.create_access_token(str(user.id), user.username)
    return AuthResponse(access_token=token, user_id=str(user.id), username=user.username)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    # Toujours renvoyer 200 pour ne pas révéler si l'email existe
    if not user:
        return {"message": "Si cet email existe, un lien a été envoyé."}

    token = secrets.token_urlsafe(32)
    user.reset_token         = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    try:
        send_reset_email(user.email, token)
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")

    return {"message": "Si cet email existe, un lien a été envoyé."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == body.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token invalide")
    if user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expiré")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (8 characters min)")

    user.hashed_pw           = auth_utils.hash_password(body.new_password)
    user.reset_token         = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Mot de passe mis à jour avec succès"}
