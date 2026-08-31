"""Deterministic tests for the mentor ranking engine (Module 7).

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

# Force TF-IDF only — embeddings are network-heavy and not deterministic.
os.environ["AI_USE_EMBEDDINGS"] = "false"

from app.models.schemas import MentorProfile, SkillIn, TaskInput  # noqa: E402
from app.services.matcher import compute_mentor_match  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def react_task(level: str = "intermediate") -> TaskInput:
    return TaskInput(
        id="task-1",
        title="Build a React analytics dashboard",
        description=(
            "Build a responsive analytics dashboard in React with TypeScript, "
            "consuming a Node.js REST API. Charts, filters and auth included."
        ),
        category="Web Development",
        experience_level=level,
        required_skills=[
            SkillIn(name="React", level="advanced"),
            SkillIn(name="TypeScript", level="intermediate"),
            SkillIn(name="Node.js", level="intermediate"),
        ],
        tags=["Web Development", "frontend", "dashboard"],
    )


def senior_react_mentor() -> MentorProfile:
    return MentorProfile(
        id="mentor-senior",
        expertise=[
            SkillIn(name="React", level="advanced"),
            SkillIn(name="TypeScript", level="advanced"),
            SkillIn(name="Node.js", level="advanced"),
        ],
        experience_years=12,
        bio="I lead frontend teams building React and TypeScript dashboards.",
        specializations=["Web Development", "frontend"],
        active_mentees=1,
        max_mentees=5,
    )


def junior_react_mentor() -> MentorProfile:
    return MentorProfile(
        id="mentor-junior",
        expertise=[
            SkillIn(name="React", level="advanced"),
            SkillIn(name="TypeScript", level="advanced"),
            SkillIn(name="Node.js", level="advanced"),
        ],
        experience_years=1,
        bio="I lead frontend teams building React and TypeScript dashboards.",
        specializations=["Web Development", "frontend"],
        active_mentees=1,
        max_mentees=5,
    )


def unrelated_mentor() -> MentorProfile:
    return MentorProfile(
        id="mentor-unrelated",
        expertise=[
            SkillIn(name="Histopathology", level="advanced"),
            SkillIn(name="Phlebotomy", level="advanced"),
        ],
        experience_years=10,
        bio="Clinical laboratory scientist specialising in tissue diagnostics.",
        specializations=["Healthcare"],
        active_mentees=0,
        max_mentees=5,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_strong_expertise_overlap_scores_high():
    result = compute_mentor_match(senior_react_mentor(), react_task())
    assert result.score >= 80, result
    assert result.missing_skills == []
    assert set(result.matched_skills) == {"React", "TypeScript", "Node.js"}


def test_no_overlap_scores_low():
    result = compute_mentor_match(unrelated_mentor(), react_task())
    assert result.score <= 30, result
    assert set(result.missing_skills) == {"React", "TypeScript", "Node.js"}


def test_partial_overlap_lands_in_the_middle():
    mentor = MentorProfile(
        id="mentor-partial",
        expertise=[
            SkillIn(name="React", level="advanced"),
            SkillIn(name="TypeScript", level="intermediate"),
        ],
        experience_years=5,
        bio="Frontend engineer.",
        specializations=["frontend"],
    )
    result = compute_mentor_match(mentor, react_task())
    assert 40 <= result.score <= 80, result
    assert result.missing_skills == ["Node.js"]


def test_seniority_is_never_penalised_on_entry_level_tasks():
    """Regression guard.

    The student-facing _experience_fit decays above the task's level, so reusing
    compute_match here would rank a 12-year mentor BELOW a 1-year mentor on an
    entry-level task. Mentor experience must be monotonic.
    """
    task = react_task(level="entry")
    senior = compute_mentor_match(senior_react_mentor(), task)
    junior = compute_mentor_match(junior_react_mentor(), task)

    # Identical profiles apart from years of experience.
    assert senior.score > junior.score, (senior.score, junior.score)
    assert senior.breakdown["experience_fit"] >= junior.breakdown["experience_fit"]


def test_experience_fit_is_monotonic_non_decreasing():
    task = react_task(level="entry")
    scores = []
    for years in (0, 1, 3, 5, 8, 15, 30):
        mentor = senior_react_mentor()
        mentor.experience_years = years
        scores.append(compute_mentor_match(mentor, task).breakdown["experience_fit"])
    assert scores == sorted(scores), scores


def test_deterministic():
    mentor = senior_react_mentor()
    task = react_task()
    a = compute_mentor_match(mentor, task)
    b = compute_mentor_match(mentor, task)
    assert a.score == b.score
    assert a.breakdown == b.breakdown
    assert a.reasons == b.reasons


def test_reasons_mention_free_capacity():
    mentor = senior_react_mentor()
    mentor.active_mentees = 2
    mentor.max_mentees = 5
    result = compute_mentor_match(mentor, react_task())
    assert any("3 mentee slot(s) free" in r for r in result.reasons), result.reasons
