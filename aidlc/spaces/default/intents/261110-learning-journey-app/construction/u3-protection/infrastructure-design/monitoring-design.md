# Monitoring Design — u3-protection

## Sources

- `monitoring-design.md` of the first and second units — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` and `.../u2-progress/infrastructure-design/monitoring-design.md` (all alarms, metrics and the dashboard stay in force)
- `infrastructure-specification.md` in this folder
- `rules.md` and `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/functional-design/` (BR20.3 the guard skipped, BR21.1 the limit, BR23.1 delete)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR4, NFR10)

The request log line already records route, status, outcome code and total time for every call. U3 adds two metrics, one alarm and one log line. The existing Lambda-error and API server-error alarms cover a failing delete (DELETE_FAILED is a 500), but they do not cover a failing guard: when the guard's own update fails the request is let through (BR20.3) and the save still succeeds, so no error follows and the daily cap would be silently off. That case gets its own alarm. Alerts go to the same email.

## Metrics & KPIs

| Metric | How it is made | Threshold | Why it matters |
|---|---|---|---|
| `DailyLimitHit` (count) | One metric filter on the Lambda's log group (JSON form, same custom namespace as the earlier filters): event is `request` and outcome is `DAILY_LIMIT`; metric value 1; default value 0 like the other count filters | Watched on the dashboard, no alarm | Shows how often sessions reach the cap; a burst of them points at a script, which the throttle and the budget alert then back up. |
| `GuardSkipped` (count) | One metric filter: event is `guard_skipped`; metric value 1; default value 0. The generator writes that line when the guard's store was unreachable or its update failed (BR20.3), with the outcome, the error class and a short session prefix only | 1 or more in 1 hour raises the alarm below | A skipped guard means the cap is off for that request: a store problem, a missing permission or a bad update expression. Nothing else would show it. |
| Delete outcomes (log lines only) | The existing request line, route `DELETE /api/v1/journey`, outcome `ok` or `DELETE_FAILED` | Read from the logs; no metric | Deletes are rare; a failure is a 500 and reaches the existing alarm. |

Metrics are kept few on purpose: each custom metric past the free allowance has a small monthly charge (roughly 0.30 dollars at the time of writing; an estimate, use AWS's pricing tools for exact figures), and the idle-cost target is tight (NFR4). With these two, the stack has about twelve custom metrics.

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Guard skipped (new) | `GuardSkipped` 1 or more in 1 hour; missing data counts as not breaching | Medium | SNS topic, then the deploy-time email |
| Lambda errors | Errors 1 or more in 5 minutes (unchanged) | High | Same |
| API server errors | 5xx 1 or more in 5 minutes (unchanged); a DELETE_FAILED is a 500 | High | Same |

Missing data stays "not breaching". A limit answer (429) is not an error and does not alarm.

## SLIs / SLOs

The figures come from the custom metrics, which CloudWatch keeps beyond the 14-day log retention, not from the logs themselves.

| SLI | SLO target | Measurement window |
|---|---|---|
| Requests refused only because of the daily cap (`DailyLimitHit`) | Watched, no target: the cap is a courtesy limit, and a handful of hits a day is normal for a demo | 7-day rolling |
| Create requests that end in a server error | Under 1% (unchanged from the first unit) | 30-day rolling |
| A delete answers within 2 seconds | 95% (the 2-second store limit) | Checked by hand in the deploy smoke checks; no metric |

## Logs & Tracing

- No change to retention (14 days) or to what is never logged: typed text, model text, the full session ID or a full reservation id.
- The `guard_skipped` line carries the outcome, the error class and a short session prefix only.
- No tracing and no canary, as before.

## Dashboard

The existing `learning-journey` dashboard gains one line: `DailyLimitHit` and `GuardSkipped` beside the existing request counts.

## Assumptions & Open Questions

- [assumption] The metric filters are written with the JSON metric-filter syntax; a stack test confirms each pattern and that, like the other count filters, each publishes 0 in empty periods.
- None otherwise.
