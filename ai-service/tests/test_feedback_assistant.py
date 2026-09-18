"""Deterministic tests for the feedback assistant (Module 10).

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
    EvaluationMetric,
    FeedbackCriterionIn,
    FeedbackDraft,
    FeedbackIndicators,
    FeedbackSnapshot,
)
from app.services import feedback_assistant as fa  # noqa: E402
from app.services.feedback_assistant import assist, review_draft, suggest_rating  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

GOOD_DRAFT = dict(
    strengths="Delivered a clean data layer with thorough tests and clear commit messages.",
    improvements="Plan the UI work earlier so the final milestone is not rushed.",
    suggestions=["Set an internal deadline two days before each due date."],
    overall_rating=4,
)


def crit(metric: str, score: float, name: str | None = None, weight: int = 1) -> FeedbackCriterionIn:
    return FeedbackCriterionIn(name=name or metric.title(), metric=metric, score=score, weight=weight)


def snapshot(**overrides) -> FeedbackSnapshot:
    data = dict(
        context="internship",
        task_title="Build a dashboard",
        criteria=[],
        indicators=FeedbackIndicators(),
        draft=FeedbackDraft(),
    )
    data.update(overrides)
    return FeedbackSnapshot(**data)


def codes(review) -> list[str]:
    return [i.code for i in review.issues]


# ---------------------------------------------------------------------------
# Drafting
# ---------------------------------------------------------------------------


def test_strengths_come_from_high_criteria_and_improvements_from_low_ones():
    result = assist(snapshot(criteria=[crit("quality", 92), crit("timeliness", 40), crit("effort", 70)]))
    assert result.suggested_strengths == [fa.STRENGTH_TEXT["quality"]]
    assert result.suggested_improvements == [fa.IMPROVEMENT_TEXT["timeliness"]]


def test_every_improvement_is_paired_with_its_library_suggestion():
    result = assist(snapshot(criteria=[crit("communication", 30), crit("reliability", 50)]))
    assert result.suggested_improvements == [
        fa.IMPROVEMENT_TEXT["communication"],
        fa.IMPROVEMENT_TEXT["reliability"],
    ]
    assert result.suggested_suggestions == [
        fa.SUGGESTION_TEXT["communication"],
        fa.SUGGESTION_TEXT["reliability"],
    ]


def test_suggestion_library_covers_every_module_9_metric():
    metrics = set(EvaluationMetric.__args__)
    assert set(fa.SUGGESTION_TEXT) == metrics
    assert set(fa.STRENGTH_TEXT) == metrics
    assert set(fa.IMPROVEMENT_TEXT) == metrics


def test_band_edges_80_is_a_strength_and_60_is_not_an_improvement():
    result = assist(snapshot(criteria=[crit("quality", 80), crit("timeliness", 60), crit("effort", 59.99)]))
    assert result.suggested_strengths == [fa.STRENGTH_TEXT["quality"]]
    assert result.suggested_improvements == [fa.IMPROVEMENT_TEXT["effort"]]


def test_lists_are_capped_at_three_and_ordered_worst_first():
    low = [crit(m, s) for m, s in [("quality", 50), ("timeliness", 10), ("completion", 30), ("effort", 20)]]
    result = assist(snapshot(criteria=low))
    assert result.suggested_improvements == [
        fa.IMPROVEMENT_TEXT["timeliness"],
        fa.IMPROVEMENT_TEXT["effort"],
        fa.IMPROVEMENT_TEXT["completion"],
    ]
    assert len(result.suggested_suggestions) == 3


def test_indicators_add_strengths_only_where_criteria_are_silent():
    ind = FeedbackIndicators(on_time_submission_rate=0.95, rework_rate=0.05)
    result = assist(snapshot(indicators=ind))
    assert result.suggested_strengths == [fa.STRENGTH_TEXT["timeliness"], fa.STRENGTH_TEXT["reliability"]]


def test_indicator_never_contradicts_a_criterion():
    # Late finish pushed the timeliness criterion down, although most
    # submissions were on time: no praise for timeliness then.
    ind = FeedbackIndicators(on_time_submission_rate=0.95)
    result = assist(snapshot(criteria=[crit("timeliness", 45)], indicators=ind))
    assert fa.STRENGTH_TEXT["timeliness"] not in result.suggested_strengths
    assert result.suggested_improvements == [fa.IMPROVEMENT_TEXT["timeliness"]]


def test_poor_indicators_become_improvements():
    ind = FeedbackIndicators(on_time_submission_rate=0.5, rework_rate=0.5)
    result = assist(snapshot(indicators=ind))
    assert result.suggested_improvements == [
        fa.IMPROVEMENT_TEXT["timeliness"],
        fa.IMPROVEMENT_TEXT["reliability"],
    ]


def test_generic_suggestion_when_nothing_needs_work():
    result = assist(snapshot(criteria=[crit("quality", 90)]))
    assert result.suggested_suggestions == [fa.GENERIC_GROWTH_SUGGESTION]


@pytest.mark.parametrize(
    "scores,expected",
    [([100], 5), ([90], 5), ([89], 4), ([70], 4), ([69], 3), ([10], 1), ([0], 1), ([80, 60], 4)],
)
def test_suggested_rating_is_the_weighted_mean_over_20(scores, expected):
    assert suggest_rating([crit("quality", s) for s in scores]) == expected


def test_suggested_rating_respects_weights_and_rounds_half_up():
    # (3*80 + 1*20) / 4 = 65 -> 3.25 -> 3 ; (1*80 + 1*60)/2 = 70 -> 3.5 -> 4 (half up)
    assert suggest_rating([crit("quality", 80, weight=3), crit("effort", 20)]) == 3
    assert suggest_rating([crit("quality", 80), crit("effort", 60)]) == 4


def test_no_criteria_means_no_suggested_rating():
    assert suggest_rating([]) is None
    assert assist(snapshot()).suggested_overall_rating is None


def test_interview_context_returns_clearly_labelled_templates():
    result = assist(snapshot(context="interview", criteria=[crit("quality", 95)]))
    assert result.suggested_overall_rating is None
    assert all(s.startswith(fa.TEMPLATE_PREFIX) for s in result.suggested_strengths)
    assert all(s.startswith(fa.TEMPLATE_PREFIX) for s in result.suggested_improvements)
    assert result.suggested_suggestions == fa.INTERVIEW_SUGGESTIONS


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------


def test_a_good_draft_scores_100_with_no_issues():
    review = review_draft(FeedbackDraft(**GOOD_DRAFT))
    assert review.issues == []
    assert review.quality_score == 100


def test_harsh_language_is_critical_and_quoted():
    draft = FeedbackDraft(**{**GOOD_DRAFT, "improvements": "Honestly the code was stupid and you seem clueless."})
    review = review_draft(draft)
    issue = next(i for i in review.issues if i.code == "harsh_language")
    assert issue.severity == "critical"
    assert '"stupid"' in issue.message and '"clueless"' in issue.message


def test_harsh_language_matches_whole_words_only():
    # "stupidity" is not the listed word, and technical terms stay allowed.
    draft = FeedbackDraft(**{
        **GOOD_DRAFT,
        "strengths": "Handled lazy loading and garbage collection tuning well; avoided stupidity checks.",
    })
    assert "harsh_language" not in codes(review_draft(draft))
    assert fa.find_harsh_words("SHUT UP about it") == ["shut up"]


def test_too_short_and_no_suggestions_are_warnings():
    review = review_draft(FeedbackDraft(strengths="Good.", improvements="Test more."))
    by_code = {i.code: i.severity for i in review.issues}
    assert by_code["too_short"] == "warning"
    assert by_code["no_suggestions"] == "warning"


def test_unbalanced_without_strengths_or_without_improvements_below_5():
    no_strengths = review_draft(FeedbackDraft(**{**GOOD_DRAFT, "strengths": ""}))
    assert "unbalanced" in codes(no_strengths)
    no_improvements = review_draft(FeedbackDraft(**{**GOOD_DRAFT, "improvements": "", "overall_rating": 4}))
    assert "unbalanced" in codes(no_improvements)
    top_rating = review_draft(FeedbackDraft(**{**GOOD_DRAFT, "improvements": "", "overall_rating": 5}))
    assert "unbalanced" not in codes(top_rating)


def test_not_actionable_when_improvements_have_no_action_verb():
    draft = FeedbackDraft(**{**GOOD_DRAFT, "improvements": "The final milestone was rushed and messy."})
    issue = next(i for i in review_draft(draft).issues if i.code == "not_actionable")
    assert issue.severity == "info"


def test_shouting_needs_twenty_letters_mostly_capitals():
    assert fa.is_shouting("THIS WAS VERY POOR WORK OVERALL")
    assert not fa.is_shouting("OK FINE")  # too few letters to judge
    assert not fa.is_shouting("Used the REST API and SQL well throughout the project")
    draft = FeedbackDraft(**{**GOOD_DRAFT, "strengths": "GREAT WORK ON THE DATA LAYER AND TESTS"})
    assert "shouting" in codes(review_draft(draft))


def test_rating_mismatch_both_directions():
    low = FeedbackDraft(**{**GOOD_DRAFT, "improvements": "", "overall_rating": 2})
    assert "rating_mismatch" in codes(review_draft(low))
    high = FeedbackDraft(**{**GOOD_DRAFT, "strengths": "", "overall_rating": 5})
    assert "rating_mismatch" in codes(review_draft(high))


def test_draft_rating_falls_back_to_snapshot_rating():
    draft = FeedbackDraft(**{**GOOD_DRAFT, "improvements": "", "overall_rating": None})
    assert "rating_mismatch" in codes(review_draft(draft, fallback_rating=1))
    assert "rating_mismatch" not in codes(review_draft(draft, fallback_rating=None))


def test_quality_score_subtracts_penalties_and_floors_at_zero():
    # empty draft: too_short (15) + no_suggestions (15) + unbalanced (5) = 35
    assert review_draft(FeedbackDraft()).quality_score == 65
    awful = FeedbackDraft(
        strengths="STUPID IDIOT", improvements="USELESS LOSER MORON", overall_rating=5
    )
    review = review_draft(awful)
    assert review.quality_score == max(0, 100 - sum(fa.SEVERITY_PENALTY[i.severity] for i in review.issues))
    assert review_draft(FeedbackDraft(strengths="idiot " * 30)).quality_score >= 0


def test_issue_order_is_stable():
    draft = FeedbackDraft(strengths="", improvements="bad, stupid", overall_rating=5)
    assert codes(review_draft(draft)) == [
        "harsh_language",
        "too_short",
        "no_suggestions",
        "rating_mismatch",
        "unbalanced",
        "not_actionable",
    ]


def test_same_input_same_output():
    snap = snapshot(
        criteria=[crit("quality", 88), crit("communication", 35)],
        indicators=FeedbackIndicators(on_time_submission_rate=0.92, rework_rate=0.2),
        draft=FeedbackDraft(**GOOD_DRAFT),
    )
    assert assist(snap).model_dump() == assist(snap).model_dump()


# ---------------------------------------------------------------------------
# Schema + HTTP
# ---------------------------------------------------------------------------


def test_schema_rejects_bad_ratings_and_contexts():
    with pytest.raises(ValidationError):
        FeedbackDraft(overall_rating=6)
    with pytest.raises(ValidationError):
        FeedbackCriterionIn(name="x", metric="quality", score=101)
    with pytest.raises(ValidationError):
        FeedbackSnapshot(context="meeting")


client = TestClient(app)


def test_endpoint_round_trip():
    payload = {
        "feedback": {
            "context": "internship",
            "task_title": "Build a dashboard",
            "student_name": "Sara",
            "criteria": [
                {"name": "Quality of work", "metric": "quality", "score": 91, "weight": 3},
                {"name": "Communication", "metric": "communication", "score": 42, "weight": 1},
            ],
            "indicators": {"on_time_submission_rate": 1.0, "rework_rate": 0.0, "checkin_count": 2},
            "draft": {"strengths": "", "improvements": "", "suggestions": []},
        }
    }
    res = client.post("/feedback-assist", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {
        "suggested_overall_rating",
        "suggested_strengths",
        "suggested_improvements",
        "suggested_suggestions",
        "review",
    }
    # (3*91 + 42) / 4 = 78.75 -> 3.94 -> 4
    assert body["suggested_overall_rating"] == 4
    assert body["suggested_strengths"][0] == fa.STRENGTH_TEXT["quality"]
    assert body["suggested_suggestions"] == [fa.SUGGESTION_TEXT["communication"]]
    assert set(body["review"]) == {"quality_score", "issues"}


def test_endpoint_rejects_invalid_payload():
    res = client.post("/feedback-assist", json={"feedback": {"context": "internship", "draft": {"overall_rating": 9}}})
    assert res.status_code == 422
