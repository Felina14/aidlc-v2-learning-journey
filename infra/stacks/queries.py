"""Saved CloudWatch Logs Insights queries over the function's structured log lines.

Each query reads only the fixed fields the function logs (event, route, status, outcome, total_ms,
journey source, style, Bedrock outcome, problem name, an 8-character session prefix). None of them
can show typed text, because no log line holds any (NFR10).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SavedQuery:
    """One saved query: its console name (under ``learning-journey/``) and its text."""

    name: str
    query_string: str


SAVED_QUERIES: tuple[SavedQuery, ...] = (
    SavedQuery(
        "learning-journey/invalid-ai-replies-by-problem",
        'filter event = "ai_attempt" and bedrock_outcome = "invalid"\n'
        "| stats count(*) as attempts by problem\n"
        "| sort attempts desc",
    ),
    SavedQuery(
        "learning-journey/journeys-by-source-and-style",
        'filter event = "journey_made"\n'
        "| stats count(*) as journeys by source, style\n"
        "| sort journeys desc",
    ),
    SavedQuery(
        "learning-journey/request-time-by-route",
        'filter event = "request"\n'
        "| stats count(*) as requests, pct(total_ms, 50) as p50_ms, pct(total_ms, 95) as p95_ms,"
        " max(total_ms) as max_ms by route\n"
        "| sort requests desc",
    ),
    SavedQuery(
        "learning-journey/journeys-over-20-seconds",
        'filter event = "request" and route = "POST /api/v1/journey" and total_ms > 20000\n'
        "| fields @timestamp, total_ms, journey_source, bedrock_outcome, style, session\n"
        "| sort total_ms desc",
    ),
    SavedQuery(
        "learning-journey/failed-requests-by-outcome",
        'filter event = "request" and outcome != "ok"\n'
        "| stats count(*) as requests by outcome, status, route\n"
        "| sort requests desc",
    ),
    SavedQuery(
        "learning-journey/server-errors",
        'filter event = "request" and status >= 500\n'
        "| fields @timestamp, route, status, outcome, total_ms, session\n"
        "| sort @timestamp desc",
    ),
    SavedQuery(
        "learning-journey/requests-per-day",
        'filter event = "request"\n'
        "| stats count(*) as requests by bin(1d) as day\n"
        "| sort day desc",
    ),
    SavedQuery(
        "learning-journey/guard-skipped",
        'filter event = "guard_skipped"\n'
        "| fields @timestamp, @message\n"
        "| sort @timestamp desc",
    ),
    SavedQuery(
        "learning-journey/one-session-trail",
        "# Replace PREFIX with the 8-character session prefix from a request line.\n"
        'filter session = "PREFIX"\n'
        "| fields @timestamp, event, route, status, outcome, total_ms, bedrock_outcome, problem\n"
        "| sort @timestamp asc",
    ),
)

# The dashboard widget for invalid AI replies by problem name reads the logs directly, so it
# needs no metric filter of its own.
INVALID_BY_PROBLEM_WIDGET_LINES: tuple[str, ...] = (
    'filter event = "ai_attempt" and bedrock_outcome = "invalid"',
    "stats count(*) as attempts by problem",
    "sort attempts desc",
)
