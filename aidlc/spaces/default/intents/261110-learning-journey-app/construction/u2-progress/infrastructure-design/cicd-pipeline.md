# CI/CD Pipeline — u2-progress

## Sources

- `cicd-pipeline.md` of the first unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md` (the pipeline, the manual deploy and the rollback stay in force)
- `infrastructure-specification.md` and `monitoring-design.md` in this folder
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs tests on every merge; deploy from the builder's machine; no AWS keys in GitHub)

## Shape

No change to how delivery works. Checks run in GitHub Actions on every merge and hold no AWS credentials; deploys are run by hand with `cdk deploy`. U2 only adds tests to the stages that already exist and a few smoke checks to the manual deploy.

## Build and check stages

The workflow has five jobs, unchanged in shape: secret scan, Python lint and tests (which also runs the stack tests), frontend lint, tests and build, stack check (`cdk synth`), and the accessibility placeholder. U2's additions inside them:

| Job | Addition | Gate |
|---|---|---|
| Python lint and tests | Tests for the completion route, the set-based update and the other store paths, with Bedrock faked and DynamoDB doubled; and the stack tests (they run in this job) | All pass; line coverage stays at least 80% (NFR9). The pinned test double's handling of a failed condition is checked; if it does not return the old record, that branch uses a stubbed client (see the specification). |
| Python lint and tests (stack tests) | Assert the new `PUT` route, the `dynamodb:UpdateItem` statement on the one table only (no wildcard action or resource), that the front door still allows `PUT` and forwards the session header, and the new log metric filters | All pass |
| Frontend lint, tests and build | Tests for the progress rules (written first), the stage ladder, the optimistic change and its rollback | All pass; line coverage at least 80% |
| Stack check | `cdk synth` runs as before and must still produce a template | Template builds without errors |

## Deployment (manual, from the builder's machine)

Unchanged: pull `main`, confirm the pipeline is green, build the frontend, run `cdk deploy -c budget_email=<address>`, then the smoke checks. Nothing is created or removed by the deploy beyond the one route and the added permission.

## Smoke checks after a deploy

The first unit's smoke checks all still apply. U2 adds:

| Check | Expected |
|---|---|
| Create a journey, then mark stage 1 complete | The bar reads 20% for 5 stages (17% for 6 stages); the count reads "1 of 5 complete" |
| Reload the page | The skeleton, then the journey with stage 1 still done |
| Unmark stage 1 | The bar returns to 0% and a reload shows it not done |
| Mark the same stage twice from two browser tabs | It shows complete once and counts once |
| `PUT` to the completion route for stage 7 (use the browser's developer tools) | 400 INVALID_REQUEST; nothing changes |
| Mark a stage with a made-up session ID that has no journey | 404 NOT_FOUND |
| Confirm a failed condition returns a clean 404 or 400, not a 500 | Confirms the real database returns the old record on a failed condition |

## Environment promotion

None. One environment.

## Rollback

Redeploy the previous commit with `cdk deploy`. Journeys written by U2 stay readable by the older code, because its load iterates `completedStages` whether it is a list or a set, and the extra `stageCount` is ignored. **The way back has one catch:** the older code saves new journeys with `completedStages` as an empty list. If U2 is deployed again afterwards, a mark on a journey made in between is refused by the database (a list cannot take a set update) and ends as SAVE_FAILED. This is an accepted limit for a demo with one operator: after such a rollback and redeploy, delete the stuck item from the table (or make a new journey under a new session by clearing the browser's saved session ID) and carry on. It only matters if a rollback is followed by a roll-forward and a learner created a journey in between.

## Secrets management in CI/CD

Unchanged: no secrets and no AWS keys in GitHub; gitleaks guards against an accidental commit.

## Assumptions & Open Questions

- None.
