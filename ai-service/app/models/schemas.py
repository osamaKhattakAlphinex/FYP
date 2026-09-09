from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


SkillLevel = Literal["beginner", "intermediate", "advanced"]
EducationLevel = Literal["high_school", "bachelors", "masters", "phd", "other"]
TaskLevel = Literal["entry", "intermediate", "expert"]


class SkillIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    level: SkillLevel = "intermediate"


class StudentProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    skills: list[SkillIn] = Field(default_factory=list)
    experience_years: float = 0
    education_level: EducationLevel = "other"
    bio: Optional[str] = None
    interests: list[str] = Field(default_factory=list)


class TaskInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    category: str
    experience_level: TaskLevel
    required_skills: list[SkillIn] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class MatchRequest(BaseModel):
    student: StudentProfile
    tasks: list[TaskInput]


class MatchScore(BaseModel):
    task_id: str
    score: int = Field(ge=0, le=100)
    breakdown: dict[str, float]
    matched_skills: list[str]
    missing_skills: list[str]
    reasons: list[str]


class MatchResponse(BaseModel):
    student_id: str
    results: list[MatchScore]


class RankRequest(BaseModel):
    task: TaskInput
    candidates: list[StudentProfile]


class CandidateRank(BaseModel):
    student_id: str
    score: int = Field(ge=0, le=100)
    breakdown: dict[str, float]
    reasons: list[str]


class RankResponse(BaseModel):
    task_id: str
    ranking: list[CandidateRank]


# ---------------------------------------------------------------------------
# Mentor ranking (Module 7)
# ---------------------------------------------------------------------------


class MentorProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    expertise: list[SkillIn] = Field(default_factory=list)
    experience_years: float = 0
    bio: Optional[str] = None
    specializations: list[str] = Field(default_factory=list)
    active_mentees: int = 0
    max_mentees: int = 5


class RankMentorsRequest(BaseModel):
    task: TaskInput
    mentors: list[MentorProfile]


class MentorRank(BaseModel):
    mentor_id: str
    score: int = Field(ge=0, le=100)
    breakdown: dict[str, float]
    matched_skills: list[str]
    missing_skills: list[str]
    reasons: list[str]


class RankMentorsResponse(BaseModel):
    task_id: str
    ranking: list[MentorRank]


# ---------------------------------------------------------------------------
# Progress insight (Module 8)
# ---------------------------------------------------------------------------


MilestoneStatus = Literal[
    "pending",
    "in_progress",
    "submitted",
    "changes_requested",
    "completed",
    "blocked",
    "cancelled",
]
ProgressStatus = Literal["not_started", "in_progress", "paused", "completed", "abandoned"]
RiskLevel = Literal["low", "medium", "high"]
Severity = Literal["info", "warning", "critical"]


class MilestoneSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str = ""
    status: MilestoneStatus = "pending"
    weight: int = 1
    is_required: bool = True
    # Negative once the due date has passed. None when the milestone is undated.
    due_in_days: Optional[int] = None
    is_overdue: bool = False
    submission_count: int = 0
    estimated_hours: Optional[float] = None
    actual_hours: float = 0


class ProgressSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    task_title: str = ""
    status: ProgressStatus = "in_progress"
    progress_percent: int = Field(default=0, ge=0, le=100)
    # Fraction of the planned window consumed so far, 0..1. None when undated.
    elapsed_ratio: Optional[float] = None
    days_remaining: Optional[int] = None
    days_since_last_activity: Optional[float] = None
    expected_hours_per_week: Optional[int] = None
    total_hours_logged: float = 0
    open_blockers: int = 0
    overdue_milestones: int = 0
    recent_checkins: int = 0
    # 0..1. None when the student has not submitted anything yet.
    on_time_submission_rate: Optional[float] = None
    rework_rate: Optional[float] = None
    milestones: list[MilestoneSnapshot] = Field(default_factory=list)


class ProgressInsightRequest(BaseModel):
    progress: ProgressSnapshot


class RiskSignal(BaseModel):
    code: str
    severity: Severity
    message: str
    # Contribution of this signal to the overall risk score, 0..100.
    weight: int = 0


class ProgressInsightResponse(BaseModel):
    progress_id: str
    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    # Where the current pace lands the student by the target end date.
    projected_completion_percent: int = Field(ge=0, le=100)
    # progress_percent minus the percentage the schedule says they should be at.
    schedule_variance: float
    summary: str
    signals: list[RiskSignal] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    indicators: dict[str, float] = Field(default_factory=dict)
