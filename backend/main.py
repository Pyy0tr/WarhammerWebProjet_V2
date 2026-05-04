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
    # Retry create_all jusqu'à 5 fois — RDS peut mettre quelques secondes à accepter des connexions
    for attempt in range(1, 6):
        try:
            Base.metadata.create_all(bind=engine)
            with engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS email_verified      BOOLEAN DEFAULT FALSE NOT NULL,
                    ADD COLUMN IF NOT EXISTS verification_token  VARCHAR,
                    ADD COLUMN IF NOT EXISTS reset_token         VARCHAR,
                    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ
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
