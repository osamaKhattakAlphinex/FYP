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
