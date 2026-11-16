"""Structured JSON log lines. Never log typed text, the model's text or a full session ID."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger("learning_journey")
logger.setLevel(logging.INFO)


def log_event(**fields: Any) -> None:
    """Write one JSON log line made of the given fields."""
    logger.info(json.dumps(fields, sort_keys=True, default=str))


def short_session(session_id: str) -> str:
    """A short prefix of the session ID, never the whole value."""
    return session_id[:8]
