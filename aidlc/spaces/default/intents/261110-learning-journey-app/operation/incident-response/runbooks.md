# Runbooks — Learning Journey App

## Sources

- `incident-response-questions.md` in this folder (Q1 A: manual runbooks only; summary confirmed "Looks correct")
- Observability Setup: `alarms.md`, `dashboards.md`, `log-queries.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- `rollback-runbook.md` and `cd-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/`
- `health-check-report.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-execution/health-check-report.md` (the planner defect and its fix)
- Each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the units after it
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR3, NFR4, NFR6)

All runbooks are manual (no automation), run by the builder from their own machine with the AWS command line configured for the personal account (ending 5285), region us-east-1. Saved queries are under CloudWatch, Logs Insights, Saved queries, `learning-journey/`. Commands that change something are marked **(changes)**. None of the runbooks has been rehearsed live.

## Common first steps (every runbook)

1. Open the alert email or note what was seen; write the start time in the incident log (`incident-plan.md`).
2. Open the dashboard `learning-journey` and the site `https://d287qizl0f6l3h.cloudfront.net`.
3. Set the severity (`incident-plan.md`).

## RB-01 Bedrock failing or throttled (template-fallback alarm)

| | |
|---|---|
| Trigger | Template fallback alarm (3 or more template journeys in 1 hour), or many template journeys seen |
| Severity | P3 (journeys still work as templates); P2 if it lasts more than a day |
| Diagnose | Dashboard "Bedrock outcomes": `error` or `throttled` rising. Saved query `journeys-by-source-and-style`. Check the AWS Health Dashboard for Bedrock in us-east-1 |
| Act | Nothing to change in the stack: the template is the designed fallback (NFR3). If the AWS Health Dashboard shows a Bedrock event, wait and note it. If not, confirm model access is still authorized: `aws bedrock get-foundation-model-availability --model-id amazon.nova-lite-v1:0 --region us-east-1` must say `AUTHORIZED` |
| Check it is over | `BedrockOk` rising again, new journeys show source `ai` |

## RB-02 Invalid AI replies

| | |
|---|---|
| Trigger | Template fallback alarm with `BedrockInvalid` rising on the dashboard, or rows in the "Invalid AI replies by problem" widget |
| Severity | P2 if one teaching style always falls back (as the planner did on the first deploy); P3 if occasional |
| Diagnose | Saved query `invalid-ai-replies-by-problem`: the problem name says which rule failed (`hours_by_kind`, `instructor_minimums`, `not_one_json_object`, `stage_count`, `truncated`, …). Saved query `journeys-by-source-and-style` shows which style is affected |
| Act | A code fix: fix forward with a new commit, test-first, under `rollback-runbook.md` Entry 2 ("fix forward with a new change"), as was done for the planner defect. Never loosen a reply rule to make replies pass. If a recent deploy caused it, redeploy the previous tag instead (RB-03) |
| Check it is over | No new rows in the widget; that style's journeys come back as `ai` |

## RB-03 Bad deploy

| | |
|---|---|
| Trigger | Any alarm, failed smoke check or broken page right after a deploy |
| Severity | P1 if the site or journey creation is down; P2 otherwise |
| Diagnose | `git tag --list 'deploy-*' --sort=-creatordate` shows what is live and what came before. Saved queries `server-errors` and `failed-requests-by-outcome` |
| Act **(changes)** | `rollback-runbook.md` Entry 2: redeploy the previous good tag from a separate work tree, reading `cdk diff` first. A failed update is Entry 1 (CloudFormation rolls back itself) |
| Check it is over | Home page `200`; a journey can be created and reloaded; alarms `OK`. Within the 30-minute recovery target (`incident-plan.md`) |

## RB-04 Lambda errors or API server errors

| | |
|---|---|
| Trigger | Lambda errors alarm or API server errors alarm (1 or more in 5 minutes) |
| Severity | P2; P1 if every request fails |
| Diagnose | Saved queries `server-errors` (route, outcome) and `failed-requests-by-outcome`. Outcome `SAVE_FAILED` or `LOAD_FAILED` points at DynamoDB (RB-05); a Lambda error with no outcome is a crash (a bug) |
| Act | A crash after a deploy: RB-03. A crash with no recent deploy: fix forward. A store failure: RB-05 |
| Check it is over | No new rows in `server-errors`; alarms `OK` |

## RB-05 Store (DynamoDB) failing

| | |
|---|---|
| Trigger | `SAVE_FAILED`, `LOAD_FAILED` or `DELETE_FAILED` in the failed-requests query; learners see "could not save" |
| Severity | P2; P1 if no journey can be made |
| Diagnose | AWS Health Dashboard for DynamoDB in us-east-1. Table status: `aws dynamodb describe-table --table-name <table> --region us-east-1 --query Table.TableStatus` (the table name is in the stack's resources). A permission error in the logs after a deploy points at RB-03 |
| Act | AWS-side: wait and note it (escalation in `escalation-matrix.md`). After a deploy: RB-03. A deleted or broken table: `rollback-runbook.md` Entry 4 (rebuild); journeys are lost (no data-loss target, `incident-plan.md`) |
| Check it is over | Stage marks save; a journey can be created and reloaded |

## RB-06 Daily cap failing open (guard-skipped alarm)

| | |
|---|---|
| Trigger | Guard skipped alarm (1 or more in 1 hour) |
| Severity | P3; P2 if spend is also climbing |
| Diagnose | Saved query `guard-skipped`. The guard fails open by design, so journeys still work but the cap of 5 per session per day is not enforced |
| Act | A permission or expression fault after a deploy: RB-03. With no deploy: fix forward. If abuse or spend is also climbing: RB-07 first |
| Check it is over | `GuardSkipped` back to 0; a sixth journey in one session is refused again |

## RB-07 Spend spike or abuse

| | |
|---|---|
| Trigger | Daily (2 dollars) or monthly (8 dollars) budget email, or a traffic spike on the requests widget |
| Severity | P2 |
| Diagnose | Saved query `requests-per-day`; `request-time-by-route` for the busiest route; Budgets and Cost Explorer for the service that costs |
| Act **(changes)** | `rollback-runbook.md` Entry 3: the concurrency brake (`put-function-concurrency ... 0`). This stops every call to the API; the site still loads |
| Check it is over | Lambda `Invocations` flat; spend no longer rising. Lift the brake with `delete-function-concurrency` only once the cause is understood |

## RB-08 Site not loading (CloudFront or site files)

| | |
|---|---|
| Trigger | The site does not load, or loads without its styles or script |
| Severity | P1 |
| Diagnose | `curl -sI https://d287qizl0f6l3h.cloudfront.net/` (status and headers). AWS Health Dashboard for CloudFront. A recent deploy that changed site files |
| Act | After a deploy: RB-03. CloudFront event: wait and note it. Missing files with no deploy: redeploy the current tag (the deploy re-uploads the site and clears CloudFront's cache) |
| Check it is over | Home page `200` with the content security policy header; the page works |

## RB-09 Alerts not arriving

| | |
|---|---|
| Trigger | A test or a known event sends no email |
| Severity | P3 (nothing is broken for learners, but incidents would go unseen) |
| Diagnose | `aws sns list-subscriptions-by-topic --topic-arn <topic arn> --region us-east-1`: the subscription must not be `PendingConfirmation`. Check the email account's spam folder |
| Act | If pending or removed, redeploy (it recreates the subscription) and click the new confirmation link |
| Check it is over | The subscription has its own identifier |

## Assumptions & Open Questions

- [assumption] Resource names (table, topic, function) are read from the stack's resources when needed (`aws cloudformation describe-stack-resources --stack-name LearningJourney --region us-east-1`); they are not written here, because they carry generated suffixes and, for the topic, the account number.
- [assumption] No runbook was rehearsed live; Performance Validation may rehearse RB-07's brake with the person's go-ahead.
- None otherwise.
