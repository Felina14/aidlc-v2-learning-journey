# Build Instructions — Learning Journey App

## Sources

- Per-unit `code-summary.md` and `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/` and the five units after it (u2-progress, u3-protection, u4-goals-and-style, u5-encouragement, u6-accessibility-pass)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR9, NFR11)
- `team.md` — `aidlc/spaces/default/memory/team.md` (Python and TypeScript, Black, Ruff, Prettier, ESLint; no AWS keys in GitHub)
- The built project: `pyproject.toml`, `backend/`, `frontend/`, `infra/`, `.github/workflows/ci.yml`

## Prerequisites

| Tool | Used for | Notes |
|---|---|---|
| Python 3.13 and a virtual environment at `.venv` | backend, stack and tests | The project runs on 3.13.2; the Lambda runtime is Python 3.12 |
| Node.js and npm | frontend build and tests | `npm ci` installs the exact versions in `frontend/package-lock.json` (includes `axe-core` 4.14.0, development only) |
| AWS CDK command line 2.1148.0 or newer | `cdk synth` and `cdk deploy` | The globally installed `cdk` may be older and refuse the stack with "Cloud assembly schema version mismatch"; run `npx --yes aws-cdk@2.1148.0 ...` as the CI workflow does |

## Dependency installation

From the repository root:

```
python3 -m venv .venv
```

```
.venv/bin/pip install -r backend/requirements.txt -r infra/requirements.txt
```

```
npm --prefix frontend ci
```

## Environment setup

- No environment variable is needed to build or test. Bedrock and DynamoDB are replaced by a fake model client and moto in every automated test, so no AWS credentials are used.
- Set `PYTHONDONTWRITEBYTECODE=1` when running Python so no `__pycache__` folder appears under the project folders (the Construction checkpoint rejects them).
- Deploying needs the builder's own AWS credentials and `-c budget_email=<address>`; that is not part of Build and Test.

## Build commands

| Part | Command (from the repository root) |
|---|---|
| Frontend type check and bundle | `npm --prefix frontend run build` (runs `tsc --noEmit` and `node build.mjs`, writes `frontend/dist/`) |
| Backend | No compile step; the Python package is imported by the tests and bundled by the stack at deploy time |
| Stack | `cd infra` then `npx --yes aws-cdk@2.1148.0 synth -q -c budget_email=ci-dummy@example.com` (writes `infra/cdk.out/`, which is not committed) |

## Build verification

- `npm --prefix frontend run build` exits 0 and prints `built dist/`; `frontend/dist/` holds the page and no `axe-core` code.
- `cdk synth` exits 0.
- Lint and format: `.venv/bin/ruff check backend infra`, `.venv/bin/black --check backend infra`, `npm --prefix frontend run lint`, `npm --prefix frontend run format:check` all pass.
- The full verification command (the one the Construction checkpoints use) exits 0:

```
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider backend/tests infra/tests -q --cov=backend/src/learning_journey --cov-fail-under=80 && npm --prefix frontend run coverage && npm --prefix frontend run build
```

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Cloud assembly schema version mismatch` from `cdk synth` | The installed CDK command line is older than the library; use `npx --yes aws-cdk@2.1148.0` |
| A checkpoint or sensor complains about `__pycache__` | Run Python with `PYTHONDONTWRITEBYTECODE=1`, and clear stray folders with `find infra backend -name __pycache__ -type d -prune -exec rm -r {} +` |
| `test_concurrent_reservations_at_the_cap_never_pass_five` fails | Fixed in the fifth unit: the test now serialises the moto table's `update_item` with a lock, because moto is not thread-safe while real DynamoDB is atomic |
| Jsdom has no `showModal()` | The tests stub it; the dialog focus trap is checked in the manual pass |
| `.coverage` file appears | It is written by pytest-cov; it is not source and is ignored |

## Assumptions & Open Questions

- [assumption] The Python version in CI is the one in `.github/workflows/ci.yml`; Build and Test ran on the builder's machine (Python 3.13.2).
- None otherwise.
