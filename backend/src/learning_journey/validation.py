"""Topic checks (BR1.1 to BR1.3) and model reply checks (BR1.4, BR2.1 to BR2.4)."""

from __future__ import annotations

import json
import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from typing import Any

from .config import (
    DEFAULT_TEACHING_STYLE,
    HOURS_KINDS,
    INSTRUCTOR_MIN_EXERCISES,
    INSTRUCTOR_MIN_QUIZ,
    MAX_HOURS,
    MAX_LIST_ITEMS,
    MAX_RAW_TOPIC_CHARS,
    MAX_TEXT_CHARS,
    MAX_TOPIC_CHARS,
    MILESTONES,
    MIN_LIST_ITEMS,
    MIN_TOPIC_CHARS,
    PLANNER_TOLERANCE_HOURS,
    TEACHING_STYLES,
)
from .models import Materials, ModelReply, Stage

# The fixed delimiters that wrap the topic in the model request (BR1.3).
DELIMITERS = ("<<<TOPIC_START>>>", "<<<TOPIC_END>>>")

_ZWJ = "\u200d"
_SKIN_TONES = range(0x1F3FB, 0x1F400)
_REGIONAL_INDICATORS = range(0x1F1E6, 0x1F200)
_FENCE = re.compile(r"^```[A-Za-z0-9_-]*\s*\n(.*?)\n?```$", re.DOTALL)
_GOAL_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")


# --- topic ---------------------------------------------------------------------------------------


def clean_topic(raw: Any) -> str:
    """Trim the topic and remove control characters (BR1.1). Non-text becomes empty."""
    if not isinstance(raw, str):
        return ""
    without_controls = "".join(ch for ch in raw if unicodedata.category(ch) != "Cc")
    return without_controls.strip()


def visible_length(text: str) -> int:
    """Count visible characters: accents, emoji tones, joined emoji and flags count as one."""
    count = 0
    index = 0
    while index < len(text):
        ch = text[index]
        code = ord(ch)
        category = unicodedata.category(ch)
        if category in ("Mn", "Me") or code in _SKIN_TONES or ch == _ZWJ:
            # Marks, skin tones and joiners add to the character before them.
            if ch == _ZWJ:
                index += 2  # the joiner glues the next character to the previous one
                continue
            index += 1
            continue
        count += 1
        if code in _REGIONAL_INDICATORS and index + 1 < len(text):
            if ord(text[index + 1]) in _REGIONAL_INDICATORS:
                index += 1  # two regional indicators make one flag
        index += 1
    return count


@dataclass(frozen=True)
class TopicCheck:
    """Outcome of the topic checks: ``problem`` is ``length`` or ``no_letter_or_digit``."""

    ok: bool
    topic: str
    problem: str | None = None


def _has_letter_or_digit(text: str) -> bool:
    for ch in text:
        category = unicodedata.category(ch)
        if category.startswith("L") or category == "Nd":
            return True
    return False


def check_topic(raw: Any) -> TopicCheck:
    """Clean the topic and apply BR1.1 (visible and raw length) and BR1.2 (a letter or digit)."""
    topic = clean_topic(raw)
    if len(topic) > MAX_RAW_TOPIC_CHARS:  # code points; stops mark and joiner floods first
        return TopicCheck(False, topic, "length")
    length = visible_length(topic)
    if length < MIN_TOPIC_CHARS or length > MAX_TOPIC_CHARS:
        return TopicCheck(False, topic, "length")
    if not _has_letter_or_digit(topic):
        return TopicCheck(False, topic, "no_letter_or_digit")
    return TopicCheck(True, topic)


def strip_delimiter(topic: str) -> str:
    """Remove any text equal to a prompt delimiter, repeating until none can re-form (BR1.3)."""
    pattern = re.compile("|".join(re.escape(d) for d in DELIMITERS), re.IGNORECASE)
    previous = None
    while previous != topic:
        previous = topic
        topic = pattern.sub("", topic)
    return topic


# --- model reply ---------------------------------------------------------------------------------


@dataclass(frozen=True)
class ReplyCheck:
    """Outcome of checking a model reply.

    ``kind`` is ``refusal``, ``valid`` or ``invalid``. A refusal or valid result carries the
    checked ``reply``; an invalid result carries a short ``problem`` for the log (never the text).
    """

    kind: str
    reply: ModelReply | None = None
    problem: str | None = None


def _invalid(problem: str) -> ReplyCheck:
    return ReplyCheck("invalid", None, problem)


def _reject_constant(name: str) -> Any:
    raise ValueError(f"non-finite number {name}")


def _parse_object(text: Any) -> dict[str, Any] | None:
    if not isinstance(text, str):
        return None
    body = text.strip()
    fenced = _FENCE.match(body)
    if fenced:
        body = fenced.group(1).strip()
    try:
        value = json.loads(body, parse_constant=_reject_constant)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


def _text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    if not stripped or len(stripped) > MAX_TEXT_CHARS:
        return None
    return stripped


def _text_list(value: Any) -> list[str] | None:
    if not isinstance(value, list) or not MIN_LIST_ITEMS <= len(value) <= MAX_LIST_ITEMS:
        return None
    items = [_text(item) for item in value]
    if any(item is None for item in items):
        return None
    return [item for item in items if item is not None]


def _finite_number(value: Any) -> int | float | None:
    """The number itself when it fits a finite float; None for text, booleans, NaN, inf or huge."""
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    try:
        number = float(value)
    except OverflowError:  # a whole number too large for a float
        return None
    return value if math.isfinite(number) else None


def _hours(value: Any) -> float | None:
    number = _finite_number(value)
    if number is None or number <= 0 or number > MAX_HOURS:
        return None
    return number


def _hours_by_kind(value: Any, hours: float) -> dict[str, float] | None:
    """The planner split: all four numbers at least 0, adding up to ``hours`` within 0.1."""
    if not isinstance(value, dict):
        return None
    split: dict[str, float] = {}
    for kind in HOURS_KINDS:
        number = _finite_number(value.get(kind))
        if number is None or number < 0:
            return None
        split[kind] = number
    total = sum(float(part) for part in split.values())
    if not math.isfinite(total):  # four large finite numbers can add up past the float range
        return None
    # A small allowance for float error keeps a difference of exactly 0.1 valid.
    if abs(total - hours) > PLANNER_TOLERANCE_HOURS + 1e-9:
        return None
    return split


def _stage(data: Any, expected_number: int, style: str = DEFAULT_TEACHING_STYLE) -> Stage | str:
    """Return the checked stage, or a short problem name."""
    if not isinstance(data, dict):
        return "stage_type"
    number = data.get("stageNumber")
    if isinstance(number, bool) or not isinstance(number, int) or number != expected_number:
        return "stage_number"
    title = _text(data.get("title"))
    what = _text(data.get("whatItIs"))
    why = _text(data.get("whyItMatters"))
    after = _text(data.get("afterThis"))
    if None in (title, what, why, after):
        return "stage_text"
    raw_materials = data.get("materials")
    if not isinstance(raw_materials, dict):
        return "materials"
    reading = _text_list(raw_materials.get("reading"))
    exercises = _text_list(raw_materials.get("exercises"))
    quiz = _text_list(raw_materials.get("quiz"))
    mini_project = _text(raw_materials.get("miniProject"))
    if reading is None or exercises is None or quiz is None or mini_project is None:
        return "materials"
    hours = _hours(data.get("hours"))
    if hours is None:
        return "hours"
    if style == "instructor" and (
        len(exercises) < INSTRUCTOR_MIN_EXERCISES or len(quiz) < INSTRUCTOR_MIN_QUIZ
    ):
        return "instructor_minimums"
    split: dict[str, float] | None = None
    if style == "planner":
        split = _hours_by_kind(data.get("hoursByKind"), hours)
        if split is None:
            return "hours_by_kind"
    # For guide and instructor replies a hoursByKind is ignored and never stored (BR33.4).
    assert title and what and why and after  # narrowed by the None check above
    return Stage(
        stage_number=expected_number,
        title=title,
        what_it_is=what,
        why_it_matters=why,
        after_this=after,
        materials=Materials(reading, exercises, mini_project, quiz),
        hours=hours,
        hours_by_kind=split,
    )


def check_reply(text: Any, style: str = DEFAULT_TEACHING_STYLE) -> ReplyCheck:
    """Classify a model reply as a refusal, a valid journey or invalid.

    A refusal is recognised first, even when stages are also present (BR1.4). One JSON object may
    be wrapped in a single Markdown code fence; anything else is invalid (BR2.4). The instructor
    and planner styles add the checks of BR33.4; the guide style adds none.
    """
    data = _parse_object(text)
    if data is None:
        return _invalid("not_one_json_object")
    refused = data.get("refused")
    if refused is True:
        reason = data.get("reason")
        return ReplyCheck("refusal", ModelReply(True, reason if isinstance(reason, str) else ""))
    if refused is not False:
        return _invalid("refused_flag")
    raw_stages = data.get("stages")
    if not isinstance(raw_stages, list):
        return _invalid("stages_type")
    if len(raw_stages) not in (5, 6):
        return _invalid("stage_count")
    stages: list[Stage] = []
    for position, raw in enumerate(raw_stages, start=1):
        checked = _stage(raw, position, style)
        if isinstance(checked, str):
            return _invalid(checked)
        stages.append(checked)
    return ReplyCheck("valid", ModelReply(False, "", stages))


# --- goal date -----------------------------------------------------------------------------------


@dataclass(frozen=True)
class GoalCheck:
    """Outcome of the goal-date check: ``goal_date`` is the date text, or None to clear."""

    ok: bool
    goal_date: str | None = None
    problem: str | None = None


def check_goal_date(body: Any) -> GoalCheck:
    """The body must be an object with ``goalDate`` null or a real YYYY-MM-DD date (BR32.1).

    Other keys are ignored. The 365-day range is a browser rule only; the server checks just that
    the date exists on the calendar.
    """
    if not isinstance(body, dict) or "goalDate" not in body:
        return GoalCheck(False, None, "goal_date_missing")
    value = body["goalDate"]
    if value is None:
        return GoalCheck(True, None)
    if not isinstance(value, str) or _GOAL_DATE.fullmatch(value) is None:
        return GoalCheck(False, None, "goal_date_format")
    try:
        date(int(value[:4]), int(value[5:7]), int(value[8:10]))
    except ValueError:
        return GoalCheck(False, None, "goal_date_not_real")
    return GoalCheck(True, value)


def check_style(value: Any) -> str | None:
    """The teaching style: one of the three fixed words, or None when it is anything else."""
    return value if isinstance(value, str) and value in TEACHING_STYLES else None


# --- milestone -----------------------------------------------------------------------------------


@dataclass(frozen=True)
class MilestoneCheck:
    """Outcome of the milestone check: ``milestone`` is the checked name when ``ok``."""

    ok: bool
    milestone: str | None = None
    problem: str | None = None


def check_milestone(body: Any) -> MilestoneCheck:
    """The body must be an object whose ``milestone`` is exactly one of the three names (BR44.1).

    Other keys are ignored. A name that is not text, or not exactly spelled, is invalid, so an
    unknown name never reaches the store.
    """
    if not isinstance(body, dict) or "milestone" not in body:
        return MilestoneCheck(False, None, "milestone_missing")
    value = body["milestone"]
    if not isinstance(value, str):
        return MilestoneCheck(False, None, "milestone_type")
    if value not in MILESTONES:
        return MilestoneCheck(False, None, "milestone_unknown")
    return MilestoneCheck(True, value)
