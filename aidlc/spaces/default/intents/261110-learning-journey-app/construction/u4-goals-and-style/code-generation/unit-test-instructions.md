# Unit Test Instructions — u4-goals-and-style

## Sources

- `code-generation-plan.md` in this folder (Testing Contract: custom ordering, standard strategy, 80% line floor)
- `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/functional-design/rules.md`
- The earlier units' `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/unit-test-instructions.md`, `.../u2-progress/code-generation/unit-test-instructions.md` and `.../u3-protection/code-generation/unit-test-instructions.md` (the runners and set-up they describe already exist)
- `team.md` — `aidlc/spaces/default/memory/team.md` (Bedrock is faked in automated tests)

## Test frameworks and setup

The runners are the earlier units': pytest with pytest-cov and moto for `backend/` and `infra/`, and vitest with jsdom for `frontend/`. No new dependency is planned. Set-up is unchanged: `pip install -r backend/requirements.txt -r infra/requirements.txt` inside the project's virtual environment, and `npm ci` inside `frontend`.

## Commands for this unit (each scoped to this unit's files only)

Test-first files, run on their own to see them fail before the code and pass after:

```
pytest backend/tests/test_reply_validation.py backend/tests/test_goal_validation.py -q
```

```
npx vitest run tests/goal.test.ts
```

(the second from the `frontend` folder)

Backend prompt, store, route and generator tests for this unit:

```
pytest backend/tests/test_prompt_and_client.py backend/tests/test_store.py backend/tests/test_handler.py backend/tests/test_generator.py backend/tests/test_template.py -q --cov=backend/src/learning_journey --cov-report=term-missing
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
| Style reply checks: instructor minimums, planner breakdown and tolerance, other styles unaffected (BR33.4) | `backend/tests/test_reply_validation.py` | Written first |
| Goal date validity on the server: real calendar dates, the exact form, null, missing key (BR32.1) | `backend/tests/test_goal_validation.py` | Written first |
| Goal rules in the browser: allowed dates and messages, state and days remaining, the pace maths, small-pace wording (BR30.1 to BR30.3) | `frontend/tests/goal.test.ts` | Written first |
| Style prompt and output cap (BR33.3) | `backend/tests/test_prompt_and_client.py` | After the code |
| Template unchanged for every style (BR33.5) | `backend/tests/test_template.py` | After the code |
| Create route style handling and the style in the log line (BR33.2) | `backend/tests/test_handler.py`, `test_generator.py` | After the code |
| Goal update, save without a goal date, null read as none (BR32.1, BR34.1) | `backend/tests/test_store.py` | After the code, with moto |
| Goal route (BR32.1) | `backend/tests/test_handler.py` | After the code; includes handler to store to the double |
| Style radios and hint, goal form, header goal line, planner hours, announcements, rollback and the in-flight rules (BR31, BR33.1, BR33.6, BR30.4) | `frontend/tests/api.test.ts`, `state.test.ts`, `render.test.ts`, `app.test.ts` | After the code, with a fake `fetch` and jsdom |
| Stack changes (NFR6, NFR10) | `infra/tests/test_stack.py` | After the code, CDK assertions |

About 70 new tests: 5 to 8 per component, plus the handler to store integration tests. The team's tests-first areas (journey validation and progress maths) are exactly the first three rows, so those are written first.

## Expected coverage targets

- Line coverage of at least 80% (Testing Contract floor). It is judged by Build and Test on the full suite of the assembled project, not by a single unit-scoped run. The floor is set in `pyproject.toml` and `frontend/vitest.config.ts` and is never lowered to make a run pass.
- A coverage target for this unit's own paths (the style checks, the goal rules and the goal route) is 90% line coverage, checked with the commands above.
- When a unit-scoped command exits non-zero only on the project-wide floor with every selected test passing, record that with the results; it is not a failed test. The floor runs are their own commands: `pytest backend/tests -q --cov=backend/src/learning_journey --cov-fail-under=80` and `npm run coverage` in `frontend`, each with no step after it.

## Mocking and stubbing guidance

- Amazon Bedrock is always faked (`FakeModelClient`); no automated test calls Bedrock or any AWS service. Style replies are fixtures: a good and a bad reply for each style.
- DynamoDB is replaced by moto. The conditional SET and REMOVE of one attribute are checked against moto first; any branch moto does not support the way the real service does uses a stubbed client, recorded in `code-summary.md`.
- Time is injected: the browser's "today" and its midnight timer are passed in so month ends, leap days, a daylight-saving change and midnight rollover are tested without waiting. The server's clock is injected as before.
- In the browser tests `fetch` and browser storage are replaced by fakes; the native dialog stand-in from the third unit's helpers is reused.

## Test data management

- Fixtures extend `backend/tests/fixtures/`: valid and invalid replies for each style (an instructor stage with one exercise, a planner stage whose four hours add to the wrong total, a planner stage missing one of the four, a guide reply carrying a stray `hoursByKind`), stored records with no goal date, a stored null and a real date.
- Dates in tests are built from an injected "today"; a table of edge dates is shared by the browser and server date tests: 29 February in a leap and a non-leap year, 30 February, a month end, a datetime string, a date in another format.
- Session IDs are generated per test. No real names, addresses or identifiers appear.

## Not run in this stage

- The live goal calls, the three-style smoke journeys and the first-day template-fallback watch against the deployed stack, and `cdk deploy` itself, which need the person's AWS account (the deploy smoke checks in `cicd-pipeline.md`).
