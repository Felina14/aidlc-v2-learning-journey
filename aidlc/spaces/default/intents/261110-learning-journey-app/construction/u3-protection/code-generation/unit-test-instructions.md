# Unit Test Instructions — u3-protection

## Sources

- `code-generation-plan.md` in this folder (Testing Contract: custom ordering, standard strategy, 80% line floor)
- `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/functional-design/rules.md`
- The earlier units' `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/unit-test-instructions.md` and `.../u2-progress/code-generation/unit-test-instructions.md` (the runners and set-up they describe already exist)
- `team.md` — `aidlc/spaces/default/memory/team.md` (Bedrock is faked in automated tests)

## Test frameworks and setup

The runners are the earlier units': pytest with pytest-cov and moto for `backend/` and `infra/`, and vitest with jsdom for `frontend/`. No new dependency is planned. Set-up is unchanged: `pip install -r backend/requirements.txt -r infra/requirements.txt` inside the project's virtual environment, and `npm ci` inside `frontend`.

## Commands for this unit (each scoped to this unit's files only)

Backend guard, store and route tests for this unit:

```
pytest backend/tests/test_usage_guard.py backend/tests/test_store.py backend/tests/test_generator.py backend/tests/test_handler.py -q --cov=backend/src/learning_journey --cov-report=term-missing
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
| Usage guard: reserve, refuse at 5, release, UTC day, guard store failure, concurrent reserve (BR20.1 to BR20.5) | `backend/tests/test_usage_guard.py` | After the code, with moto and a stubbed client for failures |
| Generator with the real guard (BR20.2, BR20.3, BR21.1) | `backend/tests/test_generator.py` | After the code, with the fake model |
| Journey delete (BR23.1) | `backend/tests/test_store.py` | After the code, with moto |
| Create route DAILY_LIMIT, delete route (BR21.1, BR23.1) | `backend/tests/test_handler.py` | After the code; includes handler to guard to store to the double |
| Limit message, replace flow, delete flow, dialogs (BR21.2, BR22, BR23.2, BR24) | `frontend/tests/api.test.ts`, `state.test.ts`, `render.test.ts`, `app.test.ts` | After the code, with a fake `fetch` and jsdom |
| Stack changes (NFR6, NFR10) | `infra/tests/test_stack.py` | After the code, CDK assertions |

About 55 new tests: 5 to 8 per component, plus the handler to guard to store integration tests. The team's tests-first areas (journey validation, progress maths, the nudge rule) are not touched by this unit, so none is written first.

## Expected coverage targets

- Line coverage of at least 80% (Testing Contract floor). It is judged by Build and Test on the full suite of the assembled project, not by a single unit-scoped run. The floor is set in `pyproject.toml` and `frontend/vitest.config.ts` and is never lowered to make a run pass.
- A coverage target for this unit's own paths (the guard, the delete call and the dialogs) is 90% line coverage, checked with the commands above.
- When a unit-scoped command exits non-zero only on the project-wide floor with every selected test passing, record that with the results; it is not a failed test. The floor runs are their own commands: `pytest backend/tests -q --cov=backend/src/learning_journey --cov-fail-under=80` and `npm run coverage` in `frontend`, each with no step after it.

## Mocking and stubbing guidance

- Amazon Bedrock is always faked (`FakeModelClient`); no automated test calls Bedrock or any AWS service.
- DynamoDB is replaced by moto. The conditional increment, the conditional decrement and the `if_not_exists` expressions are checked against moto first; any branch moto does not support the way the real service does (a failed condition, a timeout) uses a stubbed client, and the difference is recorded in `code-summary.md`.
- Time is injected (a clock function and a date function) so the UTC day boundary, midnight rollover and the timeouts are tested without waiting.
- Concurrency is tested by calling reserve repeatedly and from threads against the double, not by sleeping.
- In the browser tests `fetch` and browser storage are replaced by fakes; the native dialog is exercised in jsdom with its focus, Escape and busy behaviour.

## Test data management

- Fixtures extend `backend/tests/fixtures/`: sessions with counts of 0, 4 and 5, a count from the day before, a stored journey beside a count item, and a table that raises on the guard's update.
- Session IDs are generated per test. No real names, addresses or identifiers appear.

## Not run in this stage

- The live cap, delete and replace checks against the deployed table, and `cdk deploy` itself, which need the person's AWS account (the deploy smoke checks in `cicd-pipeline.md`).
