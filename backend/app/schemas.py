from typing import Dict, List, Optional

from pydantic import BaseModel


class CreatorIn(BaseModel):
    name: str
    handle: str
    bio: str = ""
    platforms: List[str] = []
    niches: List[str] = []
    languages: List[str] = []
    country: str = ""
    city: str = ""
    followers: int = 0
    engagement_rate: float = 0.0
    avg_views: int = 0
    rate_per_post: float = 0.0
    audience_age_min: int = 18
    audience_age_max: int = 44
    audience_top_geos: List[str] = []
    verified: bool = False


class CreatorUpdate(BaseModel):
    name: Optional[str] = None
    handle: Optional[str] = None
    bio: Optional[str] = None
    platforms: Optional[List[str]] = None
    niches: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    country: Optional[str] = None
    city: Optional[str] = None
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    avg_views: Optional[int] = None
    rate_per_post: Optional[float] = None
    audience_age_min: Optional[int] = None
    audience_age_max: Optional[int] = None
    audience_top_geos: Optional[List[str]] = None
    verified: Optional[bool] = None


class CampaignIn(BaseModel):
    name: str
    brand: str = ""
    description: str = ""
    objective: str = ""
    call_to_action: str = ""
    status: str = "draft"
    niches: List[str] = []
    channels: List[str] = []
    target_geos: List[str] = []
    languages: List[str] = []
    target_age_min: int = 18
    target_age_max: int = 44
    budget_total: float = 0.0
    budget_per_creator: float = 0.0
    min_followers: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    call_to_action: Optional[str] = None
    status: Optional[str] = None
    niches: Optional[List[str]] = None
    channels: Optional[List[str]] = None
    target_geos: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    budget_total: Optional[float] = None
    budget_per_creator: Optional[float] = None
    min_followers: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class MatchStatusUpdate(BaseModel):
    status: str  # suggested | shortlisted | invited | accepted | declined


class MatchOut(BaseModel):
    creator_id: int
    creator_name: str
    creator_handle: str
    platforms: List[str]
    niches: List[str]
    followers: int
    engagement_rate: float
    rate_per_post: float
    country: str
    score: float
    breakdown: Dict[str, float]
    reasons: List[str]
    status: str = "suggested"
