# CI/CD Pipeline — u4-goals-and-style

## Sources

- The earlier units' `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md`, `.../u2-progress/infrastructure-design/cicd-pipeline.md` and `.../u3-protection/infrastructure-design/cicd-pipeline.md` (the pipeline, the manual deploy and the rollback stay in force)
- `infrastructure-specification.md` and `monitoring-design.md` in this folder
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs tests on every merge; deploy from the builder's machine; no AWS keys in GitHub)
- `.github/workflows/ci.yml` (read only, to check the job names)

## Shape

No change to how delivery works. Checks run in GitHub Actions on every merge and hold no AWS credentials; deploys are run by hand with `cdk deploy`. U4 only adds tests to the jobs that already exist and a few smoke checks to the manual deploy.

## Build and check stages

The workflow keeps its five jobs: secret scan, Python lint and tests (which also runs the stack tests), frontend lint, tests and build, stack check (`cdk synth`), and the accessibility placeholder. U4's additions inside them:

| Job | Addition | Gate |
|---|---|---|
| Python lint and tests | Tests for the style-aware prompt and reply checks (instructor minimums, the planner breakdown and its tolerance, the template unchanged for every style), the create route's style handling (absent means guide, an unknown style is INVALID_REQUEST with no model call), and the goal call (set, change, clear, repeat, a missing key, a date that is not real, NOT_FOUND and SAVE_FAILED), with Bedrock faked and DynamoDB doubled | All pass; line coverage stays at least 80% (NFR9). The pinned test double's handling of a conditional set and remove of one attribute is checked; if a branch differs from the real service it is tested with a stubbed client. |
| Python lint and tests (stack tests) | Assert the new `PUT /api/v1/journey/goal` route, that the role's table actions are still exactly GetItem, PutItem, UpdateItem and DeleteItem with no wildcard, that the front door still allows `PUT` and forwards the session header, the `GoalChangeFailed` and `GoalChangeTimeMs` filters with their patterns (the first with default 0, the second with none), and no reserved concurrency | All pass |
| Frontend lint, tests and build | The goal and pace rules written first (the team's progress-maths practice): allowed dates, days remaining across month ends, leap days and daylight-saving changes, the pace examples; then the style radios, the goal form, the header goal line, the planner hours display and the rollback paths | All pass; line coverage at least 80% |
| Stack check | `cdk synth` runs as before and must still produce a template | Template builds without errors |

## Deployment (manual, from the builder's machine)

Unchanged: pull `main`, confirm the pipeline is green, build the frontend, run `cdk deploy -c budget_email=<address>`, then the smoke checks. The deploy adds one route, one metric filter and one dashboard line; nothing else.

## Smoke checks after a deploy

The earlier units' smoke checks all still apply (each in a fresh session where the daily cap matters). U4 adds:

| Check | Expected |
|---|---|
| Open the topic screen | No style is selected and "Generate my journey" is disabled with its reason; choosing a style and a topic enables it |
| Create one journey in each style (three journeys, a few cents of model use, in one fresh session) and note from the logs how long each took and whether it was the AI or the template | Each is made, the header shows the style's name; the instructor journey has at least 2 exercises and 1 quiz in every stage; the planner journey shows four hours per stage when it came from the AI. Note any style that fell back to the template or took close to 12 seconds: see the accepted risk in the specification |
| Set a goal date, reload the page | The goal date, days left and pace show again |
| Change it, then clear it | The header updates and returns to "Set a goal date" with no pace |
| `PUT /api/v1/journey/goal` with a date that is not real, or without the key (developer tools) | 400 INVALID_REQUEST; nothing changes |
| Set a goal date with a made-up session ID that has no journey | 404 NOT_FOUND |
| Start a new journey while a goal date is set | The new journey has no goal date |
| Watch the template-fallback metric over the first day | If it rises sharply after U4, the new reply checks are rejecting too much and the tolerance or the prompt needs a look |

## Environment promotion

None. One environment.

## Rollback

Redeploy the previous commit with `cdk deploy`. Stored journeys stay readable by the older code, which reads `goalDate` and `teachingStyle` as it did; it has no goal route and always makes guide journeys. No data change is needed.

## Secrets management in CI/CD

Unchanged: no secrets and no AWS keys in GitHub; gitleaks guards against an accidental commit.

## Assumptions & Open Questions

- None.
