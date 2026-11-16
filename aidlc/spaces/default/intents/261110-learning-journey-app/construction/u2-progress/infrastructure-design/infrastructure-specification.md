# Infrastructure Specification — u2-progress

## Sources

- `infrastructure-specification.md` of the first unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` (the stack this unit extends; all of it stays in force)
- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/functional-design/`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 completion call, C5)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5, NFR6, NFR10, NFR11)
- The built stack — `infra/stacks/journey_stack.py` (read only to check what already exists)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/`

This is a design: it names what changes in the one existing stack and why. The CDK code is written in Code Generation. The NFR Design stage did not run for this unit, so the changes are derived from the functional design and the first unit's stack.

U2 adds no service and no stack. Almost everything it needs already exists: one API route family, one Lambda, one table, the front door that forwards every method and the session header. The few changes are listed below; anything not listed is unchanged.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | No change: the same Python 3.12 arm64 Lambda handles the new completion route, with the same 512 MB, 25 s limits and environment settings | One function for all routes (first unit Q2); a mark is one small table update, so duration stays well under the 2-second store limit. |
| Ingress | One new route on the existing HTTP API: `PUT /api/v1/journey/stages/{stageNumber}/completion`, integrated with the same Lambda | The front door already forwards every method (`ALLOW_ALL`) on `/api/*`, with no caching, passing `X-Session-Id`; no CloudFront change is needed. The route is additive under `/v1` (contract rules). |
| Throttle | No change: the API-wide stage throttle of rate 5 and burst 10 covers the new route | One mark is one request, and the page sends one change at a time (BR13.2), so a learner uses well under the rate. The throttle is shared by all users, which is acceptable at tens of users. |
| Storage | No change of table, keys, billing or expiry setting. `completedStages` becomes a DynamoDB number set (absent when empty) and the record gains a stored `stageCount` number | The functional design needs set add and delete actions and a stage-number check inside one conditional update (BR11.1, BR11.2). Only the stored shape changes. |
| Permissions | The Lambda role gains one table action, `dynamodb:UpdateItem`, on the one table ARN | Least privilege: the existing `GetItem` and `PutItem` stay; no index, no other table, no wildcard. Reading the record back on a failed condition needs no extra action. |
| Timeouts | No change: the store allows one attempt and 2 seconds in total (connect 1 s plus read 1 s); the browser waits 10 seconds for a mark | Functional design BR11.5. A mark must be saved within 2 seconds for 95% of actions (NFR2). |
| Concurrency | No reserved concurrency; the account limit of 10 is the ceiling, as in the first unit | Unchanged decision. |
| Environments | One environment, one stack | Team practice. |
| IaC approach | Edits to the existing `infra/stacks/journey_stack.py`: add the route with method `PUT`, add `dynamodb:UpdateItem` to the role's table statement, add the completion log metric filters and one dashboard widget described in `monitoring-design.md` | Same single CDK stack, deployed with `cdk deploy`. |
| Teardown | No change: no new resource is created, so `cdk destroy` and the tag and log-group checks from the first unit still remove and prove everything | NFR5. |
| Rollback | Redeploy the previous commit. Journeys written by U2 stay readable by the older code (its load iterates `completedStages`, so a number set reads the same as a list; `stageCount` is ignored). One catch on the way back: the older code saves new journeys with an empty list, so after a rollback followed by a roll-forward a mark on a journey made in between ends as SAVE_FAILED until that item is deleted or a new session is used. Accepted for a one-operator demo; see `cicd-pipeline.md` | A rollback needs no data change; only a rollback followed by a roll-forward leaves that one limit. |
| Secrets | None; no new setting | NFR6. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway HTTP API | api gateway | One added route `PUT /api/v1/journey/stages/{stageNumber}/completion` to the existing Lambda integration; same stage throttle (rate 5, burst 10) and access log | The stage number is a path parameter checked by the Lambda (BR11.3), not by the gateway. |
| Amazon CloudFront | cdn | No change | `/api/*` already allows all methods, forwards `X-Session-Id` and caches nothing; a stack test confirms `PUT` is allowed. |
| AWS Lambda | compute | No change to size or timeout; the function code gains the completion route | Its request log line already carries route, status, outcome and total time; the new route appears in it. |
| Amazon DynamoDB | database | Same on-demand table. Records now hold `completedStages` as a number set (attribute absent when empty) and `stageCount`; the completion change is one `UpdateItem` with add or delete on the set, a condition (record exists, `expiresAt` greater than now, stage number no more than `stageCount`), and the old record returned on a failed condition | No new table, index or capacity setting. Expiry stays on `expiresAt` in epoch seconds. A set cannot be empty, so the last removal deletes the attribute. |
| IAM | permissions | Existing Lambda role plus `dynamodb:UpdateItem` on the one table | No other change; the Bedrock statement is untouched. |

### Shared Infrastructure

Nothing new is created. U2 uses the resources the first unit owns.

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| DynamoDB table | u1-skeleton | u2-progress (completion changes), u3-protection, u4-goals-and-style, u5-encouragement | The Lambda role only; new record kinds use new sort-key prefixes; U2 touches only the journey record and only the fields in the entities file. |
| API Gateway HTTP API and its throttle | u1-skeleton | u2 to u5 (each adds routes under `/api/v1`) | Additive-only routes (contract rules). |
| Lambda function and execution role | u1-skeleton | u2 to u5 | Permissions widen only by a named table action, reviewed at each unit: U2 adds `dynamodb:UpdateItem`. |

## Estimated Cost

| Item | Change | Notes |
|---|---|---|
| DynamoDB on-demand | A few extra write request units per learner session (one per mark or unmark) | Negligible at tens of users; no change to idle cost. |
| API Gateway, Lambda | A few extra requests per session | Well within free-tier-scale volumes; idle cost unchanged. |
| CloudWatch | Three new custom metrics from log metric filters (roughly 0.30 dollars each a month, about 1 dollar in total; an estimate) and one added dashboard widget | Small, but counted against the tight idle-cost target; the metrics were kept to three on purpose (`monitoring-design.md`). |

NFR4 (under 10 dollars in total, near zero when idle) is unaffected. Exact figures come from AWS's pricing tools and the budget alerts.

## Assumptions & Open Questions

- [assumption] The first unit has not been deployed, so no stored record needs converting. U2's code generation changes the first unit's save to omit `completedStages` when empty and to store `stageCount`. If a journey with an empty list were ever present, a mark on it would be refused by the database and end as SAVE_FAILED (an accepted limit).
- [assumption] The pinned DynamoDB test double (moto) may not return the old record on a failed condition. If so, that branch is tested with a stubbed client and its real behaviour is confirmed by the deploy smoke checks in `cicd-pipeline.md`.
- [assumption] The CloudFront content security policy already allows same-origin requests with `PUT`; a script on the same site calling the same site needs no new source.
- None otherwise.
