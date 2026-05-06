import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username            = Column(String, unique=True, nullable=False, index=True)
    hashed_pw           = Column(String, nullable=False)
    email               = Column(String, unique=True, nullable=True, index=True)
    reset_token         = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at          = Column(DateTime(timezone=True), default=utcnow)

    armies = relationship("Army", back_populates="owner", cascade="all, delete-orphan")


class Army(Base):
    __tablename__ = "armies"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String, nullable=False)
    units      = Column(JSONB, default=list)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="armies")


class Feedback(Base):
    __tablename__ = "feedback"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type       = Column(String(20), nullable=False)   # bug | suggestion | other
    message    = Column(Text, nullable=False)
    email      = Column(String, nullable=True)
    username   = Column(String, nullable=True)
    is_read    = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
