# Deployment Execution — Questions

## Sources

- Deployment Pipeline: `cd-config.md`, `deployment-strategy.md` and `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/` (pre-deploy checklist, deploy order, 13 smoke checks, rollback entries)
- Environment Provisioning: `environment-inventory.md` and `validation-report.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/environment-provisioning/` (account ending 5285, us-east-1, CDK bootstrap in place, Nova Lite authorized, Lambda limit 10, no `LearningJourney` stack yet)
- Build and Test: `build-and-test-summary.md` and `test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/` (616 Python and 629 frontend tests pass, build and `cdk synth` pass, seven `Unverified` targets that need this deployment)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/` (single environment, deploy from the builder's machine, no AWS credentials in GitHub, deadline 14 November 2026)

Pre-deployment check done before writing these questions: the AWS command line in my shell is signed in to the account ending 5285 as an IAM user, the same account the environment checks used. Nothing has been deployed.

This stage creates the application stack: billable AWS resources in your account. The questions are about how that happens. One finding changes the picture: the pre-deploy checklist in the runbook assumes work that has been committed on `main`, pushed, and checked by GitHub Actions, but the repository's only commit is the AI-DLC set-up commit, on a branch called `master`; all of the application code (backend, frontend, infra, CI workflow) is untracked, and the repository has no remote. So checklist items 1 to 3 (on `main`, clean tree, CI green) cannot be met as written, and the deploy tag needs a commit to point at. These four questions are the places a real choice is left. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] What should the first deploy be built from, given nothing is committed yet?

The CDK packs whatever is in the working tree when it runs. If it runs from uncommitted files, nothing records which exact code is live, the rollback runbook's "previous good commit" has nothing to point at, and a tag cannot be made. I will only commit if you ask for it here; I would stage exactly the application files (backend, frontend, infra, the CI workflow, `pyproject.toml`, `.gitignore` as changed, and the AI-DLC records), never `recordings/` or `.DS_Store`, and I would not push anything.

A. Commit the application work as one local commit on the current branch first, then deploy from that commit and tag it `deploy-YYYYMMDD-HHMM` locally after the smoke checks pass; no push, because the repository has no remote (Recommended): it gives the deploy a fixed commit and the rollback runbook a real target, and it is local and reversible. The CI-green and `main` items are recorded as not met, with the reason, rather than ticked.
B. Deploy from the working tree as it is, with nothing committed; tag later: the quickest and it changes no git state, but the live code is recorded only as "the working tree on 2026-11-11", and the first rollback target does not exist.
C. You commit (and, if you want, create `main` and push to GitHub) yourself first, then tell me; I deploy from that commit and the checklist runs as written, including CI: the strictest, and it lets GitHub run the CI checks (including the secret scan) before anything goes live, at the price of a pause for you to set up the remote and wait for the run.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A — commit locally only, never recordings/ or .DS_Store, and do not push.

---

## Q2. [Rules] How should the CDK's change approval prompt be answered?

`cdk deploy --require-approval any-change` stops and waits for a typed yes before it applies changes. My shell cannot answer an interactive prompt, so it would hang. The runbook's intent is that a person reads the diff before anything is applied.

A. I run `cdk diff` first and show you what will be created in plain words (the resources, any new permission, anything that would be deleted), then ask you in this chat for a yes; after your yes I run the deploy with the prompt turned off (`--require-approval never`) (Recommended): your reading of the diff and your yes in the chat replace the typed prompt, the deploy cannot hang, and nothing is created before you have seen what it is.
B. You run the deploy yourself in your own terminal and answer the prompt there, and I only run the checks before and the smoke checks after: you keep the keyboard on the one step that creates billable resources, at the cost of a pause and a step for you.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] Which smoke checks should I run on the live site?

The runbook lists 13 smoke checks. Several create journeys, which call Amazon Bedrock and count against the daily limit of five journeys per session: roughly a dozen journeys in total, a few cents of model use. Check 5 (forcing the template fallback) has no safe, designed way on a deployed stack. Check 13 is yours (Lighthouse, keyboard, VoiceOver, four browsers, zoom, print preview). I would drive the API checks from the command line with made-up session IDs; the page checks need a browser, which I do not have.

A. Run all the checks that can be done without a browser (the API behaviour, the logs, the metrics and alarms, the table items), record the page checks and check 5 as not run with the reason, and leave check 13 to you (Recommended): it exercises everything that can honestly be done from here, spends only a few cents, and records the rest as not run instead of claiming it.
B. Run only the basics (HTTPS and redirect, create and reload one journey, the alarms): the cheapest and quickest, but it leaves the daily cap, delete, goal, style and milestone routes unverified on the live stack.
C. Run nothing beyond the deploy itself and the stack's own health; you do all the smoke checks in your browser: the least from me, but the log and table checks need AWS access, which you would have to run too.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] What should I do if a check fails after the stack is created?

This is a first deploy, so there is no earlier version to go back to. A failed CloudFormation create rolls itself back and leaves nothing. A stack that creates but a check that fails leaves resources running (and costing a little) until something is done.

A. Stop at the first failure, show you the result and the options from the runbook (fix forward, the concurrency brake, or destroy and redeploy), and wait for your choice; do not change anything on my own (Recommended): after a first deploy the right response depends on what failed, and the changes (a destroy, a redeploy) are yours to decide.
B. Automatically `cdk destroy` and stop if the stack's own health fails (home screen does not load, journey creation fails), and stop and ask for anything else: it avoids paying for a broken stack, but it deletes resources, and the data in them, without asking.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] Deployment window: now. There is no maintenance window to respect; the only users are you and your tests.
- [assumption] Database migrations: none. A first deploy creates an empty table and no unit changed stored data.
- [assumption] Dependent services: Amazon Bedrock (Nova Lite) is authorized (checked at Environment Provisioning); nothing else is depended on.
- [assumption] The budget alert email address you gave at Environment Provisioning is passed only as `-c budget_email=<address>` on the command line, as you chose; it is not written to any file, log or artifact of this stage. The alert subscription stays pending until you click the confirmation link AWS emails you; I will check its state with a read-only call and ask you to click it.
- [assumption] The CDK command line is `npx --yes aws-cdk@2.1148.0` (the globally installed one is too old), and the frontend is built from the working tree before the diff (`npm --prefix frontend ci` then `npm --prefix frontend run build`).
- [assumption] Real timings (NFR2), the spend over a day (NFR4) and the `cdk destroy` check (NFR5) are not done here; Performance Validation owns them, last.
- [assumption] The stack is left running after this stage, so Observability Setup, Incident Response and Performance Validation have something to work on. It is destroyed only at the end, by the NFR5 check, with your go-ahead.
- [assumption] The deploy artifacts (log, results, health report) record the account only as ending 5285 and never the email address or the full ARN.
- None otherwise.

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
