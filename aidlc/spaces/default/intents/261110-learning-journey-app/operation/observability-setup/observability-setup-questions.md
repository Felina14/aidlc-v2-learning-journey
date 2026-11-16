# Observability Setup — Questions

## Sources

- Monitoring design of each unit: `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` and the five units after it (metrics, alerts, SLIs and SLOs, logs, dashboard)
- Infrastructure design of each unit: `infrastructure-specification.md` in the same folders
- NFR Design was skipped in this plan, so there is no `performance-design.md`, `security-design.md` or `reliability-design.md`; the observability strategy comes from the monitoring designs above and the requirements, as each unit recorded
- Deployment Execution: `deployment-log.md`, `smoke-test-results.md` and `health-check-report.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-execution/` (stack live at `fac52c1`, alarms 4 of 4 OK, the new `problem` field on invalid attempts)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR4, NFR10)
- The live stack, read only on 2026-11-11: 14 metric filters, 4 alarms, 1 dashboard, 4 log groups kept 14 days, Lambda tracing `PassThrough` (X-Ray off)

The deployed stack already has the observability the units designed: structured JSON logs, 14 log-based metrics (journeys by source, Bedrock outcomes, stage-change and goal-change times and failures, the daily-limit and guard-skipped counts), four alarms (Lambda errors, API 5xx, template fallback 3 or more in an hour, guard skipped) to the confirmed email, two spend budgets, and one dashboard. Distributed tracing was decided against in the first unit (Q4). So this stage mostly records what is live and adds what is missing for operating it: saved log queries, the SLO tracking, and whether to add anything. These four questions are the real choices. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] Should this stage change the live monitoring, or only document and query it?

Changing the alarms, dashboard or metric filters means editing the CDK stack and redeploying (the stack is the only source of the monitoring; a console change would be drift). Saved CloudWatch Logs Insights queries are not in the stack today; they can be added either to the stack or created by hand.

A. Document what is live and add saved Logs Insights queries to the stack, with one redeploy whose diff shows only the queries; leave the alarms, metrics and dashboard as built (Recommended): the queries are what you need to answer "what happened" during an incident, they cost nothing, and the monitoring the six units designed and reviewed stays unchanged.
B. Document only; write the queries in `log-queries.md` for you to paste into Logs Insights when needed: no change to the stack and no redeploy, but the queries are not one click away in the console.
C. Document, add the queries, and also tune or add alarms and dashboard widgets as Q2 and Q3 decide, in one redeploy.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] Should an alarm be added for invalid AI replies?

The planner defect would have shown as two `invalid` attempts per planner journey and a template journey each time. The template-fallback alarm (3 or more template journeys in an hour) would have caught it only after three planner journeys in one hour. Since the fix forward, each invalid attempt also logs its problem name. A metric for invalid attempts (`BedrockInvalid`) already exists, without an alarm.

A. No new alarm; add a dashboard line for invalid attempts by problem name and a saved query for it (Recommended): at tens of users an invalid reply is rare and the template-fallback alarm already covers a lasting failure; the new query shows the cause at once when that alarm fires, and nothing new is billed.
B. Add an alarm on `BedrockInvalid` of 3 or more in an hour, to the same email: it catches a prompt or model problem sooner, at the cost of one more alarm (about 0.10 dollars a month) and possible noise from a one-off bad reply.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] How should the SLOs be tracked?

The first unit set the SLOs: a journey within 20 seconds for 100% of valid topics (NFR2), under 1% of requests ending in a server error over 30 days, the AI share watched with no target, and idle spend under 0.10 dollars a day (NFR4). CloudWatch has an SLO feature (Application Signals), but it needs extra instrumentation and has its own charges.

A. Track them with saved Logs Insights queries and the existing metrics, reviewed by hand (a short weekly check listed in `slo-config.md`), with no new AWS feature (Recommended): the numbers are all in the logs and metrics already, the demo runs for days not months, and nothing new is added to the bill or the code.
B. Turn on CloudWatch Application Signals SLOs: dashboards and burn-rate alerts out of the box, but it needs the Lambda instrumented (a layer or code change), adds cost, and is a larger change than the remaining days justify.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Should X-Ray tracing be turned on?

Tracing shows one request's path (API to Lambda to Bedrock and DynamoDB) with timings. The first unit decided against it at this scale. The request log line already carries the total time per request; the model time can be read from the attempt lines.

A. Keep tracing off, as decided in the first unit, and record why in `tracing-config.md` (Recommended): one function and two downstream calls are easy to follow in the logs, and tracing adds a permission, a setting and a small cost.
B. Turn on active tracing for the function only (a one-line stack change and the X-Ray write permission), useful for Performance Validation's timing work: it gives a timing breakdown per request, at the cost of a stack change, a new permission and X-Ray charges after the free tier.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The golden signals are: traffic (API request count by route), errors (API 5xx, Lambda errors, save failures), latency (the logged total time per request, and the stage-change and goal-change times), and saturation (Lambda concurrent executions against the account limit of 10, and 429 throttling). All come from metrics and logs that exist today.
- [assumption] Log retention stays 14 days for every log group, removed with the stack, as the units designed; no log aggregation outside CloudWatch.
- [assumption] Anomaly detection: none; at tens of users a CloudWatch anomaly band has too little data to learn from. `anomaly-config.md` records this and the fixed thresholds used instead.
- [assumption] Alarms and spend alerts keep going to the one confirmed email; there is no paging or second contact. Escalation is to the builder only (single person).
- [assumption] Any redeploy in this stage follows the `cd-config.md` routine (diff read, then deploy, then tag) and shows nothing but the monitoring change in the diff.
- [assumption] The artifacts record the account only as ending 5285 and never the email address.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
