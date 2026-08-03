"""Seed the creator table from the real roster (roster_seed.json).

The JSON is exported from frontend/src/talentMatchData.js so the backend
Creators data and the frontend Roster are the same people. No demo
campaigns are seeded — campaigns are created by the user.
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from .models import Creator

ROSTER_FILE = Path(__file__).parent / "roster_seed.json"


def seed_if_empty(session: Session) -> None:
    if session.exec(select(Creator).limit(1)).first():
        return
    if not ROSTER_FILE.exists():
        return
    roster = json.loads(ROSTER_FILE.read_text(encoding="utf-8"))
    for entry in roster:
        session.add(
            Creator(
                name=entry["name"],
                handle=entry["handle"],
                bio="",
                platforms=entry["platforms"],
                niches=entry["niches"],
                languages=entry["languages"],
                country=entry["country"],
                city="",
                followers=entry["followers"],
                engagement_rate=entry["engagement_rate"],
                avg_views=entry["avg_views"],
                rate_per_post=0.0,
                audience_age_min=18,
                audience_age_max=44,
                audience_top_geos=entry["audience_top_geos"],
                verified=False,
            )
        )
    session.commit()
