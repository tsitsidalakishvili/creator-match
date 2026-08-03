"""Marketing agent pipeline: strategy → bilingual copy → visual brief → audit.

Ported from the easy-ai product demo, but run server-side (like AIKanbanTeam's
agent runner): the run is persisted, each agent appends logs/outputs to the DB,
and the frontend polls for progress. Ends at a human approval gate.
"""

import os
import re
import threading
from datetime import datetime, timezone

from anthropic import Anthropic
from sqlmodel import Session

from sqlmodel import select

from .database import engine
from .models import Brand, BrandDataset, PipelineRun

MODEL = "claude-opus-4-8"

AGENT_SEQUENCE = [
    {"key": "strategy", "label": "Strategy Agent", "icon": "🎯"},
    {"key": "copy", "label": "Copy — EN + Georgian", "icon": "✍️"},
    {"key": "visual", "label": "Visual Brief", "icon": "🔥"},
    {"key": "audit", "label": "Brand Audit", "icon": "🔍"},
]


def api_key_configured() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def _call_claude(system: str, prompt: str, max_tokens: int = 4096) -> str:
    client = Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        return "[The model declined this request.]"
    return next((b.text for b in response.content if b.type == "text"), "")


def _extract(text: str, key: str) -> str:
    match = re.search(rf"{key}:\s*([\s\S]*?)(?=(?:EN_|GEO_)[A-Z_]+:|$)", text)
    return match.group(1).strip() if match else ""


def _brand_context(brand: Brand) -> str:
    return (
        f"Brand: {brand.name} ({brand.description})\n"
        f"Tone: {brand.tone}\n"
        f"Audience: {brand.audience}\n"
        f"Key message: {brand.key_message}\n"
        f"Georgian tagline: {brand.georgian_tagline}\n"
        f"Visual style: {brand.visual_style}\n"
        f"Color palette: {brand.color_palette}"
    )


def _data_context(session: Session, brand_id: int, max_rows: int = 25) -> str:
    """Compact summary of the client's uploaded page data for the strategist."""
    datasets = session.exec(
        select(BrandDataset).where(BrandDataset.brand_id == brand_id)
    ).all()
    if not datasets:
        return ""
    parts = []
    for ds in datasets:
        sample = ds.rows[:max_rows]
        header = ",".join(ds.columns)
        lines = [",".join(str(row.get(c, "")) for c in ds.columns) for row in sample]
        parts.append(
            f"[{ds.source} · {ds.filename} · {ds.row_count} rows total, first {len(sample)} shown]\n"
            f"{header}\n" + "\n".join(lines)
        )
    return (
        "\n\nClient performance data (from their social page exports). Ground your "
        "strategy in what actually performed:\n" + "\n\n".join(parts)
    )[:8000]


def _log(session: Session, run: PipelineRun, message: str, kind: str = "proc") -> None:
    run.logs = [*run.logs, {"t": _now(), "msg": message, "type": kind}]
    session.add(run)
    session.commit()
    session.refresh(run)


def _save_output(session: Session, run: PipelineRun, key: str, value) -> None:
    run.outputs = {**run.outputs, key: value}
    session.add(run)
    session.commit()
    session.refresh(run)


def execute_run(run_id: int) -> None:
    with Session(engine) as session:
        run = session.get(PipelineRun, run_id)
        if not run:
            return
        brand = session.get(Brand, run.brand_id)
        try:
            _log(session, run, f"[INIT] Pipeline — {brand.name} · {run.platform}", "info")
            _log(session, run, "[OK] Brand DNA loaded", "ok")

            messengers = ""
            if run.suggested_messengers:
                lines = [
                    f"- {m.get('name')} ({m.get('niche')}, {m.get('reach')} followers, score {m.get('score')}%)"
                    for m in run.suggested_messengers
                ]
                messengers = (
                    "\nSuggested messengers from our creator roster (consider them in "
                    "distribution recommendations):\n" + "\n".join(lines)
                )

            data_ctx = _data_context(session, run.brand_id)
            if data_ctx:
                _log(session, run, "[OK] Client page data loaded", "ok")

            # 1 — Strategy
            _log(session, run, "[PROCESSING] Strategy Agent...")
            strategy = _call_claude(
                "World-class marketing strategist for the Georgian market. Sharp, "
                "specific, commercially focused. No fluff.",
                f"{_brand_context(brand)}\nPlatform: {run.platform}\n"
                f"Objective: {run.objective}\nBrief: {run.brief}{messengers}{data_ctx}\n\n"
                "CAMPAIGN_ANGLE:\nHOOK:\nEMOTIONAL_TRIGGER:\nVISUAL_DIRECTION:\nCTA:\nRATIONALE:",
            )
            _save_output(session, run, "strategy", strategy)
            _log(session, run, "[OK] Strategy complete", "ok")

            # 2 — Bilingual copy
            _log(session, run, "[PROCESSING] Copy — EN + Georgian...")
            copy_raw = _call_claude(
                "Expert bilingual copywriter. Georgian must be natural Tbilisi "
                "vernacular — never sound translated.",
                f"Brand: {brand.name}\nTone: {brand.tone}\nPlatform: {run.platform}\n"
                f"Strategy: {strategy}\n\n"
                "EN_HEADLINE:\nEN_CAPTION:\nEN_CTA:\nGEO_HEADLINE:\nGEO_CAPTION:\nGEO_CTA:",
            )
            copy = {
                "en_headline": _extract(copy_raw, "EN_HEADLINE"),
                "en_caption": _extract(copy_raw, "EN_CAPTION"),
                "en_cta": _extract(copy_raw, "EN_CTA"),
                "geo_headline": _extract(copy_raw, "GEO_HEADLINE"),
                "geo_caption": _extract(copy_raw, "GEO_CAPTION"),
                "geo_cta": _extract(copy_raw, "GEO_CTA"),
            }
            if not copy["en_headline"] and not copy["geo_headline"]:
                copy["raw"] = copy_raw
            _save_output(session, run, "copy", copy)
            _log(session, run, "[OK] Copy complete — EN + Georgian", "ok")

            # 3 — Visual brief
            _log(session, run, "[PROCESSING] Visual Brief...")
            visual = _call_claude(
                "Creative director. Prompts must be vivid and commercially excellent.",
                f"Brand: {brand.name}\nVisual style: {brand.visual_style}\n"
                f"Colors: {brand.color_palette}\nPlatform: {run.platform}\n"
                f"Strategy: {strategy[:400]}\n\n"
                "Generate 2 image-generation prompts (40-60 words each):\n"
                "PROMPT_1:\nPROMPT_2:\nSTYLE_NOTES:",
            )
            _save_output(session, run, "visual", visual)
            _log(session, run, "[OK] Visual prompts ready", "ok")

            # 4 — Audit
            _log(session, run, "[PROCESSING] Brand Audit...")
            audit = _call_claude(
                "Senior brand quality auditor for the Georgian market. Honest and specific.",
                f"Brand: {brand.name}\nPlatform: {run.platform}\n"
                f"Strategy: {strategy[:300]}\n"
                f"EN copy: {copy['en_headline']}\nGEO copy: {copy['geo_headline']}\n\n"
                "BRAND_FIT: [1-10] — [1 sentence]\n"
                "COPY_QUALITY: [1-10] — [1 sentence]\n"
                "GEORGIAN_AUTHENTICITY: [1-10] — [sounds native?]\n"
                "PLATFORM_FIT: [1-10]\n"
                "RECOMMENDATION: [APPROVE/REVISE/REJECT]\nNOTES:",
            )
            _save_output(session, run, "audit", audit)
            _log(session, run, "[OK] Audit complete", "ok")
            _log(session, run, "[WAITING] Human approval gate", "warn")

            run.status = "awaiting_approval"
            session.add(run)
            session.commit()
        except Exception as exc:  # surface the failure to the polling client
            run.error = str(exc)
            run.status = "failed"
            run.logs = [*run.logs, {"t": _now(), "msg": f"[ERROR] {exc}", "type": "err"}]
            session.add(run)
            session.commit()


def start_run(run_id: int) -> None:
    threading.Thread(target=execute_run, args=(run_id,), daemon=True).start()
