# Infrastructure Specification — u4-goals-and-style

## Sources

- The earlier units' `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md`, `.../u2-progress/infrastructure-design/infrastructure-specification.md` and `.../u3-protection/infrastructure-design/infrastructure-specification.md` (the stack this unit extends; all of it stays in force)
- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/functional-design/`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 goal call and style, C3, C5)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR3, NFR4, NFR5, NFR6, NFR7, NFR10, NFR11)
- The built stack — `infra/stacks/journey_stack.py` (read only to check what already exists)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/`

This is a design: it names what changes in the one existing stack and why. The CDK code is written in Code Generation. The NFR Design stage did not run for this unit.

U4 adds no service and no stack. The goal call is one more route on the existing API; the style changes only the request sent to the model and the checks on its reply. The few changes are listed below; anything not listed is unchanged.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | No change: the same Python 3.12 arm64 Lambda handles the goal route, with the same size, timeout and settings | One function for all routes (first unit Q2); a goal change is one small table update. |
| Ingress | One new route on the existing HTTP API: `PUT /api/v1/journey/goal`, integrated with the same Lambda | The front door already forwards every method (`ALLOW_ALL`) on `/api/*`, caches nothing and passes `X-Session-Id`; no CloudFront change. The route is additive under `/v1`. |
| Throttle | No change: the API-wide stage throttle (rate 5, burst 10) covers the new route | A goal change is one request and the page sends one at a time. |
| Storage | No change of table, keys, billing or expiry setting. The journey item's `goalDate` becomes a plain text attribute that is set or removed (absent when none); `teachingStyle` is stored as before | The functional design needs the goal date set and cleared in one conditional update (BR32.1). Code generation changes the first unit's `save()` to omit `goalDate` instead of writing a stored null, as the second unit did for `completedStages`; a record from the earlier code with a stored null is still read as none. |
| Permissions | No change: the role already has `dynamodb:UpdateItem` on the one table (granted for the stage change and the usage guard); a `SET` or `REMOVE` of `goalDate` is the same action | Least privilege: nothing is added; no index, no wildcard. |
| Model call | No change to model, region or permission. The instructor and planner requests ask for more in every stage (at least 2 exercises, or four hours per stage), so their replies are longer. The built call caps the reply at 4096 output tokens and each call at 12 seconds inside the 15-second clock. Code generation raises the output cap for the instructor and planner styles to the model's documented maximum (checked then; the guide keeps 4096), and treats a reply cut off by the cap as an invalid reply, which goes through the one retry and then the template. A longer reply also takes longer to arrive, so these two styles may hit the 12-second per-call limit or fall back to the template more often than the guide does | The reply checks (BR33.4) and the longer replies can both make a reply invalid more often, so the retry or the template is used more often. This is an **accepted risk**, measured rather than assumed: the deploy smoke checks record the time and outcome of one journey per style, and the template-fallback alarm and the style in the log lines show it afterwards. If the instructor or planner style falls back most of the time, the next step is to shorten what they ask for (fewer items per list) or to relax the per-call limit within the 15-second clock, as a change of its own |
| Timeouts | No change: one attempt and 2 seconds in total per store call; the browser waits 10 seconds for a goal change | NFR2. |
| Concurrency | No reserved concurrency; the account limit of 10 is the ceiling, as before | Unchanged decision. |
| Environments | One environment, one stack | Team practice. |
| IaC approach | One small edit to the existing `infra/stacks/journey_stack.py`: add the `PUT /api/v1/journey/goal` route to the existing integration, and two metric filters and a dashboard line described in `monitoring-design.md` | Same single CDK stack, deployed with `cdk deploy`. |
| Teardown | No change: no new resource is created, so `cdk destroy` and the tag and log-group checks still remove and prove everything | NFR5. |
| Rollback | Redeploy the previous commit. A journey stored with a goal date or a style is read by the older code as before, because the older code already reads `goalDate` (and treats a missing one as none) and `teachingStyle`. The older code has no goal route and always makes guide journeys | A rollback needs no data change. |
| Secrets | None; no new setting | NFR6. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway HTTP API | api gateway | One added route `PUT /api/v1/journey/goal` to the existing Lambda integration; same stage throttle and access log | The body is checked by the Lambda (BR32.1), not by the gateway. |
| Amazon CloudFront | cdn | No change | `/api/*` already allows all methods; the stack test already confirms `PUT` is allowed. |
| Lambda | compute | No change to size or timeout; the code gains the goal route and the style-aware prompt and reply checks | The request log line and the generator's journey line gain the chosen style: this is a code-generation change (today they log only the source and the outcome). |
| Amazon DynamoDB | database | Same on-demand table and journey item. The goal change is one `UpdateItem` that sets `goalDate` (or removes it for none), moves `lastActivityAt` and `expiresAt`, and is conditional on the record existing and `expiresAt` greater than now | No new table, index or capacity setting. |
| Amazon Bedrock | AI model | Amazon Nova Lite as before; longer prompts and replies for two styles | Cost per journey rises slightly (more tokens); NFR4 is unaffected at tens of users. |
| IAM | permissions | No change | The Bedrock and table statements are untouched. |

### Shared Infrastructure

Nothing new is created. U4 uses the resources the first unit owns.

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| DynamoDB table | u1-skeleton | u2 to u5 (U4: the goal date and the style) | The Lambda role only; U4 writes only `goalDate`, `lastActivityAt` and `expiresAt` after the save. |
| API Gateway HTTP API and its throttle | u1-skeleton | u2 to u5 | Additive-only routes and methods (contract rules). |
| Lambda function and execution role | u1-skeleton | u2 to u5 | U4 adds no permission. |

## Estimated Cost

| Item | Change | Notes |
|---|---|---|
| Amazon Bedrock Nova Lite | Somewhat more tokens per journey for the instructor and planner styles, and a few more retries or templates | Still cents per journey; the daily cap of 5 per session and the throttle bound it. |
| DynamoDB, API Gateway, Lambda | A few extra requests per session | Negligible; idle cost unchanged. |
| CloudWatch | Two new custom metrics (roughly 0.30 dollars a month each past the free allowance; an estimate) | See `monitoring-design.md`. |

NFR4 (under 10 dollars in total, near zero when idle) is unaffected. Exact figures come from AWS's pricing tools and the budget alerts.

## Assumptions & Open Questions

- [assumption] The first unit has not been deployed, so no stored record needs converting; the older code's stored null for `goalDate` is still read as none.
- [assumption] The pinned DynamoDB test double (moto) supports a conditional `SET` and `REMOVE` of one attribute; if a branch behaves differently from the real service it is tested with a stubbed client and confirmed by the deploy smoke checks in `cicd-pipeline.md`.
- None otherwise.
