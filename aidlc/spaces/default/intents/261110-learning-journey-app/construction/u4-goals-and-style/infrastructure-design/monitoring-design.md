# Monitoring Design — u4-goals-and-style

## Sources

- The earlier units' `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md`, `.../u2-progress/infrastructure-design/monitoring-design.md` and `.../u3-protection/infrastructure-design/monitoring-design.md` (all alarms, metrics and the dashboard stay in force)
- `infrastructure-specification.md` in this folder
- `rules.md` and `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/functional-design/` (BR32.1 the goal call, BR33.4 the style reply checks)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR4, NFR10)
- `infra/stacks/journey_stack.py` (read only, to see how the earlier filters and alarms are made)

The request log line already records route, status, outcome code and total time for every call, and the generator already logs the journey source (AI or template) and each model attempt's outcome. U4 adds the chosen style to those lines, one metric and no alarm: the existing Lambda-error and API server-error alarms cover a failing goal change (SAVE_FAILED is a 500), and the existing template-fallback alarm covers the new risk. Alerts go to the same email.

## Metrics & KPIs

| Metric | How it is made | Threshold | Why it matters |
|---|---|---|---|
| Template fallbacks (existing) | The existing `template` count metric and its alarm (3 or more in 1 hour) | Unchanged | The instructor and planner reply checks (BR33.4) are stricter than the guide's, so replies are rejected more often and the template is used more often. The same alarm shows it, whichever style causes it. |
| `GoalChangeFailed` (count) | One metric filter on the Lambda's log group (JSON form, same custom namespace as the earlier filters): event is `request`, route is exactly `PUT /api/v1/journey/goal`, outcome is `SAVE_FAILED`; metric value 1; default value 0 like the other count filters | Watched on the dashboard, no alarm | A failing goal save is a 500 and reaches the existing alarm; this line only shows how often it happens. |
| `GoalChangeTimeMs` | One metric filter on the same route with the metric value taken from the line's `total_ms` field and **no default value** (as for the completion time metric, so empty periods add no zero samples); read as the p95 statistic | The target is under 2000 ms at p95 | Makes the goal-change time target measurable instead of checked by hand. |
| Style of each journey (log field) | **Code generation adds** the chosen style (`guide`, `instructor` or `planner`, nothing typed) to the generator's journey line and to the request line; today they log only the source and the outcome | Read from the logs; no metric | Lets the builder see which style falls back to the template most often when the fallback alarm fires. |
| Goal calls by outcome (log lines only) | The existing request line, route `PUT /api/v1/journey/goal` | Read from the logs; no metric | Goal changes are rare. |

Metrics are kept few on purpose: each custom metric past the free allowance has a small monthly charge (roughly 0.30 dollars at the time of writing; an estimate, use AWS's pricing tools for exact figures), and the idle-cost target is tight (NFR4). With these two, the stack has about fourteen custom metrics.

## Alerts

No new alert. These existing ones cover U4:

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Template fallbacks | 3 or more template journeys in 1 hour (unchanged) | Medium | SNS topic, then the deploy-time email |
| Lambda errors | Errors 1 or more in 5 minutes (unchanged) | High | Same |
| API server errors | 5xx 1 or more in 5 minutes (unchanged); a SAVE_FAILED goal change is a 500 | High | Same |
| Guard skipped | `GuardSkipped` 1 or more in 1 hour (unchanged) | Medium | Same |

Missing data stays "not breaching".

## SLIs / SLOs

The figures come from the custom metrics, which CloudWatch keeps beyond the 14-day log retention, not from the logs themselves.

| SLI | SLO target | Measurement window |
|---|---|---|
| Valid topic returns a journey (AI or template) within 20 seconds | 100% of requests (unchanged, NFR2) | Per request, from the logged total time and the existing metrics |
| Journeys served from the AI rather than the template | Watched, no target (the template is the promised fallback, NFR3); a rise after U4 means the new reply checks reject too much | 7-day rolling |
| A goal change is saved within 2 seconds | 95% of changes (the 2-second store limit) | 30-day rolling, from the `GoalChangeTimeMs` p95 |

## Logs & Tracing

- Retention stays 14 days. What is never logged stays the same: typed text, model text, the full session ID or a full reservation id. The chosen style is one of three fixed words and the goal date itself is not logged.
- No tracing and no canary, as before.

## Dashboard

The existing `learning-journey` dashboard gains one line: `GoalChangeFailed` and the `GoalChangeTimeMs` p95 beside the existing request counts.

## Assumptions & Open Questions

- [assumption] The metric filter is written with the JSON metric-filter syntax and a wildcard-free route match on the exact goal path; a stack test confirms its pattern and that, like the other count filters, it publishes 0 in empty periods.
- None otherwise.
