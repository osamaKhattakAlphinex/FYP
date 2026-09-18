"""Deterministic rubric evaluator for Module 9 (Automated Evaluation).

Same design rules as `progress_analyzer.py`: pure functions, no global state,
same input always produces the same output. The backend sends the rubric a
company defined for the task plus the evidence it measured over the whole
internship; each criterion is scored 0..100 by the rule for its metric, with a
written rationale and the evidence lines behind it.

The ethical NFR (§2.3.2.5) asks automated decisions to give clear reasons, so
every rule below is a short formula and every constant is named and commented.
The backend mirrors these rules in `evaluationService.fallbackEvaluation` for
when this service is unreachable — keep the two in step.
"""
from __future__ import annotations

import math

from app.models.schemas import (
    CriterionResult,
    EvaluateResponse,
    EvaluationCriterionIn,
    EvaluationEvidence,
    EvaluationSnapshot,
)


# Score given to a criterion when there is nothing recorded to judge it on.
# Deliberately a "pass but unremarkable" C, so a missing signal neither sinks
# nor flatters the student — and it lowers `confidence` so reviewers know.
NEUTRAL_SCORE = 60.0

# --- quality ---------------------------------------------------------------
# Per-submission review scores are the main signal; the supervisor's closing
# rating is a single holistic judgement, so it counts for less.
QUALITY_REVIEW_SHARE = 0.7
QUALITY_SUPERVISOR_SHARE = 0.3
# Rework above this share of reviews starts to cost quality points…
QUALITY_REWORK_THRESHOLD = 0.3
# …up to this many, reached when 70% of reviews came back for changes.
QUALITY_REWORK_MAX_PENALTY = 15.0
QUALITY_REWORK_FULL_AT = 0.7

# --- timeliness ------------------------------------------------------------
LATE_FINISH_PENALTY = 20.0
LATE_FINISH_PER_DAY = 2.0
LATE_FINISH_MAX_PENALTY = 30.0

# --- completion ------------------------------------------------------------
OUTSTANDING_WORK_PENALTY = 15.0

# --- communication ---------------------------------------------------------
# One check-in a week is the cadence Module 8 nudges students towards.
CHECKINS_PER_WEEK_TARGET = 1.0
CHECKIN_SHARE = 80.0
# Raising a blocker early and getting it cleared is good communication.
BLOCKER_RESOLVED_BONUS = 20.0

# --- effort ----------------------------------------------------------------
# Logged hours against the expected (weekly target × weeks) or estimated hours.
EFFORT_BAND_LOW = 0.9
EFFORT_BAND_HIGH = 1.3
# Over-running is only gently penalised: it bottoms out at this score…
EFFORT_OVERRUN_FLOOR = 80.0
# …once the student has logged this multiple of the baseline.
EFFORT_OVERRUN_FLOOR_AT = 2.0

# --- reliability -----------------------------------------------------------
UNRESOLVED_BLOCKER_PENALTY = 10.0

# --- grades, feedback ------------------------------------------------------
GRADE_BANDS: list[tuple[float, str]] = [(85, "A"), (70, "B"), (55, "C"), (40, "D")]
STRENGTH_AT = 80.0
IMPROVEMENT_BELOW = 60.0
MAX_FEEDBACK_ITEMS = 3

# Prefix of the evidence line that carries the supervisor's private rating.
# The backend strips lines with this prefix from the student's view (Module 8
# keeps `performanceRating` away from students), so it must not change.
SUPERVISOR_RATING_PREFIX = "Supervisor closing rating"


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _round(value: float, places: int) -> float:
    """Half-up rounding, matching JavaScript's Math.round in the backend
    fallback (Python's round() is banker's rounding and would drift)."""
    factor = 10 ** places
    return math.floor(float(value) * factor + 0.5) / factor


def _pct(rate: float) -> str:
    return f"{int(round(rate * 100))}%"


def grade_for(score: float) -> str:
    for threshold, grade in GRADE_BANDS:
        if score >= threshold:
            return grade
    return "F"


# A metric rule returns (score, has_evidence, rationale, evidence lines).
Scored = tuple[float, bool, str, list[str]]


def _neutral(reason: str) -> Scored:
    return (
        NEUTRAL_SCORE,
        False,
        f"Neutral score — insufficient evidence: {reason}",
        [],
    )


def score_quality(ev: EvaluationEvidence) -> Scored:
    review = (
        (ev.average_review_score - 1.0) / 4.0 * 100.0
        if ev.average_review_score is not None
        else None
    )
    supervisor = (
        (ev.supervisor_rating - 1.0) / 4.0 * 100.0
        if ev.supervisor_rating is not None
        else None
    )
    if review is None and supervisor is None:
        return _neutral("no submission was given a review score and no closing rating was recorded.")

    lines: list[str] = []
    if review is not None and supervisor is not None:
        base = QUALITY_REVIEW_SHARE * review + QUALITY_SUPERVISOR_SHARE * supervisor
        how = "review scores (70%) blended with the supervisor's closing rating (30%)"
    elif review is not None:
        base = review
        how = "the average review score"
    else:
        base = supervisor  # type: ignore[assignment]
        how = "the supervisor's closing rating"

    if ev.average_review_score is not None:
        lines.append(
            f"Average review score {ev.average_review_score:.2f}/5 across "
            f"{ev.reviewed_count} reviewed submission(s)"
        )
    if ev.supervisor_rating is not None:
        lines.append(f"{SUPERVISOR_RATING_PREFIX} {ev.supervisor_rating:g}/5")

    penalty = 0.0
    if ev.rework_rate is not None and ev.rework_rate > QUALITY_REWORK_THRESHOLD:
        share = (ev.rework_rate - QUALITY_REWORK_THRESHOLD) / (
            QUALITY_REWORK_FULL_AT - QUALITY_REWORK_THRESHOLD
        )
        penalty = QUALITY_REWORK_MAX_PENALTY * _clamp(share, 0.0, 1.0)
        lines.append(f"{_pct(ev.rework_rate)} of reviews asked for changes")

    score = _clamp(base - penalty)
    rationale = f"Based on {how}."
    if penalty > 0:
        rationale += f" {penalty:.1f} points deducted for a high rework rate."
    return score, True, rationale, lines


def score_timeliness(ev: EvaluationEvidence) -> Scored:
    if ev.on_time_submission_rate is None and ev.finished_on_time is None:
        return _neutral("nothing was submitted and the internship had no target end date.")

    lines: list[str] = []
    if ev.on_time_submission_rate is not None:
        base = ev.on_time_submission_rate * 100.0
        lines.append(
            f"{_pct(ev.on_time_submission_rate)} of {ev.submission_count} submission(s) "
            "were handed in by their due date"
        )
        rationale = "Share of submissions delivered on time."
    else:
        base = NEUTRAL_SCORE
        rationale = "No submissions to time; starts from the neutral score."

    if ev.finished_on_time is False:
        penalty = min(
            LATE_FINISH_MAX_PENALTY,
            LATE_FINISH_PENALTY + LATE_FINISH_PER_DAY * ev.days_late,
        )
        lines.append(f"Finished {ev.days_late} day(s) after the target end date")
        rationale += f" {penalty:.0f} points deducted for finishing after the deadline."
        base -= penalty
    elif ev.finished_on_time is True:
        lines.append("Finished by the target end date")

    return _clamp(base), True, rationale, lines


def score_completion(ev: EvaluationEvidence) -> Scored:
    if ev.milestone_count <= 0:
        return _neutral("no milestones were planned, so there was no scope to measure against.")

    lines = [
        f"{ev.completed_milestones} of {ev.milestone_count} milestone(s) approved "
        f"({ev.weighted_completion:g}% by weight)"
    ]
    score = float(ev.weighted_completion)
    rationale = "Weighted share of the planned milestones that were approved."
    if ev.closed_with_outstanding_work:
        score -= OUTSTANDING_WORK_PENALTY
        lines.append(f"Closed with {ev.required_outstanding} required milestone(s) still open")
        rationale += (
            f" {OUTSTANDING_WORK_PENALTY:.0f} points deducted because the internship was "
            "closed with required work outstanding."
        )
    return _clamp(score), True, rationale, lines


def score_communication(ev: EvaluationEvidence) -> Scored:
    if ev.checkin_count <= 0 and ev.blockers_raised <= 0:
        return _neutral(
            "no check-ins or blockers were posted on the platform; communication may "
            "have happened elsewhere."
        )

    weeks = max(1.0, float(ev.active_weeks))
    rate = ev.checkin_count / weeks
    score = min(1.0, rate / CHECKINS_PER_WEEK_TARGET) * CHECKIN_SHARE
    lines = [f"{ev.checkin_count} check-in(s) over {weeks:g} active week(s) ({rate:.2f}/week)"]
    rationale = (
        f"Check-in cadence against a target of {CHECKINS_PER_WEEK_TARGET:g} per week "
        f"(worth up to {CHECKIN_SHARE:.0f} points)."
    )
    if ev.blockers_raised > 0:
        lines.append(f"{ev.blockers_raised} blocker(s) raised, {ev.blockers_resolved} resolved")
    if ev.blockers_raised > 0 and ev.blockers_resolved > 0:
        score += BLOCKER_RESOLVED_BONUS
        rationale += (
            f" +{BLOCKER_RESOLVED_BONUS:.0f} for raising blockers early and seeing them resolved."
        )
    return _clamp(score), True, rationale, lines


def score_effort(ev: EvaluationEvidence) -> Scored:
    baseline = ev.expected_hours or ev.estimated_hours
    if not baseline or baseline <= 0:
        return _neutral("no weekly hours target or milestone estimates to compare against.")

    source = "expected hours" if ev.expected_hours else "estimated hours"
    ratio = ev.hours_logged / baseline
    if ratio < EFFORT_BAND_LOW:
        score = ratio / EFFORT_BAND_LOW * 100.0
    elif ratio <= EFFORT_BAND_HIGH:
        score = 100.0
    else:
        over = (ratio - EFFORT_BAND_HIGH) / (EFFORT_OVERRUN_FLOOR_AT - EFFORT_BAND_HIGH)
        score = max(EFFORT_OVERRUN_FLOOR, 100.0 - _clamp(over, 0.0, 1.0) * (100.0 - EFFORT_OVERRUN_FLOOR))

    lines = [f"{ev.hours_logged:g}h logged against {baseline:g}h {source} ({ratio:.2f}×)"]
    rationale = (
        f"Logged hours as a share of the {source}; {EFFORT_BAND_LOW:g}–{EFFORT_BAND_HIGH:g}× "
        "scores full marks and over-running is only gently penalised."
    )
    return _clamp(score), True, rationale, lines


def score_reliability(ev: EvaluationEvidence) -> Scored:
    lines: list[str] = []
    if ev.first_time_approval_rate is not None:
        base = ev.first_time_approval_rate * 100.0
        lines.append(f"{_pct(ev.first_time_approval_rate)} of approved milestones passed on the first attempt")
        rationale = "Share of milestones approved without needing rework."
    elif ev.rework_rate is not None:
        base = (1.0 - ev.rework_rate) * 100.0
        lines.append(f"{_pct(1.0 - ev.rework_rate)} of reviews were approvals")
        rationale = "Share of reviews that did not ask for changes."
    else:
        return _neutral("no submission was reviewed.")

    unresolved = max(0, ev.blockers_raised - ev.blockers_resolved)
    if unresolved > 0:
        base -= UNRESOLVED_BLOCKER_PENALTY
        lines.append(f"{unresolved} blocker(s) left unresolved")
        rationale += f" {UNRESOLVED_BLOCKER_PENALTY:.0f} points deducted for unresolved blockers."
    return _clamp(base), True, rationale, lines


_RULES = {
    "quality": score_quality,
    "timeliness": score_timeliness,
    "completion": score_completion,
    "communication": score_communication,
    "effort": score_effort,
    "reliability": score_reliability,
}

# Phrased as things to keep doing / do next, so the feedback is actionable.
_STRENGTH_TEXT = {
    "quality": "Consistently high-quality deliverables that reviewers rated well.",
    "timeliness": "Reliable delivery — work was handed in on schedule.",
    "completion": "Delivered the planned scope in full.",
    "communication": "Kept supervisors informed with regular check-ins.",
    "effort": "Put in the time the internship called for.",
    "reliability": "Work was usually accepted first time, with little rework.",
}
_IMPROVEMENT_TEXT = {
    "quality": "Raise the quality bar before submitting: self-review against the brief and ask for early feedback.",
    "timeliness": "Plan backwards from due dates and flag slippage before a deadline passes.",
    "completion": "Break remaining scope into smaller milestones and close each one out before starting the next.",
    "communication": "Post a short check-in at least once a week, and raise blockers as soon as they appear.",
    "effort": "Block out regular working time so logged hours track the agreed weekly commitment.",
    "reliability": "Clarify acceptance criteria up front to cut down on rework after review.",
}


def weighted_score(pairs: list[tuple[int, float]]) -> float:
    """Σ(weight·score)/Σweight, rounded to 2dp. 0 when there are no weights."""
    total = sum(w for w, _ in pairs)
    if total <= 0:
        return 0.0
    return _round(sum(w * s for w, s in pairs) / total, 2)


def _summarise(
    snapshot: EvaluationSnapshot,
    scored: list[tuple[EvaluationCriterionIn, float, bool]],
    overall: float,
    grade: str,
    confidence: float,
) -> str:
    title = snapshot.task_title or "this internship"
    ranked = sorted(scored, key=lambda x: (-x[1], x[0].name))
    best, worst = ranked[0], ranked[-1]
    backed = sum(1 for _, _, has in scored if has)
    parts = [
        f"Overall {overall:.0f}/100 (grade {grade}) on {len(scored)} criteria for \"{title}\".",
    ]
    if len(ranked) > 1:
        parts.append(
            f"Strongest: {best[0].name} ({best[1]:.0f}); weakest: {worst[0].name} ({worst[1]:.0f})."
        )
    parts.append(f"{backed} of {len(scored)} criteria were backed by recorded evidence.")
    if confidence < 0.5:
        parts.append(
            "Evidence is thin, so treat this as a starting point and adjust where you know more."
        )
    return " ".join(parts)


def evaluate(snapshot: EvaluationSnapshot) -> EvaluateResponse:
    ev = snapshot.evidence
    results: list[CriterionResult] = []
    scored: list[tuple[EvaluationCriterionIn, float, bool]] = []

    for criterion in snapshot.criteria:
        score, has_evidence, rationale, lines = _RULES[criterion.metric](ev)
        score = _round(_clamp(score), 1)
        results.append(
            CriterionResult(
                id=criterion.id,
                score=score,
                rationale=rationale,
                evidence=lines,
                has_evidence=has_evidence,
            )
        )
        scored.append((criterion, score, has_evidence))

    overall = weighted_score([(c.weight, s) for c, s, _ in scored])
    grade = grade_for(overall)
    confidence = _round(sum(1 for _, _, has in scored if has) / len(scored), 3)

    # Feedback is keyed by metric so two criteria on the same metric do not
    # produce the same sentence twice.
    strengths: list[str] = []
    for c, s, has in sorted(scored, key=lambda x: (-x[1], x[0].name)):
        text = _STRENGTH_TEXT[c.metric]
        if has and s >= STRENGTH_AT and text not in strengths:
            strengths.append(text)
    improvements: list[str] = []
    for c, s, has in sorted(scored, key=lambda x: (x[1], x[0].name)):
        text = _IMPROVEMENT_TEXT[c.metric]
        if has and s < IMPROVEMENT_BELOW and text not in improvements:
            improvements.append(text)

    return EvaluateResponse(
        evaluation_id=snapshot.id,
        overall_score=overall,
        grade=grade,
        confidence=confidence,
        summary=_summarise(snapshot, scored, overall, grade, confidence),
        criteria=results,
        strengths=strengths[:MAX_FEEDBACK_ITEMS],
        improvements=improvements[:MAX_FEEDBACK_ITEMS],
    )
