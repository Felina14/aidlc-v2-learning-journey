# Incident Plan — Learning Journey App

## Sources

- `incident-response-questions.md` in this folder (Q1 to Q4: A; summary confirmed "Looks correct")
- `runbooks.md` and `escalation-matrix.md` in this folder
- Observability Setup: `alarms.md` and `slo-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/rollback-runbook.md`
- `team.md` — `aidlc/spaces/default/memory/team.md` (one builder, one environment, demo until 14 November 2026)
- Phase rules — `aidlc/spaces/default/memory/phases/operation.md` (runbooks with escalation paths; a post-incident review for every P1 and P2)

## Scope

One person (the builder) runs a demo of tens of users in one stack. This plan is a document: no AWS Incident Manager, no automated response, no backup (Q1 A, Q2 A).

## Severities

| Severity | Meaning | Examples | Response |
|---|---|---|---|
| P1 | The site does not load, or no journey can be made at all (not even a template) | Site down (RB-08); every request fails (RB-04); a broken deploy (RB-03) | Act now; recovery target below |
| P2 | One feature fails, or spend is climbing | Saving fails (RB-05); one teaching style always falls back (RB-02); a budget alert (RB-07) | Act the same day |
| P3 | Degraded but working | More template journeys while Bedrock is slow (RB-01); the cap failing open with no spend rise (RB-06); alerts not arriving (RB-09) | Note it; act when convenient |

## Targets (Q3 A)

| Target | Value | How it is met |
|---|---|---|
| Recovery time (RTO) | Within 30 minutes of the alert email, for a bad deploy or a stuck stack | Redeploying a previous tag took under a minute for a code change; a full rebuild took about four minutes plus CloudFront's spread (`rollback-runbook.md` Entries 2 and 4) |
| Data loss (RPO) | No target for journeys | Journeys are demo data with a 90-day expiry, deleted with the stack, and not backed up (Q2 A). A lost journey is replaced by the learner making a new one; the daily limit of 5 per session still applies |

The recovery time assumes the builder sees the email; there is no one else to act.

## Lifecycle of an incident

1. **Detect:** an alarm or budget email, a failed weekly SLO check, or something seen.
2. **Log the start:** add a row to the incident log below.
3. **Classify:** set the severity from the table above.
4. **Respond:** follow the runbook named in the row (`runbooks.md`). Use the concurrency brake first if the cause is cost or abuse.
5. **Recover and check:** each runbook's "Check it is over" step.
6. **Log the end:** fill in the end time, impact and action.
7. **Review:** for every P1 or P2, fill in the review template below within two days.

## Communication (Q4 A)

No external communication. Learners see the page's own messages: the "AI-generated" or template label on a journey, "couldn't save that change", the "no longer saved" message and the daily-limit message. The builder's record is the incident log.

## Incident log

| Start | End | Severity | What happened | Impact | Action | Runbook | Review |
|---|---|---|---|---|---|---|---|
| 2026-11-11, first deploy | 2026-11-11, redeploy at `fac52c1` | P2 | Every planner-style journey fell back to the template: the planner prompt's JSON shape had no `hoursByKind`, so every reply failed the reply check | Planner learners got the 5-stage template with no hours breakdown; no data lost; no outage | Fixed forward: the planner shape carries `hoursByKind` (tests first), and the invalid-reply log line now names the problem; redeployed and tagged `deploy-20261111-2212` | RB-02 (written after the event) | Below |

## Post-incident review template

Copy this for each P1 or P2.

- **Incident:** date, severity, one line on what happened.
- **Timeline:** detected, acted, recovered (times).
- **Root cause:** what made it happen.
- **Why it was not caught earlier:** which test, check or alarm should have seen it.
- **Prevention:** the change that stops it happening again, and the test that proves it.
- **Follow-ups:** anything left open.

## Review: planner fallback (2026-11-11, P2)

- **Timeline:** found by smoke check 9 on the first deploy; diagnosed the same session with 9 local Nova Lite calls (9 of 9 replies missing `hoursByKind`); fix tested with 9 more calls (9 of 9 valid); fixed forward and redeployed the same evening.
- **Root cause:** the planner instruction asked for `hoursByKind` in a sentence, but the prompt told the model to follow a JSON shape "exactly", and that shape had no `hoursByKind`.
- **Why it was not caught earlier:** the automated tests fake the model (a team rule), so they checked that the prompt mentions `hoursByKind`, not that a real model returns it. The log said only "invalid", not why.
- **Prevention:** the planner shape now carries the field, with a test; invalid attempts now log their problem name; Observability Setup added a dashboard widget and a saved query for invalid replies by problem.
- **Follow-ups:** none open. A real-model check of each teaching style after any prompt change is part of the deploy smoke checks (check 9).

## Assumptions & Open Questions

- [assumption] "Within two days" for a review suits a demo of a few days; it is a working rule, not a commitment to anyone else.
- None otherwise.
