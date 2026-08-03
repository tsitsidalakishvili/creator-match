"""Scoring engine that ranks creators against a campaign brief.

Mirrors the audience-readiness idea from the Campaigns/Audience modules:
every match gets a 0-100 score, a per-dimension breakdown, and
human-readable reasons so the ranking is explainable.
"""

from typing import Dict, List, Tuple

from .models import Campaign, Creator

WEIGHTS = {
    "niche_fit": 30,
    "channel_fit": 15,
    "geo_fit": 15,
    "age_fit": 10,
    "language_fit": 10,
    "budget_fit": 10,
    "engagement": 10,
}


def _norm(values: List[str]) -> set:
    return {v.strip().lower() for v in values if v and v.strip()}


def _overlap_ratio(wanted: List[str], available: List[str]) -> float:
    """Share of wanted items that the creator covers. 1.0 if nothing was requested."""
    w, a = _norm(wanted), _norm(available)
    if not w:
        return 1.0
    if not a:
        return 0.0
    return len(w & a) / len(w)


def _age_overlap(c_min: int, c_max: int, t_min: int, t_max: int) -> float:
    """Fraction of the campaign's target age range covered by the creator's audience."""
    lo, hi = max(c_min, t_min), min(c_max, t_max)
    if hi <= lo:
        return 0.0
    target_span = max(t_max - t_min, 1)
    return min((hi - lo) / target_span, 1.0)


def _budget_fit(rate: float, budget_per_creator: float) -> float:
    if budget_per_creator <= 0:
        return 1.0  # no budget constraint set
    if rate <= 0:
        return 0.8  # rate unknown — mildly optimistic
    if rate <= budget_per_creator:
        return 1.0
    if rate <= budget_per_creator * 1.25:
        return 0.5  # negotiable range
    return 0.0


def _engagement_quality(engagement_rate: float) -> float:
    """Normalize engagement %: ~1% weak, 3% solid, 6%+ excellent."""
    if engagement_rate <= 0:
        return 0.0
    return min(engagement_rate / 6.0, 1.0)


def score_creator(campaign: Campaign, creator: Creator) -> Tuple[float, Dict[str, float], List[str]]:
    components = {
        "niche_fit": _overlap_ratio(campaign.niches, creator.niches),
        "channel_fit": _overlap_ratio(campaign.channels, creator.platforms),
        "geo_fit": _overlap_ratio(
            campaign.target_geos, creator.audience_top_geos + [creator.country]
        ),
        "age_fit": _age_overlap(
            creator.audience_age_min,
            creator.audience_age_max,
            campaign.target_age_min,
            campaign.target_age_max,
        ),
        "language_fit": _overlap_ratio(campaign.languages, creator.languages),
        "budget_fit": _budget_fit(creator.rate_per_post, campaign.budget_per_creator),
        "engagement": _engagement_quality(creator.engagement_rate),
    }

    breakdown = {k: round(v * WEIGHTS[k], 1) for k, v in components.items()}
    score = round(sum(breakdown.values()), 1)

    reasons: List[str] = []
    matched_niches = _norm(campaign.niches) & _norm(creator.niches)
    if matched_niches:
        reasons.append("Covers campaign niches: " + ", ".join(sorted(matched_niches)))
    else:
        reasons.append("No direct niche overlap with the campaign brief")

    matched_channels = _norm(campaign.channels) & _norm(creator.platforms)
    if matched_channels:
        reasons.append("Active on requested channels: " + ", ".join(sorted(matched_channels)))

    matched_geos = _norm(campaign.target_geos) & _norm(
        creator.audience_top_geos + [creator.country]
    )
    if matched_geos:
        reasons.append("Audience reach in: " + ", ".join(sorted(matched_geos)))
    elif campaign.target_geos:
        reasons.append("Audience is outside the campaign's target geography")

    if components["age_fit"] >= 0.7:
        reasons.append(
            f"Audience age {creator.audience_age_min}-{creator.audience_age_max} "
            f"covers the {campaign.target_age_min}-{campaign.target_age_max} target"
        )

    if components["budget_fit"] >= 1.0 and campaign.budget_per_creator > 0:
        reasons.append(
            f"Rate ${creator.rate_per_post:,.0f} fits the "
            f"${campaign.budget_per_creator:,.0f}/creator budget"
        )
    elif components["budget_fit"] == 0.5:
        reasons.append("Rate slightly above budget — negotiable")
    elif components["budget_fit"] == 0.0:
        reasons.append("Rate exceeds the per-creator budget")

    if creator.engagement_rate >= 4.5:
        reasons.append(f"Excellent engagement rate ({creator.engagement_rate}%)")
    elif creator.engagement_rate >= 3.0:
        reasons.append(f"Solid engagement rate ({creator.engagement_rate}%)")

    if campaign.min_followers and creator.followers < campaign.min_followers:
        reasons.append(
            f"Below minimum follower requirement ({creator.followers:,} < {campaign.min_followers:,})"
        )

    return score, breakdown, reasons


def rank_creators(campaign: Campaign, creators: List[Creator]) -> List[dict]:
    ranked = []
    for creator in creators:
        if campaign.min_followers and creator.followers < campaign.min_followers:
            continue
        score, breakdown, reasons = score_creator(campaign, creator)
        ranked.append(
            {
                "creator": creator,
                "score": score,
                "breakdown": breakdown,
                "reasons": reasons,
            }
        )
    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked
