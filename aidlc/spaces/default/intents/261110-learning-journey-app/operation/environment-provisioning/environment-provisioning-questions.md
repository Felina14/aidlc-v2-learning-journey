# Environment Provisioning — Questions

## Sources

- Infrastructure design: each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the five units after it (one stack, no VPC, no secrets store, Bedrock Nova Lite in us-east-1, an account Lambda concurrency limit of 10)
- Deployment Pipeline: `cd-config.md`, `deployment-strategy.md` and `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/` (manual `cdk deploy` from your machine, with the pinned CDK command line)
- Build and Test: `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/` (seven `Unverified` targets that need the deployed stack)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/` (single environment in a personal AWS account in us-east-1; NEVER store AWS credentials in GitHub)
- The stack — `infra/app.py` and `infra/stacks/journey_stack.py` (read only)

This is the first stage that touches your AWS account, so these questions are about what I may do there and what I must leave to you. The usual checklist for this stage (VPCs, subnets, security groups, secrets in a secrets store, cross-account links) mostly does not apply: the stack has no network, no secrets store and no second account. What does apply is a short list of prerequisites: the account and region you mean, the CDK bootstrap in us-east-1, the Lambda concurrency limit, Bedrock access for Nova Lite, and the alert email the stack needs. Nothing in this stage creates the application stack itself; that is Deployment Execution, the next stage. These four questions are the choices that are yours. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] May I run read-only checks against your AWS account, and under which profile?

To validate the environment I need to ask AWS a few questions: who am I (`aws sts get-caller-identity`), is the CDK bootstrap stack present in us-east-1, what is the Lambda concurrency limit, is the Nova Lite model enabled in the account, and is a stack named `LearningJourney` already there. All of these only read; none changes or creates anything, and none sends your code anywhere. I do not know which AWS profile your command line uses; I would use the default one unless you name another.

A. Yes, run the read-only checks with the default profile, and show me the account number's last four digits only, with the full results in the validation report minus the account number (Recommended): it gives a real validation instead of an assumed one, it shows you which account I am looking at before anything is created, and the report stays safe to commit to a public repository.
B. Yes, but with a profile or region I will name in my reply: the same checks against the account you choose, for when the default profile is not the personal account.
C. No, do not touch AWS in this stage; I will run the checks myself from a list you write: nothing reaches your account from me, but the validation report would be a list of checks you ran, not results I saw.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] If the CDK bootstrap is missing, may I create it?

`cdk deploy` needs a one-time set-up stack (named CDKToolkit) in the account and region: a storage bucket, a few IAM roles, and an image repository setting. Creating it changes your account and the stack stays after `cdk destroy`: the teardown check for NFR5 does not remove it, by design. If it already exists, nothing needs doing.

A. If it is missing, show me the exact command and what it will create, and run it only after I say yes in this chat (Recommended): the bootstrap is a real change to your account that outlives the application, so it is worth one explicit yes, and the run is recorded with its result.
B. If it is missing, run it without asking again: quicker, but this answer would be the only approval for a lasting change.
C. If it is missing, stop and I will bootstrap it myself: nothing is created by me, at the cost of a pause in the workflow.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] Which of the stack's prerequisites should this stage leave to Deployment Execution?

This stage is called "provisioning", and the stack creates every resource itself when it is deployed. Two things could count as provisioning: validating the prerequisites above (read-only, plus the optional bootstrap), and creating the stack. The earlier runbook puts the deploy, its smoke checks and the deploy tag in Deployment Execution.

A. This stage only validates prerequisites and, with your yes, bootstraps; the stack is created in Deployment Execution, with its own go-ahead (Recommended): it keeps the one irreversible-looking step (creating billable resources) in the stage designed for it, with the pre-deploy checklist and smoke checks right beside it.
B. This stage also runs the first `cdk deploy`, and Deployment Execution then only runs the smoke checks: fewer pauses, but the pre-deploy checklist and the deploy would happen in a stage whose artifacts are about the environment, not the release.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Where should the budget alert email address come from?

The stack will not build without `-c budget_email=<address>`: it receives the alarms and the daily and monthly spend alerts. The address is personal information and the repository is public, so it must never be written into a file there. It would be typed into a command, and the command would then appear in your terminal history and in the local, ignored session records that AI-DLC keeps on your machine (not in the committed audit trail).

A. You run the deploy yourself in your own terminal, typing the address there, and I never see it; the validation uses a dummy address like CI does (Recommended): the address stays out of this conversation and out of every file, at the cost of you running the deploy command from the runbook yourself.
B. You tell me the address in this chat and I pass it on the command line when I deploy: smoother, but the address is then in this conversation and in the ignored local session records.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: B — the budget alert address was given in the chat; it is passed only as -c budget_email on the command line and is not written into any file (redacted here because this file is committed to a public repository).

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] There is one environment: one account, us-east-1, no staging tier. "All environments provisioned per the infrastructure design" therefore means this one.
- [assumption] No VPC, subnet, security group, secrets-store or cross-account check applies: the stack defines none of them, and the only credential is the Bedrock access of the function's role, which the stack grants itself.
- [assumption] The validation report records results without the full account number and without the budget email address. Results are judged against the earlier units' designs: Lambda concurrency limit of 10 (the stack sets no reserved concurrency), Nova Lite enabled in us-east-1, the region us-east-1, the stack name `LearningJourney`.
- [assumption] `cdk synth` and `cdk diff` against an empty account are not run in this stage: the diff needs the account and region and belongs to the pre-deploy checklist in Deployment Execution.
- [assumption] Security posture validation by the security specialist is a read of the synthesized template (HTTPS redirect, least-privilege role, removal policies, tags) already covered by the stack tests; this stage adds only what the live account shows.
- [assumption] The Bedrock model-access check reads the account's model access state only. It makes no model call.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
