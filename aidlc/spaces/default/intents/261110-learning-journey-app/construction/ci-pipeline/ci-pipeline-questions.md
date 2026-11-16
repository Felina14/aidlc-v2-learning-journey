# CI Pipeline — Questions

## Sources

- Build and Test results: `build-and-test-summary.md`, `test-results.md`, `cross-unit-traceability.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/`
- The six units' `code-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/code-summary.md` and the five after it
- Infrastructure design `cicd-pipeline.md` of each unit (the shape agreed in the first unit: checks in GitHub Actions, deploys by hand from the builder's machine, no AWS keys in GitHub)
- The existing workflow — `.github/workflows/ci.yml`
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs the tests on every merge; short-lived branches squash-merged into `main`; public repository; no AWS keys in GitHub)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR6, NFR9, NFR11)

A workflow already exists from the first unit and was extended by each unit after it: it runs on every push to `main` and every pull request, with four jobs (secret scan with gitleaks, Python lint and tests, frontend lint, tests and build, and `cdk synth`), holds no AWS credentials, and the deploy stays manual. This stage turns that into the pipeline definition (`ci-config.md`), writes the quality gates (`quality-gates.md`), and checks that the gates enforce the commands Build and Test recorded. Most of the usual questions are already answered by your team practices: the CI tool is GitHub Actions, the branch strategy is short-lived branches squash-merged into `main`, and there is no artifact repository (the only build output is the frontend bundle, uploaded between jobs, and the stack deploys it from your machine). These four are the places a real choice is left. Everything else is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] What should have to pass before a change is merged into `main`?

The workflow reports four checks, but nothing makes them binding: with no branch protection, a change can be merged while a check is red or still running. Branch protection is a GitHub setting on the repository (Settings, Branches), not a file in the repository, so I cannot set it for you; I can write exactly what to switch on.

A. Require all four checks to pass on a pull request before it can be merged, and require the branch to be up to date (Recommended): it makes the 80% coverage floors, the accessibility tests and the secret scan actually binding, and it costs a solo builder only a pull request per change, which the squash-merge practice already assumes.
B. Require only the tests (Python lint and tests, and frontend lint, tests and build); leave the secret scan and the stack check advisory: quicker to merge, but a leaked key or a broken stack would not stop a merge.
C. No branch protection; rely on checking the workflow by eye before merging: nothing to set up, but a red check does not stop a merge, and the "tests run on every merge" practice becomes a habit rather than a rule.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] How should the third-party actions in the workflow be pinned?

The repository is public and the workflow uses six actions (checkout, setup-python, setup-node, upload and download artifact, and gitleaks), each pinned today to a version tag such as `v4.2.2`. A tag can be moved by the action's owner after the fact; a full commit identifier cannot. This was an open item from the first unit ("check the pinned GitHub Action versions").

A. Pin each action to its full commit identifier, with the version as a comment, after checking each identifier against the action's repository (Recommended): a moved or hijacked tag cannot change what runs, which matters most for the job that sees `GITHUB_TOKEN` and the whole git history (gitleaks).
B. Keep the version tags, and check that each tag still exists and is current: simpler to read and update, but it trusts the action owners not to move a tag.
C. Pin only the gitleaks action (the one with the history and the token) to a commit identifier and keep tags for the rest: a middle path with a smaller change.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A — verify each commit identifier against the action's repository using the GitHub CLI available on this machine (gh is installed and authenticated; e.g. gh api repos/OWNER/REPO/git/ref/tags/TAG). If an identifier cannot be verified, fall back to option C for that action (tag kept) and record it as an open item rather than guessing a SHA.

---

## Q3. [Rules] Should the pipeline also check dependencies for known vulnerabilities?

The workflow checks the code and its own secrets, but not the packages it depends on: the backend and stack Python packages and the frontend's npm packages (including the development-only axe package). A dependency check reports known security advisories in those packages. NFR6 asks for least privilege and no secrets, not a dependency audit, so this is an addition rather than a requirement.

A. Add a dependency audit job (the Python audit tool and `npm audit`) that fails the build only for high or critical advisories in packages that ship (the runtime packages), and reports the rest without failing (Recommended): it catches the serious problems with no maintenance on every low-severity notice, and it keeps development-only packages from blocking a merge.
B. Add the audit as report-only, never failing the build: no risk of a surprise red check on a day nothing in the project changed, but nothing stops a serious advisory either.
C. Do not add a dependency audit: the least to maintain, and the project has a short life and tens of users; the packages are pinned and are reviewed when they are changed.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Which Python versions should the pipeline test on?

The Lambda runtime is Python 3.12 and the workflow tests on 3.12. Your own machine ran the full suite on 3.13.2 for Build and Test, and it passed. A second version in the pipeline doubles the Python test time (about a minute) for a project that runs only on 3.12 in production.

A. Test on 3.12 only, the version the function runs on (Recommended): it matches production exactly; your 3.13 runs are a local convenience, and a 3.13-only difference cannot reach the deployed function.
B. Test on 3.12 and 3.13: it would catch a difference before you upgrade the runtime, at the price of a longer run and a second set of results to read.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] CI tool: GitHub Actions, as the team practices say. Triggers: every push to `main` and every pull request, as built. No schedule, no tag trigger, no release workflow (a deploy is manual from your machine).
- [assumption] No artifact repository: the frontend bundle is uploaded as a workflow artifact only to hand it to the stack check; deployed output goes from your machine through `cdk deploy`. No versioning scheme beyond the git commit.
- [assumption] The pipeline never holds AWS credentials and never deploys; the Deployment Pipeline stage (in the Operation phase) is where a deploy routine is written for your machine.
- [assumption] Quality gates enforce exactly the commands Build and Test recorded: Ruff and Black, the Python tests and the 80% floor from `pyproject.toml`, ESLint and Prettier, the frontend tests with the 80% floor from `vitest.config.ts` (which includes the accessibility checks), the frontend build, the secret scan and `cdk synth`. The workflow currently runs the backend and stack tests as two commands rather than the single combined one; this stage will check that the floor still applies to the combined run, and write any difference down.
- [assumption] Lighthouse, the keyboard and screen-reader passes and the browser matrix stay manual and are not made part of the pipeline.
- [assumption] The Construction to Operation phase check (`verification/phase-check-construction.md`) is written by this stage from the cross-unit traceability and the unit traceability files. It will record that nine IDs are uncovered (three manual accessibility criteria and six requirements, as accepted at Build and Test) rather than call the gate fully passed.
- None otherwise.
