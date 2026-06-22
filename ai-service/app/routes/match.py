from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import (
    CandidateRank,
    MatchRequest,
    MatchResponse,
    RankRequest,
    RankResponse,
)
from app.services.matcher import compute_match


router = APIRouter(tags=["match"])


@router.post("/match", response_model=MatchResponse)
def match_student_to_tasks(payload: MatchRequest) -> MatchResponse:
    scores = [compute_match(payload.student, task) for task in payload.tasks]
    scores.sort(key=lambda s: s.score, reverse=True)
    return MatchResponse(student_id=payload.student.id, results=scores)


@router.post("/rank-candidates", response_model=RankResponse)
def rank_candidates_for_task(payload: RankRequest) -> RankResponse:
    ranking: list[CandidateRank] = []
    for candidate in payload.candidates:
        result = compute_match(candidate, payload.task)
        ranking.append(
            CandidateRank(
                student_id=candidate.id,
                score=result.score,
                breakdown=result.breakdown,
                reasons=result.reasons,
            )
        )
    ranking.sort(key=lambda r: r.score, reverse=True)
    return RankResponse(task_id=payload.task.id, ranking=ranking)
