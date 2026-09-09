from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import ProgressInsightRequest, ProgressInsightResponse
from app.services.progress_analyzer import analyze_progress


router = APIRouter(tags=["progress"])


@router.post("/progress-insight", response_model=ProgressInsightResponse)
def progress_insight(payload: ProgressInsightRequest) -> ProgressInsightResponse:
    """Risk assessment and performance indicators for one internship (Module 8).

    The backend degrades to its own rule set if this endpoint is unavailable,
    so the response shape here is the contract both sides implement.
    """
    return analyze_progress(payload.progress)
