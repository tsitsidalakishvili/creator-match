from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .database import get_session
from .matching import rank_creators
from .models import Campaign, Creator, Match
from .schemas import CampaignIn, CampaignUpdate, MatchOut, MatchStatusUpdate

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

MATCH_STATUSES = {"suggested", "shortlisted", "invited", "accepted", "declined"}


@router.get("", response_model=List[Campaign])
def list_campaigns(
    status: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(Campaign)
    if status:
        query = query.where(Campaign.status == status)
    return session.exec(query).all()


@router.post("", response_model=Campaign, status_code=201)
def create_campaign(payload: CampaignIn, session: Session = Depends(get_session)):
    campaign = Campaign(**payload.model_dump())
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: int, session: Session = Depends(get_session)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.patch("/{campaign_id}", response_model=Campaign)
def update_campaign(campaign_id: int, payload: CampaignUpdate, session: Session = Depends(get_session)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: int, session: Session = Depends(get_session)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for match in session.exec(select(Match).where(Match.campaign_id == campaign_id)).all():
        session.delete(match)
    session.delete(campaign)
    session.commit()


@router.get("/{campaign_id}/matches", response_model=List[MatchOut])
def get_matches(campaign_id: int, session: Session = Depends(get_session)):
    """Rank all creators against the campaign brief, live.

    Persisted Match rows only store workflow status (shortlisted, invited...);
    scores are recomputed so brief edits are reflected immediately.
    """
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    creators = session.exec(select(Creator)).all()
    ranked = rank_creators(campaign, creators)

    saved = session.exec(select(Match).where(Match.campaign_id == campaign_id)).all()
    status_by_creator = {m.creator_id: m.status for m in saved}

    return [
        MatchOut(
            creator_id=item["creator"].id,
            creator_name=item["creator"].name,
            creator_handle=item["creator"].handle,
            platforms=item["creator"].platforms,
            niches=item["creator"].niches,
            followers=item["creator"].followers,
            engagement_rate=item["creator"].engagement_rate,
            rate_per_post=item["creator"].rate_per_post,
            country=item["creator"].country,
            score=item["score"],
            breakdown=item["breakdown"],
            reasons=item["reasons"],
            status=status_by_creator.get(item["creator"].id, "suggested"),
        )
        for item in ranked
    ]


@router.put("/{campaign_id}/matches/{creator_id}/status", response_model=Match)
def set_match_status(
    campaign_id: int,
    creator_id: int,
    payload: MatchStatusUpdate,
    session: Session = Depends(get_session),
):
    if payload.status not in MATCH_STATUSES:
        raise HTTPException(status_code=422, detail=f"Status must be one of {sorted(MATCH_STATUSES)}")
    campaign = session.get(Campaign, campaign_id)
    creator = session.get(Creator, creator_id)
    if not campaign or not creator:
        raise HTTPException(status_code=404, detail="Campaign or creator not found")

    match = session.exec(
        select(Match).where(Match.campaign_id == campaign_id, Match.creator_id == creator_id)
    ).first()
    if not match:
        from .matching import score_creator

        score, breakdown, reasons = score_creator(campaign, creator)
        match = Match(
            campaign_id=campaign_id,
            creator_id=creator_id,
            score=score,
            breakdown=breakdown,
            reasons=reasons,
        )
    match.status = payload.status
    session.add(match)
    session.commit()
    session.refresh(match)
    return match


@router.get("/{campaign_id}/shortlist", response_model=List[Match])
def get_shortlist(campaign_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Match).where(Match.campaign_id == campaign_id, Match.status != "suggested")
    ).all()
