# Deployment Log — Learning Journey App

## Sources

- `deployment-execution-questions.md` in this folder (answers Q1 to Q4: A; summary confirmed "Looks correct")
- `cd-config.md`, `deployment-strategy.md` and `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/`
- `environment-inventory.md` and `validation-report.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/environment-provisioning/`
- `test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/test-results.md`

The account is recorded only as ending 5285; the budget alert address is never written here.

## Pre-deploy checklist (from `cd-config.md`)

| # | Check | Result |
|---|---|---|
| 1 | On `main`, up to date with the remote | **Not met.** The branch is `master` and the repository has no remote (Q1 A: recorded, not ticked) |
| 2 | Clean working tree | Met for the build: after the commit only `recordings/` and `.DS_Store` are left untracked, and they are not part of the build |
| 3 | The five CI checks green for this commit | **Not met.** The workflow has never run: nothing is pushed to GitHub. Build and Test's local runs are the only evidence (616 Python and 629 frontend tests pass; lint, format and `cdk synth` pass) |
| 4 | Frontend built from this commit | Met: `npm --prefix frontend ci` then `npm --prefix frontend run build` printed `built dist/` |
| 5 | AWS identity is the intended account and region | Met: an IAM user in the account ending 5285, region us-east-1 |
| 6 | `cdk diff` read | Done; summarised for the person below and waiting for their yes |
| 7 | Approval prompt answered by reading | Replaced by the person's yes in chat after the diff (Q2 A) |

## Timeline

| Time (2026-11-11) | Step | Result |
|---|---|---|
| Before writing the questions | `aws sts get-caller-identity` from the agent's shell | Account ending 5285, IAM user |
| After the summary was confirmed | Scan of the files to commit for the account number, the email address, the IAM user name and key patterns | 310 untracked files scanned; no match |
| Then | `git add` of the named paths and one local commit | Commit `c9bf90e` on `master`, 313 files; not pushed; `recordings/` and `.DS_Store` left out |
| Then | Frontend build from the commit | `built dist/` |
| Then | `npx --yes aws-cdk@2.1148.0 diff -c budget_email=<address>` | 61 resources to create, 0 to change or delete (see below). Read-only; the CDK published the template to the bootstrap bucket to build a read-only change set |
| Next | Waiting for the person's yes to deploy | — |
| After the person's yes | `npx --yes aws-cdk@2.1148.0 deploy -c budget_email=<address> --require-approval never` from commit `c9bf90e` | `CREATE_COMPLETE`, 61 resources, 247 s. The address was passed only on the command line, as the person chose; command output was redacted for the account number and the address |
| Then | Smoke checks 1 to 4, 6, 9, 10 | All pass except check 9 (planner style returns the template); stopped and asked the person (Q4 A) |
| Then | The person chose to investigate locally and fix forward | 15 Nova Lite calls from the builder's machine with scratch probe scripts (deleted after): root cause found and a fix tested (see `smoke-test-results.md`) |
| Then | Smoke checks 7, 8 and 12, as the person asked | All pass |
| Not done | Deploy tag `deploy-YYYYMMDD-HHMM` | Not created: the cd-config tags a deploy only after its smoke checks pass, and check 9 failed. The fix forward's redeploy is the one to tag |

## Fix forward (under the rollback runbook, Entry 2's "fix forward with a new change")

The person chose to fix forward inside Deployment Execution rather than reopen Code Generation for every unit (the only reopen the workflow offered from here). One change, one redeploy.

| Time (2026-11-11) | Step | Result |
|---|---|---|
| First | Tests written first: the planner prompt's JSON shape carries `hoursByKind` that adds up; the guide and instructor shapes do not; an invalid attempt logs its problem name and never reply text; a cut-off reply logs `truncated`; other outcomes log no problem | 3 of the new tests failed before the change (`KeyError: 'hoursByKind'`, `[None, None]` instead of the problem names, `KeyError: 'problem'`) |
| Then | Backend change in `prompt.py` (a planner variant of the shape), `bedrock_client.py` (`log_attempt` takes an optional fixed problem name) and `generator.py` (passes `checked.problem`, or `truncated`) | 77 tests in the two files pass; the 0.1 sum rule in `validation.py` is unchanged |
| Then | CSS-only polish of `frontend/styles.css`, test-first with a new `frontend/tests/layout.test.ts` (15 of its 22 tests failed before the CSS edit) | A centred 960px container with 24px gutters for the header bar, main and footer; a header bar on the surface colour with a divider; card padding and spacing for each stage and for the summary block; a type scale (`--font-size-sm` to `--font-size-2xl`); the primary button with the accent colours, 44px minimum and centred text. Colour tokens unchanged. `main` no longer sticky (observation O-1 of the sixth unit); the progress summary stays sticky. No change to `index.html` or `src/` |
| Then | Full verification command, plus Ruff, Black, ESLint and Prettier | 622 Python tests (99.78%), 651 frontend tests (99.78%), build passes, all lint and format clean |
| Then | Commit | **`fac52c1`** "Fix forward: planner prompt shape, problem-name log line, layout polish" (7 files: 3 backend source, 2 backend test, `styles.css`, `layout.test.ts`); scanned for the account number, the email and key patterns first; not pushed |
| Then | `cdk diff` | Two changes only: the function code (`JourneyFunction`) and the site files deployment; no IAM, network or other resource change |
| Then | `cdk deploy` from `fac52c1` | `UPDATE_COMPLETE` in 50 s |
| Then | Smoke check 9 again, plus a regression look at the other two styles and the alarms | Planner: 3 of 3 AI journeys of 6 stages, `hoursByKind` on every stage, sums equal to the hours. Guide and instructor: AI journeys, no `hoursByKind`, at least 2 exercises and 2 quiz items per stage. Home page `200`; the live stylesheet carries the new container. Alarms 4 of 4 `OK` |
| Then | Tag | **`deploy-20261111-2212`** on `fac52c1`, annotated, local only (the repository has no remote) |

The generated `infra/cdk.out` folder (which holds the full account number) was deleted after the diff and the deploy.

## Result

The stack is live and healthy at commit `fac52c1`, tagged `deploy-20261111-2212`. The planner defect found by the first deploy (commit `c9bf90e`) is fixed and smoke check 9 now passes. Nothing was rolled back or destroyed.

## What the diff will create (61 resources, nothing changed or removed)

| Group | Resources |
|---|---|
| Site | 1 S3 bucket (with its policy, which denies any non-HTTPS access), 1 CloudFront distribution with an origin access control, a response headers policy and an origin request policy, plus the CDK's site upload and auto-delete helpers |
| API | 1 HTTP API with 6 routes, 1 stage and 1 Lambda integration, and 6 permissions for the API to call the function |
| Compute | 1 application function (`JourneyFunction`) and 2 CDK helper functions with a layer |
| Data | 1 DynamoDB table |
| Observability and spend | 4 log groups, 14 metric filters, 4 alarms, 1 dashboard, 1 SNS topic with 1 email subscription (the budget address), 2 budgets (daily 2 dollars, monthly 8 dollars) |
| IAM | 3 roles and 2 policies |

Permissions the application function gets: `dynamodb:GetItem`, `PutItem`, `UpdateItem` and `DeleteItem` on the one table only; `bedrock:InvokeModel` on the Nova Lite foundation model and its US inference profile only; write to its own log group. No wildcard action on the table or the model. The CDK's own helpers get the S3 actions they need on the site bucket and `cloudfront:CreateInvalidation` (resource `*`, the CDK's standard for its deployment helper). No security group is created.

## Assumptions & Open Questions

- [assumption] Not pushing means GitHub Actions has not checked this commit; the person accepted that at Q1 (A) and it is recorded above.
- Open: none for the deploy itself; the remaining open items are in `health-check-report.md`.
- None otherwise.
