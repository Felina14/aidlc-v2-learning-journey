# Unit Test Instructions — u2-progress

## Sources

- `code-generation-plan.md` in this folder (Testing Contract: custom ordering, standard strategy, 80% line floor)
- `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/functional-design/rules.md`
- The first unit's `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/unit-test-instructions.md` (the runners and set-up it describes already exist)
- `team.md` — `aidlc/spaces/default/memory/team.md` (Bedrock is faked in automated tests)

## Test frameworks and setup

The runners are the first unit's: pytest with pytest-cov and moto for `backend/` and `infra/`, and vitest with jsdom for `frontend/`. No new dependency is planned. Set-up is unchanged: `pip install -r backend/requirements.txt -r infra/requirements.txt` inside the project's virtual environment, and `npm ci` inside `frontend`.

## Commands for this unit (each scoped to this unit's files only)

Progress rules, test-first (run on its own to see it fail before the code and pass after; from the `frontend` folder):

```
npx vitest run tests/progress.test.ts
```

Backend store and route tests for this unit:

```
pytest backend/tests/test_store.py backend/tests/test_handler.py -q --cov=backend/src/learning_journey --cov-report=term-missing
```

Page, client and controller tests for this unit (from the `frontend` folder):

```
npx vitest run tests/api.test.ts tests/state.test.ts tests/render.test.ts tests/app.test.ts
```

Stack tests:

```
pytest infra/tests -q
```

## What the tests cover

| Area | Files | Approach |
|---|---|---|
| Progress rules (BR10.1 to BR10.4) | `frontend/tests/progress.test.ts` | Written first |
| Stored shape and expiry (BR11.4, BR12.1, BR12.2) | `backend/tests/test_store.py` | After the code, with moto |
| Completion update (BR11.1, BR11.2, BR11.5) | `backend/tests/test_store.py` | After the code; a stubbed client for the failed-condition branch if the test double needs it |
| Completion route (BR11.3) | `backend/tests/test_handler.py` | After the code; includes handler to store to the double |
| Completion client and controller (BR13.1 to BR13.7) | `frontend/tests/api.test.ts`, `frontend/tests/state.test.ts` | After the code, with a fake `fetch` |
| Ladder, header, skeleton, focus, announcements | `frontend/tests/render.test.ts`, `frontend/tests/app.test.ts` | After the code, with jsdom |
| Stack changes (NFR2, NFR6, NFR10) | `infra/tests/test_stack.py` | After the code, CDK assertions |

About 60 new tests: 5 to 8 per component, plus the handler to store integration tests.

## Expected coverage targets

- Line coverage of at least 80% (Testing Contract floor). It is judged by Build and Test on the full suite of the assembled project, not by a single unit-scoped run. The floor is set in `pyproject.toml` and `frontend/vitest.config.ts` and is never lowered to make a run pass.
- A coverage target for this unit's own paths (the progress module, the completion update and the new route) is 90% line coverage, checked with the commands above.
- When a unit-scoped command exits non-zero only on the project-wide floor with every selected test passing, record that with the results; it is not a failed test. The floor runs are their own commands: `pytest backend/tests -q --cov=backend/src/learning_journey --cov-fail-under=80` and `npm run coverage` in `frontend`, each with no step after it.

## Mocking and stubbing guidance

- Amazon Bedrock is always faked (`FakeModelClient`); no automated test calls Bedrock or any AWS service.
- DynamoDB is replaced by moto. Moto's handling of set add and delete, of a conditional update, and of the old record on a failed condition is checked in the first store test; if it differs from the real service, that branch uses a stubbed client and the difference is recorded in `code-summary.md`.
- Time is injected (a clock function) so the expiry boundaries (89, 90 and 91 days) and the timeout rules are tested without waiting.
- In the browser tests `fetch` and browser storage are replaced by fakes; animation frames and focus are checked in jsdom.

## Test data management

- Fixtures extend `backend/tests/fixtures/`: journeys of 5 and 6 stages, a stored record with a number set, with no attribute, with an empty list, and with an expired expiry; stage numbers in every form the route must refuse.
- Session IDs are generated per test. No real names, addresses or identifiers appear.

## Not run in this stage

- The live completion call against the deployed table, the missing-journey 404 and the out-of-range 400 against the real database (these are in the deploy smoke checks in `cicd-pipeline.md`), and `cdk deploy` itself, all of which need the person's AWS account.
