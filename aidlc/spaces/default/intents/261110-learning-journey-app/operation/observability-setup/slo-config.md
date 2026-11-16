# SLO Configuration — Learning Journey App

## Sources

- `observability-setup-questions.md` in this folder (Q3 A: saved queries, existing metrics and a weekly manual check; no Application Signals)
- `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` (the SLIs and SLOs)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR4)
- `log-queries.md` in this folder

## SLIs, SLOs and how each is measured

| SLI | SLO | Window | Measured with | First reading (2026-11-11, about 1 hour of traffic) |
|---|---|---|---|---|
| A valid topic returns a journey (AI or template) within 20 seconds | 100% of requests (NFR2) | Each day | Saved query `journeys-over-20-seconds` (must return no rows) and `request-time-by-route` (max for `POST /api/v1/journey`) | 0 rows over 20 s; max 10.4 s over 18 creates |
| Marking a stage is saved within 2 seconds | 95% of actions (NFR2) | Each day | `request-time-by-route` (p95 for the completion route) and the `CompletionTimeMs` p95 on the dashboard | Single-digit milliseconds in the handler |
| Requests that end in a server error (5xx) | Under 1% | 30-day rolling | `server-errors` (count) over `requests-per-day` (total) | 0 of 47 |
| Journeys served by the AI rather than the template | Watched, no target (the template is the promised fallback, NFR3) | 7-day rolling | `journeys-by-source-and-style` | 1 template journey (the planner defect, fixed) out of 14 |
| Idle daily spend | Under 0.10 dollars (NFR4) | Any 24 hours with no traffic | AWS Budgets and Cost Explorer (daily granularity) | Not yet measurable: Performance Validation owns it |

The handler times are measured inside the function; the time a person sees also includes CloudFront and the network. Performance Validation measures the end-to-end numbers.

## Weekly manual check (about 5 minutes)

1. CloudWatch Logs Insights, us-east-1, saved queries `learning-journey/...`, time range "last 7 days".
2. Run `journeys-over-20-seconds`: it must return no rows. Any row is an SLO miss; note the date and look at its `bedrock_outcome`.
3. Run `request-time-by-route`: the completion route's p95 must be under 2000 ms.
4. Run `server-errors` and `requests-per-day`: errors divided by requests must be under 1%.
5. Run `journeys-by-source-and-style`: note the template share; a rising share with `invalid-ai-replies-by-problem` rows points at the prompt.
6. Open Budgets: the month-to-date total must stay under 8 dollars.
7. Write the four numbers and the date in a line under "Readings" below.

## Readings

| Date | Journeys over 20 s | Completion p95 | 5xx share | Template share | Month-to-date spend |
|---|---|---|---|---|---|
| 2026-11-11 (first hour after deploy) | 0 | single-digit ms (handler) | 0 of 47 | 1 of 14 | not yet read |

## Not used, and why (Q3 A)

CloudWatch Application Signals SLOs would give burn-rate alerts, but they need the function instrumented (a layer or a code change) and add cost; the demo runs for days, and every SLI above is already in the logs or metrics.

## Assumptions & Open Questions

- [assumption] Logs are kept 14 days, so a 30-day rolling window can only be read over the last 14 days; for a demo of a few days this does not matter.
- None otherwise.
