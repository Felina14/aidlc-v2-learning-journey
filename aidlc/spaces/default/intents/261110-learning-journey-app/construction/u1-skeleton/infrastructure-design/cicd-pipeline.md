# CI/CD Pipeline — u1-skeleton

## Sources

- `infrastructure-specification.md` in this folder
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- Infrastructure answers Q5 and Q6 — `infrastructure-design-questions.md` in this folder
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs tests on every merge; deploy from the builder's machine; no AWS keys in GitHub)

## Shape

Checks run in GitHub Actions; deploys run by hand. The pipeline holds no AWS credentials, so it cannot deploy and cannot touch the account.

## Build and check stages (every merge to `main`, and every pull request)

| Order | Stage | What it does | Gate |
|---|---|---|---|
| 1 | Secret scan | gitleaks over the full history and working tree [Q5] | Any finding fails the run (public repository, NFR6) |
| 2 | Lint and format | Ruff and Black (Python); ESLint and Prettier (TypeScript) | Any error fails the run |
| 3 | Python tests | Unit tests with Bedrock faked, coverage report | All pass; line coverage at least 80% (NFR9) |
| 4 | TypeScript tests | Unit tests for the progress rules and the page logic | All pass; line coverage at least 80% (reported separately from the Python figure) |
| 5 | Frontend build | Compile the TypeScript to `frontend/dist` (the folder `cdk deploy` uploads) | Must build without errors; the folder is not committed |
| 6 | Stack check | `cdk synth` with the budget email context set to a dummy value, after step 5 so the asset folder exists | Must produce a template without errors |
| 7 | Accessibility check | axe or Lighthouse over the built pages (from U6; a placeholder step before then) | No critical or serious violations (NFR1) |

`cdk-nag` is not part of the run for now (Q5: avoids rule churn before the deadline). It can be added as a stage after the stack check.

## Deployment (manual, from the builder's machine)

1. Pull `main` and confirm the pipeline is green.
2. Build the frontend to `frontend/dist` (the same build as pipeline step 5).
3. Run `cdk deploy` with the budget email passed as context: `-c budget_email=<address>`. The deployment uploads `frontend/dist` to the site bucket and then clears CloudFront's cache for the site files, so learners never see old files.
4. Open the confirmation email from AWS (the alarm and budget email subscription stays pending until its link is clicked) and confirm it.
5. Run the smoke checks below.
6. To remove everything: `cdk destroy`; then list resources by the `Project` tag, and log groups by the stack's name prefix, to confirm none are left (NFR5). The CDK bootstrap stack is outside the stack and stays.

## Smoke checks after a deploy

| Check | Expected |
|---|---|
| Open the CloudFront address | The home screen loads over HTTPS |
| Open the HTTP form of the address | Redirected to HTTPS (NFR6) |
| Create a journey for a normal topic | An AI journey or a labelled template is shown |
| Reload the page | The same journey is shown |
| Confirm the email subscription | The confirmation link was clicked, so alarms can reach the builder |
| Send a burst of 15 or more quick `GET /api/v1/journey` calls (no model call is made) | Some calls in the burst answer 429 (throttling is best effort, so the exact call is not fixed) |

## Environment promotion

None. There is one environment. A change is merged, checked by the pipeline, then deployed once.

## Rollback

Check out the previous good commit and run `cdk deploy` again. Data in the table is not changed by a rollback. If a deploy fails midway, CloudFormation rolls the stack back by itself; if the stack is left unusable, `cdk destroy` and `cdk deploy` rebuild it (journeys are demo data).

## Secrets management in CI/CD

- No secrets exist in the pipeline and no AWS keys are stored in GitHub (`project.md`: NEVER store AWS credentials in GitHub).
- The deploy-time budget email is a local command-line value, never committed.
- gitleaks is the guard against an accidental commit of a key.

## Artifact management

Nothing is published. The build output is created and uploaded to the site bucket by `cdk deploy` itself.

## Assumptions & Open Questions

- [assumption] The accessibility check step is a no-op until the pages exist in U6; the run does not fail for its absence.
- None otherwise.
