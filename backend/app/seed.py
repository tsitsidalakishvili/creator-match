"""Seed the creator table from the real roster (roster_seed.json).

The JSON is exported from frontend/src/talentMatchData.js so the backend
Creators data and the frontend Roster are the same people. No demo
campaigns are seeded — campaigns are created by the user.
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from .models import Brand, Creator

ROSTER_FILE = Path(__file__).parent / "roster_seed.json"

# Client Brand DNA profiles (from the easy-ai demo) — every pipeline agent
# reads the selected brand's DNA at runtime.
BRANDS = [
    dict(name="Remember", emoji="🎁", description="Gifts & Lifestyle",
         tone="warm, generous, celebratory, Georgian pride",
         audience="Georgian families & gift-givers, 25–50",
         key_message="Perfect gifts for every occasion",
         georgian_tagline="სრულყოფილი საჩუქარი ყველა შემთხვევისთვის",
         visual_style="warm lighting, gift wrapping, celebrations",
         color_palette="gold, white, deep red"),
    dict(name="Funky Buddha", emoji="🧘", description="Activewear & Wellness",
         tone="energetic, inclusive, motivating, body-positive",
         audience="Active Georgians 20–40",
         key_message="Move more, feel better, live fully",
         georgian_tagline="მოძრაობა. ენერგია. თავისუფლება.",
         visual_style="dynamic movement, outdoor energy",
         color_palette="electric blue, orange, white"),
    dict(name="American Vintage", emoji="👗", description="Casual Luxury Fashion",
         tone="effortlessly cool, minimal, understated luxury",
         audience="Fashion-forward Tbilisi 25–45",
         key_message="Effortless style, quality fabrics",
         georgian_tagline="უძალისხმევო სტილი. უმაღლესი ხარისხი.",
         visual_style="clean editorial, natural light, minimal",
         color_palette="neutral palette, off-white, earth tones"),
    dict(name="Captain Candy", emoji="🍬", description="Candy & Confectionery",
         tone="playful, joyful, colorful, family-friendly",
         audience="Families, tourists, sweet lovers",
         key_message="Joy in every piece, colour your day",
         georgian_tagline="სიხარული ყოველ ნამცხვარში",
         visual_style="bright colors, candy textures, playful",
         color_palette="rainbow palette, bright primary colors"),
    dict(name="Harmont & Blaine", emoji="🐶", description="Italian Premium Menswear",
         tone="sophisticated, Italian elegance, understated premium",
         audience="Affluent Georgian men 30–55",
         key_message="Italian craftsmanship, timeless elegance",
         georgian_tagline="იტალიური ხელოსნობა. დაუვიწყარი სტილი.",
         visual_style="refined photography, luxury details",
         color_palette="navy, white, camel"),
]


def seed_if_empty(session: Session) -> None:
    if not session.exec(select(Brand).limit(1)).first():
        for data in BRANDS:
            session.add(Brand(**data))
        session.commit()
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
