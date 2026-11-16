# Test Results — Performance Validation, Learning Journey App

## Sources

- `load-test-plan.md` and `performance-validation-questions.md` in this folder (Q1 to Q4: A; the person's later choices at the two teardown failures)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5)
- `log-queries.md` and `slo-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/rollback-runbook.md` (Entry 4, now with the post-destroy cleanup)

All runs on 2026-11-11 from the builder's machine, account ending 5285, us-east-1. Scratch scripts (standard library and boto3 only) were deleted after use.

## 1. Load run (stack at `41a9782`, site `d3v7tl7b4jtner.cloudfront.net`)

Window: epoch 1794417303 to 1794417723 (7 minutes). Client times include the network from the builder's machine; server times are the function's logged `total_ms`.

| Phase | Requests | Statuses | Client p50 | Client p95 | Client max | Server p50 | Server p95 | Server max |
|---|---|---|---|---|---|---|---|---|
| Page `/` | 20 | 200 × 20 | 0.53 s | 0.63 s | 0.63 s | — | — | — |
| `styles.css` | 20 | 200 × 20 | 0.52 s | 0.62 s | 0.69 s | — | — | — |
| `main.js` | 20 | 200 × 20 | 0.69 s | 0.75 s | 1.05 s | — | — | — |
| Create (`POST`), 10 per style | 30 | 201 × 30 | 6.17 s | 10.26 s | 13.69 s | 5.25 s | 12.47 s | 12.90 s |
| Read (`GET`) | 150 (+30 burst) | 200 × 150 | 0.67 s | 0.92 s | 1.95 s | 4 ms | 7 ms | 77 ms |
| Stage mark (`PUT`) | 150 | 200 × 150 | 0.66 s | 0.90 s | 1.85 s | 6 to 7 ms | 8 to 9 ms | 10 ms |
| Burst of 30 reads at once | 30 | **200 × 30 (no 429)** | 0.93 s | 1.01 s | 1.02 s | (in reads above) | | |
| Cleanup `DELETE` | 30 | 204 × 29, **429 × 1** | 0.62 s | 0.79 s | 0.88 s | 5 ms | 8 ms | 8 ms |

| Other readings | Value |
|---|---|
| Journey sources | 30 of 30 AI (guide 10, instructor 10, planner 10); no template |
| AI attempts | 30 `ok`; 4 `invalid` recovered by the one retry (problem names: `not_one_json_object` × 3, `hours_by_kind` × 1) |
| Lambda peak concurrency | 6 per minute (account limit 10); 0 Lambda throttles |
| API 4xx in the hour | 2 (the one cleanup 429 and one 404 from earlier checks) |
| 5xx | 0 |
| API throttle settings (read back) | rate 5, burst 10 on the `$default` stage |
| Model calls and cost | 34 Nova Lite calls, a few cents |

**Throttle finding.** A burst of 30 reads started together all answered `200`; the throttle (rate 5, burst 10) did not reject them. One of the 30 sequential cleanup deletes got a `429` a few seconds later. HTTP API throttling is applied on a best-effort basis, so this is the service's behaviour, not a setting fault (the settings read back as designed). The cost of abuse stays bounded by the daily limit of 5 journeys per session, the Lambda account limit of 10, the budgets and the concurrency brake.

**Data left by the run.** One journey was not deleted (its delete got the `429`); it was removed with the table by the teardown check below.

## 2. Cost reading (NFR4)

| Reading | Value |
|---|---|
| Month-to-date total, Cost Explorer (unblended, all services, 2026-11-01 to 2026-11-12) | 0.00 dollars, marked estimated (cost data lags up to a day) |
| Idle cost, estimated from what bills while idle | About 0.04 to 0.05 dollars a day at most: mainly the 14 custom metrics from log filters beyond CloudWatch's free 10, and the four alarms if the free allowance is used elsewhere; storage of a few kilobytes in S3, DynamoDB and logs; no idle charge for Lambda, API Gateway or CloudFront. Exact figures come from the AWS pricing pages and Cost Explorer, not from this estimate |
| 24-hour idle reading | Not done here (Q2 A): a dated follow-up for the person |

## 3. Teardown check (NFR5): two destroys

| | First destroy | Second destroy |
|---|---|---|
| Stack destroyed | `41a9782` (tag `deploy-20261111-2227`), 17:25 to 17:28 UTC | `2b393e2` (deployed for the check), 17:39 to 17:43 UTC |
| Before | 21 resources tagged `Project=learning-journey` | Same stack, exercised with one request |
| Stack | Gone | Gone |
| Tagged resources | 0 | 0 |
| Budgets, dashboard, alarms, saved queries, distribution | All gone | All gone |
| Log groups with the stack's prefix | **1 left**: `SiteDeploymentLogs`, recreated at 17:25:44, empty, no retention | **2 left**: `HelperLogs` (17:40:02) and `SiteDeploymentLogs` (17:40:23), both empty, no retention |
| `CDKToolkit` | Stays (by design) | Stays (by design) |
| Result | **Not Met** | **Not Met** |
| Action | Orphan deleted by hand; the person chose to fix forward | Orphans deleted by hand; the person chose to accept and document |

**Root cause.** The two CDK helper functions (the site upload and the bucket auto-delete) are invoked once during the destroy, in the right order. Lambda delivers their log lines a few seconds later, after their log groups have been deleted, and AWS creates the groups again using the helpers' permission to create log groups.

**First fix forward (commit `2b393e2`, "Teardown: leave site files on delete...").** `retain_on_delete=True` on the site deployment, test-first (the new stack test failed with `assert None is True`, then passed; full verification green: 627 Python, 651 frontend). It did not fix the orphan, because the helper is still invoked on delete. It is harmless (the bucket's auto-delete empties the bucket) and is kept.

**Decision (the person, 2026-11-11).** Record NFR5 as **Not Met as worded** and add a one-command post-destroy cleanup to the teardown entry of `rollback-runbook.md` (Entry 4). With that step, the teardown leaves nothing: after the cleanup on both runs, no tagged resource and no log group with the stack's prefix remained. A possible fix (helper roles without permission to create log groups) is recorded as an open item.

## 4. Redeploy and basic smoke checks (stack at `2b393e2`)

| Step | Result |
|---|---|
| Deploy | `CREATE_COMPLETE`, 245 s |
| New site address | `https://d287qizl0f6l3h.cloudfront.net` (the old address no longer works) |
| HTTPS home | `200` in 0.97 s; HTTP answers `301` to HTTPS; content security policy and HSTS headers present |
| Create and reload one journey (planner) | `201` in 8.9 s, AI, 6 stages, `hoursByKind` on every stage; reload `200`; deleted `204` |
| Log lines | `journey_made` (ai, planner) and the three `request` lines, no typed text |
| Alarms | 4 of 4 `OK` |
| Saved queries | 9 recreated |
| Alarm email subscription | **`PendingConfirmation`**: the person must click the new confirmation link |
| Tag | `deploy-20261111-2323` on `2b393e2` (local, no remote) |

## Assumptions & Open Questions

- [assumption] Client-side times are from one location (the builder's machine); learners elsewhere will see different network times.
- Open: confirm the new alarm email subscription.
- Open: the 24-hour idle cost reading (person, after a full idle day).
- Open: the browser drawing part of NFR2 (person's Lighthouse run).
- Open: a real fix for the teardown orphans (helper roles without log-group creation), if NFR5 is to be met as worded.
- None otherwise.
