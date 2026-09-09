"""Deterministic progress-risk engine for Module 8 (Progress Tracking).

Same design rules as `matcher.py`: pure functions, no request-scoped global
state, same input always produces the same output. The backend calls this to
turn a raw progress snapshot into the "performance indicators" and early
delay warnings the module is specified to provide, and falls back to its own
rule set when this service is unreachable.

Nothing here is trained or stochastic — an FYP defence can walk a reader
through every number it produces.
"""
from __future__ import annotations

from app.models.schemas import (
    MilestoneSnapshot,
    ProgressInsightResponse,
    ProgressSnapshot,
    RiskSignal,
)


# Every signal contributes at most its weight to the 0..100 risk score.
_SIGNAL_WEIGHTS: dict[str, int] = {
    "no_plan": 15,
    "schedule_lag": 30,
    "overdue_milestones": 25,
    "open_blockers": 20,
    "inactivity": 20,
    "effort_shortfall": 15,
    "rework": 12,
    "late_submissions": 12,
    "estimate_overrun": 10,
    "deadline_crunch": 20,
    "not_started": 15,
}

# Risk bands. Deliberately generous at the bottom so a healthy internship is
# not nagged, and decisive at the top so a mentor is told to step in.
_MEDIUM_RISK_AT = 25
_HIGH_RISK_AT = 55

# A student idle for longer than this while the internship is live is flagged.
_INACTIVITY_WARN_DAYS = 7.0
_INACTIVITY_CRITICAL_DAYS = 14.0

# How far progress may trail the elapsed schedule before it counts against them.
_SCHEDULE_TOLERANCE = 10.0

_OUTSTANDING = {"pending", "in_progress", "submitted", "changes_requested", "blocked"}
_COUNTED = {
    "pending",
    "in_progress",
    "submitted",
    "changes_requested",
    "completed",
    "blocked",
}


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _expected_percent(snapshot: ProgressSnapshot) -> float | None:
    """Where a linear plan says the student should be, 0..100."""
    if snapshot.elapsed_ratio is None:
        return None
    return _clamp(snapshot.elapsed_ratio, 0.0, 1.0) * 100.0


def _projected_percent(snapshot: ProgressSnapshot) -> int:
    """Extrapolate the current pace out to the target end date."""
    ratio = snapshot.elapsed_ratio
    if ratio is None or ratio <= 0.02:
        # Too early (or no schedule) for extrapolation to mean anything.
        return int(round(_clamp(snapshot.progress_percent, 0, 100)))
    projected = snapshot.progress_percent / _clamp(ratio, 0.02, 1.0)
    return int(round(_clamp(projected, 0, 100)))


def _counted_milestones(milestones: list[MilestoneSnapshot]) -> list[MilestoneSnapshot]:
    return [m for m in milestones if m.status in _COUNTED]


def _outstanding_required(milestones: list[MilestoneSnapshot]) -> list[MilestoneSnapshot]:
    return [m for m in milestones if m.is_required and m.status in _OUTSTANDING]


def _expected_hours(snapshot: ProgressSnapshot) -> float | None:
    """Hours the student should have logged by now, from the weekly target."""
    if not snapshot.expected_hours_per_week or snapshot.elapsed_ratio is None:
        return None
    if snapshot.days_remaining is None:
        return None
    ratio = _clamp(snapshot.elapsed_ratio, 0.0, 1.0)
    if ratio <= 0:
        return 0.0
    # Recover the full window length from the days still to run and the ratio
    # already consumed, then take the elapsed share of it.
    remaining_days = max(0, snapshot.days_remaining)
    if ratio >= 1.0:
        # Past the deadline: fall back to whatever the elapsed portion implies.
        total_days = max(1.0, remaining_days + 1.0)
    else:
        total_days = max(1.0, remaining_days / max(1e-6, 1.0 - ratio))
    elapsed_days = total_days * ratio
    return (elapsed_days / 7.0) * float(snapshot.expected_hours_per_week)


def _build_signals(snapshot: ProgressSnapshot) -> list[RiskSignal]:
    signals: list[RiskSignal] = []
    counted = _counted_milestones(snapshot.milestones)
    outstanding_required = _outstanding_required(snapshot.milestones)

    # --- the plan itself -------------------------------------------------
    if not counted:
        signals.append(
            RiskSignal(
                code="no_plan",
                severity="warning",
                message=(
                    "No milestones have been defined yet, so progress cannot be "
                    "measured objectively."
                ),
                weight=_SIGNAL_WEIGHTS["no_plan"],
            )
        )

    if snapshot.status == "not_started":
        signals.append(
            RiskSignal(
                code="not_started",
                severity="warning",
                message="The internship has been set up but no work has been recorded against it.",
                weight=_SIGNAL_WEIGHTS["not_started"],
            )
        )

    # --- schedule --------------------------------------------------------
    expected = _expected_percent(snapshot)
    if expected is not None and counted:
        variance = snapshot.progress_percent - expected
        if variance < -_SCHEDULE_TOLERANCE:
            behind = abs(variance)
            severity = "critical" if behind >= 30 else "warning"
            # Scale the penalty with how far behind they are, up to the cap.
            weight = int(round(_clamp(behind / 40.0, 0.0, 1.0) * _SIGNAL_WEIGHTS["schedule_lag"]))
            signals.append(
                RiskSignal(
                    code="schedule_lag",
                    severity=severity,
                    message=(
                        f"{snapshot.progress_percent}% complete against roughly "
                        f"{int(round(expected))}% of the time window used — "
                        f"{int(round(behind))} points behind schedule."
                    ),
                    weight=weight,
                )
            )

    if snapshot.overdue_milestones > 0:
        weight = int(
            round(
                _clamp(snapshot.overdue_milestones / 3.0, 0.0, 1.0)
                * _SIGNAL_WEIGHTS["overdue_milestones"]
            )
        )
        signals.append(
            RiskSignal(
                code="overdue_milestones",
                severity="critical",
                message=(
                    f"{snapshot.overdue_milestones} milestone(s) are past their due date "
                    "and still open."
                ),
                weight=weight,
            )
        )

    if (
        snapshot.days_remaining is not None
        and 0 <= snapshot.days_remaining <= 7
        and outstanding_required
    ):
        signals.append(
            RiskSignal(
                code="deadline_crunch",
                severity="critical" if len(outstanding_required) > 1 else "warning",
                message=(
                    f"{len(outstanding_required)} required milestone(s) still open with "
                    f"{snapshot.days_remaining} day(s) left."
                ),
                weight=_SIGNAL_WEIGHTS["deadline_crunch"],
            )
        )

    # --- engagement ------------------------------------------------------
    if snapshot.open_blockers > 0:
        signals.append(
            RiskSignal(
                code="open_blockers",
                severity="critical" if snapshot.open_blockers > 1 else "warning",
                message=f"{snapshot.open_blockers} unresolved blocker(s) are holding up the work.",
                weight=_SIGNAL_WEIGHTS["open_blockers"],
            )
        )

    idle = snapshot.days_since_last_activity
    if idle is not None and snapshot.status == "in_progress":
        if idle >= _INACTIVITY_CRITICAL_DAYS:
            signals.append(
                RiskSignal(
                    code="inactivity",
                    severity="critical",
                    message=f"No activity recorded for {int(idle)} days.",
                    weight=_SIGNAL_WEIGHTS["inactivity"],
                )
            )
        elif idle >= _INACTIVITY_WARN_DAYS:
            signals.append(
                RiskSignal(
                    code="inactivity",
                    severity="warning",
                    message=f"No activity recorded for {int(idle)} days.",
                    weight=int(round(_SIGNAL_WEIGHTS["inactivity"] * 0.6)),
                )
            )

    expected_hours = _expected_hours(snapshot)
    if expected_hours is not None and expected_hours >= 4:
        shortfall = expected_hours - snapshot.total_hours_logged
        if shortfall > expected_hours * 0.35:
            signals.append(
                RiskSignal(
                    code="effort_shortfall",
                    severity="warning",
                    message=(
                        f"{snapshot.total_hours_logged:.1f}h logged against roughly "
                        f"{expected_hours:.0f}h expected at this point."
                    ),
                    weight=_SIGNAL_WEIGHTS["effort_shortfall"],
                )
            )

    # --- quality ---------------------------------------------------------
    if snapshot.rework_rate is not None and snapshot.rework_rate > 0.4:
        signals.append(
            RiskSignal(
                code="rework",
                severity="warning",
                message=(
                    f"{int(round(snapshot.rework_rate * 100))}% of submissions came back "
                    "for changes — the brief may not be landing."
                ),
                weight=_SIGNAL_WEIGHTS["rework"],
            )
        )

    if snapshot.on_time_submission_rate is not None and snapshot.on_time_submission_rate < 0.6:
        signals.append(
            RiskSignal(
                code="late_submissions",
                severity="warning",
                message=(
                    f"Only {int(round(snapshot.on_time_submission_rate * 100))}% of "
                    "submissions arrived before their due date."
                ),
                weight=_SIGNAL_WEIGHTS["late_submissions"],
            )
        )

    overrunning = [
        m
        for m in snapshot.milestones
        if m.estimated_hours and m.estimated_hours > 0 and m.actual_hours > m.estimated_hours * 1.5
    ]
    if overrunning:
        signals.append(
            RiskSignal(
                code="estimate_overrun",
                severity="info",
                message=(
                    f"{len(overrunning)} milestone(s) have taken over 1.5x their estimate — "
                    "the scope may be larger than planned."
                ),
                weight=_SIGNAL_WEIGHTS["estimate_overrun"],
            )
        )

    return signals


def _build_recommendations(
    snapshot: ProgressSnapshot, signals: list[RiskSignal]
) -> list[str]:
    codes = {s.code for s in signals}
    out: list[str] = []

    if "no_plan" in codes:
        out.append("Break the task into 3-6 weighted milestones with due dates so progress is measurable.")
    if "not_started" in codes:
        out.append("Ask the student to start the first milestone and log their first hours this week.")
    if "open_blockers" in codes:
        out.append("Clear the open blocker before anything else — it is gating the rest of the plan.")
    if "overdue_milestones" in codes or "deadline_crunch" in codes:
        out.append(
            "Re-baseline the overdue milestones: either move the dates or cut optional scope."
        )
    if "schedule_lag" in codes:
        out.append("Schedule a check-in this week to agree a catch-up plan for the remaining milestones.")
    if "inactivity" in codes:
        out.append("Reach out directly — a silent week usually means the student is stuck, not idle.")
    if "effort_shortfall" in codes:
        out.append("Confirm the student can still commit the agreed weekly hours.")
    if "rework" in codes:
        out.append("Tighten the acceptance criteria on the next milestone before work starts.")
    if "late_submissions" in codes:
        out.append("Agree an internal deadline a couple of days ahead of each milestone due date.")
    if "estimate_overrun" in codes:
        out.append("Revisit the hour estimates on the remaining milestones — they look optimistic.")

    if not out:
        if snapshot.progress_percent >= 100:
            out.append("All milestones are complete — review the work and close the internship out.")
        else:
            out.append("On track. Keep the current cadence and log time as you go.")

    return out


def _summarise(
    snapshot: ProgressSnapshot,
    risk_level: str,
    projected: int,
    variance: float | None,
) -> str:
    title = snapshot.task_title or "the internship"

    if snapshot.status == "completed":
        return f"{title} is complete at {snapshot.progress_percent}%."
    if snapshot.status == "abandoned":
        return f"{title} was abandoned at {snapshot.progress_percent}%."
    if snapshot.status == "paused":
        return f"{title} is paused at {snapshot.progress_percent}%."

    parts = [f"{snapshot.progress_percent}% of the milestone weight on {title} is complete"]

    if variance is not None:
        if variance >= _SCHEDULE_TOLERANCE:
            parts.append(f"running about {int(round(variance))} points ahead of schedule")
        elif variance <= -_SCHEDULE_TOLERANCE:
            parts.append(f"about {int(round(abs(variance)))} points behind schedule")
        else:
            parts.append("broadly in line with the schedule")

    if snapshot.days_remaining is not None:
        if snapshot.days_remaining < 0:
            parts.append(f"{abs(snapshot.days_remaining)} day(s) past the target end date")
        else:
            parts.append(f"{snapshot.days_remaining} day(s) remaining")

    if variance is not None and projected < 100 and snapshot.status == "in_progress":
        parts.append(f"projecting {projected}% by the deadline at the current pace")

    sentence = ", ".join(parts) + "."
    prefix = {
        "low": "On track. ",
        "medium": "Needs attention. ",
        "high": "At risk. ",
    }[risk_level]
    return prefix + sentence[0].upper() + sentence[1:]


def analyze_progress(snapshot: ProgressSnapshot) -> ProgressInsightResponse:
    """Turn a progress snapshot into risk level, signals and recommendations."""
    signals = _build_signals(snapshot)
    projected = _projected_percent(snapshot)

    expected = _expected_percent(snapshot)
    variance = None if expected is None else snapshot.progress_percent - expected

    # A closed internship carries no forward-looking risk.
    if snapshot.status in {"completed", "abandoned"}:
        signals = []
        risk_score = 0
    else:
        risk_score = int(round(_clamp(sum(s.weight for s in signals), 0, 100)))

    if risk_score >= _HIGH_RISK_AT:
        risk_level = "high"
    elif risk_score >= _MEDIUM_RISK_AT:
        risk_level = "medium"
    else:
        risk_level = "low"

    counted = _counted_milestones(snapshot.milestones)
    completed = [m for m in counted if m.status == "completed"]

    indicators = {
        "completion_rate": round(
            (len(completed) / len(counted)) * 100.0 if counted else 0.0, 2
        ),
        "weighted_completion": float(snapshot.progress_percent),
        "expected_completion": round(expected, 2) if expected is not None else 0.0,
        "schedule_variance": round(variance, 2) if variance is not None else 0.0,
        "projected_completion": float(projected),
        "hours_logged": round(float(snapshot.total_hours_logged), 2),
        "open_blockers": float(snapshot.open_blockers),
        "overdue_milestones": float(snapshot.overdue_milestones),
        "days_since_last_activity": round(float(snapshot.days_since_last_activity), 2)
        if snapshot.days_since_last_activity is not None
        else 0.0,
        "on_time_submission_rate": round(float(snapshot.on_time_submission_rate) * 100.0, 2)
        if snapshot.on_time_submission_rate is not None
        else 0.0,
        "rework_rate": round(float(snapshot.rework_rate) * 100.0, 2)
        if snapshot.rework_rate is not None
        else 0.0,
    }

    return ProgressInsightResponse(
        progress_id=snapshot.id,
        risk_level=risk_level,
        risk_score=risk_score,
        projected_completion_percent=projected,
        schedule_variance=round(variance, 2) if variance is not None else 0.0,
        summary=_summarise(snapshot, risk_level, projected, variance),
        # Most serious first, so a UI that truncates keeps the important ones.
        signals=sorted(signals, key=lambda s: s.weight, reverse=True),
        recommendations=_build_recommendations(snapshot, signals),
        indicators=indicators,
    )
