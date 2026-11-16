# Validation Report — Learning Journey App

## Sources

- `environment-inventory.md` and `environment-provisioning-questions.md` in this folder
- Infrastructure design: each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the five units after it
- Build and Test: `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR5, NFR6, NFR7, NFR11)

All checks ran on 2026-11-11 from the builder's machine against the account ending 5285 in us-east-1, using the default profile. Every check except the bootstrap only reads. The full account number and the budget alert email address are deliberately not recorded.

## Checks and results

| # | Check | Command (shortened) | Result | Verdict |
|---|---|---|---|---|
| 1 | Which identity and account the command line uses | `aws sts get-caller-identity` | An IAM user in the account ending 5285 | Pass (shown to the person before anything was created) |
| 2 | Default region | `aws configure get region` | us-east-1 | Pass |
| 3 | CDK bootstrap present | `aws cloudformation describe-stacks --stack-name CDKToolkit` | Not present at first; created after the person's yes; now `CREATE_COMPLETE`, version 33 | Pass (after bootstrap) |
| 4 | Application stack not already present | `describe-stacks --stack-name LearningJourney` | Does not exist | Pass |
| 5 | Lambda concurrency limit | `aws lambda get-account-settings` | 10 total, 10 unreserved | Pass: matches the design (no reserved concurrency; the limit of 10 is the ceiling) |
| 6 | Nova Lite available | `aws bedrock get-foundation-model-availability --model-id amazon.nova-lite-v1` | `AUTHORIZED`; agreement, entitlement, region all `AVAILABLE` | Pass (NFR7). Reads access state only; no model call was made |
| 7 | Region enabled | `aws ec2 describe-regions` | `opt-in-not-required` for us-east-1 | Pass |
| 8 | Bootstrap run | `npx --yes aws-cdk@2.1148.0 bootstrap aws://<account>/us-east-1 -c budget_email=<placeholder>` | 12 of 12 resources created, `CDKToolkit` `CREATE_COMPLETE` | Pass |

The first bootstrap attempt stopped at once because the stack's app refuses to build without the budget email context (`ValueError`); nothing was created by it. The command was re-run with a placeholder value, which the bootstrap does not use, so the real address was not needed and was not passed.

## Security posture validation

| Item | Result |
|---|---|
| Credentials in the repository or in GitHub | None stored; the command line used the builder's local profile (NEVER store AWS credentials in GitHub) |
| Account number and email in files | Not recorded in any file written by this stage |
| Bootstrap trust | Trusted accounts for deployment and lookup: none (single account) |
| CloudFormation execution role | Default `AdministratorAccess` (CDK default); accepted for a personal demo account, narrowable by re-running the bootstrap with a custom policy |
| Application template (HTTPS redirect, least-privilege role, removal policies, tags) | Covered by the stack tests and `cdk synth`; not re-validated live because the stack does not exist yet |
| Secrets store, network controls | Not applicable; the stack has none |

## What this stage did not validate

- The application stack itself: it does not exist. Its resources, endpoints, alarms and the real alert email subscription are validated in Deployment Execution.
- Real timings, spend and the `cdk destroy` result (Performance Validation).
- Any live call to the model.

## Result

The environment is ready for Deployment Execution: the right account and region, the CDK bootstrap in place, Nova Lite authorized, the Lambda limit as designed, and no existing stack in the way. Environment Provisioning created exactly one thing, the `CDKToolkit` stack.

## Assumptions & Open Questions

- [assumption] One environment, so "all environments provisioned per the design" is satisfied by the bootstrap plus the prerequisites above.
- Open: the application stack's first deploy is the next stage and needs its own go-ahead.
- None otherwise.
