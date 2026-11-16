# NFR Validation Matrix — Learning Journey App

## Sources

- `test-results.md` and `load-test-plan.md` in this folder
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5)
- `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/build-and-test-summary.md` (the targets Build and Test assigned to this stage: T-NFR2, T-NFR4, T-NFR5-LIVE)
- `slo-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/slo-config.md`

## Target versus actual

| ID | Target | Actual | Evidence | Verdict |
|---|---|---|---|---|
| PV-1 (NFR2) | A journey (AI or template) within 20 s, 100% of valid topics | 30 of 30 under 20 s; client max 13.7 s, server max 12.9 s; p95 10.3 s (client) and 12.5 s (server) | `test-results.md` §1 | **Met** |
| PV-2 (NFR2) | A stage mark saved within 2 s, 95% of actions | Client p95 0.90 s, max 1.85 s; server p95 under 10 ms (150 marks) | §1 | **Met** |
| PV-3 (NFR2) | A stage mark shown on the page within 1 s, 95% | The request part is 0.90 s at p95 from here; the page's own update is drawn in the browser and was not measured | §1 | **Unverified** (browser part: the person's Lighthouse run) |
| PV-4 (NFR2) | A return visit shows the saved journey within 3 s, 95% | Network and server part: page 0.63 s, stylesheet 0.62 s, script 0.75 s and the journey read 0.92 s at p95; together about 2.3 s if fetched one after another, less in a browser that fetches in parallel | §1 | **Unverified** (drawing time: the person's Lighthouse run) |
| PV-5 | The throttle answers 429 under a burst; no 5xx | No 5xx in any phase; a burst of 30 reads was **not** throttled (all `200`), though a `429` appeared once soon after | §1 | **Not Met** for the throttle part (best-effort service behaviour; the settings are correct); **Met** for no 5xx |
| Scale | Tens of users within the designed caps | Peak 6 concurrent of 10, 0 Lambda throttles, 30 creates in 60 s with no error | §1 | **Met** (no auto-scaling exists; the caps are the design) |
| PV-6 (NFR4) | Idle day under 0.10 dollars; total under 10 dollars | Month-to-date 0.00 dollars (estimated); idle estimate about 0.05 dollars a day at most | §2 | Total: **Met** so far. Idle day: **Unverified** (24-hour reading for the person) |
| PV-7 (NFR5) | One `cdk destroy` removes every resource, no orphans | Both destroys left empty log groups (1, then 2) recreated by late log delivery; after a one-command cleanup, nothing remained | §3 | **Not Met as worded**; teardown is complete with the documented cleanup step |

## Build and Test targets closed or carried

| Build and Test target | Before | Now |
|---|---|---|
| T-NFR2 | Unverified | Server and network parts **Met** (PV-1, PV-2); browser part **Unverified** (PV-3, PV-4) |
| T-NFR4 | Unverified | Total **Met** so far; idle day **Unverified** |
| T-NFR5-LIVE | Unverified | **Not Met as worded** (PV-7), accepted by the person with the cleanup step |

## Capacity notes

- The real ceiling is the Lambda account limit of 10 concurrent executions; a create holds one for 5 to 13 seconds, so about 1 create a second is the sustained limit before Lambda throttles. At tens of users this is far away.
- The daily limit (5 journeys per session per day) bounds model cost per session, not per person: a new session ID gets a new allowance. The budgets and the concurrency brake are the backstop.

## Assumptions & Open Questions

- [assumption] "Met" means met for this scale and these samples (30 creates, 150 reads, 150 marks), from one location.
- None otherwise.
