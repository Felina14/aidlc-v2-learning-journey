# Code Summary — u1-skeleton

## Sources

- `code-generation-plan.md` and `unit-test-instructions.md` in this folder
- `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md`

## Files created or modified

| Area | Paths |
|---|---|
| Backend (Python Lambda) | `backend/src/learning_journey/`: `config`, `errors`, `models`, `validation`, `template`, `prompt`, `logs`, `bedrock_client`, `usage_guard`, `store`, `generator`, `handler`; `backend/requirements.txt` |
| Backend tests | `backend/tests/`: `test_topic_validation`, `test_reply_validation`, `test_template`, `test_usage_guard`, `test_prompt_and_client`, `test_store`, `test_generator`, `test_handler`, `conftest`, `fixtures/` |
| Infrastructure (CDK, Python) | `infra/app.py`, `infra/cdk.json`, `infra/requirements.txt`, `infra/stacks/journey_stack.py`, `infra/tests/test_stack.py` |
| Frontend (plain TypeScript) | `frontend/index.html`, `styles.css`, `build.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`; `frontend/src/` (`types`, `validation`, `session`, `api`, `state`, `render`, `app`, `main`); `frontend/tests/` (6 test files and `helpers.ts`) |
| CI and config | `.github/workflows/ci.yml`, `pyproject.toml` |
| Existing file changed | `.gitignore`: one block added after the AI-DLC block for `node_modules/`, `.venv/`, `cdk.out/`, `frontend/dist/`, `coverage/`, `.coverage`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/` (the plan named this one change) |

Local only, not committed: `.venv/`, `frontend/node_modules/`, `frontend/dist/`, `.ruff_cache/`, `.coverage`.

## Key implementation decisions

- One Lambda handles `POST` and `GET /api/v1/journey`; the model sits behind a small `ModelClient` interface with a real Bedrock `converse` implementation and a scripted fake used by every test.
- Topic and reply checks were written test-first (red run: both files failed to import `learning_journey.validation`; green: 117 passed after the implementation), as the Testing Contract's custom ordering requires. Everything else was built first and tested after.
- The usage guard is the C4 interface with an always-grant stand-in, so the generator is already written against what U3 will fill.
- The generator keeps the 15-second clock and 18-second cap, retries once only with at least 5 seconds left, falls back to the fixed template, and releases a reserved slot exactly once when no journey results.
- Log lines carry the journey source, Bedrock outcome and total time, and only an 8-character session ID prefix; no typed text or model text is logged.
- All typed and AI-written text is set with `textContent`. Interactive elements carry `data-testid`.
- **Lambda concurrency:** no reserved concurrency is set on the function. This account's Lambda concurrency limit is 10 in total (checked with get-account-settings) and AWS keeps 10 unreserved, so nothing can be reserved. The account limit of 10 is the effective ceiling and matches the API burst of 10, so the API Gateway throttle is the only limiter a learner meets. A stack test asserts that no reserved concurrency is set. If the account limit is raised, reserved concurrency can be added as a stack setting.

## Test coverage summary

| Suite | Result |
|---|---|
| Backend and infrastructure (`pytest backend/tests infra/tests --cov`) | 238 passed; 99.67% line coverage (80% floor met) |
| Test-first files only | red before the code (collection errors), 117 passed after; the review fixes below were also tests-first (2 red, then green) |
| Frontend (`npx vitest run`) | 62 passed in 6 files; 99.6% line coverage |
| Lint, format, build | Ruff, Black, ESLint, Prettier and the frontend build pass |
| `cdk synth` (CDK CLI 2.1148.0, dummy `budget_email`) | produced a template (run before the review fixes; the stack was not changed by them) |

## Changes after the first review

The reviewer passed the work as ready with one Major and eight Minor findings (`reviews/review-01.md`). These were fixed:

- **R-01 (Major), topic length bypass:** `check_topic` (backend `validation.py`) and `checkTopic` (browser `validation.ts`) now also reject a cleaned topic of more than 200 code points. Tests with the joiner and combining-mark floods were written first and failed, then passed; a handler test shows a joiner-flood topic answers TOPIC_INVALID with no model call.
- **R-02, session ID pattern:** `fullmatch` replaces `match` with `$`; a trailing newline or other extra text is rejected (new test).
- **R-03, metrics:** `journey_made` is logged only after a successful save (two new tests).
- **R-04, request log on error paths:** the raised `ApiError` carries the model, last Bedrock outcome and journey source, and the request log line uses them (three new tests).
- **R-05, TLS:** recorded in the infrastructure specification as a known limit and an accepted risk.
- **R-06, BR2.4:** the wording in `rules.md` and `entities.md` now says the one JSON object may be wrapped in a single Markdown code fence.
- **R-07, store timeout:** one attempt, connect limit 1 s plus read limit 1 s, so one store call takes 2 s at most; the test checks the total and the single attempt.
- **R-08, traceability:** AC1.2.6 and BR1.6 now point at a new prompt test (every style gets the guide voice). AC2.1.2 (`styles.css`) and BR7.5 (`.github/workflows/ci.yml`) remain checked by inspection.
- **R-09, test-first evidence:** accepted as recorded. Commit the tests before the code on the next unit.

## Tests written but not executed in this stage

- The live Amazon Bedrock call and `cdk deploy`: they need the person's AWS account (covered by the deploy smoke checks in `cicd-pipeline.md`).
- The GitHub Actions workflow has not run on GitHub; only its YAML parses. Its action version tags were pinned from memory and must be checked before the first run.
- The accessibility check (axe or Lighthouse) is a placeholder step until U6.

## Deviations from the plan

- **TypeScript version:** `typescript` is 6.0.3, because the pinned `typescript-eslint` accepts only versions below 6.1; `@types/node` was added for a test helper.
- **ESLint config:** `eslint.config.js` (flat config) instead of `.eslintrc`, because ESLint 10 no longer reads `.eslintrc`.
- **Fenced replies:** `check_reply` also accepts one JSON object wrapped in a single Markdown code fence, because Nova often adds one. This widens BR2.4, whose wording now says so (`rules.md`); anything else that is not one JSON object is still invalid.
- **Minimum TLS version:** the specification asked for TLS 1.2 minimum, but CloudFront's default `*.cloudfront.net` certificate allows viewers down to TLS 1.0. TLS 1.2 needs a custom domain and certificate, so the setting was removed. HTTPS redirect, HSTS and the security headers are in place. **Accepted risk**, recorded in `infrastructure-specification.md`; revisit if a custom domain is added.
- **Extra error code:** `DAILY_LIMIT` (429) was added for when the guard refuses a slot; it cannot occur in U1 with the always-grant stand-in.
- **Helper-function log groups:** the functions CDK adds to empty the bucket and upload the site get their own 14-day, destroy-on-delete log groups and the `Project` tag.

## Open items for the person

- Update the installed CDK CLI before `cdk deploy`: the one on this machine (2.1127.0) is older than the `aws-cdk-lib` 2.275.0 pin and cannot read its output. CI uses CDK CLI 2.1148.0.
- This machine runs Node 25.2.1, which jsii does not support; CI uses Node 24.
- Check the pinned GitHub Action versions in `.github/workflows/ci.yml`.
- Pass the alert email at deploy: `cdk deploy -c budget_email=<address>`; the app refuses to synthesise without it.
