"""Deterministic tests for the performance insight rules (Module 11).

Every expected number below is worked out by hand in the comment next to it,
and the backend's JavaScript fallback is pinned to the same numbers in
backend/tests/analytics.rules.test.js.

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
from app.models.schemas import StudentPerformanceIn  # noqa: E402
from app.services import performance_insights as pi  # noqa: E402
from app.services.performance_insights import analyze, analyze_student  # noqa: E402


def student(**overrides) -> StudentPerformanceIn:
    base = dict(id="s1")
    base.update(overrides)
    return StudentPerformanceIn(**base)


def evals(*pairs):
    return [{"score": s, "finalized_days_ago": d} for s, d in pairs]


client = TestClient(app)


# ---------------------------------------------------------------------------
# Index: components, renormalisation, recency
# ---------------------------------------------------------------------------

def test_no_components_is_insufficient_data():
    r = analyze_student(student())
    assert r.performance_index == 0
    assert r.band == "insufficient_data"
    assert r.trend == "insufficient_data"
    assert r.confidence == 0
    assert r.trend_slope is None and r.predicted_next_score is None
    assert r.insights == [pi.NO_DATA_SENTENCE]


def test_reliability_and_on_time_alone_give_no_index():
    # A completed internship with nothing else would otherwise be a perfect 100.
    r = analyze_student(student(completed_internships=1, on_time_rate=1.0))
    assert r.performance_index == 0
    assert r.band == "insufficient_data"
    assert r.confidence == 0
    assert r.insights == [pi.NO_DATA_SENTENCE]


def test_all_four_components_weighted():
    # eval 80·0.5 + feedback (4-1)/4·100=75 ·0.2 + reliability 1/2=50 ·0.15 + on-time 100 ·0.15
    # = 40 + 15 + 7.5 + 15 = 77.5
    r = analyze_student(student(
        evaluations=evals((80, 0)), feedback_average=4, feedback_count=2,
        completed_internships=1, abandoned_internships=1, on_time_rate=1.0,
    ))
    assert r.performance_index == 77.5
    assert r.band == "strong"


def test_missing_components_renormalise_the_weights():
    # feedback 5 → 100 (0.2), on-time 0.5 → 50 (0.15): (20 + 7.5) / 0.35 = 78.571… → 78.6
    r = analyze_student(student(feedback_average=5, feedback_count=1, on_time_rate=0.5))
    assert r.performance_index == 78.6
    assert r.band == "strong"


def test_recency_weighting_halves_every_180_days():
    # weights 1 (today) and 0.5 (180 days): (100·1 + 0·0.5) / 1.5 = 66.67 → 66.7
    r = analyze_student(student(evaluations=evals((100, 0), (0, 180))))
    assert r.performance_index == 66.7
    assert pi.recency_weight(0) == 1
    assert pi.recency_weight(180) == 0.5
    assert pi.recency_weight(360) == 0.25


def test_recency_weight_has_a_floor():
    assert pi.recency_weight(5000) == pi.RECENCY_MIN_WEIGHT


@pytest.mark.parametrize("score,band", [
    (85, "excellent"), (84.96, "excellent"), (84.9, "strong"), (70, "strong"),
    (69.9, "developing"), (50, "developing"), (49.9, "needs_support"), (0, "needs_support"),
])
def test_bands_use_the_rounded_index(score, band):
    assert analyze_student(student(evaluations=evals((score, 0)))).band == band


# ---------------------------------------------------------------------------
# Trend and prediction
# ---------------------------------------------------------------------------

def test_improving_trend_with_prediction_clamped_to_100():
    # oldest first: 60, 70, 80, 90 → slope 10; next = 75 + 10·(4 − 1.5) = 100
    r = analyze_student(student(evaluations=evals((90, 0), (80, 100), (70, 200), (60, 300))))
    assert r.trend == "improving"
    assert r.trend_slope == 10
    assert r.predicted_next_score == 100


def test_prediction_is_the_fitted_line_at_the_next_index():
    # 60, 70, 65: mean 65, slope (−1·−5 + 0 + 1·0)/2 = 2.5 → stable; next = 65 + 2.5·2 = 70
    r = analyze_student(student(evaluations=evals((60, 20), (70, 10), (65, 0))))
    assert r.trend == "stable"
    assert r.trend_slope == 2.5
    assert r.predicted_next_score == 70


def test_prediction_clamped_at_zero():
    # 40, 20, 0: slope −20, next = 20 − 20·2 = −20 → 0
    r = analyze_student(student(evaluations=evals((40, 2), (20, 1), (0, 0))))
    assert r.trend == "declining"
    assert r.predicted_next_score == 0


def test_no_prediction_with_two_evaluations():
    r = analyze_student(student(evaluations=evals((70, 10), (90, 0))))
    assert r.trend == "improving"
    assert r.trend_slope == 20
    assert r.predicted_next_score is None


@pytest.mark.parametrize("second,trend", [(73, "improving"), (72.99, "stable"), (67, "declining"), (67.01, "stable")])
def test_trend_thresholds(second, trend):
    assert analyze_student(student(evaluations=evals((70, 1), (second, 0)))).trend == trend


def test_single_evaluation_has_no_trend():
    r = analyze_student(student(evaluations=evals((82.5, 0))))
    assert r.trend == "insufficient_data"
    assert r.insights[0] == "Only one finalized evaluation so far (82.5/100); a trend needs at least two."


def test_same_age_keeps_input_order():
    r = analyze_student(student(evaluations=evals((50, 10), (90, 10))))
    assert r.trend_slope == 40


# ---------------------------------------------------------------------------
# Confidence, strengths, insights
# ---------------------------------------------------------------------------

def test_confidence_components():
    assert analyze_student(student(evaluations=evals((70, 0)), feedback_average=4, feedback_count=1, on_time_rate=1)).confidence == 0.55
    assert analyze_student(student(feedback_average=4, feedback_count=1)).confidence == 0.2
    full = student(evaluations=evals((70, 0), (70, 1), (70, 2), (70, 3), (70, 4)), feedback_average=4,
                   feedback_count=1, on_time_rate=0.5)
    assert analyze_student(full).confidence == 1
    # 3 evaluations: 0.75·0.6 = 0.45
    assert analyze_student(student(evaluations=evals((70, 0), (70, 1), (70, 2)))).confidence == 0.45


def test_strengths_and_focus_areas():
    r = analyze_student(student(
        evaluations=evals((70, 0)),
        criteria_averages={"quality": 90, "timeliness": 85, "completion": 80, "communication": 59,
                           "effort": 40, "reliability": 60},
    ))
    assert r.strengths == ["Quality of work", "Timeliness", "Scope completion"]
    assert r.focus_areas == ["Effort & commitment", "Communication"]


def test_equal_averages_follow_metric_order():
    r = analyze_student(student(evaluations=evals((70, 0)), criteria_averages={"effort": 90, "quality": 90}))
    assert r.strengths == ["Quality of work", "Effort & commitment"]


def test_insights_text_and_cap():
    r = analyze_student(student(
        evaluations=evals((90, 0), (80, 100), (70, 200), (60, 300)),
        completed_internships=2, feedback_average=4.5, feedback_count=2, recommend_rate=1, on_time_rate=0.75,
    ))
    assert r.insights == [
        "Scores are improving by about 10 points per evaluation across 4 evaluations.",
        "If this trend continues, the next evaluation is projected at about 100/100.",
        "Finished 2 of 2 internships (completed rather than abandoned).",
    ]


def test_insights_without_evaluations():
    r = analyze_student(student(feedback_average=4.25, feedback_count=1, recommend_rate=0.5,
                                completed_internships=1, abandoned_internships=0, on_time_rate=2 / 3))
    assert r.insights == [
        "No finalized evaluations yet, so there is no score trend to show.",
        "Finished 1 of 1 internship (completed rather than abandoned).",
        "Average feedback rating 4.25/5 from 1 review, 50% would recommend.",
    ]


def test_steady_insight_wording():
    r = analyze_student(student(evaluations=evals((70, 1), (71, 0))))
    assert r.insights == ["Scores are steady across 2 evaluations (within 3 points per evaluation)."]


# ---------------------------------------------------------------------------
# Batch + HTTP contract
# ---------------------------------------------------------------------------

def test_batch_keeps_input_order_and_is_deterministic():
    students = [student(id="b", evaluations=evals((50, 0))), student(id="a", evaluations=evals((90, 0)))]
    first = analyze(students)
    assert [r.id for r in first.results] == ["b", "a"]
    assert first.model_dump() == analyze(students).model_dump()


def test_endpoint_returns_results():
    res = client.post("/performance-insights", json={"students": [
        {"id": "7", "evaluations": evals((80, 0)), "criteria_averages": {"quality": 85},
         "feedback_average": None, "feedback_count": 0, "recommend_rate": None,
         "completed_internships": 1, "abandoned_internships": 0, "on_time_rate": None},
    ]})
    assert res.status_code == 200
    body = res.json()["results"][0]
    # (80·0.5 + 100·0.15) / 0.65 = 84.615… → 84.6
    assert body["performance_index"] == 84.6
    assert body["band"] == "strong"
    assert body["strengths"] == ["Quality of work"]
    assert set(body) == {"id", "performance_index", "band", "trend", "trend_slope", "predicted_next_score",
                         "confidence", "strengths", "focus_areas", "insights"}


@pytest.mark.parametrize("payload", [
    {"students": []},
    {"students": [{"id": str(i)} for i in range(201)]},
    {"students": [{"id": "1", "evaluations": [{"score": 101, "finalized_days_ago": 0}]}]},
    {"students": [{"id": "1", "evaluations": [{"score": 50, "finalized_days_ago": -1}]}]},
    {"students": [{"id": "1", "criteria_averages": {"charisma": 50}}]},
    {"students": [{"id": "1", "criteria_averages": {"quality": 150}}]},
    {"students": [{"id": "1", "feedback_average": 6}]},
    {"students": [{"id": "1", "on_time_rate": 1.5}]},
])
def test_endpoint_rejects_invalid_input(payload):
    assert client.post("/performance-insights", json=payload).status_code == 422


def test_schema_rejects_negative_counts():
    with pytest.raises(ValidationError):
        StudentPerformanceIn(id="1", completed_internships=-1)
