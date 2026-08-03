"""Seed demo data so the app works immediately after deploy."""

from sqlmodel import Session, select

from .models import Campaign, Creator

CREATORS = [
    dict(
        name="Nino Beridze", handle="@nino.creates", bio="Lifestyle & sustainable living content from Tbilisi.",
        platforms=["instagram", "tiktok"], niches=["lifestyle", "sustainability", "travel"],
        languages=["ka", "en"], country="Georgia", city="Tbilisi",
        followers=182000, engagement_rate=5.1, avg_views=64000, rate_per_post=850,
        audience_age_min=18, audience_age_max=34, audience_top_geos=["Georgia", "Armenia", "Turkey"], verified=True,
    ),
    dict(
        name="Luka Kapanadze", handle="@luka.tech", bio="Tech reviews, gadgets and app walkthroughs.",
        platforms=["youtube", "instagram"], niches=["tech", "gaming", "education"],
        languages=["ka", "en"], country="Georgia", city="Batumi",
        followers=95000, engagement_rate=3.8, avg_views=41000, rate_per_post=600,
        audience_age_min=18, audience_age_max=29, audience_top_geos=["Georgia", "Ukraine"], verified=False,
    ),
    dict(
        name="Emma Sørensen", handle="@emmarunning", bio="Marathon training, healthy recipes and running gear.",
        platforms=["instagram", "youtube"], niches=["fitness", "health", "food"],
        languages=["en", "da"], country="Denmark", city="Copenhagen",
        followers=310000, engagement_rate=4.6, avg_views=88000, rate_per_post=1900,
        audience_age_min=25, audience_age_max=44, audience_top_geos=["Denmark", "Germany", "UK"], verified=True,
    ),
    dict(
        name="Diego Fuentes", handle="@diegocooks", bio="Street food tours and 15-minute recipes.",
        platforms=["tiktok", "youtube"], niches=["food", "travel", "lifestyle"],
        languages=["es", "en"], country="Mexico", city="Mexico City",
        followers=540000, engagement_rate=6.2, avg_views=210000, rate_per_post=2400,
        audience_age_min=18, audience_age_max=34, audience_top_geos=["Mexico", "USA", "Spain"], verified=True,
    ),
    dict(
        name="Aisha Khan", handle="@aisha.codes", bio="Coding tutorials and women-in-tech advocacy.",
        platforms=["youtube", "linkedin"], niches=["tech", "education", "career"],
        languages=["en", "ur"], country="Pakistan", city="Lahore",
        followers=220000, engagement_rate=4.1, avg_views=52000, rate_per_post=1100,
        audience_age_min=18, audience_age_max=34, audience_top_geos=["Pakistan", "India", "USA"], verified=True,
    ),
    dict(
        name="Tom Weaver", handle="@weaveroutdoors", bio="Hiking, camping gear and national park guides.",
        platforms=["youtube", "instagram"], niches=["outdoors", "travel", "sustainability"],
        languages=["en"], country="USA", city="Denver",
        followers=128000, engagement_rate=3.2, avg_views=36000, rate_per_post=950,
        audience_age_min=25, audience_age_max=54, audience_top_geos=["USA", "Canada"], verified=False,
    ),
    dict(
        name="Sofia Rossi", handle="@sofia.beauty", bio="Clean beauty reviews and skincare science.",
        platforms=["instagram", "tiktok"], niches=["beauty", "lifestyle", "health"],
        languages=["it", "en"], country="Italy", city="Milan",
        followers=410000, engagement_rate=4.9, avg_views=150000, rate_per_post=2100,
        audience_age_min=18, audience_age_max=34, audience_top_geos=["Italy", "France", "Spain"], verified=True,
    ),
    dict(
        name="Giorgi Melia", handle="@giorgi.finance", bio="Personal finance and investing basics for beginners.",
        platforms=["youtube", "instagram"], niches=["finance", "education", "career"],
        languages=["ka", "en"], country="Georgia", city="Tbilisi",
        followers=67000, engagement_rate=3.5, avg_views=19000, rate_per_post=400,
        audience_age_min=25, audience_age_max=44, audience_top_geos=["Georgia"], verified=False,
    ),
    dict(
        name="Hana Kim", handle="@hana.eats", bio="Seoul café tours and Korean home cooking.",
        platforms=["tiktok", "instagram"], niches=["food", "travel", "lifestyle"],
        languages=["ko", "en"], country="South Korea", city="Seoul",
        followers=780000, engagement_rate=5.8, avg_views=320000, rate_per_post=3200,
        audience_age_min=18, audience_age_max=29, audience_top_geos=["South Korea", "Japan", "USA"], verified=True,
    ),
    dict(
        name="Marc Dubois", handle="@marcfit", bio="Home workouts and nutrition coaching.",
        platforms=["instagram", "youtube"], niches=["fitness", "health", "food"],
        languages=["fr", "en"], country="France", city="Lyon",
        followers=150000, engagement_rate=2.9, avg_views=28000, rate_per_post=800,
        audience_age_min=18, audience_age_max=39, audience_top_geos=["France", "Belgium", "Switzerland"], verified=False,
    ),
]

CAMPAIGNS = [
    dict(
        name="Green Steps Launch", brand="EcoStride",
        description="Launch of a recycled-material sneaker line targeting eco-conscious young adults in Europe.",
        objective="Drive 5,000 pre-orders during launch month.",
        call_to_action="Pre-order on the EcoStride site",
        status="active",
        niches=["sustainability", "lifestyle", "fitness"],
        channels=["instagram", "tiktok"],
        target_geos=["Denmark", "Germany", "Italy", "France"],
        languages=["en"],
        target_age_min=18, target_age_max=34,
        budget_total=15000, budget_per_creator=2000, min_followers=50000,
        start_date="2026-09-01", end_date="2026-09-30",
    ),
    dict(
        name="CodeCamp Fall Cohort", brand="DevAcademy",
        description="Enrollment push for an online coding bootcamp with scholarships for women in tech.",
        objective="600 applications for the fall cohort.",
        call_to_action="Apply for the fall cohort",
        status="active",
        niches=["tech", "education", "career"],
        channels=["youtube", "linkedin"],
        target_geos=["Pakistan", "India", "Georgia", "USA"],
        languages=["en"],
        target_age_min=18, target_age_max=34,
        budget_total=8000, budget_per_creator=1200, min_followers=30000,
        start_date="2026-08-15", end_date="2026-10-01",
    ),
    dict(
        name="Taste of Tbilisi", brand="Visit Georgia",
        description="Tourism board campaign promoting Georgian food culture and city breaks in Tbilisi.",
        objective="Reach 2M viewers with authentic food-travel content.",
        call_to_action="Plan your trip to Georgia",
        status="draft",
        niches=["food", "travel"],
        channels=["tiktok", "youtube", "instagram"],
        target_geos=["Georgia", "Turkey", "Armenia", "Germany"],
        languages=["en", "ka"],
        target_age_min=21, target_age_max=44,
        budget_total=20000, budget_per_creator=2500, min_followers=0,
        start_date="2026-10-01", end_date="2026-11-15",
    ),
]


def seed_if_empty(session: Session) -> None:
    if session.exec(select(Creator).limit(1)).first():
        return
    for data in CREATORS:
        session.add(Creator(**data))
    for data in CAMPAIGNS:
        session.add(Campaign(**data))
    session.commit()
