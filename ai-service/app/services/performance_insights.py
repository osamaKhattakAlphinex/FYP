"""Deterministic performance insights for Module 11 (Performance Analytics).

Requirement §1.5.1.4: "Predict performance based on historical data and
patterns … Generate insights and recommendations for users and organizations."
The backend sends a batch of students' recorded track records (finalized
Module 9 evaluations, Module 10 feedback, Module 8 internships and submissions)
and gets back, per student, a 0-100 performance index, a score trend, a
projected next score and short plain-language reasons.

Same design rules as `evaluator.py` and `feedback_assistant.py`: pure
functions, no global state, the same input always produces the same output,
and every constant is named. The ethical NFR (§2.3.2.5) asks automated
judgements to come with clear reasons, which is why `insights` spells out what
the numbers are based on. The backend mirrors these rules in
`analyticsService.fallbackPerformanceInsights` for when this service is
unreachable — keep constants, sentence wording and order identical.

Floating-point note: sums are plain left-to-right loops (never `sum()`/`fsum`)
and rounding is half-up, so the JavaScript copy reproduces every number.
"""
from __future__ import annotations

import math
from typing import Optional

from app.models.schemas import (
    PerformanceInsight,
    PerformanceInsightsResponse,
    StudentPerformanceIn,
)


# --- performance index -----------------------------------------------------
# Weighted mean of the components a student actually has. Evaluations are the
# richest signal (a rubric over the whole internship), feedback is a human
# judgement, and the last two are reliability habits. A missing component is
# dropped and the remaining weights renormalised, so "no data" is never read
# as "zero".
EVALUATION_WEIGHT = 0.5
FEEDBACK_WEIGHT = 0.2
RELIABILITY_WEIGHT = 0.15
ON_TIME_WEIGHT = 0.15

# Recency: an evaluation's weight halves every 180 days, so recent work counts
# more than old work. Weights are rounded to 6dp (keeps the JS copy exact) and
# never drop below 1% of a fresh evaluation.
RECENCY_HALF_LIFE_DAYS = 180.0
RECENCY_MIN_WEIGHT = 0.01

# Index bands (on the rounded index).
BANDS = [(85.0, "excellent"), (70.0, "strong"), (50.0, "developing")]
LOWEST_BAND = "needs_support"

# --- trend and prediction --------------------------------------------------
# Least-squares slope of the scores in chronological order, in points per
# evaluation. At or beyond ±3 points the direction is called.
TREND_THRESHOLD = 3.0
MIN_TREND_EVALUATIONS = 2
# A projection from two points is just the line through them; three is the
# least that says anything about a pattern.
MIN_PREDICTION_EVALUATIONS = 3

# --- confidence ------------------------------------------------------------
# Evaluations carry most of it, reaching full share at four.
CONFIDENCE_FULL_EVALUATIONS = 4
CONFIDENCE_EVALUATION_SHARE = 0.6
CONFIDENCE_FEEDBACK_SHARE = 0.2
CONFIDENCE_ON_TIME_SHARE = 0.2

# --- strengths / focus areas (same bands as the Module 9/10 rules) --------
STRENGTH_AT = 80.0
FOCUS_BELOW = 60.0
MAX_AREAS = 3
MAX_INSIGHTS = 3

METRIC_ORDER = ["quality", "timeliness", "completion", "communication", "effort", "reliability"]
# The default Module 9 rubric names, so the wording matches the evaluation.
METRIC_LABELS = {
    "quality": "Quality of work",
    "timeliness": "Timeliness",
    "completion": "Scope completion",
    "communication": "Communication",
    "effort": "Effort & commitment",
    "reliability": "Reliability",
}

# Reliability and on-time delivery are habits, not a judgement of the work,
# so on their own they never produce an index: a student with one completed
# internship and nothing else would otherwise score a perfect 100. At least
# one finalized evaluation or one piece of feedback is required.
NO_DATA_SENTENCE = (
    "Not enough recorded performance yet: an index needs at least one finalized "
    "evaluation or one piece of feedback."
)


def _round(value: float, places: int) -> float:
    """Half-up rounding, matching JavaScript's Math.round in the backend
    fallback (Python's round() is banker's rounding and would drift)."""
    factor = 10 ** places
    return math.floor(float(value) * factor + 0.5) / factor


def _fmt(value: float) -> str:
    """Number text identical to JavaScript's String(n) for these magnitudes."""
    if value == int(value):
        return str(int(value))
    return repr(float(value))


def _plural(n: int, word: str) -> str:
    return word if n == 1 else word + "s"


def recency_weight(days_ago: int) -> float:
    return max(RECENCY_MIN_WEIGHT, _round(0.5 ** (days_ago / RECENCY_HALF_LIFE_DAYS), 6))


def chronological_scores(student: StudentPerformanceIn) -> list[tuple[float, int]]:
    """(score, days_ago) oldest first; ties keep input order."""
    indexed = list(enumerate(student.evaluations))
    indexed.sort(key=lambda p: (-p[1].finalized_days_ago, p[0]))
    return [(float(e.score), int(e.finalized_days_ago)) for _, e in indexed]


def recency_weighted_mean(ordered: list[tuple[float, int]]) -> Optional[float]:
    if not ordered:
        return None
    weight_total = 0.0
    total = 0.0
    for score, days in ordered:
        w = recency_weight(days)
        weight_total += w
        total += w * score
    return total / weight_total


def components_for(student: StudentPerformanceIn, ordered: list[tuple[float, int]]) -> list[tuple[float, float]]:
    """(weight, value 0..100) for every component the student has, fixed order."""
    out: list[tuple[float, float]] = []
    mean = recency_weighted_mean(ordered)
    if mean is not None:
        out.append((EVALUATION_WEIGHT, mean))
    if student.feedback_average is not None:
        out.append((FEEDBACK_WEIGHT, (float(student.feedback_average) - 1) / 4 * 100))
    closed = student.completed_internships + student.abandoned_internships
    if closed > 0:
        out.append((RELIABILITY_WEIGHT, student.completed_internships / closed * 100))
    if student.on_time_rate is not None:
        out.append((ON_TIME_WEIGHT, float(student.on_time_rate) * 100))
    return out


def performance_index(components: list[tuple[float, float]]) -> float:
    if not components:
        return 0.0
    weight_total = 0.0
    total = 0.0
    for weight, value in components:
        weight_total += weight
        total += weight * value
    return min(100.0, max(0.0, _round(total / weight_total, 1)))


def band_for(index: float, has_data: bool) -> str:
    if not has_data:
        return "insufficient_data"
    for threshold, band in BANDS:
        if index >= threshold:
            return band
    return LOWEST_BAND


def trend_for(scores: list[float]) -> tuple[str, Optional[float], Optional[float]]:
    """(trend, slope rounded 2dp, predicted next score rounded 1dp)."""
    n = len(scores)
    if n < MIN_TREND_EVALUATIONS:
        return "insufficient_data", None, None

    x_mean = (n - 1) / 2
    y_total = 0.0
    for y in scores:
        y_total += y
    y_mean = y_total / n
    num = 0.0
    den = 0.0
    for i, y in enumerate(scores):
        dx = i - x_mean
        num += dx * (y - y_mean)
        den += dx * dx
    raw = num / den
    slope = _round(raw, 2)

    if slope >= TREND_THRESHOLD:
        trend = "improving"
    elif slope <= -TREND_THRESHOLD:
        trend = "declining"
    else:
        trend = "stable"

    predicted = None
    if n >= MIN_PREDICTION_EVALUATIONS:
        # Fitted line at the next index: intercept + slope·n.
        predicted = _round(min(100.0, max(0.0, y_mean + raw * (n - x_mean))), 1)
    return trend, slope, predicted


def confidence_for(student: StudentPerformanceIn, n: int, has_data: bool) -> float:
    if not has_data:
        return 0.0
    value = min(1.0, n / CONFIDENCE_FULL_EVALUATIONS) * CONFIDENCE_EVALUATION_SHARE
    value += CONFIDENCE_FEEDBACK_SHARE if student.feedback_count > 0 else 0.0
    value += CONFIDENCE_ON_TIME_SHARE if student.on_time_rate is not None else 0.0
    return _round(value, 3)


def areas_for(criteria_averages: dict) -> tuple[list[str], list[str]]:
    items = [(m, float(criteria_averages[m])) for m in METRIC_ORDER if m in criteria_averages]
    order = {m: i for i, m in enumerate(METRIC_ORDER)}
    best_first = sorted(items, key=lambda p: (-p[1], order[p[0]]))
    worst_first = sorted(items, key=lambda p: (p[1], order[p[0]]))
    strengths = [METRIC_LABELS[m] for m, v in best_first if v >= STRENGTH_AT][:MAX_AREAS]
    focus = [METRIC_LABELS[m] for m, v in worst_first if v < FOCUS_BELOW][:MAX_AREAS]
    return strengths, focus


def insights_for(
    student: StudentPerformanceIn,
    scores: list[float],
    trend: str,
    slope: Optional[float],
    predicted: Optional[float],
    has_data: bool,
) -> list[str]:
    if not has_data:
        return [NO_DATA_SENTENCE]

    n = len(scores)
    out: list[str] = []
    if n == 0:
        out.append("No finalized evaluations yet, so there is no score trend to show.")
    elif n == 1:
        out.append(
            f"Only one finalized evaluation so far ({_fmt(scores[0])}/100); a trend needs at least two."
        )
    elif trend == "improving":
        out.append(f"Scores are improving by about {_fmt(abs(slope))} points per evaluation across {n} evaluations.")
    elif trend == "declining":
        out.append(f"Scores are declining by about {_fmt(abs(slope))} points per evaluation across {n} evaluations.")
    else:
        out.append(
            f"Scores are steady across {n} evaluations "
            f"(within {_fmt(TREND_THRESHOLD)} points per evaluation)."
        )

    if predicted is not None:
        out.append(f"If this trend continues, the next evaluation is projected at about {_fmt(predicted)}/100.")

    closed = student.completed_internships + student.abandoned_internships
    if closed > 0:
        out.append(
            f"Finished {student.completed_internships} of {closed} {_plural(closed, 'internship')} "
            f"(completed rather than abandoned)."
        )

    if student.feedback_count > 0 and student.feedback_average is not None:
        text = (
            f"Average feedback rating {_fmt(_round(student.feedback_average, 2))}/5 from "
            f"{student.feedback_count} {_plural(student.feedback_count, 'review')}"
        )
        if student.recommend_rate is not None:
            text += f", {_fmt(_round(student.recommend_rate * 100, 0))}% would recommend"
        out.append(text + ".")

    if student.on_time_rate is not None:
        out.append(f"Delivered {_fmt(_round(student.on_time_rate * 100, 0))}% of milestone submissions on time.")

    return out[:MAX_INSIGHTS]


def analyze_student(student: StudentPerformanceIn) -> PerformanceInsight:
    ordered = chronological_scores(student)
    scores = [score for score, _ in ordered]
    components = components_for(student, ordered)
    has_data = len(scores) > 0 or student.feedback_average is not None

    index = performance_index(components) if has_data else 0.0
    trend, slope, predicted = trend_for(scores)
    strengths, focus = areas_for(student.criteria_averages)

    return PerformanceInsight(
        id=student.id,
        performance_index=index,
        band=band_for(index, has_data),
        trend=trend,
        trend_slope=slope,
        predicted_next_score=predicted,
        confidence=confidence_for(student, len(scores), has_data),
        strengths=strengths,
        focus_areas=focus,
        insights=insights_for(student, scores, trend, slope, predicted, has_data),
    )


def analyze(students: list[StudentPerformanceIn]) -> PerformanceInsightsResponse:
    """One result per student, in input order."""
    return PerformanceInsightsResponse(results=[analyze_student(s) for s in students])
