## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T23:20:00Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/infrastructure-design/infrastructure-specification.md > Infrastructure Services, Amazon CloudFront row | The row says the stack test already confirms PUT is allowed on /api/*. The existing assertion in infra/tests/test_stack.py (around line 131) is Match.array_with(["GET", "POST"]), which does not check PUT. The stack itself is fine (ALLOW_ALL in journey_stack.py), but the claimed test coverage does not exist today. | Reword the row to say the stack uses ALLOW_ALL and that the new stack test (listed in cicd-pipeline.md) adds the PUT assertion. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/infrastructure-design/monitoring-design.md > intro paragraph and Alerts | The text says the Lambda-error alarm covers a failing milestone store. A failed record is a handled ApiError answered as a 500, not an unhandled Lambda exception, so only the API 5xx alarm fires. The Lambda-error alarm would not. | State that the API server-error alarm is the one that covers a failing milestone record, and drop the Lambda-error alarm from that claim. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/infrastructure-design/cicd-pipeline.md > Build and check stages, Frontend row | BR44.2 (a NOT_FOUND, INVALID_REQUEST, SAVE_FAILED or 429 answer on a milestone call shows the learner nothing and leaves the banner as it is) is the main throttle-related behaviour, but no listed frontend test covers it. The throttle is API-wide (rate 5, burst 10), so a 429 is possible. | Add to the frontend row a test that each of the four failure answers, and a network failure after the one quiet repeat, leaves the banner and the page unchanged and shows no message. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/infrastructure-design/cicd-pipeline.md > Smoke checks, rows 'Choose Back to my journey', 'made-up session ID' and fresh-session groups | Three checks can mislead. (1) 'The journey at 80%' is only right for a 5-stage journey; a 6-stage one shows 83%. (2) 'A made-up session ID' answers 400 if it is not a valid UUID, not the expected 404. (3) Each fresh-session group makes a journey, and the number of journeys is not set against the daily cap from the third unit. | Say 'one stage short of complete (80% for 5 stages, 83% for 6)'. Say 'a valid but unused UUID'. Note how many journeys the smoke run creates against the daily cap. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Stack check of IAM (journey_stack.py) | Role grants exactly GetItem, PutItem, UpdateItem, DeleteItem on the one table | The no-IAM-change claim holds: UpdateItem covers ADD to a string set. |
| Stack check of API and CloudFront | Exact-path routes, one shared integration, API-wide throttle 5/10, /api/* uses ALLOW_ALL, CACHING_DISABLED and forwards X-Session-Id | A new PUT /api/v1/journey/milestones route fits with no CloudFront change and no overlap with the existing paths. |
| Stack check of metrics | 14 metric filters (2 journey, 5 Bedrock, 2 U3, 3 U2 completion, 2 U4 goal), 4 alarms | 'About fourteen custom metrics' and 'no new metric or alarm' are accurate. |
| store.py load and models.py | milestones_shown=list(item.get(...)) iterates a set, a list, or a missing attribute; U1 to U4 save writes an empty list | The rollback claim is accurate. Older code reads a U5 set fine. After a roll-forward, ADD to an empty list type fails in the database and ends as SAVE_FAILED. |
| Response headers policy | CSP has style-src 'self', connect-src 'self', no inline allowance; Referrer-Policy is no-referrer; no Permissions-Policy | window.print() and local storage are not affected. A print style in styles.css (served from dist by build.mjs, linked by index.html) is allowed. No inline styles may be used for the certificate. |
| ci.yml | Jobs python, frontend, stack-check, accessibility, secret-scan; frontend coverage and Python coverage floors enforced | The test additions land in existing jobs as claimed. |
| traceability.json | N/A rows (NFR1, NFR3, NFR7, NFR8) each give a real reason | Acceptable. |

### Summary

The design holds up against the built stack: no IAM change is needed, the new route fits the integration, throttle and CloudFront, the metric count and rollback paragraph are accurate, and the CSP does not affect printing, local storage or a print style in styles.css. Only minor wording and test-coverage gaps remain, so it is ready.
