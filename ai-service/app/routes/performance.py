from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import PerformanceInsightsRequest, PerformanceInsightsResponse
from app.services.performance_insights import analyze


router = APIRouter(tags=["performance"])


@router.post("/performance-insights", response_model=PerformanceInsightsResponse)
def performance_insights(payload: PerformanceInsightsRequest) -> PerformanceInsightsResponse:
    """Performance index, trend, projection and reasons for a batch of students (Module 11).

    Batched so a company's whole candidate list is ranked in one call. The
    backend falls back to its own copy of these rules if this endpoint is
    unavailable, so the response shape here is the contract both sides implement.
    """
    return analyze(payload.students)
