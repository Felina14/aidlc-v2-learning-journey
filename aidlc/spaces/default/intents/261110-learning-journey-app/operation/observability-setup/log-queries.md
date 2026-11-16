# Log Queries — Learning Journey App

## Sources

- `observability-setup-questions.md` in this folder (Q1 A: saved queries in the stack; Q2 A: invalid replies by problem)
- The stack — `infra/stacks/queries.py` (the query text, the single source) and `infra/stacks/journey_stack.py` (`_saved_queries`), deployed at commit `41a9782` (tag `deploy-20261111-2227`)
- The function's log fields — `backend/src/learning_journey/handler.py`, `generator.py`, `bedrock_client.py`, `usage_guard.py`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR10)

## Where they are

CloudWatch console, us-east-1, Logs Insights, "Saved queries", folder `learning-journey`. Each is bound to the function's log group (`FunctionLogs...`, kept 14 days). They are created and removed with the stack.

Every query was run once against the live logs before it went into the stack (2026-11-11, last 6 hours); all nine completed. The stack test `test_every_saved_query_is_in_the_stack_on_the_function_logs` checks that the deployed text equals `queries.py`.

## The queries

| Name (`learning-journey/...`) | Answers | First live result |
|---|---|---|
| `invalid-ai-replies-by-problem` | Which rule an invalid AI reply broke, counted by problem name (`hours_by_kind`, `not_one_json_object`, `truncated`, …) | 2 attempts with no name (from before the fix forward) |
| `journeys-by-source-and-style` | AI or template, per teaching style | 4 rows; most were AI guide journeys |
| `request-time-by-route` | Count, p50, p95 and max total time per route | 8 routes; create p50 5.8 s, p95 10.4 s |
| `journeys-over-20-seconds` | Creates over the NFR2 limit, with source and Bedrock outcome | 0 rows |
| `failed-requests-by-outcome` | Every non-`ok` request by outcome, status and route | 8 rows (the expected 400s, 404s and the one 429 from the smoke checks) |
| `server-errors` | Every 5xx with route and outcome | 0 rows |
| `requests-per-day` | Total requests per day (the denominator for the 5xx SLO) | 47 on 2026-11-11 |
| `guard-skipped` | Each time the daily cap failed open | 0 rows |
| `one-session-trail` | Everything one session did, in order. Replace `PREFIX` with the 8-character session prefix from a request line | (needs a prefix) |

## What the queries can and cannot show

The function logs only fixed fields: the event, route, status, outcome code, total time in milliseconds, journey source, teaching style, Bedrock outcome, problem name, model identifier and an 8-character session prefix. No log line holds the topic, the model's text, the certificate name or a full session ID (NFR10), so no query can show them. The `guard-skipped` query prints the whole message, which contains only those fixed fields.

## Assumptions & Open Questions

- [assumption] The API access logs (a second log group) are not queried here; the function's request line carries the same route, status and time with the outcome code.
- None otherwise.
