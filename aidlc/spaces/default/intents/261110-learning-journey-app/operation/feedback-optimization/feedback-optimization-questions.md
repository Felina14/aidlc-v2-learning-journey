# Feedback & Optimization — Questions

## Sources

- Observability Setup: `dashboards.md`, `alarms.md`, `slo-config.md`, `log-queries.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- Deployment Execution: `deployment-log.md`, `smoke-test-results.md`, `health-check-report.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-execution/`
- Incident Response: `incident-plan.md` (the planner incident and its review), `runbooks.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/incident-response/`
- Performance Validation: `test-results.md`, `nfr-validation-matrix.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/performance-validation/` (live at `2b393e2`, tag `deploy-20261111-2323`, site `https://d287qizl0f6l3h.cloudfront.net`)
- Each unit's `infrastructure-specification.md` (the design to compare drift against) — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the units after it
- Build and Test: `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/build-and-test-summary.md` (the targets still `Unverified`)
- `team.md` — `aidlc/spaces/default/memory/team.md` (deadline 14 November 2026; cut order)

This is the last stage. It reports how the live system is doing against its SLOs and costs, checks for drift, and writes the feedback loop: what the next cycle should pick up. The stack has run for a few hours with test traffic only, so there is no real user behaviour to learn from yet, and the SLO and cost numbers are first readings, not trends. These four questions are the real choices. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] How should drift be checked?

Drift is a difference between the deployed resources and the stack's definition, for example a setting changed in the console. As far as I know nothing was changed outside the stack this session (the concurrency brake was never used), but a check is the only proof.

A. Run CloudFormation's own drift detection on `LearningJourney` once (free, read-only) and report what it finds (Recommended): it compares every supported resource with the template, needs nothing new, and changes nothing.
B. Turn on AWS Config with a drift rule: continuous checks, but a configuration recorder and rules are new billed resources that `cdk destroy` would not remove, for a demo that ends in days.
C. No drift check; the stack was deployed fresh from a tagged commit an hour ago: the cheapest, but it records no evidence.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] Should any cost or design optimisation be made now?

The idle cost is small and mostly CloudWatch: 14 custom metrics from log filters (beyond the free 10) and four alarms. The two open technical items from Performance Validation are the teardown orphans (a fix: helper roles without permission to create log groups) and the throttle letting a burst through (service behaviour, settings correct).

A. Change nothing now; write each optimisation as a proposal with its saving or benefit, its effort and its risk, for the next cycle (Recommended): the demo deadline is 14 November, the money at stake is cents a day, and every change now means another deploy and smoke checks.
B. Make the cheap stack change now: drop the metric filters nobody reads (for example the six Bedrock-outcome filters, replaced by the saved query), with one redeploy: a little less idle cost, at the price of a deploy and less on the dashboard.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] Should AWS's own recommendation tools be read?

Trusted Advisor's API needs a Business support plan; on the basic plan a few core checks show only in the console. Cost Optimization Hub and Compute Optimizer need opting in and enough usage history to say anything.

A. Skip them and say why in the report; instead list the checks they would cover (security groups, MFA on the root user, unused resources, service limits) for you to look at in the Trusted Advisor console in a minute (Recommended): nothing to enable, and the few core checks that apply are quicker to see in the console than to automate.
B. Opt in to Compute Optimizer and Cost Optimization Hub now: they take at least a day and some usage to produce findings, so they would report nothing before the deadline.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] What should the feedback loop hand to the next cycle?

The feedback loop is the input to a next Ideation cycle, if there is one. The work open now: the person's manual accessibility passes, the 24-hour idle cost reading, confirming the new alert email, pushing to GitHub so CI and the secret scan run, branch protection, the teardown orphan fix, the throttle behaviour, the untested Node version warning from the CDK, and learnings from the planner incident.

A. A prioritised list of follow-ups, each with an owner (you or a next cycle), a reason and the evidence that would close it; split into "before the demo" and "next cycle"; no new piece of work is started (Recommended): it gives you a short list for the next three days and a clean starting point if you continue later.
B. The same list, and start a new AI-DLC piece of work now for the next-cycle items: it records them as a new intent at once, but starts a new workflow before this one is reviewed.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A — include in the 'before the demo' list: add a favicon (the site returns 403 for /favicon.ico), and the user's manual accessibility passes from manual-pass-scripts.md.

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] SLO report: the readings in `slo-config.md` and Performance Validation are the evidence; the error budget for the 5xx SLO (1% over 30 days) is unspent (0 server errors in about 900 requests). The weekly check has not had a week to run.
- [assumption] User behaviour: there are no real users yet; the report says so and lists what to look at once there are (the journeys-by-source-and-style query, daily-limit hits, return visits).
- [assumption] Toil that could be automated is listed in the feedback loop (the post-destroy cleanup, the weekly SLO check) as proposals, not built.
- [assumption] The Cost Explorer reading in this stage, if any, costs 1 cent a call and is made at most once.
- [assumption] The account is recorded only as ending 5285, never the email address.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
