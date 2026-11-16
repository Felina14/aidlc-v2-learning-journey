"""Typed structures for the Journey, its Stages and the model reply (entities.md, contract C2)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .config import MILESTONES


def sort_milestones(stored: Any) -> list[str]:
    """Read a stored set, a list or a missing value as the known names in the fixed order."""
    names = set(stored) if isinstance(stored, (set, frozenset, list, tuple)) else set()
    return [name for name in MILESTONES if name in names]


@dataclass(frozen=True)
class Materials:
    """What the learner can study in one stage."""

    reading: list[str]
    exercises: list[str]
    mini_project: str
    quiz: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "reading": list(self.reading),
            "exercises": list(self.exercises),
            "miniProject": self.mini_project,
            "quiz": list(self.quiz),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Materials:
        return cls(
            reading=list(data["reading"]),
            exercises=list(data["exercises"]),
            mini_project=data["miniProject"],
            quiz=list(data["quiz"]),
        )


@dataclass(frozen=True)
class Stage:
    """One step of the journey."""

    stage_number: int
    title: str
    what_it_is: str
    why_it_matters: str
    after_this: str
    materials: Materials
    hours: float
    # Hours for reading, exercises, miniProject and quiz. Only a planner-style AI journey has it.
    hours_by_kind: dict[str, float] | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "stageNumber": self.stage_number,
            "title": self.title,
            "whatItIs": self.what_it_is,
            "whyItMatters": self.why_it_matters,
            "afterThis": self.after_this,
            "materials": self.materials.to_dict(),
            "hours": self.hours,
        }
        if self.hours_by_kind is not None:
            data["hoursByKind"] = dict(self.hours_by_kind)
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Stage:
        split = data.get("hoursByKind")
        return cls(
            stage_number=int(data["stageNumber"]),
            title=data["title"],
            what_it_is=data["whatItIs"],
            why_it_matters=data["whyItMatters"],
            after_this=data["afterThis"],
            materials=Materials.from_dict(data["materials"]),
            hours=data["hours"],
            hours_by_kind=dict(split) if isinstance(split, dict) else None,
        )


@dataclass(frozen=True)
class Journey:
    """The one journey a session holds (C2). ``session_id`` and ``expires_at`` are stored only."""

    topic: str
    teaching_style: str
    source: str  # "ai" or "template"
    stages: list[Stage]
    created_at: str
    last_activity_at: str
    completed_stages: list[int] = field(default_factory=list)
    goal_date: str | None = None
    milestones_shown: list[str] = field(default_factory=list)

    def to_public_dict(self) -> dict[str, Any]:
        """The shape sent to the browser; never holds the session ID or the expiry time."""
        return {
            "topic": self.topic,
            "teachingStyle": self.teaching_style,
            "source": self.source,
            "stages": [stage.to_dict() for stage in self.stages],
            "completedStages": sorted(self.completed_stages),
            "goalDate": self.goal_date,
            "milestonesShown": sort_milestones(self.milestones_shown),
            "createdAt": self.created_at,
            "lastActivityAt": self.last_activity_at,
        }

    @classmethod
    def from_public_dict(cls, data: dict[str, Any]) -> Journey:
        return cls(
            topic=data["topic"],
            teaching_style=data["teachingStyle"],
            source=data["source"],
            stages=[Stage.from_dict(s) for s in data["stages"]],
            created_at=data["createdAt"],
            last_activity_at=data["lastActivityAt"],
            completed_stages=[int(n) for n in data.get("completedStages", [])],
            goal_date=data.get("goalDate"),
            milestones_shown=list(data.get("milestonesShown", [])),
        )


@dataclass(frozen=True)
class ModelReply:
    """The checked outcome of one model reply. Held only while a request runs; never stored."""

    refused: bool
    reason: str = ""
    stages: list[Stage] = field(default_factory=list)
