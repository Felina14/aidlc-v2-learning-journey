# Dashboards — Learning Journey App

## Sources

- `observability-setup-questions.md` in this folder (Q1 A, Q2 A; summary confirmed "Looks correct", including the one log widget)
- Each unit's `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` and the five units after it
- `infrastructure-specification.md` of each unit, in the same folders
- The stack — `infra/stacks/journey_stack.py` (`_dashboard`) and `infra/stacks/queries.py`, deployed at commit `41a9782` (tag `deploy-20261111-2227`)

## The dashboard

One CloudWatch dashboard, `learning-journey`, in us-east-1, defined in the stack and removed with it. Nine widgets, read live on 2026-11-11 after the deploy.

| Row | Widget | Shows | Signal |
|---|---|---|---|
| 1 | Requests, 4xx (includes 429) and 5xx | API Gateway `Count`, `4xx`, `5xx`, 5-minute sums | Traffic, errors, saturation (429) |
| 1 | Lambda errors and p95 duration | Function `Errors`; `Duration` p95 | Errors, latency |
| 2 | Journeys by source | `JourneysAi`, `JourneysTemplate` | NFR10 (share of fallbacks) |
| 2 | Bedrock outcomes | `BedrockOk`, `BedrockRefused`, `BedrockInvalid`, `BedrockError`, `BedrockThrottled` | Why fallbacks happen |
| 2 | Completion changes and time | `CompletionOk`, `CompletionSaveFailed`; `CompletionTimeMs` p95 | Latency (NFR2: saved within 2 s) |
| 2 | Goal changes failed and time | `GoalChangeFailed`; `GoalChangeTimeMs` p95 | Errors, latency |
| 2 | Daily limit hits and guard skipped | `DailyLimitHit`, `GuardSkipped` | Cap working; guard health |
| 2 | Spend | A text pointer to Billing and Cost Management, Budgets | NFR4 |
| 3 | **Invalid AI replies by problem** (added in this stage) | A Logs Insights table over the function logs: invalid attempts counted by the reply check's problem name | Cause of an invalid reply at a glance |

The new widget reads the logs directly, so no metric filter was added for it. Attempts from before the fix forward have no problem name and show as a blank row.

## What changed in this stage

| Change | Commit | Deploy |
|---|---|---|
| The log-query widget in row 3 | `41a9782` | `UPDATE_COMPLETE` in 19 s; tag `deploy-20261111-2227` |

The diff before the deploy showed only the dashboard change and the nine saved queries. Nothing else in the dashboard changed.

## How to open it

CloudWatch console, us-east-1, Dashboards, `learning-journey`. Set the time range to the period being checked; the metric widgets use 5-minute periods.

## Assumptions & Open Questions

- [assumption] Lambda concurrency against the account limit of 10 is read from the Lambda console (`ConcurrentExecutions`) when needed; it is not on the dashboard, because at tens of users it stays near zero.
- None otherwise.
