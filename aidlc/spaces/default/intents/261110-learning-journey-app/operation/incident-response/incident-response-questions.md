# Incident Response — Questions

## Sources

- Observability Setup: `dashboards.md`, `alarms.md`, `slo-config.md`, `log-queries.md`, `tracing-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/` (four alarms to one email, nine saved queries, a weekly SLO check)
- Deployment Pipeline: `rollback-runbook.md` and `cd-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/` (redeploy a previous tag, the concurrency brake, rebuild from nothing)
- Deployment Execution: `deployment-log.md` and `health-check-report.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-execution/` (the planner defect found live and fixed forward)
- Each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the units after it (one stack, the table's 90-day expiry, removal policy `DESTROY`)
- NFR Design was skipped in this plan, so there is no `reliability-design.md` or `security-design.md`; reliability and security come from the requirements (NFR3, NFR6) and the units' designs
- `team.md` and `project.md` — `aidlc/spaces/default/memory/` (one person, a personal account, demo until 14 November 2026)

This stage writes what to do when something goes wrong. A lot is fixed by the shape of the project: one person runs it, so there is no on-call rota and no one to escalate to; there is one environment and one stack; the data is demo journeys that expire after 90 days; and the main recovery moves already exist in the rollback runbook. The stage file also lists automated runbooks (SSM Automation), AWS Incident Manager and AWS Backup; for a one-person demo those are real choices, not defaults, so they are asked below. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] Should any response be automated?

The likely incidents are: Bedrock slow, throttled or failing (the template keeps the service up), a bad deploy, the daily cap failing open, a spend spike or abuse, and a store failure. The rollback runbook already has the manual moves. Automation would mean, for example, an SSM Automation document or a small function that sets the concurrency brake when the spend alert fires.

A. No automation: write each response as a manual runbook with exact commands and checks, linked from the alarm it answers (Recommended): with one operator, tens of users and a few days left, a wrong automatic brake would take the demo down with no one watching; a manual step after the email costs minutes, and the budgets already cap the money at risk.
B. Automate only the spend brake: a budget action or an alarm-triggered function sets the function's concurrency to 0 when the daily spend passes 2 dollars, and you lift it by hand: it protects the bill while you are away, at the cost of new resources, a new permission, code and tests in a finished build.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] Should AWS Incident Manager or AWS Backup be set up?

Incident Manager adds response plans, contacts and engagement (calls or texts); it is built for teams. AWS Backup would keep copies of the DynamoDB table. The table holds only demo journeys that expire after 90 days and is deleted with the stack; DynamoDB keeps it across three Availability Zones by itself.

A. Neither: the incident plan is a document; recovery of the data is "a learner makes a new journey"; record the recovery time and data-loss targets that follow from that (Recommended): Incident Manager has no one to engage but you, and a backup of demo data that the design deletes at the end would add a resource, a cost and a teardown step (NFR4, NFR5).
B. Turn on DynamoDB point-in-time recovery only (a one-line stack change, a few cents a month): it allows restoring the table to any second in the last 35 days, at the cost of a stack change and a redeploy; Incident Manager is still not used.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] What recovery time (RTO) and data-loss (RPO) targets should be recorded?

These follow from Q2 and the runbook. A bad deploy is undone by redeploying the previous tag, which took under a minute for a code-only change; a full rebuild from nothing (stack destroyed) took about four minutes plus the CloudFront spread. Without a backup, a lost table means lost journeys.

A. RTO: within 30 minutes of the alert email for a bad deploy or a stuck stack (redeploy the previous tag, or rebuild); RPO: no target for journeys (losing them is accepted for a demo; a learner makes a new one, and the daily limit applies) (Recommended): it matches what the runbook can actually do with one person, and it states the data loss honestly rather than promising a backup that does not exist.
B. RTO within 30 minutes, RPO of a few seconds with point-in-time recovery (only if Q2 is B).
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Who should be told during an incident, and how?

There are no paying users and no status page. The people who might notice are you and anyone you have shown the demo to.

A. No external communication process: the incident plan says what you note for yourself (start, impact, action, end) in a short incident log kept in this folder, and that a learner sees the page's own messages (the template label, the "could not save" message, the daily-limit message) (Recommended): it keeps a record for the review that the phase rules ask for, with nothing to set up.
B. Add a fixed notice on the page during an incident (a banner you switch on by a deploy): learners are told directly, at the cost of a code change and a deploy at the worst moment.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] Severities: P1 means the site does not load or no journey can be made (even a template); P2 means one feature fails (save, goal, milestones, planner style), or spend is climbing; P3 means degraded but working (more template journeys, slow requests). The phase rules ask for a post-incident review for any P1 or P2; the incident plan includes a short review template.
- [assumption] Escalation is to the builder only. The escalation matrix records that, and names AWS Support (the account's basic support plan) as the only outside party, for an AWS service failure.
- [assumption] The failure modes covered are the ones the design and the first deploy showed: Bedrock failing, invalid AI replies, a bad deploy, the guard failing open, a store failure, a spend spike or abuse, the CloudFront or site files failing, and the alert email not arriving.
- [assumption] Every runbook uses only commands that exist in the rollback runbook and the saved queries, and records the account only by its last four digits.
- [assumption] No runbook is rehearsed live in this stage (a rehearsal would mean, for example, braking the live function); the commands were checked as written. Performance Validation can rehearse the brake if you want it.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
