"""Deterministic tests for the progress-risk engine (Module 8).

Run from the ai-service directory:
    pytest -q
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Make `app.*` imports work whether pytest is run from ai-service/ or the repo root.
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

os.environ["AI_USE_EMBEDDINGS"] = "false"

from app.models.schemas import MilestoneSnapshot, ProgressSnapshot  # noqa: E402
from app.services.progress_analyzer import analyze_progress  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def milestone(
    mid: str,
    status: str = "pending",
    *,
    weight: int = 1,
    required: bool = True,
    due_in_days: int | None = None,
    overdue: bool = False,
    submissions: int = 0,
    estimated: float | None = None,
    actual: float = 0,
) -> MilestoneSnapshot:
    return MilestoneSnapshot(
        id=mid,
        title=f"Milestone {mid}",
        status=status,
        weight=weight,
        is_required=required,
        due_in_days=due_in_days,
        is_overdue=overdue,
        submission_count=submissions,
        estimated_hours=estimated,
        actual_hours=actual,
    )


def healthy_snapshot() -> ProgressSnapshot:
    """Half done, half the window used, active this week, no blockers."""
    return ProgressSnapshot(
        id="p-1",
        task_title="Build a React dashboard",
        status="in_progress",
        progress_percent=50,
        elapsed_ratio=0.5,
        days_remaining=14,
        days_since_last_activity=1.0,
        expected_hours_per_week=10,
        total_hours_logged=20.0,
        open_blockers=0,
        overdue_milestones=0,
        recent_checkins=2,
        on_time_submission_rate=1.0,
        rework_rate=0.0,
        milestones=[
            milestone("m1", status="completed", weight=2),
            milestone("m2", status="completed", weight=2),
            milestone("m3", status="in_progress", weight=2),
            milestone("m4", status="pending", weight=2),
        ],
    )


def codes(result) -> set[str]:
    return {s.code for s in result.signals}


# ---------------------------------------------------------------------------
# Healthy path
# ---------------------------------------------------------------------------

def test_healthy_internship_is_low_risk():
    result = analyze_progress(healthy_snapshot())
    assert result.risk_level == "low"
    assert result.risk_score < 25
    assert result.progress_id == "p-1"
    assert result.summary.startswith("On track.")


def test_healthy_internship_projects_full_completion():
    # 50% done with 50% of the window used extrapolates to 100%.
    result = analyze_progress(healthy_snapshot())
    assert result.projected_completion_percent == 100
    assert abs(result.schedule_variance) < 1e-6


def test_indicators_are_populated():
    result = analyze_progress(healthy_snapshot())
    assert result.indicators["completion_rate"] == 50.0
    assert result.indicators["weighted_completion"] == 50.0
    assert result.indicators["hours_logged"] == 20.0


# ---------------------------------------------------------------------------
# Schedule risk
# ---------------------------------------------------------------------------

def test_schedule_lag_is_detected():
    snap = healthy_snapshot()
    snap.progress_percent = 10
    snap.elapsed_ratio = 0.8
    snap.days_remaining = 5
    result = analyze_progress(snap)
    assert "schedule_lag" in codes(result)
    assert result.schedule_variance < 0
    assert result.risk_level in {"medium", "high"}


def test_being_ahead_of_schedule_raises_no_lag_signal():
    snap = healthy_snapshot()
    snap.progress_percent = 90
    snap.elapsed_ratio = 0.3
    result = analyze_progress(snap)
    assert "schedule_lag" not in codes(result)
    assert result.schedule_variance > 0
    assert "ahead of schedule" in result.summary


def test_overdue_milestones_are_critical():
    snap = healthy_snapshot()
    snap.overdue_milestones = 2
    result = analyze_progress(snap)
    signal = next(s for s in result.signals if s.code == "overdue_milestones")
    assert signal.severity == "critical"


def test_deadline_crunch_with_required_work_outstanding():
    snap = healthy_snapshot()
    snap.days_remaining = 3
    result = analyze_progress(snap)
    assert "deadline_crunch" in codes(result)


def test_deadline_crunch_ignores_optional_milestones():
    snap = healthy_snapshot()
    snap.days_remaining = 3
    snap.milestones = [
        milestone("m1", status="completed"),
        milestone("m2", status="pending", required=False),
    ]
    result = analyze_progress(snap)
    assert "deadline_crunch" not in codes(result)


# ---------------------------------------------------------------------------
# Engagement risk
# ---------------------------------------------------------------------------

def test_open_blockers_raise_risk():
    snap = healthy_snapshot()
    snap.open_blockers = 2
    result = analyze_progress(snap)
    assert "open_blockers" in codes(result)
    assert any("blocker" in r.lower() for r in result.recommendations)


def test_inactivity_escalates_with_time():
    warn = healthy_snapshot()
    warn.days_since_last_activity = 8.0
    critical = healthy_snapshot()
    critical.days_since_last_activity = 20.0

    warn_signal = next(s for s in analyze_progress(warn).signals if s.code == "inactivity")
    crit_signal = next(s for s in analyze_progress(critical).signals if s.code == "inactivity")

    assert warn_signal.severity == "warning"
    assert crit_signal.severity == "critical"
    assert crit_signal.weight > warn_signal.weight


def test_inactivity_not_flagged_when_paused():
    snap = healthy_snapshot()
    snap.status = "paused"
    snap.days_since_last_activity = 30.0
    result = analyze_progress(snap)
    assert "inactivity" not in codes(result)


def test_effort_shortfall_detected():
    snap = healthy_snapshot()
    snap.total_hours_logged = 1.0
    result = analyze_progress(snap)
    assert "effort_shortfall" in codes(result)


# ---------------------------------------------------------------------------
# Quality risk
# ---------------------------------------------------------------------------

def test_high_rework_rate_flagged():
    snap = healthy_snapshot()
    snap.rework_rate = 0.75
    result = analyze_progress(snap)
    assert "rework" in codes(result)


def test_late_submissions_flagged():
    snap = healthy_snapshot()
    snap.on_time_submission_rate = 0.25
    result = analyze_progress(snap)
    assert "late_submissions" in codes(result)


def test_estimate_overrun_is_informational():
    snap = healthy_snapshot()
    snap.milestones = [milestone("m1", status="completed", estimated=4, actual=12)]
    result = analyze_progress(snap)
    signal = next(s for s in result.signals if s.code == "estimate_overrun")
    assert signal.severity == "info"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_plan_is_flagged():
    snap = healthy_snapshot()
    snap.milestones = []
    snap.progress_percent = 0
    result = analyze_progress(snap)
    assert "no_plan" in codes(result)
    assert any("milestone" in r.lower() for r in result.recommendations)


def test_not_started_internship_is_flagged():
    snap = ProgressSnapshot(id="p-2", task_title="Fresh", status="not_started")
    result = analyze_progress(snap)
    assert "not_started" in codes(result)


def test_completed_internship_carries_no_risk():
    snap = healthy_snapshot()
    snap.status = "completed"
    snap.progress_percent = 100
    snap.overdue_milestones = 3
    snap.open_blockers = 2
    result = analyze_progress(snap)
    assert result.risk_level == "low"
    assert result.risk_score == 0
    assert result.signals == []
    assert "complete" in result.summary


def test_undated_internship_produces_no_schedule_signals():
    snap = healthy_snapshot()
    snap.elapsed_ratio = None
    snap.days_remaining = None
    result = analyze_progress(snap)
    assert "schedule_lag" not in codes(result)
    assert "deadline_crunch" not in codes(result)
    assert result.schedule_variance == 0.0
    # With no schedule, projection is just current progress.
    assert result.projected_completion_percent == snap.progress_percent


def test_risk_score_is_capped_at_100():
    snap = ProgressSnapshot(
        id="p-3",
        task_title="Everything wrong",
        status="in_progress",
        progress_percent=0,
        elapsed_ratio=0.99,
        days_remaining=1,
        days_since_last_activity=40.0,
        expected_hours_per_week=20,
        total_hours_logged=0.0,
        open_blockers=5,
        overdue_milestones=6,
        on_time_submission_rate=0.0,
        rework_rate=1.0,
        milestones=[milestone("m1", status="blocked", overdue=True, estimated=2, actual=9)],
    )
    result = analyze_progress(snap)
    assert result.risk_score == 100
    assert result.risk_level == "high"
    assert result.summary.startswith("At risk.")


def test_output_is_deterministic():
    snap = healthy_snapshot()
    assert analyze_progress(snap).model_dump() == analyze_progress(snap).model_dump()


def test_signals_are_ordered_by_weight():
    snap = healthy_snapshot()
    snap.progress_percent = 0
    snap.elapsed_ratio = 0.9
    snap.open_blockers = 1
    snap.days_since_last_activity = 9.0
    weights = [s.weight for s in analyze_progress(snap).signals]
    assert weights == sorted(weights, reverse=True)
