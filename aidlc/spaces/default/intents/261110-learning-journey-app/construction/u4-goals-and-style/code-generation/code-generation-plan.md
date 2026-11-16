# Code Generation Plan — u4-goals-and-style

## Summary

- Builds: the teaching style choice (three styles, none preselected, with style-aware prompts and reply checks) and the goal date (a new `PUT /api/v1/journey/goal`, the goal form, the header goal line with days left, and the weekly pace).
- Touches: `backend/src/learning_journey/` (validation, prompt, models, bedrock client settings, generator, store, handler, config), `backend/tests/`, `frontend/src/` and `frontend/tests/` (a new `goal.ts` and its tests, plus api, state, render, app, types), `frontend/index.html` and `styles.css`, `infra/stacks/journey_stack.py` and `infra/tests/`; no new folder and no existing project file of yours is changed.
- Tests: about 70 new automated tests; the style reply checks, the server goal-date check and the goal and pace maths are written first; Bedrock faked, DynamoDB doubled, the 80% line-coverage floor kept.

## Sources

- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/functional-design/` (rules BR30 to BR34)
- `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/infrastructure-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 goal call and the optional `style`, C2, C3, C5)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (the header, GoalDateField, the style radios, messages, focus)
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U4)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- The earlier units' built code (`backend/`, `frontend/`, `infra/`), which U4 extends
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

How the ordering applies here: the team writes tests first for journey validation and progress maths. In U4 that covers (1) the style-specific reply checks (BR33.4), which are journey validation; (2) the server's goal-date check (BR32.1, part of the request validation); and (3) the goal rules in the browser (BR30.1 to BR30.3: allowed dates, state and days remaining, the weekly pace), which are progress maths. Those tests are written first and seen failing before the code (steps 2 to 4). Everything else (prompt, store, routes, page, stack) is written first and tested after. The nudge rule does not exist in U4. The test runners already exist, so no runner bootstrap is needed; the exact commands are in `unit-test-instructions.md`.

## Layout

All work is inside folders the earlier units created. New files: `frontend/src/goal.ts`, `frontend/tests/goal.test.ts`, `backend/tests/test_goal_validation.py`. Everything else is an edit of an existing file.

```
backend/src/learning_journey/   validation.py, prompt.py, models.py, bedrock_client.py, config.py, generator.py, store.py, handler.py, logs.py (edited)
backend/tests/                  test_reply_validation.py, test_goal_validation.py (new), test_prompt_and_client.py, test_template.py, test_generator.py, test_store.py, test_handler.py (edited)
frontend/src/                   goal.ts (new); api.ts, state.ts, render.ts, app.ts, types.ts (edited)
frontend/                       index.html, styles.css (edited)
frontend/tests/                 goal.test.ts (new); api, state, render, app tests (extended)
infra/stacks/journey_stack.py   route, two metric filters, dashboard line (edited)
infra/tests/test_stack.py       extended
```

## Steps

- [x] **Step 1 — Baseline check.** Confirm the earlier units' commands run from a clean tree (`pytest backend/tests infra/tests -q`, and `npx vitest run` in `frontend`) before any change, and record the starting numbers in `code-summary.md`. Stories: NFR9.
- [x] **Step 2 — Tests first: style reply checks (red).** Extend `backend/tests/test_reply_validation.py` for BR33.4: an instructor reply is invalid when any stage has fewer than 2 exercises or fewer than 1 quiz item, and valid at exactly 2 and 1; a planner reply is invalid when any stage lacks `hoursByKind`, lacks one of the four numbers, has a negative number, or the four do not add up to the stage hours within 0.1 (valid at a difference of exactly 0.1 and invalid at 0.11); a guide reply is not held to either rule and a stray `hoursByKind` on a guide or instructor reply is accepted and dropped; every earlier reply rule still applies to all styles. Run it and keep the failing output. Rules: BR33.4.
- [x] **Step 3 — Tests first: server goal-date check (red).** New `backend/tests/test_goal_validation.py` for the BR32.1 check: null is valid; `2026-11-10` and a leap day `2028-02-29` are valid; `2027-02-29`, `2026-02-30`, `26-11-10`, `2026-11-10T00:00:00Z`, `10/11/2026`, an empty string, a number and a missing key are invalid; extra body keys are ignored. Run it and keep the failing output. Rules: BR32.1.
- [x] **Step 4 — Tests first: goal and pace maths (red).** New `frontend/tests/goal.test.ts` for BR30.1 to BR30.3 with an injected "today": allowed from today to today plus 365 and refused for yesterday and today plus 366 (including across a leap day and a month end); the two messages (range, and the format YYYY-MM-DD for text that is not a date); state none, upcoming, due today and passed with days remaining counted in calendar days across a daylight-saving change; the pace (16 hours, nothing done, 28 days gives 4; two 4-hour stages done gives 2; 2 days left gives one week; 1 day left; due today, passed, all done and no goal give no pace; a pace under 0.1 reads "less than 0.1 hours per week"; the hours-writing rule is reused). Run it and keep the failing output. Rules: BR30.1 to BR30.3.
- [x] **Step 5 — Implementation: the first-tested rules (green).** Backend `validation.py`: the style checks of BR33.4 and a `check_goal_date` for BR32.1; `models.py`: the optional `hoursByKind` on a stage, kept only for planner AI journeys and dropped otherwise. Frontend `frontend/src/goal.ts`: pure functions for the allowed-date check and messages, the goal state and days remaining, and the pace, with no DOM or network use. Make steps 2 to 4 pass with the smallest code, then refactor while green. Rules: BR30.1 to BR30.3, BR32.1, BR33.4.
- [x] **Step 6 — Backend: prompt, model call, generator.** Edit `prompt.py` so the style changes only tone and emphasis (guide: encouraging and analogy-led; instructor: at least 2 exercises and at least 1 quiz in every stage; planner: hours for reading, exercises, mini project and quiz in every stage); edit `config.py` and `bedrock_client.py` so the output cap is 4096 tokens for the guide and the model's documented maximum for the instructor and planner (check the figure when building) and a reply cut off by the cap is treated as invalid; edit `generator.py` to pass the style to the prompt and the reply check, and `logs.py` and the generator's journey line and the request line to carry the chosen style (one of the three fixed words) and never typed text; the template stays the same for every style with no `hoursByKind`. Rules: BR33.3, BR33.4, BR33.5.
- [x] **Step 7 — Backend: store and routes.** Edit `store.py`: `save` omits `goalDate` instead of writing a stored null and keeps recording the style; `load` reads a missing, null or text `goalDate` and the optional `hoursByKind`; add `set_goal_date(session_id, goal_date_or_none)` as one conditional `update_item` (SET the date, or REMOVE the attribute for none; `lastActivityAt` and `expiresAt` moved in the same update; condition: the record exists and `expiresAt` is greater than now in whole epoch seconds; NOT_FOUND on a failed condition; SAVE_FAILED on another store error or over the 2-second limit); expose the C5 name `setGoalDate`. Edit `handler.py`: add `PUT /api/v1/journey/goal` (session ID check, body check by `check_goal_date`, answer 200 `{"goalDate": ...}` or the C1 error shape), and make the create route read the optional `style` (absent means guide, anything else outside the three is INVALID_REQUEST before any slot or model call). Rules: BR32.1, BR33.2, BR34.1.
- [x] **Step 8 — Backend tests (after the code).** Extend `test_prompt_and_client.py` (each style's prompt text, the same stages and fields for every style, the topic still only as delimited data, the output caps), `test_template.py` (identical for every style, no `hoursByKind`), `test_generator.py` (the style reaches the prompt and the check; a cut-off reply is invalid and retried; the style appears in the journey log line and no typed text does), `test_store.py` (save omits the goal date and records the style; a stored null and a missing attribute both read as none; set, change, clear, repeat and clear-when-absent are successes; NOT_FOUND for an absent or expired journey with nothing created; the update moves `lastActivityAt` and `expiresAt`; a replacement journey has no goal date; a stubbed failure is SAVE_FAILED) and `test_handler.py` (the goal route's status codes and body checks; the create route's style handling, with no model call and no slot for a bad style; the request line carries the style). Standard strategy: 5 to 8 tests per component plus the handler to store integration with the fake model. Update any earlier test that expected a stored null goal date.
- [x] **Step 9 — Frontend: client and controller.** Edit `api.ts` and `types.ts`: the create call sends the chosen style; add `setGoalDate` (header, 10-second wait, one automatic retry on a network failure, result kinds: saved, not-found, invalid, failed, rate-limited). Edit `state.ts`: the style choice that starts empty every time the topic screen opens (also through "Start a new journey"); the goal change flow (optimistic change, the answer as the truth, rollback with the right message for failure, journey gone, invalid request and throttle, one goal change at a time, "Start a new journey" and "Delete my journey" ignored while a goal change is saving and Save and Clear ignored while a delete runs, a late answer for a journey no longer on the page dropped, the "Goal date saved" announcement only after the answer); a timer for the next local midnight and a refresh when the tab becomes visible again so the goal state stays right. Rules: BR31.1 to BR31.3, BR33.1.
- [x] **Step 10 — Frontend: page.** Edit `render.ts`, `app.ts`, `index.html` and `styles.css`: three native style radios in a labelled group with nothing selected and the disabled button's visible hint; the header showing the style's name, the goal line (the date and "N days left", "Due today" or "Goal date passed — choose a new date", or the "Set a goal date" button) and the pace, inside the "Details" disclosure under 768 pixels; the goal form with the visible label "Goal date", a native date field limited from today to 365 days ahead, the hint "Use the format YYYY-MM-DD" when the browser shows a text field, Save, Clear and Escape; the inline errors and messages for the failure paths; for a planner AI journey the four hours beside each stage's total (the total only otherwise, including for a template); the polite announcements; focus returning to the opener. All text with `textContent`; targets at least 44 by 44 pixels; no colour-only status; works from 320 pixels wide. Rules: BR30.4, BR31.1, BR33.1, BR33.6.
- [x] **Step 11 — Frontend tests (after the code).** Extend the client, controller, render and app tests with vitest and jsdom: the create call carries the style and the button's hint and enabled state; the radios start empty on every opening; the goal client (200, 400, 404, 500, 429 with and without a code, timeout, one retry); the controller (set, change, clear, a failed save puts the old value back, journey gone, invalid request, throttle, one change at a time, the in-flight rules against replace and delete, a late answer dropped, the announcement only after the answer); the header and form render (each goal state, the pace shown and hidden, the Details disclosure, the planner hours display and the template without it, the style name); the midnight refresh. 5 to 8 tests per module.
- [x] **Step 12 — CDK stack.** Edit `infra/stacks/journey_stack.py` per the infrastructure specification: add the route `PUT /api/v1/journey/goal` to the existing integration; add the metric filters `GoalChangeFailed` (event `request`, route exactly `PUT /api/v1/journey/goal`, outcome `SAVE_FAILED`, default value 0) and `GoalChangeTimeMs` (the same route, metric value from `total_ms`, no default value) in the existing namespace, and a dashboard line. No change to permissions, no reserved concurrency, no new resource. Rules: NFR2, NFR10.
- [x] **Step 13 — CDK tests (after the code).** Extend `infra/tests/test_stack.py`: the new route and method; the role's table actions still exactly GetItem, PutItem, UpdateItem and DeleteItem on the table ARN with no wildcard; the front door still allows `PUT` and forwards the session header; the two metric filters with their patterns, `GoalChangeFailed` with default 0 and `GoalChangeTimeMs` with none; no reserved concurrency; the earlier assertions unchanged except the filter count. 5 to 8 tests.
- [x] **Step 14 — Pipeline, documentation and traceability.** No workflow change is planned: confirm `.github/workflows/ci.yml` still runs the new tests in its Python and frontend jobs and that `cdk synth` still builds. Run the lint, format, coverage and build commands and keep the 80% floors. Inline docstrings on new public functions; `unit-test-instructions.md` kept current; `source-manifest.json`; `traceability.json` from the sensor with each AC and BR row set to its test or implementation file. Record in `code-summary.md` any test not run here and why (the live goal calls and the three-style smoke journeys need the person's AWS account), the output-cap figure used, what moto did or did not support, and the starting and ending test numbers.

## Story and rule traceability

| Plan step | Stories | Rules and requirements |
|---|---|---|
| 2, 5 | US1.2 | BR33.4 |
| 3, 5, 7, 8 | US4.1 | BR32.1 |
| 4, 5, 9, 10, 11 | US4.1, US4.2 | BR30.1 to BR30.4, BR31.1 to BR31.3 |
| 6, 7, 8 | US1.2 | BR33.2, BR33.3, BR33.5, BR34.1 |
| 9, 10, 11 | US1.2 | BR33.1, BR33.6 |
| 12, 13 | US4.1 | NFR2, NFR10, NFR11 |
| 14 | all | NFR9 |

## Assumptions & Open Questions

- [assumption] The goal and pace rules live in one browser module, `frontend/src/goal.ts`, with no network or page code, so they are written and tested first as the team practices require. The server's date check lives in `validation.py` for the same reason.
- [assumption] The model's documented maximum output size is checked when the output cap is changed; if it is lower than the current 4096 for any reason, the cap is left at 4096 and the point is recorded in `code-summary.md`.
- [assumption] The pinned DynamoDB test double (moto) supports a conditional SET and REMOVE of one attribute; if it does not, that branch is tested with a stubbed client and confirmed by the deploy smoke checks.
- None otherwise.
