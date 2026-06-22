"""Pure scoring engine for student <-> task matching.

The engine is deterministic: same input -> same output. It avoids any
request-scoped global state. An optional sentence-transformer embedder is
loaded lazily and only when `AI_USE_EMBEDDINGS=true`; if the model fails to
load, the engine transparently falls back to TF-IDF.
"""
from __future__ import annotations

import math
import os
import threading
from typing import Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.schemas import (
    MatchScore,
    SkillIn,
    StudentProfile,
    TaskInput,
)


_LEVEL_WEIGHT: dict[str, float] = {
    "beginner": 0.6,
    "intermediate": 0.85,
    "advanced": 1.0,
}
_LEVEL_ORDER: dict[str, int] = {"beginner": 0, "intermediate": 1, "advanced": 2}
_TASK_TO_SKILL_LEVEL: dict[str, str] = {
    "entry": "beginner",
    "intermediate": "intermediate",
    "expert": "advanced",
}

_WEIGHTS = {
    "skill_match": 0.55,
    "experience_fit": 0.15,
    "level_fit": 0.10,
    "interest_overlap": 0.10,
    "text_similarity": 0.10,
}


# ---------------------------------------------------------------------------
# Optional embedding backend
# ---------------------------------------------------------------------------

_embedder_lock = threading.Lock()
_embedder: Optional[object] = None
_embedder_tried: bool = False


def is_model_loaded() -> bool:
    """True only if the sentence-transformer model is loaded in this process."""
    return _embedder is not None


def _use_embeddings() -> bool:
    return os.getenv("AI_USE_EMBEDDINGS", "false").lower() in {"1", "true", "yes"}


def _get_embedder():
    global _embedder, _embedder_tried
    if _embedder is not None or _embedder_tried:
        return _embedder
    with _embedder_lock:
        if _embedder is not None or _embedder_tried:
            return _embedder
        _embedder_tried = True
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            model_name = os.getenv("AI_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
            _embedder = SentenceTransformer(model_name)
        except Exception:
            _embedder = None
        return _embedder


def warm_embedder() -> bool:
    """Eagerly load the embedding model if enabled. Returns True on success."""
    if not _use_embeddings():
        return False
    return _get_embedder() is not None


# ---------------------------------------------------------------------------
# Component scorers
# ---------------------------------------------------------------------------


def _norm(s: str) -> str:
    return s.strip().lower()


def _skill_match(
    student_skills: list[SkillIn], required_skills: list[SkillIn]
) -> tuple[float, list[str], list[str]]:
    if not required_skills:
        return 1.0, [], []

    student_map: dict[str, str] = {_norm(s.name): s.level for s in student_skills}

    matched: list[str] = []
    missing: list[str] = []
    earned = 0.0
    penalty = 0.0

    for req in required_skills:
        key = _norm(req.name)
        if key in student_map:
            stu_level = student_map[key]
            stu_w = _LEVEL_WEIGHT[stu_level]
            req_w = _LEVEL_WEIGHT[req.level]
            # if student >= required, full credit; else proportional
            credit = stu_w if _LEVEL_ORDER[stu_level] >= _LEVEL_ORDER[req.level] else stu_w / req_w
            earned += min(1.0, credit)
            matched.append(req.name)
        else:
            # missing required skill hurts harder than just "not earned"
            penalty += 0.5 * _LEVEL_WEIGHT[req.level]
            missing.append(req.name)

    raw = (earned - penalty) / len(required_skills)
    return max(0.0, min(1.0, raw)), matched, missing


def _experience_fit(years: float, level: str) -> float:
    y = max(0.0, float(years))
    if level == "entry":
        if y <= 1.0:
            return 1.0
        # gentle decay: overqualified still OK but slightly worse
        return max(0.3, 1.0 - (y - 1.0) * 0.15)
    if level == "intermediate":
        if 1.0 <= y <= 3.0:
            return 1.0
        if y < 1.0:
            return max(0.2, y)  # 0y -> 0.2, 1y -> 1.0
        return max(0.3, 1.0 - (y - 3.0) * 0.12)
    if level == "expert":
        if y >= 3.0:
            return 1.0
        return max(0.0, y / 3.0)
    return 0.5


def _level_fit(student_skills: list[SkillIn], task_level: str) -> float:
    if not student_skills:
        return 0.3
    dominant = max(student_skills, key=lambda s: _LEVEL_ORDER[s.level])
    required_skill_level = _TASK_TO_SKILL_LEVEL[task_level]
    diff = _LEVEL_ORDER[dominant.level] - _LEVEL_ORDER[required_skill_level]
    if diff >= 0:
        return 1.0
    return max(0.0, 1.0 + diff * 0.4)  # diff=-1 -> 0.6; diff=-2 -> 0.2


def _interest_overlap(interests: list[str], tags: list[str]) -> float:
    if not tags:
        return 0.5  # neutral when no tags published
    si = {_norm(x) for x in interests if x}
    st = {_norm(x) for x in tags if x}
    if not st:
        return 0.5
    return len(si & st) / len(st)


def _student_text(student: StudentProfile) -> str:
    parts: list[str] = []
    if student.bio:
        parts.append(student.bio)
    if student.interests:
        parts.append(" ".join(student.interests))
    parts.append(" ".join(s.name for s in student.skills))
    return " ".join(p for p in parts if p).strip()


def _task_text(task: TaskInput) -> str:
    parts: list[str] = [task.title, task.description, task.category]
    if task.tags:
        parts.append(" ".join(task.tags))
    parts.append(" ".join(s.name for s in task.required_skills))
    return " ".join(p for p in parts if p).strip()


def _text_similarity(student: StudentProfile, task: TaskInput) -> float:
    a = _student_text(student)
    b = _task_text(task)
    if not a or not b:
        return 0.0

    if _use_embeddings():
        model = _get_embedder()
        if model is not None:
            try:
                vecs = model.encode([a, b], normalize_embeddings=True)
                sim = float(np.dot(vecs[0], vecs[1]))
                return max(0.0, min(1.0, sim))
            except Exception:
                pass  # fall through to TF-IDF

    try:
        vec = TfidfVectorizer(stop_words="english", lowercase=True, max_features=2000)
        m = vec.fit_transform([a, b])
        sim = float(cosine_similarity(m[0], m[1])[0][0])
    except ValueError:
        # all-stopwords or empty vocabulary
        return 0.0
    if math.isnan(sim):
        return 0.0
    return max(0.0, min(1.0, sim))


# ---------------------------------------------------------------------------
# Reasons
# ---------------------------------------------------------------------------


def _build_reasons(
    *,
    matched: list[str],
    missing: list[str],
    total_required: int,
    breakdown: dict[str, float],
    student: StudentProfile,
    task: TaskInput,
) -> list[str]:
    reasons: list[str] = []
    if total_required > 0:
        reasons.append(
            f"Strong match on {len(matched)}/{total_required} required skills"
            if len(matched) >= total_required - 1
            else f"Matched {len(matched)}/{total_required} required skills"
        )
    for skill in missing[:3]:
        reasons.append(f"Missing required skill: {skill}")
    if breakdown["experience_fit"] >= 0.9:
        reasons.append(f"Experience ({student.experience_years:g}y) fits a {task.experience_level} task")
    elif breakdown["experience_fit"] < 0.4:
        reasons.append(f"Experience ({student.experience_years:g}y) does not fit a {task.experience_level} task")
    shared = sorted(
        {_norm(x) for x in student.interests} & {_norm(x) for x in task.tags}
    )
    if shared:
        reasons.append("Shared interests: " + ", ".join(sorted(shared)))
    if breakdown["text_similarity"] >= 0.5:
        reasons.append("Profile text aligns closely with task description")
    return reasons


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compute_match(student: StudentProfile, task: TaskInput) -> MatchScore:
    skill_score, matched, missing = _skill_match(student.skills, task.required_skills)
    experience_score = _experience_fit(student.experience_years, task.experience_level)
    level_score = _level_fit(student.skills, task.experience_level)
    interest_score = _interest_overlap(student.interests, task.tags)
    text_score = _text_similarity(student, task)

    breakdown = {
        "skill_match": round(skill_score, 4),
        "experience_fit": round(experience_score, 4),
        "level_fit": round(level_score, 4),
        "interest_overlap": round(interest_score, 4),
        "text_similarity": round(text_score, 4),
    }

    weighted = (
        skill_score * _WEIGHTS["skill_match"]
        + experience_score * _WEIGHTS["experience_fit"]
        + level_score * _WEIGHTS["level_fit"]
        + interest_score * _WEIGHTS["interest_overlap"]
        + text_score * _WEIGHTS["text_similarity"]
    )
    final = int(round(max(0.0, min(1.0, weighted)) * 100))

    reasons = _build_reasons(
        matched=matched,
        missing=missing,
        total_required=len(task.required_skills),
        breakdown=breakdown,
        student=student,
        task=task,
    )

    return MatchScore(
        task_id=task.id,
        score=final,
        breakdown=breakdown,
        matched_skills=matched,
        missing_skills=missing,
        reasons=reasons,
    )
