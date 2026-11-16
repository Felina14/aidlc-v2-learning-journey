# Tracing Configuration — Learning Journey App

## Sources

- `observability-setup-questions.md` in this folder (Q4 A: keep tracing off)
- `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` ("No X-Ray tracing and no synthetic canary", infrastructure answer Q4)
- The live function, read on 2026-11-11: tracing mode `PassThrough`

## Decision

AWS X-Ray tracing stays **off**. The function's tracing mode is `PassThrough` (it records nothing of its own), and the stack grants no X-Ray permission.

## Why

- The path of a request is short and fixed: CloudFront, the HTTP API, one function, then DynamoDB and (for a create) Bedrock. It is easy to follow in the logs.
- The request log line carries the total time per request, and each `ai_attempt` line marks a model call and its outcome; together they give the timing a trace would give for this path.
- Turning it on needs a stack change, the X-Ray write permission and, past the free tier, a charge; none is justified at tens of users.

## How to follow one request without tracing

1. Find the request line (saved query `server-errors`, `failed-requests-by-outcome` or `journeys-over-20-seconds`) and note its 8-character session prefix.
2. Run `one-session-trail` with that prefix: the `ai_attempt`, `journey_made` and `request` lines of that session, in order.
3. For a create, the model's share of the time is the gap between the request start and the last `ai_attempt` line.

## If tracing is wanted later

Set `tracing=lambda_.Tracing.ACTIVE` on `JourneyFunction` in `infra/stacks/journey_stack.py`; CDK adds the X-Ray write permission. Redeploy with the `cd-config.md` routine. Performance Validation can ask for this if the logs are not enough for its timing work.

## Assumptions & Open Questions

- None.
