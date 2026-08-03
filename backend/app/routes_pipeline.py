from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .database import get_session
from .models import Brand, BrandDataset, PipelineRun
from .pipeline import AGENT_SEQUENCE, DEFAULT_MODELS, LLMConfig, server_keys, start_run

MAX_STORED_ROWS = 300

router = APIRouter(prefix="/api", tags=["pipeline"])


class BrandIn(BaseModel):
    name: str
    emoji: str = "✨"
    description: str = ""
    tone: str = ""
    audience: str = ""
    key_message: str = ""
    georgian_tagline: str = ""
    visual_style: str = ""
    color_palette: str = ""


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    description: Optional[str] = None
    tone: Optional[str] = None
    audience: Optional[str] = None
    key_message: Optional[str] = None
    georgian_tagline: Optional[str] = None
    visual_style: Optional[str] = None
    color_palette: Optional[str] = None


class RunIn(BaseModel):
    brand_id: int
    brief: str
    platform: str = "Instagram Feed"
    objective: str = "Brand Awareness"
    suggested_messengers: List[dict] = []
    provider: str = "anthropic"  # anthropic | openai | local
    model: str = ""
    base_url: Optional[str] = None  # local provider only
    # BYOK: used for this run only, kept in memory, never persisted or logged.
    api_key: Optional[str] = None


class DecisionIn(BaseModel):
    decision: str  # approved | rejected


@router.get("/brands", response_model=List[Brand])
def list_brands(session: Session = Depends(get_session)):
    return session.exec(select(Brand)).all()


@router.post("/brands", response_model=Brand, status_code=201)
def create_brand(payload: BrandIn, session: Session = Depends(get_session)):
    brand = Brand(**payload.model_dump())
    session.add(brand)
    session.commit()
    session.refresh(brand)
    return brand


@router.patch("/brands/{brand_id}", response_model=Brand)
def update_brand(brand_id: int, payload: BrandUpdate, session: Session = Depends(get_session)):
    brand = session.get(Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(brand, key, value)
    session.add(brand)
    session.commit()
    session.refresh(brand)
    return brand


class DatasetIn(BaseModel):
    source: str = "csv"
    filename: str = ""
    columns: List[str] = []
    rows: List[dict] = []


@router.get("/brands/{brand_id}/datasets", response_model=List[BrandDataset])
def list_datasets(brand_id: int, session: Session = Depends(get_session)):
    return session.exec(select(BrandDataset).where(BrandDataset.brand_id == brand_id)).all()


@router.post("/brands/{brand_id}/datasets", response_model=BrandDataset, status_code=201)
def upload_dataset(brand_id: int, payload: DatasetIn, session: Session = Depends(get_session)):
    if not session.get(Brand, brand_id):
        raise HTTPException(status_code=404, detail="Brand not found")
    if not payload.rows:
        raise HTTPException(status_code=422, detail="No rows in the uploaded file")
    dataset = BrandDataset(
        brand_id=brand_id,
        source=payload.source,
        filename=payload.filename,
        columns=payload.columns,
        rows=payload.rows[:MAX_STORED_ROWS],
        row_count=len(payload.rows),
    )
    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    return dataset


@router.delete("/brands/{brand_id}/datasets/{dataset_id}", status_code=204)
def delete_dataset(brand_id: int, dataset_id: int, session: Session = Depends(get_session)):
    dataset = session.get(BrandDataset, dataset_id)
    if not dataset or dataset.brand_id != brand_id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    session.delete(dataset)
    session.commit()


class InstagramConnectIn(BaseModel):
    # Apify token is used for this request only — never stored.
    apify_token: str
    handle: str
    results_limit: int = 30


@router.post("/brands/{brand_id}/connect/instagram", response_model=BrandDataset, status_code=201)
def connect_instagram(brand_id: int, payload: InstagramConnectIn, session: Session = Depends(get_session)):
    """Pull recent posts for an IG account via Apify's Instagram Scraper and store as a dataset."""
    if not session.get(Brand, brand_id):
        raise HTTPException(status_code=404, detail="Brand not found")
    handle = payload.handle.strip().lstrip("@")
    if not handle:
        raise HTTPException(status_code=422, detail="Instagram handle is required")

    run_input = {
        "directUrls": [f"https://www.instagram.com/{handle}/"],
        "resultsType": "posts",
        "resultsLimit": max(1, min(payload.results_limit, 100)),
    }
    try:
        resp = httpx.post(
            "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items",
            params={"token": payload.apify_token.strip()},
            json=run_input,
            timeout=300,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Apify request failed: {exc}")
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Apify error {resp.status_code}: {resp.text[:200]}")

    items = resp.json()
    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=502, detail="Apify returned no posts for that handle.")

    columns = ["type", "caption", "likes", "comments", "video_views", "timestamp", "url"]
    rows = [
        {
            "type": item.get("type", ""),
            "caption": (item.get("caption") or "")[:200],
            "likes": item.get("likesCount", ""),
            "comments": item.get("commentsCount", ""),
            "video_views": item.get("videoViewCount", ""),
            "timestamp": item.get("timestamp", ""),
            "url": item.get("url", ""),
        }
        for item in items
    ]
    dataset = BrandDataset(
        brand_id=brand_id,
        source="instagram",
        filename=f"@{handle} (Apify)",
        columns=columns,
        rows=rows[:MAX_STORED_ROWS],
        row_count=len(rows),
    )
    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    return dataset


@router.get("/pipeline/config")
def pipeline_config():
    return {
        "agents": AGENT_SEQUENCE,
        "server_keys": server_keys(),
        "default_models": DEFAULT_MODELS,
    }


@router.get("/pipeline/runs", response_model=List[PipelineRun])
def list_runs(brand_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(PipelineRun)
    if brand_id is not None:
        query = query.where(PipelineRun.brand_id == brand_id)
    runs = session.exec(query).all()
    return sorted(runs, key=lambda r: r.id or 0, reverse=True)


@router.post("/pipeline/runs", response_model=PipelineRun, status_code=201)
def create_run(payload: RunIn, session: Session = Depends(get_session)):
    provider = payload.provider
    if provider not in ("anthropic", "openai", "local"):
        raise HTTPException(status_code=422, detail="Provider must be anthropic, openai, or local")
    user_key = (payload.api_key or "").strip()
    keys = server_keys()
    if provider == "anthropic" and user_key and not user_key.startswith("sk-ant"):
        raise HTTPException(status_code=422, detail="Anthropic keys start with sk-ant-...")
    if provider in ("anthropic", "openai") and not user_key and not keys[provider]:
        raise HTTPException(
            status_code=503,
            detail=f"No {provider} API key available. Paste yours in the Studio, "
            f"or set it as an environment variable on the server.",
        )
    if provider == "local" and not (payload.base_url or "").strip():
        raise HTTPException(status_code=422, detail="Local provider needs a base URL (e.g. http://127.0.0.1:1234/v1)")
    if not session.get(Brand, payload.brand_id):
        raise HTTPException(status_code=404, detail="Brand not found")
    if not payload.brief.strip():
        raise HTTPException(status_code=422, detail="Brief is required")

    model = payload.model.strip() or DEFAULT_MODELS[provider]
    run = PipelineRun(
        **payload.model_dump(exclude={"api_key", "base_url", "model"}),
        model=model,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    cfg = LLMConfig(
        provider=provider,
        model=model,
        api_key=user_key or None,
        base_url=(payload.base_url or "").strip() or None,
    )
    start_run(run.id, cfg)
    return run


@router.get("/pipeline/runs/{run_id}", response_model=PipelineRun)
def get_run(run_id: int, session: Session = Depends(get_session)):
    run = session.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("/pipeline/runs/{run_id}/decision", response_model=PipelineRun)
def decide_run(run_id: int, payload: DecisionIn, session: Session = Depends(get_session)):
    if payload.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Decision must be 'approved' or 'rejected'")
    run = session.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail=f"Run is {run.status}, not awaiting approval")
    run.status = payload.decision
    session.add(run)
    session.commit()
    session.refresh(run)
    return run
