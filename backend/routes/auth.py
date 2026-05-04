import secrets
from datetime import timedelta, timezone, datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
import models
import auth as auth_utils
import email_utils

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class EmailRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class MessageResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already in use")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (8 characters min)")

    token = secrets.token_urlsafe(32)
    user  = models.User(
        email              = body.email,
        hashed_pw          = auth_utils.hash_password(body.password),
        email_verified     = False,
        verification_token = token,
    )
    db.add(user)
    db.commit()

    bg.add_task(email_utils.send_verification_email, body.email, token)
    return MessageResponse(message="Check your email to verify your account")


@router.post("/login", response_model=AuthResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not auth_utils.verify_password(form.password, user.hashed_pw):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")

    token = auth_utils.create_access_token(str(user.id), user.email)
    return AuthResponse(access_token=token, user_id=str(user.id), email=user.email)


@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user.email_verified     = True
    user.verification_token = None
    db.commit()
    return MessageResponse(message="Email verified — you can now sign in")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(body: EmailRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    # Return the same message whether user exists or not (no enumeration)
    if user and not user.email_verified:
        token                  = secrets.token_urlsafe(32)
        user.verification_token = token
        db.commit()
        bg.add_task(email_utils.send_verification_email, user.email, token)
    return MessageResponse(message="If an unverified account exists, a new email has been sent")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: EmailRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if user and user.email_verified:
        token                     = secrets.token_urlsafe(32)
        user.reset_token          = token
        user.reset_token_expires  = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        bg.add_task(email_utils.send_reset_email, user.email, token)
    return MessageResponse(message="If an account exists for this email, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == body.token).first()
    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (8 characters min)")

    user.hashed_pw           = auth_utils.hash_password(body.password)
    user.reset_token         = None
    user.reset_token_expires = None
    db.commit()
    return MessageResponse(message="Password updated — you can now sign in")
