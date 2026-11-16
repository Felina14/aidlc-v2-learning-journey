# Environment Inventory — Learning Journey App

## Sources

- `environment-provisioning-questions.md` in this folder (answers Q1 A, Q2 A, Q3 A, Q4 B; summary confirmed "Looks correct"; bootstrap approved "Yes bootstrap")
- Infrastructure design: each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the five units after it
- Deployment Pipeline: `cd-config.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/cd-config.md`
- `validation-report.md` in this folder (the checks behind this inventory)
- Checks and the bootstrap were run on 2026-11-11 against the builder's AWS account (identified here only by its last four digits, 5285) in us-east-1. The budget alert email address is not recorded in this file or anywhere in the repository.

## Environment

| Item | Value |
|---|---|
| Environments | One. No staging tier, no promotion |
| Account | The builder's personal account, ending 5285 |
| Region | us-east-1 |
| Identity used | An IAM user in that account, through the default profile of the AWS command line (version 2.32.18) |
| Application stack | `LearningJourney`: **not created yet** (created in Deployment Execution) |

## Provisioned in this stage

| Resource | Created by | Created | State | Stays after `cdk destroy` of the application stack |
|---|---|---|---|---|
| CloudFormation stack `CDKToolkit` (CDK bootstrap, template version 33) | `cdk bootstrap` with the pinned `aws-cdk@2.1148.0`, approved by the person in this chat | 2026-11-11 | `CREATE_COMPLETE` | Yes, by design |

The `CDKToolkit` stack holds 12 resources, created by that one command:

| Kind | Resource | Purpose |
|---|---|---|
| S3 bucket | Staging bucket (with its bucket policy) | Holds the function code and site files that `cdk deploy` uploads |
| ECR repository | Container assets repository | Unused here: the stack builds no container images; it stays empty |
| IAM roles (5) | Deployment action, file publishing, image publishing, lookup, and CloudFormation execution | Roles the CDK assumes to deploy; the CloudFormation execution role has the default `AdministratorAccess` policy |
| IAM policies (2) | Default policies of the file and image publishing roles | Scope the publishing roles to the staging bucket and repository |
| SSM parameter | `CdkBootstrapVersion` | Records the bootstrap version for the CDK to check |

The account number is part of the staging bucket's name and the roles' ARNs; those names are deliberately left out of this file.

## Prerequisites found (read-only checks)

| Prerequisite | Needed by | Found |
|---|---|---|
| Lambda account concurrency limit of 10, all unreserved | The stack sets no reserved concurrency; the concurrency brake sets 0 | 10 total, 10 unreserved |
| Amazon Nova Lite (`amazon.nova-lite-v1`) available in us-east-1 | Journey generation (NFR7) | Authorization `AUTHORIZED`; agreement, entitlement and region availability all `AVAILABLE` |
| Region us-east-1 enabled | The stack | Enabled (no opt-in needed) |
| No stack named `LearningJourney` already present | A clean first deploy | Not present |

## Not provisioned and not needed

| Item | Reason |
|---|---|
| VPC, subnets, security groups, network ACLs | The stack defines none; the function and table are reached over AWS endpoints |
| Secrets Manager or Parameter Store entries | The stack stores no secret; the function's Bedrock and table access come from its role |
| Cross-account or cross-VPC links | Single account, no VPC |
| Staging or production tiers | One environment (team practice) |

## Assumptions & Open Questions

- [assumption] The `CDKToolkit` stack's default execution policy (`AdministratorAccess`) is accepted for a personal demo account. A narrower policy can be set by re-running the bootstrap with `--cloudformation-execution-policies`; it was not requested.
- [assumption] The bootstrap's idle cost is a few cents or less (an empty repository and a bucket that holds only what a deploy uploads).
- Open: the `CDKToolkit` stack is outside the application stack and is not removed by `cdk destroy`. Remove it by hand (empty the staging bucket, then delete the `CDKToolkit` stack) if the account is to be left exactly as found.
- None otherwise.
