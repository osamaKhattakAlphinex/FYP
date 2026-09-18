from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FeedbackAssistRequest, FeedbackAssistResponse
from app.services.feedback_assistant import assist


router = APIRouter(tags=["feedback"])


@router.post("/feedback-assist", response_model=FeedbackAssistResponse)
def feedback_assist(payload: FeedbackAssistRequest) -> FeedbackAssistResponse:
    """Drafting help and a quality/tone review for structured feedback (Module 10).

    The backend falls back to its own copy of these rules if this endpoint is
    unavailable, and always runs that copy as its server-side tone guard, so the
    response shape here is the contract both sides implement.
    """
    return assist(payload.feedback)
