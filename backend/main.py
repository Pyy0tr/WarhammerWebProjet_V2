import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from rate_limiter import limiter
from sqlalchemy import text
from dotenv import load_dotenv
from database import Base, engine
from routes import auth, armies, feedback

load_dotenv()

logger = logging.getLogger("uvicorn.error")



@asynccontextmanager
async def lifespan(_app: FastAPI):
    for attempt in range(1, 6):
        try:
            Base.metadata.create_all(bind=engine)
            with engine.connect() as conn:
                # Migrate to username-based auth
                conn.execute(text("""
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR;
                    UPDATE users SET username = 'user_' || substr(id::text, 1, 8) WHERE username IS NULL;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR UNIQUE;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
                    ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
                    ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
                """))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS feedback (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        type VARCHAR(20) NOT NULL,
                        message TEXT NOT NULL,
                        email VARCHAR,
                        username VARCHAR,
                        is_read BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """))
                conn.commit()
            logger.info("Database tables ready")
            break
        except Exception as exc:
            if attempt == 5:
                raise RuntimeError(f"Cannot reach database after 5 attempts: {exc}") from exc
            logger.warning("DB not ready (attempt %d/5), retrying in 5s…", attempt)
            time.sleep(5)
    yield


app = FastAPI(title="ProbHammer API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(armies.router)
app.include_router(feedback.router)


@app.get("/health")
def health():
    return {"status": "ok"}
