# Monitoring Design — u1-skeleton

## Sources

- `infrastructure-specification.md` in this folder
- `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/functional-spec.md` (BR4.3 logging of source and model outcome)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR4, NFR10)
- Infrastructure answers Q4 and Q6 — `infrastructure-design-questions.md` in this folder

The NFR Design observability strategy did not run for this unit; this design implements NFR10 and the answer to Q4 directly. Alarms and spend alerts all go to the one email passed at deploy time.

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Lambda errors | Lambda built-in metric | 1 or more in 5 minutes | An unexpected error ends a request with no journey. |
| Lambda duration (p95) | Lambda built-in metric | Watched on the dashboard, no alarm; the target is under 20 s (NFR2) | Shows how close journeys run to the time budget. |
| API 5xx responses | API Gateway metric | 1 or more in 5 minutes | Server failures such as SAVE_FAILED reach the learner. |
| API 429 responses | API Gateway metric | Watched on the dashboard, no alarm | Shows the throttle working or a script hammering the API. |
| Journeys by source (`ai`, `template`) | Custom metric from the Lambda's structured log line (BR4.3) | Template share watched on the dashboard | NFR10: the share of fallbacks must be visible. |
| Template fallbacks | Same custom metric, `template` count | 3 or more in 1 hour | The template hides an AI outage from the learner, so this is how it is noticed. |
| Bedrock outcome (`ok`, `refused`, `invalid`, `error`, `throttled`) | Structured log line from the generator (BR4.3) | Watched on the dashboard, no alarm | Explains why fallbacks happen. |
| Estimated daily spend | AWS Budgets | 2 dollars actual in a day; 8 dollars actual in the month | NFR4 and BR7.2. |

## Alerts

All error alarms treat missing data as not breaching, so a quiet period reads as healthy. The email subscription must be confirmed once after the first deploy (see `cicd-pipeline.md`).

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Lambda errors | Errors 1 or more in 5 minutes | High | SNS topic, then the deploy-time email |
| API server errors | 5xx 1 or more in 5 minutes | High | Same |
| AI quietly failing | Template journeys 3 or more in 1 hour | Medium | Same |
| Daily spend | Actual spend 2 dollars in a day | High | Budget notification to the same email |
| Monthly spend | Actual spend 8 dollars in the month | High | Same |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Valid topic returns a journey (AI or template) within 20 seconds | 100% of requests (NFR2) | Measured from the Lambda's logged total request time (max over each day); any value above 20 s is checked by hand in the logs. Lambda p95 is only a trend and cannot prove this. |
| Requests that end in a server error (5xx) | Under 1% | 30-day rolling |
| Journeys served from the AI rather than the template | Watched, no target (the template is the promised fallback, NFR3) | 7-day rolling |
| Idle daily spend | Under 0.10 dollars (NFR4) | Any 24 hours with no traffic |

## Logs & Tracing

- The Lambda writes structured JSON log lines: request id, route, outcome code, total request time in milliseconds, model identifier, Bedrock outcome and journey source. It never logs the session ID in full beyond a short prefix, the typed certificate name, or the model's text.
- Lambda and API access logs are kept 14 days and are removed with the stack.
- Log metric filters turn the `ai` and `template` lines into the custom metrics above.
- No X-Ray tracing and no synthetic canary (Q4: not needed at this scale).

## Dashboard

One CloudWatch dashboard, `learning-journey`, with: requests and 4xx, 5xx and 429 counts; Lambda errors and p95 duration; journeys by source; Bedrock outcomes; month-to-date spend link.

## Assumptions & Open Questions

- [assumption] The alarm thresholds are starting values and can be tuned after the first week of use.
- None otherwise.
