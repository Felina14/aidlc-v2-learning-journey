# Test Results — Learning Journey App

## Sources

- `build-instructions.md` and `integration-test-instructions.md` in this folder
- Each unit's `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/unit-test-instructions.md` and the five units after it
- `build-and-test-summary.md` in this folder (the Target Verification Matrix)

Run on 2026-11-11 on the builder's machine (macOS, Python 3.13.2, Node from Homebrew), from the repository root. Python was run with `PYTHONDONTWRITEBYTECODE=1` and `-p no:cacheprovider`; stray `__pycache__` folders were removed afterwards.

## Build

| Step | Command | Result |
|---|---|---|
| Frontend type check and bundle | `npm --prefix frontend run build` | Exit 0, `built dist/` |
| Stack synthesis | `npx --yes aws-cdk@2.1148.0 synth -q -c budget_email=ci-dummy@example.com` (in `infra`) | Exit 0 (the globally installed `cdk` is too old for the library, as `build-instructions.md` says) |
| Ruff | `.venv/bin/ruff check backend infra` | All checks passed |
| Black | `.venv/bin/black --check backend infra` | 29 files unchanged |
| ESLint | `npm --prefix frontend run lint` | Clean |
| Prettier | `npm --prefix frontend run format:check` | All files match |

## Project-wide coverage floor runs (the Evidence for the 80% rows)

| Run | Command | Exit | Result |
|---|---|---|---|
| Python, whole project | `pytest backend/tests infra/tests -q --cov=backend/src/learning_journey --cov-fail-under=80` | 0 | 616 passed; 99.78% line coverage (floor 80%) |
| Frontend, whole project | `npm --prefix frontend run coverage` | 0 | 629 passed; 99.78% line coverage (floor 80%) |

The Construction checkpoint of every unit also ran the combined verification command with exit 0 (the sixth at 2026-11-11T14:58).

## Per-unit commands (each distinct command run once)

Every command below exited 0 with every selected test passing.

| Command (shortened) | Units that list it | Result |
|---|---|---|
| `pytest backend/tests -q --cov` | u1 | 578 passed, 99.78% |
| `pytest infra/tests -q` | u1 to u5 | 38 passed |
| `pytest test_topic_validation.py test_reply_validation.py` | u1 | 170 passed |
| `pytest test_store.py test_handler.py --cov` | u2 | 245 passed |
| `pytest test_usage_guard.py test_store.py test_generator.py test_handler.py --cov` | u3 | 306 passed |
| `pytest test_reply_validation.py test_goal_validation.py` | u4 | 173 passed |
| `pytest test_prompt_and_client.py test_store.py test_handler.py test_generator.py test_template.py --cov` | u4 | 325 passed |
| `pytest test_store.py test_handler.py test_reply_validation.py --cov` | u5 | 379 passed |
| `npx vitest run` | u1 | 629 passed (16 files) |
| `npx vitest run tests/progress.test.ts` | u2 | 16 passed |
| `npx vitest run tests/api.test.ts state render app` | u2, u3, u4 | 279 passed |
| `npx vitest run tests/goal.test.ts` | u4 | 25 passed |
| `npx vitest run tests/nudge.test.ts tests/milestones.test.ts` | u5 | 68 passed |
| `npx vitest run tests/api state render app certificate` | u5 | 293 passed |
| `npx vitest run tests/structure.test.ts tests/a11y.test.ts` | u6 | 140 passed |
| `npx vitest run tests/contrast.test.ts tests/keyboard.test.ts` | u6 | 63 passed |

The unit-scoped `pytest --cov` runs report 89.66% to 95.22% for the whole package because they select only some test files; each passed the 80% floor on its own. The 90% target for a unit's own paths (u4, u5) is checked in the matrix.

## Totals (no double counting)

| Suite | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Python (backend 578, infra 38) | 616 | 616 | 0 | 0 |
| Frontend | 629 | 629 | 0 | 0 |

## Failure details

None. One earlier flaky test (`test_concurrent_reservations_at_the_cap_never_pass_five`, u3) failed twice during the fifth unit because moto is not thread-safe; it was fixed there and passed in every run here.

## Where browser behaviour was checked

All frontend tests run in **jsdom** (a DOM emulator under vitest), never in a real browser engine. They are integration evidence only. No real browser engine ran in this stage.

## Not run here

- Lighthouse, the keyboard-only pass, VoiceOver, the four-browser matrix, zoom and the 320-pixel window, and the print preview (the person; `manual-pass-scripts.md` in the sixth unit's Code Generation folder).
- Everything that needs the deployed stack: live Bedrock call, daily cap, delete, goal, style, template fallback, real timings, spend, `cdk destroy` check, and the CI-run secret scan (gitleaks).

## Loop-Back Log

No loop-back has run.

## Accepted failure

2026-11-11: seven targets are `Unverified` (T-NFR1-LH, T-NFR1-MAN, T-NFR2, T-NFR4, T-NFR5-LIVE, T-NFR6-SECRETS, T-NFR8) and no code fix exists. The person chose "Accept failure" at the halt-and-ask and said they are correctly deferred to the deployed stack, the manual passes and the CI run. They also assigned the `cdk destroy` check for NFR5 to Performance Validation so it has an owner. The stage proceeds to its approval gate with these targets named.

## Assumptions & Open Questions

- None.
