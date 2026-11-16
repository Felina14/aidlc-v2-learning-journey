# CI Configuration — Learning Journey App

## Sources

- `ci-pipeline-questions.md` in this folder (answers Q1 to Q4: A, A with an instruction, A, A)
- Build and Test results — `build-and-test-summary.md`, `test-results.md` and `build-instructions.md` in `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/`
- The six units' `code-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/code-summary.md` and the five after it
- Each unit's `cicd-pipeline.md` under `infrastructure-design/` (shape: checks in GitHub Actions, manual deploy, no AWS keys in GitHub)
- `team.md` — `aidlc/spaces/default/memory/team.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)
- The workflow file — `.github/workflows/ci.yml` (changed in this stage)

## Pipeline definition

| Item | Choice |
|---|---|
| CI tool | GitHub Actions; one workflow named CI in `.github/workflows/ci.yml` |
| Triggers | Every push to `main` and every pull request. No schedule, no tag trigger, no release workflow |
| Permissions | `contents: read` for the whole workflow; no job asks for more |
| Credentials | None. No AWS key, role or secret is stored in or used by the workflow; the only token is the automatic `GITHUB_TOKEN` the secret scan reads |
| Deploy | Never from CI. A deploy is `cdk deploy` run by hand on the builder's machine (the Deployment Pipeline stage in the Operation phase writes that routine) |
| Branch strategy | Short-lived branches squash-merged into `main` (`team.md`) |
| Artifact repository | None. The frontend bundle is uploaded as a workflow artifact only to hand it from the frontend job to the stack check |
| Runtimes | Python 3.12 (the function's runtime; Q4 A) and Node 24 |

## Jobs

| Job | Name in GitHub | Depends on | What it runs |
|---|---|---|---|
| `secret-scan` | Secret scan (gitleaks) | none | gitleaks over the full history (`fetch-depth: 0`) |
| `python` | Python lint and tests | none | `ruff check`, `black --check`, `pytest backend/tests` with coverage (the 80% floor is `fail_under` in `pyproject.toml`), `pytest infra/tests` |
| `frontend` | Frontend lint, tests and build | none | `npm ci`, ESLint, Prettier check, `npm run coverage` (vitest with the 80% thresholds in `vitest.config.ts`; it also runs the accessibility tests: axe, contrast, keyboard, structure), `npm run build`, then uploads `frontend/dist` |
| `dependency-audit` | Dependency audit | none | New in this stage (Q3 A): see below |
| `stack-check` | Stack check (cdk synth) | `frontend` | Downloads the bundle and runs `npx --yes aws-cdk@2.1148.0 synth -q -c budget_email=ci-dummy@example.com` |

The jobs that do not depend on another run in parallel.

### Dependency audit (new)

| Step | Command | Effect |
|---|---|---|
| Packages that ship (blocking) | `pip-audit -r runtime-requirements.txt` on the one line of `backend/requirements.txt` that ships (`boto3`), then `npm audit --omit=dev --audit-level=high` in `frontend` | Fails the job. The frontend bundle has no runtime npm packages, so the npm step guards the day one is added. `pip-audit` has no severity filter, so any advisory for `boto3` fails the job; `npm audit` fails only for high or critical |
| Development packages (report only) | `pip-audit` over `backend/requirements.txt` and `infra/requirements.txt`, and `npm audit --audit-level=high` over all frontend packages, marked `continue-on-error` | Findings show in the job log and never fail the build |

`pip-audit` is installed at the exact version 2.10.1. Locally, `npm audit --omit=dev --audit-level=high` reports 0 vulnerabilities; the full-tree `npm audit` reports lower-severity advisories in development packages only. `pip-audit` was **not run here**; its first run is in GitHub Actions.

## Action pinning (Q2 A)

Every third-party action is pinned to a full commit identifier with the version as a comment. Each identifier was checked against the action's repository on 2026-11-11 with `gh api repos/OWNER/REPO/git/ref/tags/TAG`; every tag is a lightweight tag that points straight at a commit, so no tag needed resolving through a tag object. No identifier had to fall back to a version tag.

| Action | Version | Commit identifier |
|---|---|---|
| actions/checkout | v4.2.2 | 11bd71901bbe5b1630ceea73d27597364c9af683 |
| actions/setup-python | v5.6.0 | a26af69be951a213d495a4c3e4e4022e16d87065 |
| actions/setup-node | v4.4.0 | 49933ea5288caeca8642d1e84afbd3f7d6820020 |
| actions/upload-artifact | v4.6.2 | ea165f8d65b6e75b540449e92b4886f43607fa02 |
| actions/download-artifact | v4.3.0 | d3f86a106a0bac45b974a628896c90dbdf5c8093 |
| gitleaks/gitleaks-action | v2.3.9 | ff98106e4c7b2bc287b24eaf42907196329070c7 |

To update one, look up the new tag the same way, change the identifier and its comment together, and let the workflow run on a pull request first. That answers the first unit's open item "check the pinned GitHub Action versions" for identity (the versions are the ones already in use); whether newer releases exist was not checked.

## Merge gate (Q1 A): a GitHub setting for you to switch on

Branch protection is a repository setting; the workflow file cannot set it. In the repository, open Settings, then Branches, then add a branch protection rule for `main` with:

1. **Require a pull request before merging.**
2. **Require status checks to pass before merging**, and add all five checks by their names: `Secret scan (gitleaks)`, `Python lint and tests`, `Frontend lint, tests and build`, `Dependency audit` and `Stack check (cdk synth)`. A check only appears in the list after it has run once on the repository.
3. **Require branches to be up to date before merging.**
4. Leave **Do not allow bypassing the above settings** off if you want to keep the option to merge in an emergency alone as the only admin; turn it on if you want the rule to bind you too.

Until this is switched on, the checks report but do not stop a merge. This stage cannot confirm the setting is on; it is recorded as an open item. Pull requests are the intended way in, with a squash merge, as the team practices say.

## NFR11 and the Construction targets

- NFR11 ("GitHub Actions shall run the tests on every merge and shall hold no AWS keys"): met by the triggers and the credentials rows above. Build and Test recorded the CI obligation of the Testing Contract as owned by this stage; the workflow runs the selected tests on every pull request and push to `main`.
- NFR6 secret scan: the job exists and now uses a pinned action. Its result is the first real evidence for the Build and Test target T-NFR6-SECRETS, which stays `Unverified` until the workflow has run on GitHub.

## Assumptions & Open Questions

- [assumption] The new job names must match the names listed under "Merge gate" exactly when the branch protection rule is set.
- [assumption] The runtime list for the blocking Python audit is the `boto3` line only. If a runtime package is added to the function bundle, the `grep` in the job must be extended; this is noted in `quality-gates.md`.
- Open: the workflow has not run on GitHub since these changes; the first run may show a finding or a version problem (for example `pip-audit` reporting a `boto3` advisory).
- Open: branch protection is not confirmed on.
- None otherwise.
