# CD Configuration — Learning Journey App

## Sources

- `deployment-pipeline-questions.md` in this folder (answers Q1 to Q4: A, A, A, A; summary confirmed "Looks correct")
- CI Pipeline: `ci-config.md` and `quality-gates.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/ci-pipeline/`
- Infrastructure design: each unit's `infrastructure-specification.md` and `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/` and the five units after it
- Build and Test: `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/`
- `phase-check-construction.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/verification/`
- `team.md` — `aidlc/spaces/default/memory/team.md`
- The stack — `infra/app.py` and `infra/stacks/journey_stack.py` (read only)

## Delivery shape

| Item | Choice |
|---|---|
| Deploy mechanism | `cdk deploy` run by hand from the builder's machine. There is no deploy job in GitHub Actions, no deploy role, no OIDC set-up and no AWS credential in GitHub (`project.md`: NEVER store AWS credentials in GitHub) |
| Stack | One stack named `LearningJourney` in us-east-1 (`infra/app.py`) |
| Environments | One. No staging tier and no promotion gates |
| CDK command line | `npx --yes aws-cdk@2.1148.0` (the version CI pins). The globally installed `cdk` on the builder's machine is older than the stack's library and refuses it with a "Cloud assembly schema version mismatch" |
| Required context | `-c budget_email=<address>`: the stack refuses to build without it (the address receives alarms and spend alerts and is never committed) |
| Artifacts | None published. `cdk deploy` uploads `frontend/dist` and the function code itself |
| Feature flags | None (Q4 A). A feature that has to go is removed by a code change and a redeploy |
| Version record | Each deployed commit is tagged `deploy-YYYYMMDD-HHMM` after the smoke checks pass (Q3 A) |

## The deploy command

From the repository root, after the pre-deploy checklist below:

```
npm --prefix frontend ci
```

```
npm --prefix frontend run build
```

```
cd infra && npx --yes aws-cdk@2.1148.0 diff -c budget_email=<address>
```

```
cd infra && npx --yes aws-cdk@2.1148.0 deploy -c budget_email=<address> --require-approval any-change
```

`--require-approval any-change` makes the CDK stop and ask before applying any change, not only changes to permissions and security rules; for a first deploy of a small stack that is a few extra prompts and it keeps the human reading of the diff (Q1 A). The default level (`broadening`) would also be acceptable for later deploys; if you prefer it, change the flag and record the change in `aidlc/spaces/default/memory/team.md`.

## Pre-deploy checklist (Q1 A)

Run every item, every time. Stop at the first one that fails.

| # | Check | How |
|---|---|---|
| 1 | On `main`, up to date with the remote | `git switch main`, `git pull --ff-only` |
| 2 | Clean working tree | `git status --short` prints nothing that matters (the `recordings/` files are the person's own and are not part of the build) |
| 3 | The five CI checks are green for this exact commit | GitHub, Actions tab: Secret scan (gitleaks), Python lint and tests, Frontend lint, tests and build, Dependency audit, Stack check (cdk synth) |
| 4 | The frontend is built from this commit | `npm --prefix frontend ci` then `npm --prefix frontend run build` prints `built dist/` |
| 5 | AWS identity is the intended account and region | `aws sts get-caller-identity`; the account is the personal one, the region us-east-1 |
| 6 | `cdk diff` read | Nothing unexpected: no deleted table or bucket, no new permission you did not design, no new resource outside the stack's design |
| 7 | The CDK approval prompt is answered by reading, not by habit | Answer `y` only after reading what it lists |

## Deploy order

1. Pre-deploy checklist (above).
2. `cdk deploy` (above). CloudFormation updates the one stack in one step, and uploads the site and clears CloudFront's cache for the site files.
3. Open the confirmation email from AWS and click its link: the alarm and budget subscription stays pending until then, so no alarm can reach you before it.
4. Run the smoke checks in `deployment-strategy.md`.
5. When they pass, tag and push: `git tag deploy-<YYYYMMDD-HHMM>` then `git push origin deploy-<YYYYMMDD-HHMM>` (Q3 A).
6. Record the date, commit and result in the stage that ran the deploy (Deployment Execution).

## Secrets and access

- The only values passed at deploy time are the budget email (a command-line value) and the AWS credentials on the builder's machine. Neither is written into a file in the repository.
- The workflow's `GITHUB_TOKEN` is read-only (`contents: read`).
- gitleaks (pinned) scans the full history on every push and pull request.

## Assumptions & Open Questions

- [assumption] The builder's machine has the AWS command line configured for the personal account. This stage did not check it and ran nothing against AWS.
- [assumption] The CDK bootstrap for us-east-1 may or may not exist in the account. Environment Provisioning checks and, with the person's go-ahead, runs it.
- [assumption] The stack's first deploy creates all resources; Environment Provisioning and Deployment Execution own that, with the person's explicit go-ahead.
- None otherwise.
