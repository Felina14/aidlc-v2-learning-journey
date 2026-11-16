# Unit Test Instructions — u5-encouragement

## Sources

- `code-generation-plan.md` in this folder (Testing Contract: custom ordering, standard strategy, 80% line floor)
- `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/functional-design/rules.md`
- The earlier units' `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/unit-test-instructions.md` and the units after it (the runners and set-up they describe already exist)
- `team.md` — `aidlc/spaces/default/memory/team.md` (Bedrock is faked in automated tests)

## Test frameworks and setup

The runners are the earlier units': pytest with pytest-cov and moto for `backend/` and `infra/`, and vitest with jsdom for `frontend/`. No new dependency is planned. Set-up is unchanged: `pip install -r backend/requirements.txt -r infra/requirements.txt` inside the project's virtual environment, and `npm ci` inside `frontend`.

## Commands for this unit (each scoped to this unit's files only)

Test-first files, run on their own to see them fail before the code and pass after (from the `frontend` folder):

```
npx vitest run tests/nudge.test.ts tests/milestones.test.ts
```

Backend validation, store and route tests for this unit:

```
pytest backend/tests/test_store.py backend/tests/test_handler.py backend/tests/test_reply_validation.py -q --cov=backend/src/learning_journey --cov-report=term-missing
```

Page, client, controller and certificate tests for this unit (from the `frontend` folder):

```
npx vitest run tests/api.test.ts tests/state.test.ts tests/render.test.ts tests/app.test.ts tests/certificate.test.ts
```

Stack tests:

```
pytest infra/tests -q
```

## What the tests cover

| Area | Files | Approach |
|---|---|---|
| Nudge rule, fixed messages, blocked words over every nudge message (BR42.1, BR42.2, BR43.1) | `frontend/tests/nudge.test.ts` | Written first |
| Milestone maths: reached, newly reached, which one shows, lower-counts-as-shown (BR40.1, BR40.2, BR43.1) | `frontend/tests/milestones.test.ts` | Written first |
| Milestone name check, store update, save omitting the attribute, sorted load (BR44.1) | `backend/tests/test_store.py`, `test_handler.py` | After the code, with moto |
| Milestone route status codes and handler to store integration (BR44.1) | `backend/tests/test_handler.py` | After the code |
| Milestone client, quiet failures, shown set, banner flow, view and Back button (BR40.2, BR40.3, BR41.1, BR44.2) | `frontend/tests/api.test.ts`, `state.test.ts`, `app.test.ts` | After the code, with a fake `fetch` and jsdom |
| Certificate: plain-text name, never sent or stored, date, print style present (BR41.2, BR41.3) | `frontend/tests/certificate.test.ts`, `render.test.ts` | After the code |
| Nudge dismissal storage, cleanup, blocked storage, no request (BR42.3, BR42.4) | `frontend/tests/nudge.test.ts`, `state.test.ts` | After the code, with a fake storage |
| Stack change (NFR10) | `infra/tests/test_stack.py` | After the code, CDK assertions |

About 80 new tests: 5 to 8 per component, plus the handler to store integration tests. The team's tests-first areas (progress maths and the nudge rule) are the first two rows.

## Expected coverage targets

- Line coverage of at least 80% (Testing Contract floor), judged by Build and Test on the full suite. The floor is set in `pyproject.toml` and `frontend/vitest.config.ts` and is never lowered to make a run pass.
- A coverage target for this unit's own paths (the milestone and nudge rules, the milestone route and the certificate) is 90% line coverage.
- When a unit-scoped command exits non-zero only on the project-wide floor with every selected test passing, record that with the results; it is not a failed test. The floor runs are their own commands: `pytest backend/tests -q --cov=backend/src/learning_journey --cov-fail-under=80` and `npm run coverage` in `frontend`.

## Mocking and stubbing guidance

- Amazon Bedrock is always faked (`FakeModelClient`); no automated test calls Bedrock or any AWS service.
- DynamoDB is replaced by moto. The conditional ADD to a string set is checked against moto first; any branch moto does not support the way the real service does uses a stubbed client, recorded in `code-summary.md`.
- Time is injected: the browser's "today", its midnight timer and visibility events are passed in so month ends, daylight-saving changes and midnight rollover are tested without waiting.
- In the browser tests `fetch` and browser storage are replaced by fakes (including a storage that throws); the print dialog is replaced by a spy.

## Test data management

- Fixtures extend the earlier ones: journeys of 5 and 6 stages with chosen completed stages and a stored `milestonesShown` as missing, a set and an empty list.
- Dates in tests are built from an injected "today". Session IDs are generated per test. The certificate name used in tests is a made-up one and is asserted to appear in no request body, header, storage entry or log line.

## Not run in this stage

- The live milestone calls, the browser print preview and a nudge on a real goal date against the deployed stack, and `cdk deploy` itself, which need the person's AWS account and browser (the deploy smoke checks in `cicd-pipeline.md`).
