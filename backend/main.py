import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from dotenv import load_dotenv
from database import Base, engine
from routes import auth, armies

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
                    ALTER TABLE users DROP COLUMN IF EXISTS email;
                    ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
                    ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
                    ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
                    ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires;
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


@app.get("/health")
def health():
    return {"status": "ok"}
