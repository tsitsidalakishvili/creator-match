from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Creator(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    handle: str = Field(index=True)
    bio: str = ""
    platforms: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    niches: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    languages: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    country: str = ""
    city: str = ""
    followers: int = 0
    engagement_rate: float = 0.0  # percent, e.g. 4.2
    avg_views: int = 0
    rate_per_post: float = 0.0  # USD
    audience_age_min: int = 18
    audience_age_max: int = 44
    audience_top_geos: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    verified: bool = False
    created_at: datetime = Field(default_factory=utcnow)


class Campaign(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    brand: str = ""
    description: str = ""
    objective: str = ""
    call_to_action: str = ""
    status: str = "draft"  # draft | active | completed
    niches: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    channels: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    target_geos: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    languages: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    target_age_min: int = 18
    target_age_max: int = 44
    budget_total: float = 0.0
    budget_per_creator: float = 0.0
    min_followers: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)


class Brand(SQLModel, table=True):
    """Brand DNA profile — injected into every pipeline agent's prompt."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    emoji: str = "✨"
    description: str = ""
    tone: str = ""
    audience: str = ""
    key_message: str = ""
    georgian_tagline: str = ""
    visual_style: str = ""
    color_palette: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class BrandDataset(SQLModel, table=True):
    """Aggregated client data (e.g. FB/IG/LinkedIn page exports) uploaded as CSV.

    A sample of rows is injected into the strategy agent's context so campaigns
    are grounded in the client's real performance data.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    brand_id: int = Field(index=True, foreign_key="brand.id")
    source: str = "csv"  # facebook | instagram | linkedin | csv
    filename: str = ""
    columns: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    rows: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    row_count: int = 0
    created_at: datetime = Field(default_factory=utcnow)


class PipelineRun(SQLModel, table=True):
    """One execution of the marketing agent pipeline (strategy → copy → visual → audit)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    brand_id: int = Field(foreign_key="brand.id")
    brief: str
    platform: str = "Instagram Feed"
    objective: str = "Brand Awareness"
    provider: str = "anthropic"
    model: str = ""
    # running | awaiting_approval | approved | rejected | failed
    status: str = "running"
    suggested_messengers: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    outputs: dict = Field(default_factory=dict, sa_column=Column(JSON))
    logs: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    error: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class Match(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    campaign_id: int = Field(index=True, foreign_key="campaign.id")
    creator_id: int = Field(index=True, foreign_key="creator.id")
    score: float = 0.0
    breakdown: dict = Field(default_factory=dict, sa_column=Column(JSON))
    reasons: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = "suggested"  # suggested | shortlisted | invited | accepted | declined
    created_at: datetime = Field(default_factory=utcnow)
