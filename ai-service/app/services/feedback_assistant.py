"""Deterministic feedback assistant for Module 10 (Feedback System).

Two jobs, both pure functions of the input (same design rules as
`progress_analyzer.py` and `evaluator.py`):

1. **Draft** — turn the evidence the platform already holds (Module 9 criterion
   scores, Module 8 indicators) into suggested strengths, improvements and one
   concrete suggestion per improvement, plus a suggested 1-5 rating.
2. **Review** — check what the author has written so far: is it long enough,
   balanced, actionable, and respectful? The ethical NFR (§2.3.2.5) asks the
   platform to protect users from misuse, so personal or insulting language is
   flagged `critical` and the backend refuses to save it.

Nothing here is a language model: every rule is a short, named check so an
author can see exactly why a warning appeared. The backend mirrors these rules
in `feedbackService.fallbackFeedbackAssist` and uses the same review as its
server-side tone guard — keep the two in step (constants, messages, order).
"""
from __future__ import annotations

import math
import re

from app.models.schemas import (
    FeedbackAssistResponse,
    FeedbackCriterionIn,
    FeedbackDraft,
    FeedbackIndicators,
    FeedbackIssue,
    FeedbackReview,
    FeedbackSnapshot,
)


# --- drafting --------------------------------------------------------------
# Same bands as the Module 9 evaluator: a criterion at or above STRENGTH_AT is
# worth praising, one below IMPROVEMENT_BELOW is worth working on.
STRENGTH_AT = 80.0
IMPROVEMENT_BELOW = 60.0
MAX_ITEMS = 3
MAX_SUGGESTIONS = 5

# Indicator thresholds (rates are 0..1).
ON_TIME_STRENGTH_AT = 0.9
ON_TIME_IMPROVEMENT_BELOW = 0.6
REWORK_STRENGTH_AT_MOST = 0.1
REWORK_IMPROVEMENT_ABOVE = 0.4

# One entry per Module 9 metric, so every drafted improvement comes with a
# specific, doable next step rather than "try harder".
STRENGTH_TEXT = {
    "quality": "Delivered high-quality work that reviewers rated well.",
    "timeliness": "Reliable with deadlines: work was handed in on schedule.",
    "completion": "Completed the planned scope in full.",
    "communication": "Kept supervisors informed with regular check-ins.",
    "effort": "Committed the time the internship called for.",
    "reliability": "Work was usually accepted first time, with little rework.",
}
IMPROVEMENT_TEXT = {
    "quality": "Raise the quality of submissions: self-review against the brief before handing work in.",
    "timeliness": "Work on delivering by the agreed due dates.",
    "completion": "Finish the agreed scope: some planned milestones were not completed.",
    "communication": "Communicate more often: share progress and raise blockers early.",
    "effort": "Put in steadier effort so logged time matches the agreed weekly commitment.",
    "reliability": "Reduce rework by clarifying what is expected before submitting.",
}
SUGGESTION_TEXT = {
    "quality": "Ask for a review checkpoint midway through each milestone so issues are caught before the final submission.",
    "timeliness": "Set an internal deadline two days ahead of each due date and flag any slippage as soon as it appears.",
    "completion": "Break the remaining scope into small milestones and close each one out before starting the next.",
    "communication": "Post a short written check-in every week covering progress, next steps and blockers.",
    "effort": "Block out fixed working hours each week so time spent matches the agreed commitment.",
    "reliability": "Confirm the acceptance criteria before starting each milestone to cut down on rework.",
}
# Used when nothing specific needs work, so the student still gets a next step.
GENERIC_GROWTH_SUGGESTION = (
    "Pick one skill used in this internship to deepen next and set a concrete goal for it."
)

# An interview has no recorded evidence to draft from, so the assistant offers
# clearly-labelled templates for the author to replace, never invented facts.
TEMPLATE_PREFIX = "Template: "
INTERVIEW_STRENGTHS = [
    TEMPLATE_PREFIX + "name one thing the candidate did well, e.g. how clearly they explained their past work.",
]
INTERVIEW_IMPROVEMENTS = [
    TEMPLATE_PREFIX + "name one area to prepare better, e.g. giving concrete examples when answering technical questions.",
]
INTERVIEW_SUGGESTIONS = [
    "Prepare two short examples of past work using the situation, action, result format.",
    "Research the company's product before an interview and prepare one question about it.",
]

# --- review ----------------------------------------------------------------
MIN_COMBINED_LENGTH = 40
SHOUTING_MIN_LETTERS = 20
SHOUTING_UPPER_SHARE = 0.6
SEVERITY_PENALTY = {"critical": 40, "warning": 15, "info": 5}

# Personal, insulting words. Deliberately short and about the *person*:
# technical words that merely sound negative ("lazy loading", "dumb component",
# "garbage collection") are left out so honest engineering feedback is never
# blocked.
HARSH_WORDS = [
    "stupid",
    "idiot",
    "idiotic",
    "moron",
    "moronic",
    "incompetent",
    "pathetic",
    "worthless",
    "useless",
    "hopeless",
    "clueless",
    "loser",
    "shut up",
]

# An improvement is "actionable" when it tells the student what to *do*.
ACTION_VERBS = [
    "add",
    "aim",
    "ask",
    "break",
    "build",
    "check",
    "clarify",
    "communicate",
    "consider",
    "document",
    "focus",
    "improve",
    "keep",
    "learn",
    "plan",
    "practice",
    "practise",
    "prepare",
    "prioritise",
    "prioritize",
    "read",
    "refactor",
    "review",
    "schedule",
    "set",
    "share",
    "spend",
    "split",
    "start",
    "test",
    "track",
    "try",
    "use",
    "work on",
    "write",
]

_LETTER = re.compile(r"[A-Za-z]")
_UPPER = re.compile(r"[A-Z]")


def _round_half_up(value: float) -> int:
    # Python's round() is banker's rounding; the backend mirror uses
    # Math.round (half up). Both sides must agree on 3.5 -> 4.
    return int(math.floor(value + 0.5))


def _word_pattern(word: str) -> re.Pattern[str]:
    return re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)


_HARSH_PATTERNS = [(w, _word_pattern(w)) for w in HARSH_WORDS]
_ACTION_PATTERNS = [_word_pattern(w) for w in ACTION_VERBS]


def _clean(text: str | None) -> str:
    return (text or "").strip()


def _clean_list(items: list[str]) -> list[str]:
    return [s.strip() for s in items if s and s.strip()]


# ---------------------------------------------------------------------------
# Drafting
# ---------------------------------------------------------------------------


def suggest_rating(criteria: list[FeedbackCriterionIn]) -> int | None:
    """Weighted criterion mean mapped onto 1..5 (score / 20), or None."""
    if not criteria:
        return None
    total_weight = sum(c.weight for c in criteria)
    mean = sum(c.weight * c.score for c in criteria) / total_weight
    return max(1, min(5, _round_half_up(mean / 20)))


def _draft_internship(
    criteria: list[FeedbackCriterionIn], ind: FeedbackIndicators
) -> tuple[list[str], list[str]]:
    """Returns (strength metrics, improvement metrics), ordered and de-duplicated."""
    strengths: list[str] = []
    improvements: list[str] = []

    by_score_desc = sorted(criteria, key=lambda c: (-c.score, c.name))
    for c in by_score_desc:
        if c.score >= STRENGTH_AT and c.metric not in strengths:
            strengths.append(c.metric)

    by_score_asc = sorted(criteria, key=lambda c: (c.score, c.name))
    for c in by_score_asc:
        if c.score < IMPROVEMENT_BELOW and c.metric not in improvements:
            improvements.append(c.metric)

    # Indicators fill in only where no criterion already spoke for the metric,
    # so a student is never praised and criticised for the same thing.
    def add(metric: str, into: list[str]) -> None:
        if metric not in strengths and metric not in improvements:
            into.append(metric)

    rate = ind.on_time_submission_rate
    if rate is not None:
        if rate >= ON_TIME_STRENGTH_AT:
            add("timeliness", strengths)
        elif rate < ON_TIME_IMPROVEMENT_BELOW:
            add("timeliness", improvements)

    rework = ind.rework_rate
    if rework is not None:
        if rework <= REWORK_STRENGTH_AT_MOST:
            add("reliability", strengths)
        elif rework > REWORK_IMPROVEMENT_ABOVE:
            add("reliability", improvements)

    return strengths[:MAX_ITEMS], improvements[:MAX_ITEMS]


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------


def find_harsh_words(text: str) -> list[str]:
    return [word for word, pattern in _HARSH_PATTERNS if pattern.search(text)]


def is_actionable(text: str) -> bool:
    return any(p.search(text) for p in _ACTION_PATTERNS)


def is_shouting(text: str) -> bool:
    letters = _LETTER.findall(text)
    if len(letters) < SHOUTING_MIN_LETTERS:
        return False
    upper = len(_UPPER.findall(text))
    return upper / len(letters) >= SHOUTING_UPPER_SHARE


def review_draft(draft: FeedbackDraft, fallback_rating: int | None = None) -> FeedbackReview:
    strengths = _clean(draft.strengths)
    improvements = _clean(draft.improvements)
    suggestions = _clean_list(draft.suggestions)
    rating = draft.overall_rating if draft.overall_rating is not None else fallback_rating
    everything = " ".join([strengths, improvements, *suggestions]).strip()

    issues: list[FeedbackIssue] = []

    def flag(code: str, severity: str, message: str) -> None:
        issues.append(FeedbackIssue(code=code, severity=severity, message=message))

    harsh = find_harsh_words(everything)
    if harsh:
        quoted = ", ".join(f'"{w}"' for w in harsh)
        flag(
            "harsh_language",
            "critical",
            f"Remove personal or insulting language ({quoted}). Describe the work and its impact, not the person.",
        )

    if len(strengths) + len(improvements) < MIN_COMBINED_LENGTH:
        flag(
            "too_short",
            "warning",
            f"The feedback is very short. Aim for at least {MIN_COMBINED_LENGTH} characters across strengths and improvements so the student has something to learn from.",
        )

    # Judged per field: one shouted paragraph is shouting even when the rest
    # of the feedback is written normally.
    if any(is_shouting(part) for part in (strengths, improvements, " ".join(suggestions))):
        flag(
            "shouting",
            "warning",
            "Most of the text is in capital letters, which reads as shouting. Use normal sentence case.",
        )

    if not suggestions:
        flag(
            "no_suggestions",
            "warning",
            "Add at least one specific suggestion the student can act on next.",
        )

    if rating is not None and rating <= 2 and not improvements:
        flag(
            "rating_mismatch",
            "warning",
            "A low rating without any improvements gives the student nothing to act on. Explain what fell short.",
        )
    elif rating == 5 and not strengths and improvements:
        flag(
            "rating_mismatch",
            "warning",
            "A top rating with only improvements listed reads as contradictory. Add what went well.",
        )

    if not strengths:
        flag(
            "unbalanced",
            "info",
            "Mention at least one strength. Balanced feedback is easier to accept and act on.",
        )
    elif not improvements and rating is not None and rating <= 4:
        flag(
            "unbalanced",
            "info",
            "The rating is below 5 but no improvements are listed. Say what would have earned a higher rating.",
        )

    if improvements and not is_actionable(improvements):
        flag(
            "not_actionable",
            "info",
            "The improvements describe problems but not what to do. Start with an action, e.g. \"Plan…\", \"Ask…\", \"Test…\".",
        )

    penalty = sum(SEVERITY_PENALTY[i.severity] for i in issues)
    return FeedbackReview(quality_score=max(0, 100 - penalty), issues=issues)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def assist(snapshot: FeedbackSnapshot) -> FeedbackAssistResponse:
    review = review_draft(snapshot.draft, snapshot.overall_rating)

    if snapshot.context == "interview":
        return FeedbackAssistResponse(
            suggested_overall_rating=None,
            suggested_strengths=list(INTERVIEW_STRENGTHS),
            suggested_improvements=list(INTERVIEW_IMPROVEMENTS),
            suggested_suggestions=list(INTERVIEW_SUGGESTIONS),
            review=review,
        )

    strength_metrics, improvement_metrics = _draft_internship(
        snapshot.criteria, snapshot.indicators
    )
    suggestions = [SUGGESTION_TEXT[m] for m in improvement_metrics]
    if not suggestions:
        suggestions = [GENERIC_GROWTH_SUGGESTION]

    return FeedbackAssistResponse(
        suggested_overall_rating=suggest_rating(snapshot.criteria),
        suggested_strengths=[STRENGTH_TEXT[m] for m in strength_metrics],
        suggested_improvements=[IMPROVEMENT_TEXT[m] for m in improvement_metrics],
        suggested_suggestions=suggestions[:MAX_SUGGESTIONS],
        review=review,
    )
