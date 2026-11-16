# Integration Test Instructions — Learning Journey App

## Sources

- Per-unit `unit-test-instructions.md` and `code-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/` and the five units after it
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 to C5)
- `build-instructions.md` in this folder
- `team.md` — `aidlc/spaces/default/memory/team.md` (Bedrock is faked in automated tests)

## Test framework and set-up

Standard strategy: key boundaries across units. Python: pytest with pytest-cov and moto (a DynamoDB double). Frontend: vitest with jsdom. Set-up is in `build-instructions.md`. No integration test calls Bedrock or any AWS service.

## Boundaries covered

| Boundary | Units | Where it is tested | How |
|---|---|---|---|
| Browser client to Lambda handler (create, load, stage change, goal, milestones, delete) | u1 to u5 | `frontend/tests/api.test.ts` (fake `fetch`), `backend/tests/test_handler.py` | Request and answer shapes of contract C1 are checked on both sides with the same status codes and error codes |
| Handler to store (DynamoDB) | u1 to u5 | `backend/tests/test_handler.py`, `test_store.py` | Handler runs over a moto table: one conditional `update_item` per change, expiry moved, NOT_FOUND for an absent or expired journey, sets stored without empty values |
| Handler to generator to model client | u1, u4 | `backend/tests/test_generator.py`, `test_prompt_and_client.py` | A fake model returns good, invalid, truncated and failing replies; one retry then the template; the style reaches the prompt and the reply check |
| Handler to usage guard | u3 | `backend/tests/test_usage_guard.py`, `test_handler.py` | Daily cap of 5 per session per UTC day, release on failure, fail-open when the guard fails |
| Page controller to render and app (the whole page in jsdom) | u1 to u6 | `frontend/tests/app.test.ts`, `state.test.ts`, `keyboard.test.ts` | The main flow from topic to certificate through the controller with a fake `fetch` |
| Stack to handler (routes, permissions, headers, tags) | u1 to u5 | `infra/tests/test_stack.py` | CDK assertions on routes, the role's four table actions, no reserved concurrency, front-door methods and headers, removal policies |
| Accessibility across every state | u6 | `frontend/tests/a11y.test.ts`, `structure.test.ts`, `contrast.test.ts` | axe over 36 states, structure and contrast checks |

## Commands

From the repository root (each on its own):

```
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider backend/tests infra/tests -q --cov=backend/src/learning_journey --cov-fail-under=80
```

```
npm --prefix frontend run coverage
```

## Expected results and coverage targets

- 616 Python tests and 629 frontend tests pass; line coverage is at least 80% on each side (measured 99.78% and 99.78%).
- Where a test runs matters: the frontend integration tests run in **jsdom**, a DOM emulator, not in a real browser. They are integration evidence, not browser or end-to-end evidence. Behaviour that needs a real browser (the native `dialog`, real focus movement, the print dialog, zoom, reflow) is covered only by `manual-pass-scripts.md` in the sixth unit's Code Generation folder, which the person runs.

## Test data and environment

- Fixtures extend `backend/tests/fixtures/`; session IDs are generated per test; dates and clocks are injected; the certificate name in tests is made up.
- A real end-to-end run against the deployed stack (a live Bedrock call, the cap, delete, goal, style, template fallback) is a deploy smoke check listed in each unit's `cicd-pipeline.md`; it needs the builder's AWS account and is not run here.

## Assumptions & Open Questions

- [assumption] The performance and security instruction files of the Comprehensive strategy are not generated: the strategy is Standard, and the deployed-environment checks they would hold belong to Performance Validation.
- None otherwise.
