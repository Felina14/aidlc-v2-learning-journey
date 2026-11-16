"""The usage guard (contract C4, rules BR20.1 to BR20.5).

``DynamoUsageGuard`` counts the journeys a session starts per UTC day in the journey table, one
item per session and day (``sk`` = ``USAGE#<date>``). ``NoLimitGuard`` stays as a stand-in for
tests. The generator is built against the ``UsageGuard`` interface, so only the guard differs.
"""

from __future__ import annotations

import base64
import binascii
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

from botocore.exceptions import ClientError

from .config import DAILY_CAP, SAVE_TIMEOUT_SECONDS, USAGE_SORT_KEY_PREFIX
from .logs import log_event, short_session

_CONDITION_FAILED = "ConditionalCheckFailedException"
_SEPARATOR = "|"


@dataclass(frozen=True)
class Reservation:
    """Result of ``reserve``: ``reservation_id`` identifies the one slot a request took."""

    granted: bool
    remaining: int
    reservation_id: str | None = None
    guard_skipped: bool = False


class UsageGuard(Protocol):
    def reserve(self, session_id: str, day: str) -> Reservation: ...

    def release(self, reservation_id: str) -> None: ...


class NoLimitGuard:
    """Stand-in for tests: always grants, releases nothing."""

    def reserve(self, session_id: str, day: str) -> Reservation:
        return Reservation(
            granted=True, remaining=DAILY_CAP, reservation_id=f"slot-{uuid.uuid4().hex}"
        )

    def release(self, reservation_id: str) -> None:
        return None


def encode_reservation_id(session_id: str, day: str) -> str:
    """Opaque text that holds the session ID and the date, so a release can find the key."""
    raw = f"{session_id}{_SEPARATOR}{day}".encode()
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_reservation_id(reservation_id: str) -> tuple[str, str] | None:
    """Return (session ID, date) from a reservation id, or nothing when it is not one of ours."""
    try:
        padded = reservation_id + "=" * (-len(reservation_id) % 4)
        text = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
    except (binascii.Error, UnicodeError, ValueError):
        return None
    session_id, separator, day = text.partition(_SEPARATOR)
    if not separator or not session_id or not day:
        return None
    return session_id, day


def usage_expiry_epoch(day: str) -> int:
    """Epoch seconds for the end of the UTC date plus one further day (BR20.4)."""
    start = datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=UTC)
    return int((start + timedelta(days=2)).timestamp())


def _error_code(exc: Exception) -> str | None:
    if isinstance(exc, ClientError):
        return exc.response.get("Error", {}).get("Code")
    return None


class DynamoUsageGuard:
    """The daily cap over the journey table: one conditional update to reserve, one to release."""

    def __init__(
        self,
        table: Any,
        cap: int = DAILY_CAP,
        clock: Callable[[], float] = time.monotonic,
        limit_seconds: float = SAVE_TIMEOUT_SECONDS,
    ) -> None:
        self._table = table
        self._cap = cap
        self._clock = clock
        self._limit = limit_seconds

    @staticmethod
    def _key(session_id: str, day: str) -> dict[str, str]:
        return {"sessionId": session_id, "sk": f"{USAGE_SORT_KEY_PREFIX}{day}"}

    def reserve(self, session_id: str, day: str) -> Reservation:
        """Take one slot with a single conditional increment (BR20.1)."""
        started = self._clock()
        try:
            response = self._table.update_item(
                Key=self._key(session_id, day),
                UpdateExpression=(
                    "SET journeysCreated = if_not_exists(journeysCreated, :zero) + :one, "
                    "expiresAt = if_not_exists(expiresAt, :exp)"
                ),
                ConditionExpression=(
                    "attribute_not_exists(journeysCreated) OR journeysCreated < :cap"
                ),
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":one": 1,
                    ":cap": self._cap,
                    ":exp": usage_expiry_epoch(day),
                },
                ReturnValues="UPDATED_NEW",
            )
        except Exception as exc:  # noqa: BLE001 - any store failure lets the request through
            if _error_code(exc) == _CONDITION_FAILED:
                return Reservation(granted=False, remaining=0)
            return self._skipped(session_id, "error", exc)
        if self._clock() - started > self._limit:
            return self._skipped(session_id, "timeout", TimeoutError("reserve over the limit"))
        count = int((response.get("Attributes") or {}).get("journeysCreated", 1))
        return Reservation(
            granted=True,
            remaining=max(self._cap - count, 0),
            reservation_id=encode_reservation_id(session_id, day),
        )

    @staticmethod
    def _skipped(session_id: str, outcome: str, exc: Exception) -> Reservation:
        """The guard's store failed: let the request go on and say so once (BR20.3)."""
        log_event(
            event="guard_skipped",
            outcome=outcome,
            error_class=type(exc).__name__,
            session=short_session(session_id),
        )
        return Reservation(granted=True, remaining=0, reservation_id=None, guard_skipped=True)

    def release(self, reservation_id: str) -> None:
        """Give one slot back, never below 0; never raises (BR20.2)."""
        decoded = decode_reservation_id(reservation_id)
        if decoded is None:
            log_event(event="guard_release", outcome="unknown_reservation")
            return
        session_id, day = decoded
        try:
            self._table.update_item(
                Key=self._key(session_id, day),
                UpdateExpression="SET journeysCreated = journeysCreated - :one",
                ConditionExpression="attribute_exists(journeysCreated) AND journeysCreated > :zero",
                ExpressionAttributeValues={":one": 1, ":zero": 0},
            )
        except Exception as exc:  # noqa: BLE001 - a failed release never changes the answer
            outcome = "nothing_to_release" if _error_code(exc) == _CONDITION_FAILED else "error"
            log_event(
                event="guard_release",
                outcome=outcome,
                error_class=type(exc).__name__,
                session=short_session(session_id),
            )
