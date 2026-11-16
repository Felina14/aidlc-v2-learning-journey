# Quality Gates — Learning Journey App

## Sources

- `ci-config.md` and `ci-pipeline-questions.md` in this folder
- `build-instructions.md`, `build-and-test-summary.md` and `test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/` (the commands Build and Test recorded)
- The Testing Contract in each unit's `code-generation-plan.md` (custom ordering, standard strategy, 80% line floor)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- `.github/workflows/ci.yml`

## Gates

Each gate below is a CI check on every pull request and every push to `main`. A gate "blocks" once branch protection is switched on (see `ci-config.md`); until then it reports but does not stop a merge.

| # | Gate | Job | Command in CI | Pass condition | Blocks merge |
|---|---|---|---|---|---|
| G1 | Secret scan | Secret scan (gitleaks) | gitleaks over full history | No secret found | Yes |
| G2 | Python lint | Python lint and tests | `ruff check backend infra` | No finding | Yes |
| G3 | Python format | Python lint and tests | `black --check backend infra` | No file would change | Yes |
| G4 | Backend tests and coverage floor | Python lint and tests | `pytest backend/tests --cov=...` | All tests pass and line coverage at least 80% (`fail_under` in `pyproject.toml`) | Yes |
| G5 | Stack tests | Python lint and tests | `pytest infra/tests` | All pass | Yes |
| G6 | Frontend lint | Frontend lint, tests and build | `npm run lint` | No finding | Yes |
| G7 | Frontend format | Frontend lint, tests and build | `npm run format:check` | All files match | Yes |
| G8 | Frontend tests, accessibility checks and coverage floor | Frontend lint, tests and build | `npm run coverage` | All tests pass (including axe over 36 states, contrast, keyboard, structure) and line coverage at least 80% (thresholds in `vitest.config.ts`) | Yes |
| G9 | Frontend build | Frontend lint, tests and build | `npm run build` | Type check passes and the bundle builds | Yes |
| G10 | Dependency audit, shipped packages | Dependency audit | `pip-audit` on `boto3`; `npm audit --omit=dev --audit-level=high` | No advisory for `boto3`; no high or critical npm advisory | Yes |
| G11 | Dependency audit, development packages | Dependency audit | `pip-audit` and `npm audit` over all packages | Report only | No |
| G12 | Stack synthesis | Stack check (cdk synth) | `cdk synth` (pinned 2.1148.0) | The template builds | Yes |

## Do the gates enforce the commands Build and Test recorded?

Build and Test ran: the frontend build, `cdk synth`, Ruff, Black, ESLint, Prettier, the Python tests (backend and stack), the frontend tests, and the two project-wide coverage floor runs.

| Build and Test command | Gate | Enforced |
|---|---|---|
| `npm run build` | G9 | Yes |
| `cdk synth` | G12 | Yes (with the pinned CLI) |
| Ruff, Black | G2, G3 | Yes |
| ESLint, Prettier | G6, G7 | Yes |
| `pytest backend/tests infra/tests` with `--cov-fail-under=80` | G4, G5 | Yes, with one difference: CI runs the backend and stack tests as two commands, and the floor applies to the backend run (the code it measures), which is the whole of `backend/src/learning_journey`. Build and Test's combined run measured the same package, so the number is the same. The floor value is also read from `pyproject.toml`, so it cannot differ between CI and local runs |
| `npm run coverage` | G8 | Yes |

Two things Build and Test deliberately did not run are not gates and stay manual: Lighthouse and the manual passes (keyboard, screen reader, browsers, zoom, print).

## Rules for changing a gate

- A gate is never loosened to make a run pass: the 80% floors, the accessibility tests and the audit thresholds change only by a decision recorded in `aidlc/spaces/default/memory/team.md`.
- A new runtime package in the function bundle must be added to the blocking audit (the `grep` for `boto3` in the `dependency-audit` job).
- A new action is pinned to a full commit identifier checked against its repository, as in `ci-config.md`.

## Assumptions & Open Questions

- [assumption] The task is to define gates; the real proof that they pass on GitHub is the first workflow run, which has not happened since these changes.
- None otherwise.
