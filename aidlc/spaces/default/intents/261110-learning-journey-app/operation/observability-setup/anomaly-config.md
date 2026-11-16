# Anomaly Detection Configuration — Learning Journey App

## Sources

- `observability-setup-questions.md` in this folder (assumption: no anomaly detection; confirmed at the summary)
- `alarms.md` and `slo-config.md` in this folder
- Each unit's `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` and the units after it

## Decision

No CloudWatch anomaly detection band and no CloudWatch Logs anomaly detector.

## Why

- A band learns from at least about two weeks of steady data; this stack has an hour of traffic and will run for days with tens of users. A band would be noise or silence.
- Each detector is billed as extra metrics.

## What is used instead

| Concern | Fixed threshold | Where |
|---|---|---|
| Errors | 1 Lambda error or 1 API 5xx in 5 minutes | `alarms.md` |
| AI quietly failing | 3 template journeys in 1 hour | `alarms.md` |
| Cap failing open | 1 guard skipped in 1 hour | `alarms.md` |
| Spend | 2 dollars a day, 8 dollars a month | `alarms.md` |
| Slow journeys | Any create over 20 seconds | `slo-config.md`, weekly check |
| Odd traffic | Read by eye on the requests widget and `requests-per-day` | `dashboards.md`, `log-queries.md` |

## Assumptions & Open Questions

- [assumption] If the app ran longer with steady traffic, a band on API `Count` would be the first worth adding.
- None otherwise.
