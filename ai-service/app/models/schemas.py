from __future__ import annotations

from typing import Annotated, Literal, Optional

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


# ---------------------------------------------------------------------------
# Automated evaluation (Module 9)
# ---------------------------------------------------------------------------


EvaluationMetric = Literal[
    "quality",
    "timeliness",
    "completion",
    "communication",
    "effort",
    "reliability",
]
Grade = Literal["A", "B", "C", "D", "F"]


class EvaluationCriterionIn(BaseModel):
    """One rubric line. The metric decides which rule scores it."""

    model_config = ConfigDict(extra="ignore")

    id: str
    name: str = ""
    metric: EvaluationMetric
    weight: int = Field(default=1, ge=1, le=10)


class EvaluationEvidence(BaseModel):
    """What the backend measured over the whole internship.

    Rates are 0..1 and None when there was nothing to measure — None means
    "no evidence", which is scored neutrally, never as zero.
    """

    model_config = ConfigDict(extra="ignore")

    weighted_completion: float = Field(default=0, ge=0, le=100)
    milestone_count: int = 0
    completed_milestones: int = 0
    required_outstanding: int = 0
    closed_with_outstanding_work: bool = False
    submission_count: int = 0
    reviewed_count: int = 0
    on_time_submission_rate: Optional[float] = Field(default=None, ge=0, le=1)
    rework_rate: Optional[float] = Field(default=None, ge=0, le=1)
    first_time_approval_rate: Optional[float] = Field(default=None, ge=0, le=1)
    average_review_score: Optional[float] = Field(default=None, ge=1, le=5)
    supervisor_rating: Optional[float] = Field(default=None, ge=1, le=5)
    hours_logged: float = 0
    expected_hours: Optional[float] = None
    estimated_hours: Optional[float] = None
    active_weeks: float = Field(default=1, ge=0)
    checkin_count: int = 0
    blockers_raised: int = 0
    blockers_resolved: int = 0
    finished_on_time: Optional[bool] = None
    days_late: int = Field(default=0, ge=0)


class EvaluationSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    task_title: str = ""
    criteria: list[EvaluationCriterionIn] = Field(min_length=1)
    evidence: EvaluationEvidence


class EvaluateRequest(BaseModel):
    evaluation: EvaluationSnapshot


class CriterionResult(BaseModel):
    id: str
    score: float = Field(ge=0, le=100)
    rationale: str
    evidence: list[str] = Field(default_factory=list)
    # False when the rule had nothing to go on and fell back to the neutral score.
    has_evidence: bool = True


class EvaluateResponse(BaseModel):
    evaluation_id: str
    overall_score: float = Field(ge=0, le=100)
    grade: Grade
    # Share of criteria that were backed by recorded evidence, 0..1.
    confidence: float = Field(ge=0, le=1)
    summary: str
    criteria: list[CriterionResult]
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Feedback assist (Module 10)
# ---------------------------------------------------------------------------


FeedbackContext = Literal["internship", "interview"]


class FeedbackCriterionIn(BaseModel):
    """One scored criterion from the Module 9 evaluation, used as evidence."""

    model_config = ConfigDict(extra="ignore")

    name: str = ""
    metric: EvaluationMetric
    score: float = Field(ge=0, le=100)
    weight: int = Field(default=1, ge=1, le=10)


class FeedbackIndicators(BaseModel):
    """Module 8 performance indicators. Rates are 0..1; None = not measured."""

    model_config = ConfigDict(extra="ignore")

    weighted_completion: Optional[float] = Field(default=None, ge=0, le=100)
    on_time_submission_rate: Optional[float] = Field(default=None, ge=0, le=1)
    rework_rate: Optional[float] = Field(default=None, ge=0, le=1)
    average_review_score: Optional[float] = Field(default=None, ge=1, le=5)
    checkin_count: Optional[int] = Field(default=None, ge=0)
    hours_logged: Optional[float] = Field(default=None, ge=0)


class FeedbackDraft(BaseModel):
    """What the author has written so far. Everything optional."""

    model_config = ConfigDict(extra="ignore")

    strengths: Optional[str] = None
    improvements: Optional[str] = None
    suggestions: list[str] = Field(default_factory=list)
    overall_rating: Optional[int] = Field(default=None, ge=1, le=5)


class FeedbackSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    context: FeedbackContext
    task_title: str = ""
    student_name: Optional[str] = None
    overall_rating: Optional[int] = Field(default=None, ge=1, le=5)
    criteria: list[FeedbackCriterionIn] = Field(default_factory=list)
    indicators: FeedbackIndicators = Field(default_factory=FeedbackIndicators)
    draft: FeedbackDraft = Field(default_factory=FeedbackDraft)


class FeedbackAssistRequest(BaseModel):
    feedback: FeedbackSnapshot


class FeedbackIssue(BaseModel):
    code: str
    severity: Severity
    message: str


class FeedbackReview(BaseModel):
    quality_score: int = Field(ge=0, le=100)
    issues: list[FeedbackIssue] = Field(default_factory=list)


class FeedbackAssistResponse(BaseModel):
    suggested_overall_rating: Optional[int] = Field(default=None, ge=1, le=5)
    suggested_strengths: list[str] = Field(default_factory=list)
    suggested_improvements: list[str] = Field(default_factory=list)
    suggested_suggestions: list[str] = Field(default_factory=list)
    review: FeedbackReview


# ---------------------------------------------------------------------------
# Performance insights (Module 11)
# ---------------------------------------------------------------------------


PerformanceBand = Literal["excellent", "strong", "developing", "needs_support", "insufficient_data"]
PerformanceTrend = Literal["improving", "stable", "declining", "insufficient_data"]


class PerformanceEvaluationIn(BaseModel):
    """One finalized Module 9 evaluation: its final score and its age."""

    model_config = ConfigDict(extra="ignore")

    score: float = Field(ge=0, le=100)
    # Whole days since the evaluation was finalized; drives recency weighting
    # and the chronological order used for the trend.
    finalized_days_ago: int = Field(default=0, ge=0)


class StudentPerformanceIn(BaseModel):
    """A student's recorded track record. Rates are 0..1; None = not measured."""

    model_config = ConfigDict(extra="ignore")

    id: str
    evaluations: list[PerformanceEvaluationIn] = Field(default_factory=list)
    # Average final criterion score per Module 9 metric, 0..100.
    criteria_averages: dict[EvaluationMetric, Annotated[float, Field(ge=0, le=100)]] = Field(default_factory=dict)
    feedback_average: Optional[float] = Field(default=None, ge=1, le=5)
    feedback_count: int = Field(default=0, ge=0)
    recommend_rate: Optional[float] = Field(default=None, ge=0, le=1)
    completed_internships: int = Field(default=0, ge=0)
    abandoned_internships: int = Field(default=0, ge=0)
    on_time_rate: Optional[float] = Field(default=None, ge=0, le=1)


class PerformanceInsightsRequest(BaseModel):
    students: list[StudentPerformanceIn] = Field(min_length=1, max_length=200)


class PerformanceInsight(BaseModel):
    id: str
    performance_index: float = Field(ge=0, le=100)
    band: PerformanceBand
    trend: PerformanceTrend
    # Points per evaluation (least-squares slope), None with < 2 evaluations.
    trend_slope: Optional[float] = None
    predicted_next_score: Optional[float] = Field(default=None, ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    strengths: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)


class PerformanceInsightsResponse(BaseModel):
    results: list[PerformanceInsight] = Field(default_factory=list)
