# Monitoring Design — u2-progress

## Sources

- `monitoring-design.md` of the first unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` (all alarms, metrics and the dashboard stay in force)
- `infrastructure-specification.md` in this folder
- `rules.md` and `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/functional-design/` (BR11.5 the 2-second limit, BR13.4 the 3-second return visit)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR10)

The first unit's request log line already records route, status, outcome code and total time for every call, with only a short session prefix. The new completion route appears in that line with no change to what is logged. U2 adds log metric filters (defined below), one dashboard widget and two service levels, and no new alarm: the existing Lambda-error and API server-error alarms already cover its failures. Alerts go to the same email.

## Metrics & KPIs

New metrics are made by CloudWatch Logs metric filters on the Lambda's log group, in the same custom namespace as the first unit's filters. The filters use the JSON form and match the request line with a wildcard on the route, so every stage number counts as one route (the route field holds the raw path, so the stage number is in it; it is not personal information).

| Metric | How it is made | Threshold | Why it matters |
|---|---|---|---|
| `CompletionOk` and `CompletionSaveFailed` (counts) | Two metric filters, each: event is `request`, route matches `PUT /api/v1/journey/stages/*`, and outcome is `ok` or `SAVE_FAILED`; metric value 1. Other outcomes (`NOT_FOUND`, `INVALID_REQUEST`) are rare and are read from the logs when needed | Watched on the dashboard; `CompletionSaveFailed` 3 or more in 1 hour is a dashboard line only | Shows how often learners mark stages and how often a mark does not save. Repeated save failures mean the table or the update itself is unhealthy; the existing 5xx alarm is the one that emails. |
| `CompletionTimeMs` | One metric filter on the same route pattern with the metric value taken from the line's `total_ms` field and **no default value** (unlike the count filters, which publish 0 in empty periods; a default of 0 here would add 0 ms samples and pull the p95 down); read as the p95 statistic. A stack test checks that the filter has no default value | The target is under 2000 ms at p95 (NFR2) | A mark must be saved within 2 seconds for 95% of actions. |

Three new custom metrics are kept deliberately few: each custom metric has a small monthly charge (roughly 0.30 dollars each at the time of writing, an estimate; use AWS's pricing tools for exact figures), and the idle-cost target is tight (NFR4). The server's share of the return-visit time (`GET` total time) is read from the logs and the smoke checks, not a metric.

## Alerts

No new alert. These existing ones cover U2:

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Lambda errors | Errors 1 or more in 5 minutes (unchanged) | High | SNS topic, then the deploy-time email |
| API server errors | 5xx 1 or more in 5 minutes (unchanged); a SAVE_FAILED completion is a 500 | High | Same |

Missing data stays "not breaching", as in the first unit.

## SLIs / SLOs

The figures come from the custom metrics above, which CloudWatch keeps well beyond the 14-day log retention, not from the logs themselves.

| SLI | SLO target | Measurement window |
|---|---|---|
| Completion change saved within 2 seconds | 95% of changes (NFR2) | 30-day rolling, from the `CompletionTimeMs` p95 and the outcome counts. It covers calls that reach the Lambda; a call rejected by the API-wide throttle (429) or failing at the gateway never reaches it and shows only on the existing API 429 and 5xx widgets, which cover every route |
| Completion changes that end in a server error (SAVE_FAILED) | Under 1% | 30-day rolling, `CompletionSaveFailed` over all completion counts |
| Saved journey served on a return visit within 3 seconds (browser to browser) | 95% of loads (NFR2) | Checked by hand in the deploy smoke checks; there is no metric for it |

## Logs & Tracing

- No change: structured JSON lines, 14-day retention, only a short session prefix, never typed text or model text.
- A completion line adds nothing sensitive: the route holds the stage number, which is not personal information; the line carries no session ID beyond the short prefix.
- No tracing and no canary, as in the first unit.

## Dashboard

The existing `learning-journey` dashboard gains one widget: completion changes (`CompletionOk` and `CompletionSaveFailed`) and `CompletionTimeMs` at p95.

## Assumptions & Open Questions

- [assumption] The filters are written with the JSON metric-filter syntax and a wildcard on the route; a stack test confirms each filter's pattern.
- None otherwise.
