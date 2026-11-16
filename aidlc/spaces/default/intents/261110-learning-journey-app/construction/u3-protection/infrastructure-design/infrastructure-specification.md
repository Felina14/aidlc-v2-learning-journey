# Infrastructure Specification — u3-protection

## Sources

- `infrastructure-specification.md` of the first unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and of the second unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/infrastructure-design/infrastructure-specification.md` (the stack this unit extends; all of it stays in force)
- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/functional-design/`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 delete, C4, C5)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5, NFR6, NFR10, NFR11)
- The built stack — `infra/stacks/journey_stack.py` (read only to check what already exists)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/`

This is a design: it names what changes in the one existing stack and why. The CDK code is written in Code Generation. The NFR Design stage did not run for this unit.

U3 adds no service and no stack. The usage count lives in the table the journeys already use; the delete call is one more method on a route that exists. The few changes are listed below; anything not listed is unchanged.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | No change: the same Python 3.12 arm64 Lambda handles the delete call and the real usage guard, with the same size and limits | One function for all routes (first unit Q2). |
| Ingress | The existing route `/api/v1/journey` gains the method `DELETE` beside `GET` and `POST`, integrated with the same Lambda | The front door already forwards every method (`ALLOW_ALL`) on `/api/*`, caches nothing and passes `X-Session-Id`, so no CloudFront change is needed. The method is additive under `/v1`. |
| Throttle | No change: the API-wide stage throttle (rate 5, burst 10) covers the delete call | The cap is only a courtesy limit; this throttle stays the real protection (ADR-004). |
| Storage | No change of table, keys, billing or expiry setting. A second kind of item is added to the same table: the daily count, with the session ID as partition key and the sort key `USAGE#<UTC date>`, holding a whole number and the table's existing `expiresAt` expiry attribute | The sort key keeps it apart from the journey item (`JOURNEY`). The journey code reads and writes only by exact key, so nothing picks the count up by accident. |
| Permissions | The Lambda role gains one table action, `dynamodb:DeleteItem`, on the one table ARN. The guard needs only `dynamodb:UpdateItem`, which the second unit already granted | Least privilege: no index, no other table, no wildcard. The reservation and the release are conditional `UpdateItem` calls. |
| Timeouts | No change: one attempt and 2 seconds in total per store call (connect 1 s plus read 1 s); the browser waits 10 seconds for a delete | A slow guard store is treated as unreachable and the request goes on (rule BR20.3). The create clock starts before the reserve, so the reserve time is inside the 15-second budget, and the 18-second cap is checked before the save. The longest path is the AI budget (15 s), a failed save (2 s) and then the release (2 s): about 19 seconds, inside the browser's 20-second wait and the Lambda's 25 seconds, though past the 18-second cap, which only guards the start of the save. This is accepted: it needs a slow AI answer, a failing store and a failing release together. |
| Concurrency | No reserved concurrency; the account limit of 10 is the ceiling, as in the first unit | Unchanged decision. |
| Environments | One environment, one stack | Team practice. |
| IaC approach | Edits to the existing `infra/stacks/journey_stack.py`: add `DELETE` to the route's methods, add `dynamodb:DeleteItem` to the role's table statement, add two log metric filters, one alarm and one dashboard line described in `monitoring-design.md` | Same single CDK stack, deployed with `cdk deploy`. |
| Teardown | No change: no new resource is created, and the count items are in the table that `cdk destroy` removes | NFR5. |
| Rollback | Redeploy the previous commit. Count items left in the table are ignored by the older code, which reads only the journey item, and expire by themselves within one to two days. The older code simply has no delete route | A rollback needs no data change. |
| Secrets | None; no new setting | NFR6. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway HTTP API | api gateway | `DELETE` added to the existing `/api/v1/journey` route; same Lambda integration, throttle and access log | The method is checked by the Lambda; a delete with a bad session ID answers 400. |
| Amazon CloudFront | cdn | No change | `/api/*` already allows all methods; a stack test confirms `DELETE` is allowed. |
| AWS Lambda | compute | No change to size or timeout; the code gains the usage guard and the delete call | The guard is built behind the interface the generator already uses. |
| Amazon DynamoDB | database | Same on-demand table. New item kind `USAGE#<date>` per session per day. **Reserve** is one `UpdateItem` that sets `journeysCreated` to its current value (0 when absent) plus 1 and sets `expiresAt` only when absent (the end of the UTC date plus one further day), with the condition that the item does not exist yet or `journeysCreated` is below 5; a failed condition means the slot is refused, and the first request of the day, with no item, passes the condition and creates the item. **The reservation id** is an opaque text that encodes the session ID and the date, so a release can find the key from the id alone. **Release** is one `UpdateItem` that subtracts 1 with the condition that the item exists and `journeysCreated` is above 0; a failed condition (the item is gone or already 0) is swallowed and logged at info level, since there is nothing to give back. The journey delete is one `DeleteItem` of the `JOURNEY` item | No new table, index or capacity setting. The count item is marked to expire through the existing `expiresAt` attribute, one to two days after its date; the table's removal may lag, and no code relies on removal (the date is part of the key, so an old date's item is never read). |
| IAM | permissions | Existing role plus `dynamodb:DeleteItem` on the one table | No other change; the Bedrock statement is untouched. |

### Shared Infrastructure

Nothing new is created. U3 uses the resources the first unit owns.

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| DynamoDB table | u1-skeleton | u2-progress, u3-protection (usage count items, journey delete), u4-goals-and-style, u5-encouragement | The Lambda role only; each kind of item has its own sort-key prefix; U3 touches the `USAGE#` items and deletes only the `JOURNEY` item. |
| API Gateway HTTP API and its throttle | u1-skeleton | u2 to u5 | Additive-only routes and methods (contract rules). |
| Lambda function and execution role | u1-skeleton | u2 to u5 | Permissions widen only by a named table action, reviewed at each unit: U3 adds `dynamodb:DeleteItem`. |

## Estimated Cost

| Item | Change | Notes |
|---|---|---|
| DynamoDB on-demand | One extra small write per create request (the reservation), one more if it is released, and one delete per delete | Negligible at tens of users; idle cost unchanged. |
| API Gateway, Lambda | A few extra requests per session | Within free-tier-scale volumes. |
| CloudWatch | Two new custom metrics (roughly 0.30 dollars a month each past the free allowance; an estimate) and one new alarm | See `monitoring-design.md`. |

NFR4 (under 10 dollars in total, near zero when idle) is unaffected. Exact figures come from AWS's pricing tools and the budget alerts.

## Assumptions & Open Questions

- [assumption] The first unit has not been deployed, so no data needs converting; the count item kind is new.
- [assumption] The pinned DynamoDB test double (moto) supports the conditional increment and decrement; if a branch behaves differently from the real service, it is tested with a stubbed client and confirmed by the deploy smoke checks in `cicd-pipeline.md`.
- [assumption] The count item's `expiresAt` is set only when the item is first created (with `if_not_exists`) and is not moved by later reserves or releases.
- None otherwise.
