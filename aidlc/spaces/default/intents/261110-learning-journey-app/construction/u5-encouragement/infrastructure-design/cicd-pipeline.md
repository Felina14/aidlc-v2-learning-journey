# CI/CD Pipeline — u5-encouragement

## Sources

- The earlier units' `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md`, `.../u2-progress/infrastructure-design/cicd-pipeline.md`, `.../u3-protection/infrastructure-design/cicd-pipeline.md` and `.../u4-goals-and-style/infrastructure-design/cicd-pipeline.md` (the pipeline, the manual deploy and the rollback stay in force)
- `infrastructure-specification.md` and `monitoring-design.md` in this folder
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs tests on every merge; deploy from the builder's machine; no AWS keys in GitHub)
- `.github/workflows/ci.yml` (read only, to check the job names)

## Shape

No change to how delivery works. Checks run in GitHub Actions on every merge and hold no AWS credentials; deploys are run by hand with `cdk deploy`. U5 only adds tests to the jobs that already exist and a few smoke checks to the manual deploy.

## Build and check stages

The workflow keeps its five jobs: secret scan, Python lint and tests (which also runs the stack tests), frontend lint, tests and build, stack check (`cdk synth`), and the accessibility placeholder. U5's additions inside them:

| Job | Addition | Gate |
|---|---|---|
| Python lint and tests | Tests for the milestone update (add one name, repeat, unknown name, a missing key, NOT_FOUND for an absent or expired journey, the set returned in the fixed order, the save omitting the attribute, a load of a missing attribute, a set and an empty list), and the milestone route's status codes and body checks, with DynamoDB doubled | All pass; line coverage stays at least 80% (NFR9). The pinned test double's handling of an `ADD` to a string set and of the returned set is checked; if a branch differs from the real service it is tested with a stubbed client. |
| Python lint and tests (stack tests) | Assert the new `PUT /api/v1/journey/milestones` route, that the role's table actions are still exactly GetItem, PutItem, UpdateItem and DeleteItem with no wildcard, that the front door still allows `PUT` and forwards the session header, that the number of metric filters and alarms is unchanged, and no reserved concurrency | All pass |
| Frontend lint, tests and build | The nudge rule written first (the team's practice): the 50% boundary for 5 and 6 stages, 0 to 3 days, passed and complete journeys, with an injected "today"; then the milestone maths and the shown-set rules, the blocked-word test over every possible milestone and nudge message, the banner area, the completion view and its Back button, the certificate name never leaving page memory (no request, no storage write), the dismissal marker and its cleanup, the milestone record staying quiet on 404, 400, 500 and 429 answers (BR44.2), and the print style's presence | All pass; line coverage at least 80% |
| Stack check | `cdk synth` runs as before and must still produce a template | Template builds without errors |

The blocked-word test is part of the normal frontend tests, so a message that gains a pressure word fails the build on every merge.

## Deployment (manual, from the builder's machine)

Unchanged: pull `main`, confirm the pipeline is green, build the frontend, run `cdk deploy -c budget_email=<address>`, then the smoke checks. The deploy adds one route; nothing else.

## Smoke checks after a deploy

The earlier units' smoke checks all still apply. U5 adds (use a fresh session for each group):

| Check | Expected |
|---|---|
| Create a journey (journeys count against the daily cap of 5) and mark the first stage | A "first stage" banner appears and can be dismissed with the keyboard; reload and mark the second stage: it does not return |
| Mark stages up to the halfway point | The halfway banner appears once |
| Mark the last stage | The completion view with the certificate: the topic, today's date and "5 stages" (or 6) |
| Type a name on the certificate, then reload | The name is gone; in the developer tools no request carried it and nothing was written to local storage for it |
| Print or save the certificate | Only the certificate shows, in black and white |
| Choose "Back to my journey" and unmark the last stage | The journey at 80% (5 stages) or 83% (6 stages), no banner; marking it again shows the completion view and no new banner |
| With a goal date 2 days away and under half done | A nudge appears; dismiss it and reload: it does not return today; set a different goal date: it may show again |
| `PUT /api/v1/journey/milestones` with an unknown name (developer tools) | 400 INVALID_REQUEST; nothing changes |
| The same call with a made-up session ID that is a valid UUID (anything else gives 400) | 404 NOT_FOUND |
| Look in the table for the journey item | `milestonesShown` is a string set holding the names shown, and is absent on a journey with none |

## Environment promotion

None. One environment.

## Rollback

Redeploy the previous commit with `cdk deploy`. Stored journeys stay readable by the older code, which ignores `milestonesShown`; it has no milestone route, certificate or nudge. A rollback followed by a roll-forward leaves one limit, as in the second unit: a journey made by the older code in between has an empty list where U5 expects a set, so recording a milestone on it ends quietly as SAVE_FAILED (the banner still shows); delete the item or use a new session. No data change is needed.

## Secrets management in CI/CD

Unchanged: no secrets and no AWS keys in GitHub; gitleaks guards against an accidental commit.

## Assumptions & Open Questions

- None.
