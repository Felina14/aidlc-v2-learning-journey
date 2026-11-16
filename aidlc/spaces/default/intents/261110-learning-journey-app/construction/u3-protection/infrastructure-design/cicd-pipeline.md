# CI/CD Pipeline — u3-protection

## Sources

- `cicd-pipeline.md` of the first and second units — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md` and `.../u2-progress/infrastructure-design/cicd-pipeline.md` (the pipeline, the manual deploy and the rollback stay in force)
- `infrastructure-specification.md` and `monitoring-design.md` in this folder
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs tests on every merge; deploy from the builder's machine; no AWS keys in GitHub)
- `.github/workflows/ci.yml` (read only, to check the job names)

## Shape

No change to how delivery works. Checks run in GitHub Actions on every merge and hold no AWS credentials; deploys are run by hand with `cdk deploy`. U3 only adds tests to the jobs that already exist and a few smoke checks to the manual deploy.

## Build and check stages

The workflow keeps its five jobs: secret scan, Python lint and tests (which also runs the stack tests), frontend lint, tests and build, stack check (`cdk synth`), and the accessibility placeholder. U3's additions inside them:

| Job | Addition | Gate |
|---|---|---|
| Python lint and tests | Tests for the usage guard (reserve, refuse at 5, release, the UTC day boundary, two requests at the cap, the guard's store failing and the request going ahead), the generator's use of it, the delete call and the create route's DAILY_LIMIT answer, with Bedrock faked and DynamoDB doubled | All pass; line coverage stays at least 80% (NFR9). The pinned test double's handling of the conditional increment and decrement is checked; if a branch differs from the real service it is tested with a stubbed client (see the specification). |
| Python lint and tests (stack tests) | Assert `DELETE` on the existing route, `dynamodb:DeleteItem` on the one table only (no wildcard action or resource), that the front door still allows `DELETE` and forwards the session header, the `DailyLimitHit` and `GuardSkipped` filters with their patterns, the guard-skipped alarm, and no reserved concurrency | All pass |
| Frontend lint, tests and build | Tests for the limit message, the replace and delete dialogs (focus, Escape, busy, error), the topic screen's way back, and the create and delete clients | All pass; line coverage at least 80% |
| Stack check | `cdk synth` runs as before and must still produce a template | Template builds without errors |

## Deployment (manual, from the builder's machine)

Unchanged: pull `main`, confirm the pipeline is green, build the frontend, run `cdk deploy -c budget_email=<address>`, then the smoke checks. The deploy adds one method, one permission, two metric filters, one alarm and one dashboard line; nothing else.

## Smoke checks after a deploy

The smoke checks use a fresh session for each check, because the cap is per session: clear the browser's saved session ID (its site data) between checks. U3 adds:

| Check | Expected |
|---|---|
| In a fresh session, create journeys for five ordinary topics, then a sixth (a few cents of model use) | The sixth answers the plain daily-limit message, the current journey is unchanged, and no new journey is made |
| In another fresh session: create a journey, delete it from the page and confirm, then create another the same day | After the delete the home screen shows, and reloading shows the home screen, not an error. The second create succeeds, and the table's count item for this session reads 2: the delete did not give a slot back |
| Start a new journey and cancel the dialog | Nothing changes; the journey stays |
| Start a new journey, confirm, then use the way back | The saved journey is shown with its progress |
| `DELETE` twice from the developer tools | Both answer 204 |
| Look in the table for the count item | One `USAGE#<date>` item for the session, whose `expiresAt` value is one to two days after the date (check the attribute; the table's removal may lag) |
| Confirm a limit answer is a 429 with the code DAILY_LIMIT, and a throttled answer shows the "please wait" message, not the limit message | The page tells the two apart |
| After deploy, look at the `GuardSkipped` metric | It is 0; a non-zero value means the guard's update is failing (permission or expression) |

## Environment promotion

None. One environment.

## Rollback

Redeploy the previous commit with `cdk deploy`. Count items stay in the table and are ignored by the older code, which reads only the journey item; they are marked to expire within one to two days and the table removes them when it gets to them (removal can lag; nothing depends on it). The older code has no delete route and no cap, so a rolled-back app is as open as the second unit was. No data change is needed.

## Secrets management in CI/CD

Unchanged: no secrets and no AWS keys in GitHub; gitleaks guards against an accidental commit.

## Assumptions & Open Questions

- None.
