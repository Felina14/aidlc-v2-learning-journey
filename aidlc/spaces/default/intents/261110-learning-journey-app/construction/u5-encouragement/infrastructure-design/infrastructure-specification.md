# Infrastructure Specification — u5-encouragement

## Sources

- The earlier units' `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md`, `.../u2-progress/infrastructure-design/infrastructure-specification.md`, `.../u3-protection/infrastructure-design/infrastructure-specification.md` and `.../u4-goals-and-style/infrastructure-design/infrastructure-specification.md` (the stack this unit extends; all of it stays in force)
- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/functional-design/`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 milestones call, C2, C5)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5, NFR6, NFR10, NFR11)
- The built stack — `infra/stacks/journey_stack.py` (read only to check what already exists)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/`

This is a design: it names what changes in the one existing stack and why. The CDK code is written in Code Generation. The NFR Design stage did not run for this unit.

U5 adds no service and no stack. The milestone call is one more route on the existing API; the nudge, the completion view and the certificate are all in the page, and the print style is part of the page's stylesheet. The few changes are listed below; anything not listed is unchanged.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | No change: the same Python 3.12 arm64 Lambda handles the milestone route, with the same size, timeout and settings | One function for all routes (first unit Q2); a milestone record is one small table update. |
| Ingress | One new route on the existing HTTP API: `PUT /api/v1/journey/milestones`, integrated with the same Lambda | The front door already forwards every method (`ALLOW_ALL`) on `/api/*`, caches nothing and passes `X-Session-Id`; no CloudFront change. The route is additive under `/v1`. |
| Throttle | No change: the API-wide stage throttle (rate 5, burst 10) covers the new route | A page makes at most three quiet milestone calls after one mark (one per milestone newly reached, lowest first), one after another; at tens of users this stays far below the rate. |
| Storage | No change of table, keys, billing or expiry setting. The journey item's `milestonesShown` becomes a DynamoDB string set, absent when empty, as `completedStages` already is | The functional design needs the milestone added in one conditional update (BR44.1). The first unit has not been deployed, so no record with an empty list exists; the save is changed in code generation. |
| Permissions | No change: the role already has `dynamodb:UpdateItem` on the one table (granted for the stage change and the usage guard); an `ADD` of one name to a string set is the same action | Least privilege: nothing is added; no index, no wildcard. The role's table actions stay exactly GetItem, PutItem, UpdateItem and DeleteItem. |
| Browser-only data | The nudge dismissal marker lives in the browser's local storage and the certificate name in page memory. Neither touches the stack | No server storage, no new setting; nothing for `cdk destroy` to remove; no personal data leaves the browser (NFR6). |
| Static assets | The print style is part of the existing `styles.css` in the site bucket, deployed with the frontend build | No new asset or origin. |
| Content security policy | No change: the page makes the same-origin calls it already makes; printing and local storage need no new source | The response headers policy stays as built. |
| Timeouts | No change: one attempt and 2 seconds in total per store call; the browser waits 10 seconds for a milestone call, repeats it once on a network failure, and never shows an error for it | NFR2; a failed record is quiet by design (BR44.2). |
| Concurrency | No reserved concurrency; the account limit of 10 is the ceiling, as before | Unchanged decision. |
| Environments | One environment, one stack | Team practice. |
| IaC approach | One small edit to the existing `infra/stacks/journey_stack.py`: add the `PUT /api/v1/journey/milestones` route to the existing integration | Same single CDK stack, deployed with `cdk deploy`. No metric filter is added (see `monitoring-design.md`). |
| Teardown | No change: no new resource is created, so `cdk destroy` and the tag and log-group checks still remove and prove everything | NFR5. |
| Rollback | Redeploy the previous commit. A journey stored with a milestone set is read by the older code, which reads `milestonesShown` by iterating it and ignores what it does not know; the older code has no milestone route and shows no banners, certificate or nudge. A rollback followed by a roll-forward has the same limit as in the second unit: a journey made by the older code in between holds an empty list, and a milestone call on it is refused by the database and ends quietly as SAVE_FAILED until the item is deleted or a new session is used. Accepted for a one-operator demo | A rollback needs no data change. |
| Secrets | None; no new setting | NFR6. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway HTTP API | api gateway | One added route `PUT /api/v1/journey/milestones` to the existing Lambda integration; same stage throttle and access log | The body is checked by the Lambda (BR44.1), not by the gateway. |
| Amazon CloudFront | cdn | No change | `/api/*` already allows all methods; the existing stack test asserts only `GET` and `POST` for the front door's `/api/*` methods, so Code Generation extends that test to assert `PUT` is allowed. |
| AWS Lambda | compute | No change to size or timeout; the code gains the milestone route and the sorted milestone list in the load and the answer | The request log line already carries route, status, outcome and total time. |
| Amazon DynamoDB | database | Same on-demand table and journey item. The milestone record is one `UpdateItem` that adds the name to the string set `milestonesShown`, moves `lastActivityAt` and `expiresAt`, and is conditional on the record existing and `expiresAt` greater than now; the updated set is returned so the answer carries all of it | No new table, index or capacity setting. |
| IAM | permissions | No change | The Bedrock and table statements are untouched. |

### Shared Infrastructure

Nothing new is created. U5 uses the resources the first unit owns.

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| DynamoDB table | u1-skeleton | u2 to u5 (U5: the milestones shown) | The Lambda role only; U5 writes only `milestonesShown`, `lastActivityAt` and `expiresAt` after the save. |
| API Gateway HTTP API and its throttle | u1-skeleton | u2 to u5 | Additive-only routes and methods (contract rules). |
| Lambda function and execution role | u1-skeleton | u2 to u5 | U5 adds no permission. |

## Estimated Cost

| Item | Change | Notes |
|---|---|---|
| DynamoDB, API Gateway, Lambda | A handful of extra tiny requests per learner session (at most one per milestone) | Negligible; idle cost unchanged. |
| CloudWatch | No new metric or alarm | See `monitoring-design.md`. |

NFR4 (under 10 dollars in total, near zero when idle) is unaffected. Exact figures come from AWS's pricing tools and the budget alerts.

## Assumptions & Open Questions

- [assumption] The first unit has not been deployed, so no stored record needs converting; U5's code generation changes the save to omit `milestonesShown` when empty.
- [assumption] The pinned DynamoDB test double (moto) supports a conditional `ADD` to a string set and returns the updated set; if a branch behaves differently from the real service it is tested with a stubbed client and confirmed by the deploy smoke checks in `cicd-pipeline.md`.
- None otherwise.
