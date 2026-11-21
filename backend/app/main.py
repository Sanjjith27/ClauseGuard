"""
ClauseGuard - FastAPI Backend
=============================

Endpoints:
  GET  /api/health          -> {"status": "ok"}
  POST /api/analyze-text    -> analysis JSON
  POST /api/analyze-pdf     -> analysis JSON (text extraction via PyMuPDF)
  POST /api/generate-ics    -> RFC-5545 .ics file download

All analysis uses the deterministic clause detector in app/clauses.py so the
frontend and backend return IDENTICAL JSON for the same input.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .clauses import (
    AnalysisResult,
    calculateFairnessScore,
    calculateMoneyAtRisk,
    calculateReadingTimeSaved,
    extractClauses,
    generateCutoffSummary,
    generateDisputeEmail,
)

app = FastAPI(
    title="ClauseGuard API",
    version="1.0.0",
    description="Deterministic contract fine-print analyzer.",
)

# CORS - open by design so the static frontend can call the API from anywhere.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/samples", tags=["analysis"])
async def samples() -> dict[str, dict[str, str]]:
    """The three demo contracts, so clients and tests share one source."""
    from .clauses import sample_contracts

    return {
        key: {"name": value["name"], "text": value["text"]}
        for key, value in sample_contracts.items()
    }


def _analyze(text: str, contract_name: str) -> AnalysisResult:
    """Shared pipeline used by both the text and PDF endpoints."""
    clauses = extractClauses(text)
    cutoff_summary, cutoff_date_iso = generateCutoffSummary(clauses, text)

    return AnalysisResult(
        fairness_score=calculateFairnessScore(clauses),
        money_at_risk=calculateMoneyAtRisk(clauses),
        reading_time_saved_mins=calculateReadingTimeSaved(len(text.split())),
        cutoff_summary=cutoff_summary,
        cutoff_date_iso=cutoff_date_iso,
        dispute_email=generateDisputeEmail(clauses, contract_name),
        clauses=clauses,
    )


# ---------------------------------------------------------------------------
# Analyze raw text
# ---------------------------------------------------------------------------
@app.post("/api/analyze-text", tags=["analysis"], response_model=AnalysisResult)
async def analyze_text(payload: dict[str, str]) -> AnalysisResult:
    """Accepts {text: str, contract_name?: str} and returns the full analysis."""
    text = payload.get("text", "")
    contract_name = payload.get("contract_name", "Pasted Contract")

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Empty text payload")

    return _analyze(text, contract_name)


# ---------------------------------------------------------------------------
# Analyze PDF - extract text with PyMuPDF, then run the same pipeline
# ---------------------------------------------------------------------------
@app.post("/api/analyze-pdf", tags=["analysis"], response_model=AnalysisResult)
async def analyze_pdf(file: UploadFile = File(...)) -> AnalysisResult:
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        import fitz  # PyMuPDF

        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            full_text = " ".join(page.get_text("text") for page in doc)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface parser failures to the client
        raise HTTPException(
            status_code=400, detail=f"PDF extraction failed: {exc}"
        ) from exc

    if not full_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No selectable text found. This PDF may be a scanned image.",
        )

    return _analyze(full_text, re.sub(r"\.[^.]+$", "", filename))


# ---------------------------------------------------------------------------
# Generate .ics calendar file (RFC 5545)
# ---------------------------------------------------------------------------
def _ics_escape(value: str) -> str:
    """Escape text per RFC 5545 section 3.3.11."""
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _ics_fold(line: str, limit: int = 75) -> str:
    """Fold long content lines at 75 octets, as the spec requires."""
    if len(line) <= limit:
        return line
    chunks = [line[:limit]]
    rest = line[limit:]
    while rest:
        chunks.append(" " + rest[: limit - 1])
        rest = rest[limit - 1 :]
    return "\r\n".join(chunks)


@app.post("/api/generate-ics", tags=["utils"])
async def generate_ics(payload: dict[str, str]) -> Response:
    """Build an .ics event with a 7-day-prior VALARM reminder.

    Accepts {title?: str, deadline_date: str (YYYY-MM-DD), notes?: str}
    and returns a downloadable calendar file.
    """
    title = payload.get("title") or "Contract Cancellation Deadline"
    deadline_str = payload.get("deadline_date", "")
    notes = payload.get("notes") or "Review your contract before this date."

    try:
        deadline = datetime.strptime(deadline_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400, detail="deadline_date must be formatted YYYY-MM-DD"
        ) from None

    date = deadline.strftime("%Y%m%d")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    uid = hashlib.sha256(f"{title}|{date}".encode("utf-8")).hexdigest()[:16]

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ClauseGuard//Contract Guard//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}@clauseguard",
        f"DTSTAMP:{stamp}",
        f"DTSTART;VALUE=DATE:{date}",
        f"DTEND;VALUE=DATE:{date}",
        f"SUMMARY:{_ics_escape(title)}",
        f"DESCRIPTION:{_ics_escape(notes)}",
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{_ics_escape('Contract deadline approaching: ' + title)}",
        "TRIGGER:-P7D",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    body = "\r\n".join(_ics_fold(line) for line in lines) + "\r\n"

    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", title).strip("_") or "deadline"

    return Response(
        content=body.encode("utf-8"),
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="ClauseGuard_{safe_name}_{date}.ics"'
        },
    )
