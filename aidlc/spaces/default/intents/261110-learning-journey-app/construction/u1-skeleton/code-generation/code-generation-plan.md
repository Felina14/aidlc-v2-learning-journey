# Code Generation Plan — u1-skeleton

## Summary

- Builds: the first end-to-end slice: a Python CDK stack, one Lambda that makes, checks, saves and loads a journey (Bedrock Nova Lite with a template fallback), and a plain TypeScript page that shows it.
- Touches: new folders `infra/`, `backend/`, `frontend/`, and `.github/workflows/ci.yml`, plus root config files (`pyproject.toml`); no existing project file is changed.
- Tests: about 45 automated tests (Python backend and CDK assertions, TypeScript page logic) with Bedrock faked, an 80% line-coverage floor, and the reply and topic checks written test-first.

## Sources

- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 to C5)
- `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/`
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U1)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1 to NFR11)
- Team memory: `aidlc/spaces/default/memory/team.md` and `project.md`

## Testing Contract

```json
{
  "version": 1,
  "methodology": "custom",
  "source": "team",
  "ordering": "We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: custom\n- **Ordering**: We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.\n- **Methodology evidence**: Affirmed in the interview (Q3): tests-first where the logic is pure and rule-heavy, tests-after elsewhere, which suits a solo build with an exploratory Bedrock prompt.\n- Coverage: 80% line-coverage floor for the feature scope, enforced in Build and Test; the existing suite stays green before merge.\n- Accessibility (WCAG 2.1 AA) is checked with automated tooling (axe or Lighthouse) plus a manual keyboard and screen-reader pass.\n- Bedrock is faked in automated tests so the suite is free and repeatable."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "custom",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Custom ordering - We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.",
      "Implementation and tests - preserve that exact ordering; do not convert it to layer-local TDD.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:83508bf7797609930ed065fdf8a24dca0473593b35c2e4130607f2a1200ed869",
  "contract_sha256": "sha256:e4d1d27cd9cc03b072521ce1cf273d75ff5e6869657632a873678b786f1f434c"
}
```

How the ordering applies here: the topic checks (BR1.1, BR1.2) and the model-reply checks (BR2.1 to BR2.4, BR3.4) are the pure, rule-heavy journey validation, so for them the tests are written first and seen failing before the code (steps 4 and 5). The progress maths and the nudge rule do not exist in U1. Everything else (store, usage-guard stand-in, generator flow, handler, stack, page) is written first and tested after.

## Layout

```
infra/            CDK app and stack (Python), CDK assertion tests
backend/          Lambda code (Python): src/learning_journey/, tests/
frontend/         Page (plain HTML, CSS, TypeScript): src/, tests/, dist/ (build output, not committed)
.github/workflows/ci.yml
pyproject.toml    Ruff, Black, pytest and coverage settings (workspace root)
```

## Steps

- [x] **Step 1 — Project structure and configuration skeleton.** Create the folders above, `pyproject.toml` (Ruff, Black, pytest, coverage with the 80% line floor), `infra/cdk.json`, `infra/requirements.txt` and `backend/requirements.txt` with pinned versions, `frontend/package.json` (TypeScript, vitest, ESLint, Prettier, jsdom; pinned versions), `frontend/tsconfig.json`, `.eslintrc`/`.prettierrc`, and a `.gitignore` addition for `node_modules`, `.venv`, `cdk.out`, `frontend/dist` and `coverage` (the existing `.gitignore` is the person's; the one added block is named in the code summary). Stories: US9.3 (NFR11).
- [x] **Step 2 — Test runner bootstrap.** Install the runners and record the exact unit-scoped commands in `unit-test-instructions.md`: `pytest backend/tests -q` with coverage for `backend/src`, `pytest infra/tests -q`, and `npx vitest run` in `frontend`. Prove each runs with one trivial real test per tree that is replaced by the real tests below (no `assert True`). Stories: NFR9.
- [x] **Step 3 — Shared types and constants.** `backend/src/learning_journey/models.py` (Journey, Stage, Materials, ModelReply as typed structures per `entities.md`), `errors.py` (stable error codes TOPIC_INVALID, INVALID_REQUEST, TOPIC_NOT_ALLOWED, RATE_LIMITED, NOT_FOUND, SAVE_FAILED, LOAD_FAILED and the C1 error shape), `config.py` (environment settings: `TABLE_NAME`, `MODEL_ID`, `BEDROCK_TIMEOUT` default 12, the 15 s clock, 18 s cap, 2 s save, 5 s retry minimum). Rules: BR3.1, BR4.3, C1 error shape.
- [x] **Step 4 — Tests first: topic checks (red).** `backend/tests/test_topic_validation.py` covering BR1.1 and BR1.2: trim, control-character removal, 2 and 100 visible characters pass, 1 and 101 fail, emoji and accented letters count as one, `!!!!` and `?? ??` fail, a non-Latin topic with a letter passes, delimiter text removed (BR1.3). Run it and keep the failing output. Rules: BR1.1, BR1.2, BR1.3.
- [x] **Step 5 — Tests first: reply checks (red).** `backend/tests/test_reply_validation.py` covering BR1.4 (refusal recognised first, even when stages are also present), BR2.1 (5 or 6 stages, numbering without gaps, required fields), BR2.2 (list sizes 1 to 5, exactly one mini project, hours above 0 and at most 20, hours a number), BR2.3 (2,000-character cap), BR2.4 (not one JSON object, wrong types, model error or throttle). Run it and keep the failing output. Rules: BR1.4, BR2.1 to BR2.4.
- [x] **Step 6 — Implementation: topic and reply checks (green).** `validation.py` with `clean_topic`, `check_topic`, `strip_delimiter`, and `check_reply` returning a refusal, a valid list of stages, or an invalid result. Make steps 4 and 5 pass with the smallest code, then refactor while green.
- [x] **Step 7 — Template and prompt.** `template.py` builds the fixed 5-stage template (titles Foundations; Core ideas; Hands-on practice; A real project; Mastery and next steps; hours 2, 3, 3, 4, 4) with the topic inserted as plain text, identical for every style, passing the same reply check; `prompt.py` builds the model request with the topic between fixed delimiters, English output, and the refusal marker instruction (`refused` true with a short reason for a non-professional or unsafe topic). Rules: BR3.3, BR4.1, BR1.3.
- [x] **Step 8 — Model interface, real and fake.** `bedrock_client.py` defines a small `ModelClient` interface (one `invoke(prompt, timeout)` call returning text), a real implementation using the Bedrock runtime `converse` call with `MODEL_ID` and the 12-second per-call timeout, and a `FakeModelClient` with scripted replies, delays and failures for tests. Logging of each attempt with its model identifier and outcome (ok, refused, invalid, error, throttled) per BR4.3. Contract: C3.
- [x] **Step 9 — Usage guard stand-in.** `usage_guard.py` with the C4 interface (`reserve`, `release`) and a `NoLimitGuard` that always grants, so the generator is built against the interface U3 will fill (functional-spec step 5). Contract: C4.
- [x] **Step 10 — Journey store.** `store.py` with `JourneyStore` over the DynamoDB table (partition key `sessionId`, sort key `sk` = `JOURNEY`): `save` (replace, `expiresAt` 90 days after `lastActivityAt`, empty `completedStages`, `goalDate` none, `milestonesShown` empty), `load` (treats an expired record as gone), 2-second save timeout, and the C5 interface. Only the session ID, never any personal data, is stored. Rules: BR5.1, BR5.2. Contract: C2, C5.
- [x] **Step 11 — Journey generator.** `generator.py`: start the 15 s clock and 18 s cap, reserve a slot, build the request, call the model, classify the reply, retry once only if at least 5 s remain, fall back to the template, log the source (`ai` or `template`), save, release the slot once on refusal, save failure or unexpected error, and keep it on success; refusal ends as TOPIC_NOT_ALLOWED with no retry, template or save. Rules: BR1.4, BR3.1 to BR3.5, BR4.1, BR4.3, BR5.1; functional-spec Workflow 1 steps 5 to 14.
- [x] **Step 12 — Request handler.** `handler.py`: route `POST /api/v1/journey` and `GET /api/v1/journey`; check the `X-Session-Id` header (random UUID format, BR5.3) and the body; map outcomes to 201, 400, 404, 422, 500 with the C1 error shape; structured JSON log lines (request id, route, outcome, total time in milliseconds, model identifier, Bedrock outcome, journey source; never the full session ID or the model's text); return text as plain JSON strings. Rules: BR5.3, BR7.1 (429 comes from the API throttle), NFR10. Contract: C1.
- [x] **Step 13 — Backend tests (after the code).** `test_template.py`, `test_generator.py` (AI success, one retry, retry skipped under 5 s, invalid twice, 15 s timeout, Bedrock down, refusal, slot released once on refusal and on save failure), `test_store.py` (save, replace, load, expiry on read, save timeout, using a DynamoDB fake such as moto), `test_handler.py` (status codes, headers, error shape, log line contents with no full session ID), `test_usage_guard.py` (stand-in always grants). All use `FakeModelClient`; no test calls Bedrock. Standard strategy: 5 to 8 tests per component plus integration tests of handler to generator to store with the fake model.
- [x] **Step 14 — Frontend: session, API client and page logic.** `frontend/src/session.ts` (random UUID, kept in browser storage, clear message when storage is blocked: BR6.4), `validation.ts` (the same BR1.1 and BR1.2 checks in the browser), `api.ts` (create and load calls with the `X-Session-Id` header, 20 s browser wait, RATE_LIMITED and bare-429 handling, GET before a retry: functional-spec Workflow 1 steps 16 to 18), `state.ts` (the create-request state machine from the functional spec). Rules: BR1.1, BR1.2, BR5.3, BR6.x, BR7.1.
- [x] **Step 15 — Frontend: pages and markup.** `index.html`, `styles.css`, `render.ts`: home screen with topic field and "Generate my journey" button, polite live-region announcements, the 5-second reassurance message, the AI or template label (BR4.2), the stage list with one open at a time and the stage detail (BR6.2), no mark, goal, style, replace or delete controls (BR6.3), the "try a different topic" message, the "please wait" message, the failure message with "Try again", and the storage-blocked message. All typed and AI-written text is set with `textContent`, never as markup (BR1.5). Interactive elements carry `data-testid`. Targets are at least 44 by 44 pixels, status is never colour alone, and the layout works from 320 pixels wide (NFR1, NFR8).
- [x] **Step 16 — Frontend tests (after the code).** `frontend/tests/` with vitest and jsdom: validation, session (including blocked storage), api client (fake `fetch`: 201, 400, 422, 429 with and without a code, 500, timeout), state machine transitions, render (label for each source, text shown as text for `<script>` input, no extra controls in U1). 5 to 8 tests per module.
- [x] **Step 17 — CDK stack.** `infra/app.py` and `infra/stacks/journey_stack.py` per `infrastructure-specification.md`: private S3 bucket with origin access control and auto-delete; CloudFront with HTTPS redirect, response headers policy (content security policy, `X-Content-Type-Options`, `Referrer-Policy`), `/api/*` behaviour to the HTTP API (no caching, forwards `X-Session-Id`, origin response timeout 30 s); HTTP API with stage throttle rate 5 and burst 10; one Python 3.12 arm64 Lambda (512 MB, 25 s) with `TABLE_NAME`, `MODEL_ID` (default `amazon.nova-lite-v1:0`) and `BEDROCK_TIMEOUT` 12; **no reserved concurrency on the function** (this account's Lambda concurrency limit is 10 in total, checked with get-account-settings, and AWS keeps 10 unreserved, so nothing can be reserved); the account limit of 10 is the effective ceiling, which matches the API burst of 10, so the API Gateway throttle is the only limiter a learner meets and the function is left unreserved; one on-demand DynamoDB table with `expiresAt` expiry; one least-privilege role (this table, the one model and its inference profile, its own logs); explicit log groups with 14-day retention and `RemovalPolicy.DESTROY`; a deployment of `frontend/dist` followed by a CloudFront cache clear for the site files; Budgets alerts (2 dollars a day, 8 dollars a month) and the alarm email from the `budget_email` context value (never committed); alarms for Lambda errors, API 5xx and template fallbacks with missing data treated as not breaching; log metric filters; the `learning-journey` dashboard; a `Project` tag on every resource. Rules: BR7.1 to BR7.5; NFR2 to NFR7, NFR10.
- [x] **Step 18 — CDK tests (after the code).** `infra/tests/test_stack.py` using CDK assertions: throttle rate 5 and burst 10, no reserved concurrency set on the function (account limit of 10 is the ceiling), table billing and expiry, bucket private with auto-delete, `DESTROY` on table, bucket and every log group, HTTPS redirect, role has no wildcard Bedrock action, budget thresholds, alarm set, tag on resources. 5 to 8 tests.
- [x] **Step 19 — Continuous integration.** `.github/workflows/ci.yml` per `cicd-pipeline.md`: gitleaks, Ruff and Black, ESLint and Prettier, Python tests with coverage floor 80%, frontend tests with coverage floor 80%, frontend build to `frontend/dist`, `cdk synth` with a dummy `budget_email`, and the accessibility step as a placeholder until U6. No AWS keys, no deploy step. Rules: NFR9, NFR11, NFR6.
- [x] **Step 20 — Documentation, run notes and traceability.** `README` sections are not added to any existing person's file; run notes go in `code-summary.md`. Inline docstrings on public functions; `unit-test-instructions.md` kept current; `source-manifest.json`; `traceability.json` from the sensor with each AC, NFR and BR row set to its implementation or test file. Record in `code-summary.md` any test not run here and why (for example the live Bedrock check and `cdk deploy`, which need the person's AWS account).

## Story and rule traceability

| Plan step | Stories | Rules and requirements |
|---|---|---|
| 4, 6 | US1.1, US1.3 | BR1.1, BR1.2, BR1.3 |
| 5, 6 | US1.4, US1.5 | BR1.4, BR2.1 to BR2.4 |
| 7, 8, 11 | US1.3, US1.4, US1.5 | BR3.1 to BR3.5, BR4.1, BR4.3, NFR3, NFR7 |
| 9 | US9.2 (stand-in) | BR3.5, contract C4 |
| 10, 12 | US2.1 | BR5.1 to BR5.3, contract C1, C2, C5 |
| 14, 15, 16 | US1.1, US2.1, US2.3 | BR1.5, BR4.2, BR6.1 to BR6.4, BR7.1, NFR1, NFR8 |
| 17, 18 | US9.1, US9.2 (throttle), US9.3 | BR7.1 to BR7.5, NFR2, NFR4 to NFR6, NFR10, NFR11 |
| 19 | US9.3 | NFR6, NFR9, NFR11 |

## Assumptions & Open Questions

- [assumption] Plain TypeScript is compiled with `tsc` and bundled with a minimal tool (esbuild) into `frontend/dist`; no UI framework is used (decided in Refined Mockups, Q1).
- [assumption] The DynamoDB tests use a local fake of the service (moto); no test touches AWS.
- [fact] This account's Lambda concurrency limit is 10 in total (checked with get-account-settings), and AWS keeps 10 unreserved, so the function is left unreserved. The account limit of 10 is the effective ceiling and matches the API burst of 10. This is recorded in `infrastructure-specification.md` and, when the code is written, in `code-summary.md`. If the account limit is raised later, reserved concurrency can be added as a stack setting.
- None otherwise.
