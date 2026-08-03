from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from .database import get_session
from .models import Creator, Match
from .schemas import CreatorIn, CreatorUpdate

router = APIRouter(prefix="/api/creators", tags=["creators"])


@router.get("", response_model=List[Creator])
def list_creators(
    search: Optional[str] = Query(default=None),
    niche: Optional[str] = Query(default=None),
    platform: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    creators = session.exec(select(Creator)).all()
    if search:
        q = search.lower()
        creators = [
            c for c in creators
            if q in c.name.lower() or q in c.handle.lower() or q in c.bio.lower()
        ]
    if niche:
        creators = [c for c in creators if niche.lower() in [n.lower() for n in c.niches]]
    if platform:
        creators = [c for c in creators if platform.lower() in [p.lower() for p in c.platforms]]
    return creators


@router.post("", response_model=Creator, status_code=201)
def create_creator(payload: CreatorIn, session: Session = Depends(get_session)):
    creator = Creator(**payload.model_dump())
    session.add(creator)
    session.commit()
    session.refresh(creator)
    return creator


@router.get("/{creator_id}", response_model=Creator)
def get_creator(creator_id: int, session: Session = Depends(get_session)):
    creator = session.get(Creator, creator_id)
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    return creator


@router.patch("/{creator_id}", response_model=Creator)
def update_creator(creator_id: int, payload: CreatorUpdate, session: Session = Depends(get_session)):
    creator = session.get(Creator, creator_id)
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(creator, key, value)
    session.add(creator)
    session.commit()
    session.refresh(creator)
    return creator


@router.delete("/{creator_id}", status_code=204)
def delete_creator(creator_id: int, session: Session = Depends(get_session)):
    creator = session.get(Creator, creator_id)
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    for match in session.exec(select(Match).where(Match.creator_id == creator_id)).all():
        session.delete(match)
    session.delete(creator)
    session.commit()
