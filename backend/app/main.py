import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, func, select

from .database import engine, get_session, init_db
from .models import Campaign, Creator, Match
from .routes_campaigns import router as campaigns_router
from .routes_creators import router as creators_router
from .routes_pipeline import router as pipeline_router
from .seed import seed_if_empty

app = FastAPI(title="CreatorMatch API", version="1.0.0")

# Comma-separated list of allowed origins, e.g. "https://creatormatch.vercel.app"
_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed_origins = [o.strip() for o in _origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(creators_router)
app.include_router(campaigns_router)
app.include_router(pipeline_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with Session(engine) as session:
        seed_if_empty(session)


@app.get("/")
def root():
    return {"service": "CreatorMatch API", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def stats(s: Session = Depends(get_session)):
    creators = s.exec(select(func.count()).select_from(Creator)).one()
    campaigns = s.exec(select(func.count()).select_from(Campaign)).one()
    active = s.exec(
        select(func.count()).select_from(Campaign).where(Campaign.status == "active")
    ).one()
    shortlisted = s.exec(
        select(func.count()).select_from(Match).where(Match.status != "suggested")
    ).one()
    return {
        "creators": creators,
        "campaigns": campaigns,
        "active_campaigns": active,
        "shortlisted": shortlisted,
    }
