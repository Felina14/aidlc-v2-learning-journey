# Unit Test Instructions — u1-skeleton

## Sources

- `code-generation-plan.md` in this folder (Testing Contract: custom ordering, standard strategy, 80% line floor)
- `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md`
- `team.md` — `aidlc/spaces/default/memory/team.md` (Bedrock is faked in automated tests)

## Test frameworks and setup

| Tree | Framework | Setup |
|---|---|---|
| `backend/` | pytest with pytest-cov, moto for DynamoDB | `python -m venv .venv`, then `pip install -r backend/requirements.txt` |
| `infra/` | pytest with the CDK assertions module | `pip install -r infra/requirements.txt` |
| `frontend/` | vitest with jsdom | `npm ci` inside `frontend` |

## Commands for this unit (each scoped to this unit's files only)

Backend, with coverage measured for the backend source only:

```
pytest backend/tests -q --cov=backend/src/learning_journey --cov-report=term-missing
```

Infrastructure stack:

```
pytest infra/tests -q
```

Frontend (from the `frontend` folder):

```
npx vitest run
```

Test-first files, run on their own to see them fail before the code exists and pass after:

```
pytest backend/tests/test_topic_validation.py backend/tests/test_reply_validation.py -q
```

## What the tests cover

| Area | Files | Approach |
|---|---|---|
| Topic checks (BR1.1 to BR1.3) | `test_topic_validation.py` | Written first |
| Reply checks (BR1.4, BR2.1 to BR2.4) | `test_reply_validation.py` | Written first |
| Template (BR4.1) | `test_template.py` | After the code |
| Generator flow (BR3, BR4.3) | `test_generator.py` | After the code, with `FakeModelClient` |
| Journey store (BR5) | `test_store.py` | After the code, with moto |
| Usage guard stand-in (C4) | `test_usage_guard.py` | After the code |
| Handler and error shape (C1) | `test_handler.py` | After the code; includes handler to generator to store with the fake model |
| Stack (BR7, NFR4 to NFR6) | `infra/tests/test_stack.py` | After the code, CDK assertions |
| Page logic and rendering | `frontend/tests/*.test.ts` | After the code |

About 45 tests in total: 5 to 8 per component, plus the integration tests for the handler, generator and store boundary.

## Expected coverage targets

- Line coverage of at least 80% (Testing Contract floor). It is judged by Build and Test on the full suite of the assembled project, not by a single unit-scoped run. The floor is set in `pyproject.toml` and `frontend/vitest.config.ts` and is never lowered to make a run pass.
- A coverage target for this unit's own paths (the validation module, the generator and the handler) is 90% line coverage, checked with the backend command above.
- When the backend command exits non-zero only on the project-wide floor with every selected test passing, record that with the results; it is not a failed test. The floor run is therefore its own command: `pytest backend/tests -q --cov=backend/src/learning_journey --cov-fail-under=80`, with no step after it.

## Mocking and stubbing guidance

- Amazon Bedrock is always faked: `FakeModelClient` returns scripted text, delays and errors. No automated test calls Bedrock or any AWS service.
- DynamoDB is replaced by moto in `test_store.py` and the integration tests.
- Time is injected into the generator (a clock function) so the 15-second, 18-second and 5-second rules are tested without waiting.
- In the browser tests `fetch` and browser storage are replaced by fakes; blocked storage is simulated by a storage object that throws.

## Test data management

- Fixtures live in `backend/tests/fixtures/` (one valid 5-stage reply, one valid 6-stage reply, replies with each defect named in BR2.1 to BR2.4, a refusal, a refusal that also holds stages).
- Topics with a hostile payload (`<script>alert(1)</script>`, a delimiter lookalike, a 2,000-character field) are part of the fixtures.
- No real names, addresses or session identifiers appear: session IDs are generated per test.

## Not run in this stage

- The live Bedrock call and `cdk deploy` need the person's AWS account; they are covered by the deploy smoke checks in `cicd-pipeline.md`.
