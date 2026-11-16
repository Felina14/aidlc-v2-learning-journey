# Deployment Pipeline — Questions

## Sources

- CI Pipeline: `ci-config.md` and `quality-gates.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/ci-pipeline/` (checks only; no AWS credentials in GitHub; five checks named for branch protection)
- Infrastructure design: each unit's `infrastructure-specification.md` and `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/` and the five units after it (one CDK stack, manual `cdk deploy`, redeploy-the-previous-commit rollback, smoke checks after a deploy)
- Build and Test: `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/` (seven `Unverified` targets that need a deployed stack)
- Construction to Operation check: `aidlc/spaces/default/intents/261110-learning-journey-app/verification/phase-check-construction.md`
- `team.md` — `aidlc/spaces/default/memory/team.md` (single environment, deploy from the builder's machine with `cdk deploy`, no AWS keys in GitHub, one named stack in us-east-1, deadline 14 November 2026)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR4, NFR5, NFR11)

This stage writes the delivery routine for getting the built system onto AWS and back off it: the deployment configuration (`cd-config.md`), the strategy (`deployment-strategy.md`) and the rollback runbook (`rollback-runbook.md`). Much of it is already settled by your team practices and the earlier units: there is one environment, one stack, no staging tier, the deploy is `cdk deploy` run by hand from your machine, and CI never holds AWS credentials. So there is no environment promotion to design and no CI/CD deploy job to write. These four questions are the places a real choice is left. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] What should be checked, and who approves, before each `cdk deploy`?

A deploy from your own machine goes straight to the account, with nothing in between except what you do by hand. The risk is deploying something that has not passed the checks: a branch that is not `main`, uncommitted changes, a red CI run, or an infrastructure change you did not expect (an IAM permission, a deleted table).

A. A written pre-deploy checklist in the runbook, run by you each time: on `main` and up to date, clean working tree, the five CI checks green for that commit, the frontend built from that commit, and `cdk diff` read before `cdk deploy`, with the CDK's own approval prompt left on for any change to permissions or security rules (Recommended): it costs a few minutes per deploy, needs no new code, and puts the human reading of the diff where the risk is.
B. The same checks, but run by a small deploy script kept in the repository that refuses to deploy unless they pass, then asks for a yes: fewer slips, but it is new code to write and test inside a deadline of 14 November 2026, and the script itself could have a bug.
C. No checklist; `cdk deploy` when you are ready: the quickest, with nothing to remember or maintain, but a deploy of a red or unexpected build would not be caught.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] How should a bad deploy be undone?

CloudFormation already rolls a failed update back by itself. This question is about a deploy that succeeds but turns out to be wrong: the page fails, the model call fails, or the cost climbs. The earlier units agreed the rollback is "redeploy the previous commit" and that the manual brake on spend is setting the function's concurrency to 0 (the function has no reserved concurrency, by your decision).

A. Redeploy the previous good commit with `cdk deploy`, and use the concurrency brake as the first move when the problem is cost or abuse rather than a bug; write both as step-by-step runbook entries with the checks that show each has worked (Recommended): it is what the units already assumed, it needs nothing new in the stack, and the data needs no change because no unit changed the stored data in an incompatible way.
B. Add a second, standing copy of the last good build (a Lambda alias) that can be switched to in seconds: faster, but it adds a resource and a stack change to a build that is already finished and reviewed, for a service with tens of users.
C. Rely on CloudFormation's automatic rollback and fix forward when something else goes wrong: nothing to write, but no plan for a deploy that succeeds and is still wrong.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] Should each deployed commit be tagged?

Redeploying "the previous good commit" needs you to know which commit that was. Git tags give a name to every deployed commit so the runbook can say "check out the last `deploy-` tag". Branch protection and squash merges mean `main` already has one commit per change, but nothing records which of them was deployed.

A. Tag each deployed commit in git as `deploy-YYYYMMDD-HHMM` after the smoke checks pass, and push the tag (Recommended): a one-line step in the checklist that makes the rollback target unambiguous and shows the deploy history; it needs no GitHub setting beyond permission to push tags.
B. Record deploys by hand in a deploy log file in the repository: readable, but a second place to keep up to date and easy to forget.
C. No tagging; use `git log` and your memory to find the last good commit: no extra step, but the rollback target is a guess when you are under pressure.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Should the system have feature flags?

Feature flags (for example AWS AppConfig) switch a feature on or off without a deploy. Your team practices already name a cut order for time pressure (nudges first, then milestones and the certificate, then the goal date, then persona choice), but those cuts were designed as code-level separations made before deploy, not as switches at run time.

A. No feature flags (Recommended): one environment, tens of users and a fixed demo window do not need a run-time switch; a feature that has to go is removed by a code change and a redeploy, and a flag service would add a resource, a cost and a permission to a stack that has none of them (NFR4, NFR6).
B. A simple on/off setting for the nudge, milestones and certificate in AppConfig: it lets you switch a feature off live if it misbehaves, at the price of a new service, new permissions and new code and tests in a finished build.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] Deployment strategy: an all-at-once update of the one stack through CloudFormation (`cdk deploy`). No blue-green, canary or rolling release: there is one function, one table and one environment, and CloudFormation replaces the function code in one step.
- [assumption] Environments and promotion: one environment in one account in us-east-1, with no staging tier and no promotion gates. The gate before a deploy is the CI result for the commit plus Q1.
- [assumption] The deploy stays manual from your machine. CI never holds AWS credentials and never deploys; there is no CD job, no deploy role in GitHub and no OIDC set-up.
- [assumption] Budget alarm: the stack's budget alert email is passed at deploy time with `-c budget_email=<address>`; the runbook records that as part of every deploy command.
- [assumption] CDK command line: the runbook uses `npx --yes aws-cdk@2.1148.0 ...` (the version CI pins), because the globally installed `cdk` on your machine is older than the stack library and refuses it. This answers the first unit's open item.
- [assumption] The smoke checks after a deploy are the ones each unit's `cicd-pipeline.md` already lists; this stage collects them into one runbook order. They are run in Deployment Execution (the next stages in the Operation phase), not here.
- [assumption] The deploy itself, creating the account resources, and the live checks are Environment Provisioning and Deployment Execution, with your explicit go-ahead; this stage only writes the routine and runs nothing against AWS.
- [assumption] Data: no unit changed stored data in an incompatible way; a rollback after a roll-forward has the known limit recorded in the second and fifth units (a journey made by older code in between may hold an empty list for one attribute), accepted for a one-operator demo.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
