from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .database import get_session
from .models import Brand, BrandDataset, PipelineRun
from .pipeline import AGENT_SEQUENCE, api_key_configured, start_run

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


@router.get("/pipeline/config")
def pipeline_config():
    return {"agents": AGENT_SEQUENCE, "api_key_configured": api_key_configured()}


@router.get("/pipeline/runs", response_model=List[PipelineRun])
def list_runs(session: Session = Depends(get_session)):
    runs = session.exec(select(PipelineRun)).all()
    return sorted(runs, key=lambda r: r.id or 0, reverse=True)


@router.post("/pipeline/runs", response_model=PipelineRun, status_code=201)
def create_run(payload: RunIn, session: Session = Depends(get_session)):
    if not api_key_configured():
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured on the server. "
            "Set it in the Render dashboard to enable the AI pipeline.",
        )
    if not session.get(Brand, payload.brand_id):
        raise HTTPException(status_code=404, detail="Brand not found")
    if not payload.brief.strip():
        raise HTTPException(status_code=422, detail="Brief is required")

    run = PipelineRun(**payload.model_dump())
    session.add(run)
    session.commit()
    session.refresh(run)
    start_run(run.id)
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
