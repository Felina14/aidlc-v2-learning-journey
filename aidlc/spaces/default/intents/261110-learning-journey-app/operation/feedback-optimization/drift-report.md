# Drift Report — Learning Journey App

## Sources

- `feedback-optimization-questions.md` in this folder (Q1 A: CloudFormation drift detection once, read-only)
- Each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the units after it
- `test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/performance-validation/test-results.md` (the stack deployed from `2b393e2`, tag `deploy-20261111-2323`)
- The live stack `LearningJourney`, account ending 5285, us-east-1, checked on 2026-11-11

## Result

`aws cloudformation detect-stack-drift` on `LearningJourney`: detection complete. **Stack status `DRIFTED`, 1 of 60 checked resources `MODIFIED`, 59 `IN_SYNC`.** No resource `DELETED`.

| Resource | Type | Property | Expected (template) | Actual (live) | Assessment |
|---|---|---|---|---|---|
| `JourneyStage` | `AWS::ApiGatewayV2::Stage` | `AccessLogSettings/DestinationArn` | The access log group's ARN ending in `:*` | The same log group's ARN without the trailing `:*` | **Not real drift.** The same log group; API Gateway stores the ARN without the wildcard suffix that the CDK's log-group ARN carries. Access logs are being written to that group |

The account number in both values is left out here.

## What was not checked, and why

- Resources CloudFormation drift detection does not support (for example the CDK's custom resources for the site upload and the bucket auto-delete) are not in the 60.
- Settings outside the stack: none are expected. The concurrency brake was never used, so the function has no reserved concurrency set by hand; the email subscription is the stack's own.
- AWS Config: not enabled (Q1 A), so there is no continuous record.

## Proposal (next cycle)

To clear the false positive, set the stage's access-log destination to the log group ARN without the `:*` suffix in `infra/stacks/journey_stack.py` (the stage's raw `AccessLogSettings` override), with a stack test; then drift detection reports `IN_SYNC`. Effort: small; risk: low; benefit: a clean drift result. Not done now (Q2 A: no change before the demo).

## Assumptions & Open Questions

- None.
