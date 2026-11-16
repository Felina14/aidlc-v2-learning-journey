# Load Test Plan — Learning Journey App

## Sources

- `performance-validation-questions.md` in this folder (Q1 to Q4: A; summary confirmed "Looks correct")
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5)
- Each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the units after it (throttle rate 5 and burst 10, Lambda account limit 10, 15-second model budget, 2-second store limit, daily limit of 5 per session)
- Observability Setup: `dashboards.md`, `log-queries.md`, `slo-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- NFR Requirements and NFR Design were skipped in this plan: no performance or scalability requirement or design files exist; the targets come from the requirements and the infrastructure designs above

## Targets

| ID | Target | Source |
|---|---|---|
| PV-1 | A valid topic produces a journey (AI or template) within 20 s, 100% of requests | NFR2 |
| PV-2 | A stage mark is saved within 2 s, 95% of actions | NFR2 |
| PV-3 | A stage mark updates the page within 1 s, 95% of actions | NFR2 (browser part) |
| PV-4 | A return visit shows the saved journey within 3 s, 95% of loads | NFR2 (network and server part measured here; drawing in the person's Lighthouse run) |
| PV-5 | The throttle answers 429 under a burst, and no 5xx appears | Infrastructure design (throttle), NFR3 |
| PV-6 | Idle daily spend under 0.10 dollars; total under 10 dollars | NFR4 |
| PV-7 | One `cdk destroy` removes every resource | NFR5 |

## Scenario

Run from the builder's machine against the live site (`https://d3v7tl7b4jtner.cloudfront.net` at the time of the run; after the teardown check the site is at `https://d287qizl0f6l3h.cloudfront.net`), with a scratch script using only the Python standard library (no new dependency, no AWS credentials used for the traffic). Made-up session IDs; fixed harmless topics.

| Phase | Traffic | Measures | Model calls |
|---|---|---|---|
| 0 | The page, `styles.css` and `main.js`, 20 times each, one after another | Network and server time for a visit (PV-4) | 0 |
| 1 | 30 journey creates, one every 2 s, each in its own session, rotating guide, instructor and planner | Create time and source (PV-1) | 30 (plus any retries) |
| 2 | 300 requests at about 4 a second over the created journeys: half reads (`GET`), half stage marks and unmarks (`PUT`) | Read time (PV-4), mark time (PV-2) | 0 |
| 3 | One burst of 30 reads started together | Throttle and errors (PV-5) | 0 |
| Cleanup | `DELETE` of every journey the run made | The table is left as it was | 0 |

Each phase is measured on two sides: the client time from this machine (network included) and the function's logged `total_ms` (server only), read with the saved query `request-time-by-route` over the run's time window. A p95 is reported only for at least 20 samples.

Phases 0 to 2 stay under the throttle (5 a second) and under the Lambda account limit of 10 (at most about 5 creates in flight at once). The cost is about 30 Nova Lite calls, under 5 cents.

## Cost reading (PV-6)

Cost Explorer, month-to-date total, read after the run; an estimate of the idle daily cost from the resources that bill while idle. The 24-hour idle reading is a dated follow-up for the person (Q2 A).

## Teardown check (PV-7), last

1. `cdk destroy` of `LearningJourney` with the pinned CDK command line.
2. Check: the stack is gone; no resource carries the project tag `learning-journey` (Resource Groups Tagging API); no log group with the stack's prefix remains.
3. Redeploy tag `deploy-20261111-2227` (commit `41a9782`) from a separate work tree with the same budget email.
4. Basic smoke checks: HTTPS and redirect, create and reload one journey, the log line, the alarms, the subscription state; tag the redeploy.

## Out of scope

- Stress beyond the designed caps (the throttle and the account limit are the designed ceiling; there is no auto-scaling to validate).
- Browser drawing time (the person's Lighthouse run).
- X-Ray (kept off in Observability Setup).

## Assumptions & Open Questions

- [assumption] The scratch script is deleted after the run; its output is recorded in `test-results.md`.
- None otherwise.
