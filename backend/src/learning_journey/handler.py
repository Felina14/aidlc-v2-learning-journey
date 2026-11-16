"""The single Lambda entry point: journey routes, stage completion, goal date and milestones.

POST, GET and DELETE on /api/v1/journey; PUT on the stage completion, goal and milestones paths.
Contract C1.
"""

from __future__ import annotations

import base64
import json
import re
import time
from collections.abc import Callable
from typing import Any

from .bedrock_client import BedrockModelClient
from .config import DEFAULT_TEACHING_STYLE, MAX_STAGE_NUMBER, MIN_STAGE_NUMBER, Settings
from .errors import (
    DELETE_FAILED,
    INVALID_REQUEST,
    LOAD_FAILED,
    NOT_FOUND,
    SAVE_FAILED,
    TOPIC_INVALID,
    ApiError,
    error_body,
)
from .generator import GenerationResult, JourneyGenerator
from .logs import log_event, short_session
from .store import JourneyStore
from .usage_guard import DynamoUsageGuard
from .validation import check_goal_date, check_milestone, check_style, check_topic

JOURNEY_PATH = "/api/v1/journey"
GOAL_PATH = "/api/v1/journey/goal"
MILESTONES_PATH = "/api/v1/journey/milestones"
MAX_BODY_CHARS = 10_000
_COMPLETION_PATH = re.compile(r"/api/v1/journey/stages/([^/]*)/completion")
# Plain ASCII digits, no sign, no decimal point, no leading zero, 1 to 6 (BR11.3).
_STAGE_NUMBER = re.compile(r"[1-6]")
_UUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")

_HEADERS = {"Content-Type": "application/json", "Cache-Control": "no-store"}


def is_session_id(value: Any) -> bool:
    """A session ID is a UUID in its standard text form (BR5.3)."""
    return isinstance(value, str) and _UUID.fullmatch(value) is not None


class JourneyApp:
    """Request handling with its collaborators passed in, so tests can use fakes."""

    def __init__(
        self,
        generator: JourneyGenerator,
        store: JourneyStore,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._generator = generator
        self._store = store
        self._clock = clock

    def handle(self, event: dict[str, Any], request_id: str = "-") -> dict[str, Any]:
        """Turn an API Gateway HTTP API event into a response and write one log line."""
        started = self._clock()
        http = (event.get("requestContext") or {}).get("http") or {}
        method = str(http.get("method", event.get("httpMethod", ""))).upper()
        path = str(event.get("rawPath", event.get("path", "")))
        route = f"{method} {path}"
        session_id = self._session_id(event)
        facts: dict[str, Any] = {
            "model_id": None,
            "bedrock_outcome": None,
            "journey_source": None,
            "style": None,  # one of the three fixed words, set only once the style is checked
        }
        try:
            trimmed = path.rstrip("/")
            completion = _COMPLETION_PATH.fullmatch(trimmed) if method == "PUT" else None
            goal = method == "PUT" and trimmed == GOAL_PATH
            milestone = method == "PUT" and trimmed == MILESTONES_PATH
            if (
                completion is None
                and not goal
                and not milestone
                and (trimmed != JOURNEY_PATH or method not in ("POST", "GET", "DELETE"))
            ):
                raise ApiError(NOT_FOUND, "no such route")
            if not is_session_id(session_id):
                raise ApiError(INVALID_REQUEST, "X-Session-Id must be a UUID")
            assert session_id is not None
            if goal:
                status, body = self._set_goal(event, session_id)
            elif milestone:
                status, body = self._mark_milestone(event, session_id)
            elif completion is not None:
                status, body = self._set_completion(event, session_id, completion.group(1))
            elif method == "POST":
                status, body = self._create(event, session_id, facts)
            elif method == "DELETE":
                status, body = self._delete(session_id)
            else:
                status, body = self._load(session_id)
            outcome = "ok"
        except ApiError as error:
            status, body, outcome = error.status, error_body(error.code, error.message), error.code
            facts.update(error.facts)
        except Exception:  # noqa: BLE001 - never leak details; log the outcome and answer a failure
            code = {"GET": LOAD_FAILED, "DELETE": DELETE_FAILED}.get(method, SAVE_FAILED)
            status, body, outcome = 500, error_body(code, "unexpected error"), code
        log_event(
            event="request",
            request_id=request_id,
            route=route,
            status=status,
            outcome=outcome,
            total_ms=int((self._clock() - started) * 1000),
            session=short_session(session_id) if isinstance(session_id, str) else None,
            **facts,
        )
        # A 204 has no body at all (C1); every other answer is JSON.
        text = "" if body is None else json.dumps(body)
        return {"statusCode": status, "headers": dict(_HEADERS), "body": text}

    @staticmethod
    def _session_id(event: dict[str, Any]) -> str | None:
        headers = {str(k).lower(): v for k, v in (event.get("headers") or {}).items()}
        value = headers.get("x-session-id")
        return value if isinstance(value, str) else None

    def _create(
        self, event: dict[str, Any], session_id: str, facts: dict[str, Any]
    ) -> tuple[int, dict[str, Any]]:
        data = self._read_json(event)
        if not isinstance(data, dict) or not isinstance(data.get("topic"), str):
            raise ApiError(INVALID_REQUEST, "the body needs a topic text")
        # An absent style means the guide style; any other value is refused before any slot is
        # reserved or any model call is made (BR33.2).
        style = DEFAULT_TEACHING_STYLE
        if "style" in data:
            checked_style = check_style(data["style"])
            if checked_style is None:
                raise ApiError(INVALID_REQUEST, "the style is not one of the three styles")
            style = checked_style
        facts["style"] = style
        checked = check_topic(data["topic"])
        if not checked.ok:
            raise ApiError(TOPIC_INVALID, f"topic check failed: {checked.problem}")
        result: GenerationResult = self._generator.generate(session_id, checked.topic, style)
        facts.update(
            model_id=result.model_id,
            bedrock_outcome=result.bedrock_outcome,
            journey_source=result.journey.source,
        )
        return 201, result.journey.to_public_dict()

    @staticmethod
    def _read_json(event: dict[str, Any]) -> Any:
        raw = event.get("body")
        if not isinstance(raw, str) or not raw:
            raise ApiError(INVALID_REQUEST, "a JSON body is required")
        if event.get("isBase64Encoded"):
            try:
                raw = base64.b64decode(raw, validate=True).decode("utf-8")
            except ValueError as exc:
                raise ApiError(INVALID_REQUEST, "the body could not be decoded") from exc
        if len(raw) > MAX_BODY_CHARS:
            raise ApiError(INVALID_REQUEST, "the body is too large")
        try:
            return json.loads(raw)
        except ValueError as exc:
            raise ApiError(INVALID_REQUEST, "the body is not JSON") from exc

    def _set_goal(self, event: dict[str, Any], session_id: str) -> tuple[int, dict[str, Any]]:
        """PUT /api/v1/journey/goal: set, change or clear the goal date (BR32.1)."""
        checked = check_goal_date(self._read_json(event))
        if not checked.ok:
            raise ApiError(INVALID_REQUEST, "the body needs goalDate as null or a YYYY-MM-DD date")
        stored = self._store.set_goal_date(session_id, checked.goal_date)
        return 200, {"goalDate": stored}

    def _mark_milestone(self, event: dict[str, Any], session_id: str) -> tuple[int, dict[str, Any]]:
        """PUT /api/v1/journey/milestones: record that one milestone was shown (BR44.1)."""
        checked = check_milestone(self._read_json(event))
        if not checked.ok:
            raise ApiError(
                INVALID_REQUEST, "the body needs milestone set to one of the three names"
            )
        assert checked.milestone is not None
        shown = self._store.mark_milestone_shown(session_id, checked.milestone)
        return 200, {"milestonesShown": shown}

    def _set_completion(
        self, event: dict[str, Any], session_id: str, stage_text: str
    ) -> tuple[int, dict[str, Any]]:
        """PUT .../stages/{stageNumber}/completion: mark or unmark one stage (BR11.3)."""
        if _STAGE_NUMBER.fullmatch(stage_text) is None:
            raise ApiError(INVALID_REQUEST, "the stage number is not valid")
        stage_number = int(stage_text)
        assert MIN_STAGE_NUMBER <= stage_number <= MAX_STAGE_NUMBER
        data = self._read_json(event)
        if not isinstance(data, dict) or not isinstance(data.get("completed"), bool):
            raise ApiError(INVALID_REQUEST, "the body needs completed set to true or false")
        completed = self._store.set_stage_completion(session_id, stage_number, data["completed"])
        return 200, {"completedStages": completed}

    def _delete(self, session_id: str) -> tuple[int, dict[str, Any] | None]:
        """DELETE /api/v1/journey: remove the journey item; 204 whether or not one was there."""
        self._store.delete(session_id)
        return 204, None

    def _load(self, session_id: str) -> tuple[int, dict[str, Any]]:
        journey = self._store.load(session_id)
        if journey is None:
            raise ApiError(NOT_FOUND, "no journey for this session")
        return 200, journey.to_public_dict()


_app: JourneyApp | None = None


def build_app(settings: Settings | None = None) -> JourneyApp:
    """Wire the real collaborators: Bedrock, DynamoDB and the usage guard on the same table."""
    settings = settings or Settings.from_env()
    store = JourneyStore.for_table(settings.table_name)
    model = BedrockModelClient(settings.model_id)
    generator = JourneyGenerator(
        model, store, DynamoUsageGuard(store.table), bedrock_timeout=settings.bedrock_timeout
    )
    return JourneyApp(generator, store)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """AWS Lambda entry point."""
    global _app
    if _app is None:
        _app = build_app()
    request_id = getattr(context, "aws_request_id", "-")
    return _app.handle(event, request_id)
