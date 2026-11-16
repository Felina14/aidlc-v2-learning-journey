# Monitoring Design — u5-encouragement

## Sources

- The earlier units' `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md`, `.../u2-progress/infrastructure-design/monitoring-design.md`, `.../u3-protection/infrastructure-design/monitoring-design.md` and `.../u4-goals-and-style/infrastructure-design/monitoring-design.md` (all alarms, metrics and the dashboard stay in force)
- `infrastructure-specification.md` in this folder
- `rules.md` and `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/functional-design/` (BR44.1 the milestone call, BR44.2 a failed record is quiet)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR4, NFR10)

The request log line already records route, status, outcome code and total time for every call, with only a short session prefix. The new milestone route appears in it with no change. U5 adds **no metric, no alarm and no dashboard line**: the stack already has about fourteen custom metrics, which is past the free allowance, and the idle-cost target is tight (NFR4). A failed milestone record is a quiet event for the learner (BR44.2), but it is not silent for the builder: it is a 500, a 404 or a 400 in the request line. Handled errors return a 500 and do not raise a Lambda error, so only the existing API server-error (5xx) alarm covers a failing store; the Lambda-error alarm fires only on an unhandled crash.

## Metrics & KPIs

| Metric | How it is made | Threshold | Why it matters |
|---|---|---|---|
| Milestone calls by outcome (log lines only) | The existing request line, route `PUT /api/v1/journey/milestones`, outcome `ok`, `NOT_FOUND`, `INVALID_REQUEST` or `SAVE_FAILED` | Read from the logs; no metric | A burst of failures would show in the existing 5xx alarm; the calls are quiet and rare. |
| Nudge and certificate use | None: both live in the page, make no request and are not logged by the server (FR6.3, and the certificate name must never be logged) | Not measured | There is nothing to collect, by design. |

## Alerts

No new alert. These existing ones cover U5:

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Lambda errors | Errors 1 or more in 5 minutes (unchanged) | High | SNS topic, then the deploy-time email |
| API server errors | 5xx 1 or more in 5 minutes (unchanged); a SAVE_FAILED milestone record is a 500 | High | Same |
| Guard skipped | `GuardSkipped` 1 or more in 1 hour (unchanged) | Medium | Same |

Missing data stays "not breaching".

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Create requests that end in a server error | Under 1% (unchanged) | 30-day rolling |
| A milestone record is saved within 2 seconds | Not a target: the call is quiet and the banner never waits for it | Not measured |

## Logs & Tracing

- Retention stays 14 days. What is never logged stays the same: typed text, model text, the full session ID or a full reservation id. The certificate name never reaches the server at all, so it cannot be logged; a test checks that no request carries it.
- The milestone name (one of three fixed words) is not in the request line, only the route and outcome.
- No tracing and no canary, as before.

## Dashboard

No change.

## Assumptions & Open Questions

- [assumption] If the builder later wants to see how often milestones fail to record, a metric filter can be added then; it is left out now to keep the custom-metric count down.
- None otherwise.
