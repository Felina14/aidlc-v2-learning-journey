"""The journey generator: model call, checks, retry, template fallback, save (BR1.4, BR3.x, BR4.x).

Time is read from an injected clock so the 15 s, 18 s and 5 s rules are tested without waiting.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from .bedrock_client import (
    OUTCOME_ERROR,
    OUTCOME_INVALID,
    OUTCOME_OK,
    OUTCOME_REFUSED,
    OUTCOME_THROTTLED,
    ModelClient,
    ModelError,
    ModelTruncatedError,
    log_attempt,
    output_cap,
)
from .config import (
    AI_BUDGET_SECONDS,
    DEFAULT_BEDROCK_TIMEOUT,
    DEFAULT_TEACHING_STYLE,
    REQUEST_CAP_SECONDS,
    RETRY_MIN_SECONDS,
)
from .errors import DAILY_LIMIT, SAVE_FAILED, TOPIC_NOT_ALLOWED, ApiError
from .logs import log_event
from .models import Journey, Stage
from .prompt import build_prompt
from .store import JourneyStore, to_iso
from .template import build_template
from .usage_guard import UsageGuard
from .validation import check_reply


@dataclass(frozen=True)
class GenerationResult:
    """A saved journey plus what the handler logs about how it was made."""

    journey: Journey
    model_id: str
    bedrock_outcome: str  # outcome of the last AI attempt, or "none" when no attempt was made


class JourneyGenerator:
    """Makes, saves and returns one journey for a valid topic."""

    def __init__(
        self,
        model: ModelClient,
        store: JourneyStore,
        guard: UsageGuard,
        clock: Callable[[], float] = time.monotonic,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        bedrock_timeout: float = DEFAULT_BEDROCK_TIMEOUT,
    ) -> None:
        self._model = model
        self._store = store
        self._guard = guard
        self._clock = clock
        self._now = now
        self._bedrock_timeout = bedrock_timeout

    def generate(
        self, session_id: str, topic: str, style: str = DEFAULT_TEACHING_STYLE
    ) -> GenerationResult:
        """Run workflow 1 steps 5 to 14 for an already-checked topic."""
        started = self._clock()
        # The day is the server's UTC calendar day, never a date from the browser (BR20.4).
        reservation = self._guard.reserve(
            session_id, self._now().astimezone(UTC).strftime("%Y-%m-%d")
        )
        if not reservation.granted:
            # No model call, no template, nothing saved or deleted (BR21.1).
            raise ApiError(
                DAILY_LIMIT,
                "the daily limit is reached",
                {
                    "model_id": self._model.model_id,
                    "bedrock_outcome": "none",
                    "journey_source": None,
                },
            )
        released = False
        outcome = "none"  # outcome of the last AI attempt, for the request log line
        source: str | None = None

        def release_once() -> None:
            nonlocal released
            if not released and reservation.reservation_id is not None:
                released = True
                self._guard.release(reservation.reservation_id)

        try:
            stages, outcome = self._ask_model(topic, style, started)
            source = "ai" if stages is not None else "template"
            if stages is None:
                stages = build_template(topic)
            if self._clock() - started >= REQUEST_CAP_SECONDS:
                raise ApiError(SAVE_FAILED, "the request took too long to save")
            journey = self._build(topic, style, source, stages)
            saved = self._store.save(session_id, journey)
            # Logged only once the journey is saved, so the metrics and the template-fallback
            # alarm never count a journey the learner did not get (review R-03).
            log_event(event="journey_made", source=source, style=style)
            return GenerationResult(saved, self._model.model_id, outcome)
        except ApiError as error:
            if error.code != DAILY_LIMIT:
                release_once()
            error.facts.setdefault("model_id", self._model.model_id)
            error.facts.setdefault("bedrock_outcome", outcome)
            error.facts.setdefault("journey_source", source)
            raise
        except Exception as exc:  # noqa: BLE001 - an unexpected error must free the slot
            release_once()
            raise ApiError(
                SAVE_FAILED,
                "the journey could not be made",
                {
                    "model_id": self._model.model_id,
                    "bedrock_outcome": outcome,
                    "journey_source": source,
                },
            ) from exc

    def _ask_model(self, topic: str, style: str, started: float) -> tuple[list[Stage] | None, str]:
        """Ask the model, retrying once while time allows: (stages or None, last outcome)."""
        prompt = build_prompt(topic, style)
        outcome = "none"
        for attempt in (1, 2):
            remaining = AI_BUDGET_SECONDS - (self._clock() - started)
            if remaining <= 0 or (attempt == 2 and remaining < RETRY_MIN_SECONDS):
                break
            try:
                text = self._model.invoke(
                    prompt, min(self._bedrock_timeout, remaining), output_cap(style)
                )
            except ModelTruncatedError:
                # A reply cut off by the output cap is never a whole journey: invalid (BR33.3).
                outcome = OUTCOME_INVALID
                log_attempt(self._model.model_id, outcome, attempt, "truncated")
                continue
            except ModelError as error:
                outcome = OUTCOME_THROTTLED if error.throttled else OUTCOME_ERROR
                log_attempt(self._model.model_id, outcome, attempt)
                continue
            except Exception:  # noqa: BLE001 - any model failure is treated the same (BR2.4)
                outcome = OUTCOME_ERROR
                log_attempt(self._model.model_id, outcome, attempt)
                continue
            checked = check_reply(text, style)
            if checked.kind == "refusal":
                log_attempt(self._model.model_id, OUTCOME_REFUSED, attempt)
                raise ApiError(
                    TOPIC_NOT_ALLOWED,
                    "the topic is not allowed",
                    {
                        "model_id": self._model.model_id,
                        "bedrock_outcome": OUTCOME_REFUSED,
                        "journey_source": None,
                    },
                )
            if checked.kind == "valid" and checked.reply is not None:
                log_attempt(self._model.model_id, OUTCOME_OK, attempt)
                return checked.reply.stages, OUTCOME_OK
            outcome = OUTCOME_INVALID
            log_attempt(self._model.model_id, outcome, attempt, checked.problem)
        return None, outcome

    @staticmethod
    def _build(topic: str, style: str, source: str, stages: list[Stage]) -> Journey:
        now = to_iso(datetime.now(UTC))
        return Journey(
            topic=topic,
            teaching_style=style,
            source=source,
            stages=stages,
            created_at=now,
            last_activity_at=now,
        )
