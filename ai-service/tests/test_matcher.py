"""Deterministic tests for the matching engine.

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

# Force TF-IDF only — embeddings are network-heavy and not deterministic across model versions.
os.environ["AI_USE_EMBEDDINGS"] = "false"

from app.models.schemas import SkillIn, StudentProfile, TaskInput  # noqa: E402
from app.services.matcher import compute_match  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _react_student() -> StudentProfile:
    return StudentProfile(
        id="stu-react",
        skills=[
            SkillIn(name="React", level="advanced"),
            SkillIn(name="TypeScript", level="advanced"),
            SkillIn(name="Node.js", level="advanced"),
        ],
        experience_years=2.0,
        education_level="bachelors",
        bio=(
            "Senior frontend engineer building React and TypeScript dashboards "
            "with Node.js APIs."
        ),
        interests=["react", "frontend", "typescript", "dashboards"],
    )


def _react_task() -> TaskInput:
    return TaskInput(
        id="task-react",
        title="React TypeScript dashboard",
        description=(
            "Build a React TypeScript dashboard with a Node.js API backend. "
            "Frontend components, charts, and real-time updates."
        ),
        category="frontend",
        experience_level="intermediate",
        required_skills=[
            SkillIn(name="React", level="advanced"),
            SkillIn(name="TypeScript", level="intermediate"),
            SkillIn(name="Node.js", level="intermediate"),
        ],
        tags=["react", "frontend", "typescript", "dashboards"],
    )


# ---------------------------------------------------------------------------
# Cases
# ---------------------------------------------------------------------------


def test_perfect_match_scores_at_least_90() -> None:
    """Required skills fully present at advanced level + tag overlap + fitting
    experience tier should produce a near-ceiling score."""
    student = _react_student()
    task = _react_task()

    result = compute_match(student, task)

    assert result.task_id == "task-react"
    assert result.score >= 90, (
        f"expected >= 90, got {result.score} (breakdown={result.breakdown})"
    )
    assert set(result.matched_skills) == {"React", "TypeScript", "Node.js"}
    assert result.missing_skills == []
    assert result.breakdown["skill_match"] == 1.0
    assert result.breakdown["interest_overlap"] == 1.0


def test_no_match_scores_at_most_25() -> None:
    """Zero skill overlap + opposite experience tier (entry-level student vs
    expert task) should collapse the score to the floor."""
    student = StudentProfile(
        id="stu-designer",
        skills=[
            SkillIn(name="Photoshop", level="beginner"),
            SkillIn(name="Illustrator", level="beginner"),
        ],
        experience_years=0.0,
        education_level="high_school",
        bio="Aspiring graphic designer interested in posters and branding.",
        interests=["design", "branding"],
    )
    task = TaskInput(
        id="task-k8s",
        title="Kubernetes platform engineer",
        description=(
            "Design and operate a production Kubernetes platform on AWS. "
            "Terraform, Go services, and Prometheus observability."
        ),
        category="devops",
        experience_level="expert",
        required_skills=[
            SkillIn(name="Kubernetes", level="advanced"),
            SkillIn(name="Terraform", level="advanced"),
            SkillIn(name="Go", level="advanced"),
        ],
        tags=["kubernetes", "devops", "aws", "terraform"],
    )

    result = compute_match(student, task)

    assert result.score <= 25, (
        f"expected <= 25, got {result.score} (breakdown={result.breakdown})"
    )
    assert set(result.missing_skills) == {"Kubernetes", "Terraform", "Go"}
    assert result.matched_skills == []
    assert result.breakdown["skill_match"] == 0.0


def test_partial_match_scores_between_50_and_75() -> None:
    """2 out of 3 required skills present with one missing should land in
    the mid-range — clearly above 'no match' but below 'perfect match'."""
    student = StudentProfile(
        id="stu-partial",
        skills=[
            SkillIn(name="React", level="intermediate"),
            SkillIn(name="TypeScript", level="intermediate"),
            # Node.js intentionally absent
        ],
        experience_years=2.0,
        education_level="bachelors",
        bio="Frontend developer comfortable with React and TypeScript.",
        interests=["react", "frontend", "typescript"],
    )
    task = _react_task()

    result = compute_match(student, task)

    assert result.task_id == "task-react"
    assert 50 <= result.score <= 75, (
        f"expected 50..75, got {result.score} (breakdown={result.breakdown})"
    )
    assert set(result.matched_skills) == {"React", "TypeScript"}
    assert result.missing_skills == ["Node.js"]


def test_compute_match_is_deterministic() -> None:
    """Same input twice — same score, same breakdown, same reasons."""
    student = _react_student()
    task = _react_task()

    a = compute_match(student, task)
    b = compute_match(student, task)

    assert a.score == b.score
    assert a.breakdown == b.breakdown
    assert a.matched_skills == b.matched_skills
    assert a.missing_skills == b.missing_skills
    assert a.reasons == b.reasons
