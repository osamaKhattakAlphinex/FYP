from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import EvaluateRequest, EvaluateResponse
from app.services.evaluator import evaluate


router = APIRouter(tags=["evaluation"])


@router.post("/evaluate-internship", response_model=EvaluateResponse)
def evaluate_internship(payload: EvaluateRequest) -> EvaluateResponse:
    """Rubric-based evaluation of one completed internship (Module 9).

    The backend falls back to its own copy of these rules if this endpoint is
    unavailable, so the response shape here is the contract both sides implement.
    """
    return evaluate(payload.evaluation)
