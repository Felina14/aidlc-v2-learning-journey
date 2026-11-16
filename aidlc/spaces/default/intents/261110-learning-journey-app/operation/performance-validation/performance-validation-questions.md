# Performance Validation — Questions

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: NFR2 (a journey within 20 s for 100% of valid topics; a stage mark shown within 1 s and saved within 2 s for 95%; a return visit shown within 3 s for 95%), NFR4 (idle day under 0.10 dollars; total under 10 dollars), NFR5 (one `cdk destroy` removes everything)
- NFR Requirements and NFR Design were skipped in this plan, so there is no `performance-requirements.md`, `scalability-requirements.md`, `performance-design.md` or `scalability-design.md`; the targets come from the requirements above and the units' infrastructure designs (API throttle rate 5 and burst 10, Lambda account limit 10 and no reserved concurrency, a 15-second model budget, a 2-second store limit, a daily limit of 5 journeys per session)
- Observability Setup: `dashboards.md`, `slo-config.md`, `log-queries.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/` (first readings: no create over 20 s, max 10.4 s over 18 creates)
- Build and Test: `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/` (targets owned here: T-NFR2, T-NFR4, T-NFR5-LIVE)
- Deployment Execution: `deployment-log.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-execution/` (live at `41a9782`, tag `deploy-20261111-2227`)
- `team.md` — `aidlc/spaces/default/memory/team.md` (tens of users; deadline 14 November 2026)
- Your instruction at the Incident Response gate: run the `cdk destroy` check last; as soon as it passes, redeploy the same tagged commit with the same budget email, re-run the basic smoke checks, and record both

This stage measures the system against its performance, cost and teardown targets on the live stack. The traffic is tens of users, so "load" here means enough requests to read percentiles, not a stress test. Two limits shape any run: the API throttle (5 requests a second, bursts of 10) and the daily limit (5 journeys per session), so a run uses many made-up sessions; and every journey created is one Nova Lite call (about a tenth of a cent each). These four questions are the real choices. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] How much load should the test put on the live stack?

A. A paced run under the throttle, plus one short read-only burst: 30 journey creates (one per made-up session, one every 2 seconds, rotating the three styles), 300 reads and stage marks at about 4 a second, then one burst of 30 reads in about a second to show the throttle answers 429 with no 5xx; measure p50, p95 and max from both the client side and the function logs (Recommended): enough samples for a p95 at the real scale, under 5 cents of model use, and the burst uses no model calls.
B. The paced run only, no burst: the same numbers without confirming the throttle under the live stack.
C. No new load; use the samples already in the logs (18 creates and the smoke-check traffic): free and immediate, but too few samples for a meaningful p95 on most routes.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] How should idle spend (NFR4) be checked, given the deadline?

NFR4's check is "with no traffic for 24 hours the daily spend is under 0.10 dollars". Cost data in AWS arrives with a delay of up to a day, so a real reading needs the stack idle for a full day and then up to another day for the cost to appear: that would hold this stage until about 13 November, and the destroy-and-redeploy in Q4 starts a new idle period anyway.

A. Record today's month-to-date total from Cost Explorer, estimate the idle daily cost from the resources that bill when idle, and record the 24-hour idle reading as a dated follow-up for you (Cost Explorer, daily view, the first full idle day after the redeploy), leaving that part of NFR4 `Unverified` with that owner (Recommended): it keeps the deadline, states plainly what was and was not measured, and the budget alarm at 2 dollars a day still guards the money.
B. Hold the stage until a full idle day's cost is visible (about two days), then read it: NFR4 fully verified, at the price of most of the remaining time before 14 November.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] How should the in-browser times of NFR2 be measured?

"Shown within 1 second" and "return visit within 3 seconds" include the browser drawing the page. I have no browser; I can time the requests from this machine (the page, its stylesheet and script, and the API calls), which covers the network and the server but not the drawing.

A. Time the page, its assets and the API calls from this machine, call those "network and server" times, and leave the drawing part to your Lighthouse performance run in Chrome (one line added to your manual-pass script), recording NFR2's browser part as `Unverified` until you run it (Recommended): honest about what was measured, with the browser part in the run you are already doing.
B. Treat the request times from this machine as the whole NFR2 measure: quicker, but it would call a browser target met without a browser.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Confirming the destroy-and-redeploy you asked for, with what it changes

You asked: run `cdk destroy` last, check nothing is left, then redeploy the same tagged commit with the same budget email, re-run the basic smoke checks and record both. Three things change as a result, and I want you to have them in front of you before I delete anything:

- The site gets a **new address**: a new CloudFront distribution means a new `...cloudfront.net` domain; the old one stops working.
- The alarm and budget email needs **confirming again**: the email subscription is recreated, so AWS sends a new confirmation link, and until you click it no alarm reaches you.
- All **journeys are deleted** with the table (demo data, as agreed). The CDK bootstrap stack (`CDKToolkit`) stays, by design.

A. Go ahead as you asked: `cdk destroy` of `LearningJourney`, then check that the stack, every resource tagged with the project tag, and every log group with the stack's prefix are gone; then redeploy tag `deploy-20261111-2227` (commit `41a9782`) from a separate work tree with the same budget email; then run the basic smoke checks (HTTPS and redirect, create and reload one journey, the log line, the alarms, the subscription state) and give you the new address and the confirmation reminder (Recommended): it verifies NFR5 for real and leaves the demo running, as you asked.
B. Postpone the destroy check until the demo is over (after 14 November), keeping today's address, and record NFR5 as `Unverified` until then: no new address and no re-confirmation, but teardown stays unproven on a live stack.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] Order of work: the load run (Q1) and the cost reading (Q2) first, on today's stack; the destroy-and-redeploy (Q4) last, as you asked.
- [assumption] The load run uses made-up session IDs and fixed, harmless topics; every journey it creates is deleted at the end of the run, so the table is left as it was.
- [assumption] Targets are judged from both sides: the client-side time from this machine (network included) and the function's logged total time (server only). The p95 is reported only where there are at least 20 samples.
- [assumption] Scalability: the system is capped by design (API throttle 5 per second, burst 10; Lambda account limit 10). There is no auto-scaling to validate; the report records the cap and what happens at it.
- [assumption] No X-Ray: Observability Setup kept tracing off, and the logged times are enough.
- [assumption] The redeploy after the destroy is of the same commit, so its smoke checks are the basic ones; the deploy is tagged again (`deploy-YYYYMMDD-HHMM` on the same commit) after they pass, so the deploy history shows it.
- [assumption] The results record the account only as ending 5285 and never the email address; the generated `infra/cdk.out` folder is deleted after each CDK command.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
