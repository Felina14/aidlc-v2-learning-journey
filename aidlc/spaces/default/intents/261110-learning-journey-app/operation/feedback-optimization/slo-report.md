# SLO Report — Learning Journey App

## Sources

- `slo-config.md` and `log-queries.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- `test-results.md` and `nfr-validation-matrix.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/performance-validation/`
- `smoke-test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-execution/smoke-test-results.md`
- `incident-plan.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/incident-response/incident-plan.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR4)

Period: 2026-11-11, from the first deploy to the end of Performance Validation (a few hours of test traffic only; no real users). The logs before the teardown check were deleted with the first stack, so the figures below were taken during the stages that produced them.

## Compliance

| SLO | Target | Measured | Samples | Status | Error budget |
|---|---|---|---|---|---|
| A journey within 20 s | 100% (NFR2) | 100%; max 13.7 s client, 12.9 s server | About 50 creates (smoke checks, the load run, the redeploy check) | **Met** | None to spend: any miss breaks it |
| A stage mark saved within 2 s | 95% (NFR2) | p95 0.90 s client, under 10 ms server | 150 in the load run, plus the smoke checks | **Met** | Ample |
| Server errors (5xx) | Under 1% over 30 days | 0% (0 server errors) | About 900 requests | **Met** | 1% of requests unspent (about 9 of 900); burn rate zero |
| AI share of journeys | Watched, no target (NFR3) | 1 template journey on the first deploy (the planner defect, fixed); every journey since was AI (30 of 30 in the load run). 4 invalid AI replies were recovered by the retry in the load run | About 50 | Watched | — |
| Idle daily spend | Under 0.10 dollars (NFR4) | Not measured yet: Cost Explorer shows 0.00 dollars for every day this month, marked estimated | — | **Unverified** | — |

## What the SLOs do not show yet

- Trends: the weekly check in `slo-config.md` has not run for a week.
- The browser part of NFR2 (drawing time): the person's Lighthouse run.
- The 24-hour idle cost: the person, after a full idle day.

## Incidents in the period

One P2: the planner style fell back to the template on every journey on the first deploy. It did not breach an SLO (a template journey is still a journey within 20 s), but it would have shown as a falling AI share. Fixed forward the same evening (`incident-plan.md`).

## Assumptions & Open Questions

- [assumption] "About 900 requests" adds the load run (about 420), the smoke checks and Performance Validation's checks; the exact count of the first stack's requests went with its logs.
- None otherwise.
