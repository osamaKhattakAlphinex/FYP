"""Deterministic tests for the rubric evaluator (Module 9).

Run from the ai-service directory:
    pytest -q
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

os.environ["AI_USE_EMBEDDINGS"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app.main import app  # noqa: E402
from app.models.schemas import (  # noqa: E402
    EvaluationCriterionIn,
    EvaluationEvidence,
    EvaluationSnapshot,
)
from app.services import evaluator  # noqa: E402
from app.services.evaluator import evaluate, grade_for, weighted_score  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

DEFAULT_RUBRIC = [
    ("quality", "Quality of work", 3),
    ("timeliness", "Timeliness", 2),
    ("completion", "Scope completion", 3),
    ("communication", "Communication", 1),
    ("effort", "Effort & commitment", 1),
]


def criteria(rubric=DEFAULT_RUBRIC) -> list[EvaluationCriterionIn]:
    return [
        EvaluationCriterionIn(id=f"c{i}", name=name, metric=metric, weight=weight)
        for i, (metric, name, weight) in enumerate(rubric)
    ]


def strong_evidence(**overrides) -> EvaluationEvidence:
    """A student who did everything well: the reference 'A' internship."""
    data = dict(
        weighted_completion=100,
        milestone_count=4,
        completed_milestones=4,
        required_outstanding=0,
        closed_with_outstanding_work=False,
        submission_count=4,
        reviewed_count=4,
        on_time_submission_rate=1.0,
        rework_rate=0.0,
        first_time_approval_rate=1.0,
        average_review_score=4.75,
        supervisor_rating=5,
        hours_logged=40,
        expected_hours=40,
        estimated_hours=36,
        active_weeks=4,
        checkin_count=4,
        blockers_raised=1,
        blockers_resolved=1,
        finished_on_time=True,
        days_late=0,
    )
    data.update(overrides)
    return EvaluationEvidence(**data)


def empty_evidence(**overrides) -> EvaluationEvidence:
    """Nothing recorded at all — every metric should take the neutral path."""
    data = dict(weighted_completion=0, milestone_count=0, hours_logged=0, active_weeks=1)
    data.update(overrides)
    return EvaluationEvidence(**data)


def snapshot(evidence: EvaluationEvidence, rubric=DEFAULT_RUBRIC) -> EvaluationSnapshot:
    return EvaluationSnapshot(
        id="ev-1", task_title="Build a React dashboard", criteria=criteria(rubric), evidence=evidence
    )


def score_of(result, cid: str) -> float:
    return next(c.score for c in result.criteria if c.id == cid)


def one(metric: str, evidence: EvaluationEvidence):
    """Evaluate a single-criterion rubric and return that criterion's result."""
    res = evaluate(snapshot(evidence, [(metric, metric.title(), 1)]))
    return res.criteria[0]


# ---------------------------------------------------------------------------
# Bands and aggregation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "score,grade",
    [(100, "A"), (85, "A"), (84.99, "B"), (70, "B"), (69.99, "C"), (55, "C"),
     (54.99, "D"), (40, "D"), (39.99, "F"), (0, "F")],
)
def test_grade_bands(score, grade):
    assert grade_for(score) == grade


def test_weighted_score_respects_weights():
    assert weighted_score([(3, 100), (1, 0)]) == 75.0
    assert weighted_score([]) == 0.0


def test_strong_internship_earns_an_a():
    res = evaluate(snapshot(strong_evidence()))
    assert res.grade == "A"
    assert res.overall_score >= 85
    assert res.confidence == 1.0
    assert res.improvements == []
    assert len(res.strengths) >= 1


def test_overall_is_the_weighted_mean_of_criteria():
    res = evaluate(snapshot(strong_evidence(checkin_count=0, blockers_raised=0)))
    weights = {f"c{i}": w for i, (_, _, w) in enumerate(DEFAULT_RUBRIC)}
    expected = weighted_score([(weights[c.id], c.score) for c in res.criteria])
    assert res.overall_score == expected


def test_heavier_weight_moves_the_overall_more():
    ev = strong_evidence(on_time_submission_rate=0.0, finished_on_time=True)
    light = evaluate(snapshot(ev, [("timeliness", "T", 1), ("completion", "C", 5)]))
    heavy = evaluate(snapshot(ev, [("timeliness", "T", 5), ("completion", "C", 1)]))
    assert heavy.overall_score < light.overall_score


# ---------------------------------------------------------------------------
# Each metric
# ---------------------------------------------------------------------------

def test_quality_blends_reviews_and_supervisor_70_30():
    # review 5/5 -> 100, supervisor 1/5 -> 0 => 70
    c = one("quality", strong_evidence(average_review_score=5, supervisor_rating=1))
    assert c.score == 70.0
    assert c.has_evidence


def test_quality_uses_whichever_signal_exists():
    only_review = one("quality", strong_evidence(average_review_score=3, supervisor_rating=None))
    only_rating = one("quality", strong_evidence(average_review_score=None, supervisor_rating=4))
    assert only_review.score == 50.0
    assert only_rating.score == 75.0


def test_quality_penalises_heavy_rework_up_to_15():
    base = one("quality", strong_evidence(average_review_score=5, supervisor_rating=None, rework_rate=0.3))
    heavy = one("quality", strong_evidence(average_review_score=5, supervisor_rating=None, rework_rate=0.9))
    assert base.score == 100.0
    assert heavy.score == 85.0


def test_quality_evidence_line_for_supervisor_rating_uses_the_fixed_prefix():
    c = one("quality", strong_evidence())
    assert any(line.startswith(evaluator.SUPERVISOR_RATING_PREFIX) for line in c.evidence)


def test_timeliness_on_time_rate_and_late_finish():
    on_time = one("timeliness", strong_evidence(on_time_submission_rate=0.75))
    assert on_time.score == 75.0
    # 20 + 2*3 = 26 point penalty
    late = one("timeliness", strong_evidence(on_time_submission_rate=0.75, finished_on_time=False, days_late=3))
    assert late.score == 49.0
    # penalty capped at 30 however late
    very_late = one("timeliness", strong_evidence(on_time_submission_rate=1.0, finished_on_time=False, days_late=40))
    assert very_late.score == 70.0


def test_timeliness_never_goes_below_zero():
    c = one("timeliness", strong_evidence(on_time_submission_rate=0.1, finished_on_time=False, days_late=30))
    assert c.score == 0.0


def test_completion_is_weighted_completion_minus_outstanding_penalty():
    assert one("completion", strong_evidence(weighted_completion=80)).score == 80.0
    closed_early = one(
        "completion",
        strong_evidence(weighted_completion=80, closed_with_outstanding_work=True, required_outstanding=1),
    )
    assert closed_early.score == 65.0


def test_communication_cadence_and_blocker_bonus():
    # 2 check-ins over 4 weeks = 0.5/week -> 40, no blockers
    c = one("communication", strong_evidence(checkin_count=2, active_weeks=4, blockers_raised=0, blockers_resolved=0))
    assert c.score == 40.0
    # weekly cadence + a resolved blocker -> 100 (capped)
    full = one("communication", strong_evidence(checkin_count=6, active_weeks=4, blockers_raised=1, blockers_resolved=1))
    assert full.score == 100.0


def test_effort_bands():
    assert one("effort", strong_evidence(hours_logged=40, expected_hours=40)).score == 100.0
    assert one("effort", strong_evidence(hours_logged=18, expected_hours=40)).score == 50.0
    # 2x the baseline bottoms out at 80, never lower
    assert one("effort", strong_evidence(hours_logged=80, expected_hours=40)).score == 80.0
    assert one("effort", strong_evidence(hours_logged=400, expected_hours=40)).score == 80.0


def test_effort_falls_back_to_estimates_when_no_weekly_target():
    c = one("effort", strong_evidence(hours_logged=20, expected_hours=None, estimated_hours=20))
    assert c.score == 100.0
    assert "estimated" in c.evidence[0]


def test_reliability_first_time_rate_and_unresolved_blockers():
    assert one("reliability", strong_evidence(first_time_approval_rate=0.5)).score == 50.0
    # falls back to 1 - rework
    assert one("reliability", strong_evidence(first_time_approval_rate=None, rework_rate=0.25)).score == 75.0
    penalised = one(
        "reliability",
        strong_evidence(first_time_approval_rate=0.5, blockers_raised=2, blockers_resolved=1),
    )
    assert penalised.score == 40.0


# ---------------------------------------------------------------------------
# Neutral path, confidence, feedback
# ---------------------------------------------------------------------------

def test_no_evidence_scores_every_criterion_neutrally_with_zero_confidence():
    rubric = DEFAULT_RUBRIC + [("reliability", "Reliability", 1)]
    res = evaluate(snapshot(empty_evidence(), rubric))
    assert all(c.score == evaluator.NEUTRAL_SCORE for c in res.criteria)
    assert all(not c.has_evidence for c in res.criteria)
    assert all("insufficient evidence" in c.rationale for c in res.criteria)
    assert res.confidence == 0.0
    assert res.grade == "C"
    # Neutral scores are not "weaknesses" to lecture the student about.
    assert res.improvements == []
    assert "Evidence is thin" in res.summary


def test_confidence_is_the_share_of_evidenced_criteria():
    ev = strong_evidence(checkin_count=0, blockers_raised=0, blockers_resolved=0)
    res = evaluate(snapshot(ev))
    assert res.confidence == 0.8  # 4 of 5


def test_improvements_are_actionable_and_capped_at_three():
    ev = strong_evidence(
        average_review_score=1.5, supervisor_rating=2, on_time_submission_rate=0.2,
        weighted_completion=30, checkin_count=1, active_weeks=8, blockers_raised=0,
        blockers_resolved=0, hours_logged=5, first_time_approval_rate=0.1,
    )
    rubric = DEFAULT_RUBRIC + [("reliability", "Reliability", 1)]
    res = evaluate(snapshot(ev, rubric))
    assert 1 <= len(res.improvements) <= 3
    assert res.strengths == []
    assert res.grade == "F"


def test_duplicate_metrics_do_not_repeat_feedback():
    rubric = [("quality", "Code quality", 2), ("quality", "Design quality", 2)]
    res = evaluate(snapshot(strong_evidence(), rubric))
    assert len(res.strengths) == 1


# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------

def test_output_is_deterministic():
    a = evaluate(snapshot(strong_evidence(checkin_count=3)))
    b = evaluate(snapshot(strong_evidence(checkin_count=3)))
    assert a.model_dump() == b.model_dump()


def test_scores_are_clamped_to_0_100():
    res = evaluate(snapshot(strong_evidence(), DEFAULT_RUBRIC + [("reliability", "R", 1)]))
    assert all(0 <= c.score <= 100 for c in res.criteria)
    assert 0 <= res.overall_score <= 100


def test_every_criterion_is_returned_in_order_with_its_id():
    res = evaluate(snapshot(strong_evidence()))
    assert [c.id for c in res.criteria] == [f"c{i}" for i in range(len(DEFAULT_RUBRIC))]
    assert res.evaluation_id == "ev-1"


def test_schema_rejects_an_empty_rubric_and_an_unknown_metric():
    with pytest.raises(ValidationError):
        EvaluationSnapshot(id="x", criteria=[], evidence=strong_evidence())
    with pytest.raises(ValidationError):
        EvaluationCriterionIn(id="c", name="n", metric="charisma", weight=1)


def test_route_returns_a_valid_response():
    client = TestClient(app)
    payload = {
        "evaluation": {
            "id": "42",
            "task_title": "Build a React dashboard",
            "criteria": [
                {"id": "1", "name": "Quality of work", "metric": "quality", "weight": 3},
                {"id": "2", "name": "Timeliness", "metric": "timeliness", "weight": 2},
            ],
            "evidence": strong_evidence().model_dump(),
        }
    }
    res = client.post("/evaluate-internship", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["evaluation_id"] == "42"
    assert body["grade"] in {"A", "B", "C", "D", "F"}
    assert [c["id"] for c in body["criteria"]] == ["1", "2"]


def test_route_rejects_a_malformed_payload():
    client = TestClient(app)
    res = client.post("/evaluate-internship", json={"evaluation": {"id": "1", "criteria": []}})
    assert res.status_code == 422
