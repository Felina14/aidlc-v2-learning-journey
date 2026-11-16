"""Stable error codes and the C1 error shape."""

from __future__ import annotations

from typing import Any

TOPIC_INVALID = "TOPIC_INVALID"
INVALID_REQUEST = "INVALID_REQUEST"
TOPIC_NOT_ALLOWED = "TOPIC_NOT_ALLOWED"
DAILY_LIMIT = "DAILY_LIMIT"
RATE_LIMITED = "RATE_LIMITED"
NOT_FOUND = "NOT_FOUND"
SAVE_FAILED = "SAVE_FAILED"
LOAD_FAILED = "LOAD_FAILED"
DELETE_FAILED = "DELETE_FAILED"

STATUS_BY_CODE: dict[str, int] = {
    TOPIC_INVALID: 400,
    INVALID_REQUEST: 400,
    TOPIC_NOT_ALLOWED: 422,
    DAILY_LIMIT: 429,
    RATE_LIMITED: 429,
    NOT_FOUND: 404,
    SAVE_FAILED: 500,
    LOAD_FAILED: 500,
    DELETE_FAILED: 500,
}


class ApiError(Exception):
    """An outcome that the handler turns into a C1 error response."""

    def __init__(self, code: str, message: str = "", facts: dict[str, Any] | None = None) -> None:
        super().__init__(message or code)
        self.code = code
        self.message = message or code
        # What was known about the attempt when the request failed (model, outcome, source),
        # so the handler's request log line is complete on error paths (review R-04).
        self.facts: dict[str, Any] = dict(facts or {})

    @property
    def status(self) -> int:
        """HTTP status for this code (C1)."""
        return STATUS_BY_CODE[self.code]


def error_body(code: str, message: str) -> dict[str, Any]:
    """Return the C1 error shape: ``{"error": {"code": ..., "message": ...}}``."""
    return {"error": {"code": code, "message": message}}
