# Code Generation Plan — u3-protection

## Summary

- Builds: the real daily cap of 5 journeys per session per UTC day (reserve, keep, release, with the guard failing open), a `DELETE` call for the journey, and the page's limit message, "Start a new journey" and "Delete my journey" with their confirmation dialogs.
- Touches: `backend/src/learning_journey/` (usage guard, generator, store, handler, errors, config), `backend/tests/`, `frontend/src/` and `frontend/tests/` (api, state, render, app, types), `frontend/index.html` and `styles.css`, `infra/stacks/journey_stack.py` and `infra/tests/`; no new folder and no existing project file of yours is changed.
- Tests: about 55 new automated tests, Bedrock faked, DynamoDB doubled, the 80% line-coverage floor kept.

## Sources

- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/functional-design/` (rules BR20 to BR24)
- `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/infrastructure-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 delete and DAILY_LIMIT, C4, C5)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (ConfirmDialog, messages, focus)
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U3)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- The earlier units' built code (`backend/`, `frontend/`, `infra/`), which U3 extends
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

How the ordering applies here: the team's tests-first areas are journey validation, progress maths and the nudge rule. U3 touches none of them (it adds a usage guard, a delete call and dialogs), so every layer here is implemented first and then tested. The test runners already exist from the first unit, so no runner bootstrap is needed; the exact commands are in `unit-test-instructions.md`.

## Layout

All work is inside folders the earlier units created; no new file is planned beyond what a step names, and each step says which.

```
backend/src/learning_journey/   usage_guard.py, generator.py, store.py, handler.py, errors.py, config.py, logs.py (edited)
backend/tests/                  test_usage_guard.py, test_generator.py, test_store.py, test_handler.py (edited and extended)
frontend/src/                   api.ts, state.ts, render.ts, app.ts, types.ts (edited); dialog code in render.ts or a new confirm-dialog.ts
frontend/                       index.html, styles.css (edited)
frontend/tests/                 api, state, render, app tests (extended); confirm-dialog tests if that file is made
infra/stacks/journey_stack.py   method, permission, metric filters, alarm, dashboard line (edited)
infra/tests/test_stack.py       extended
```

## Steps

- [x] **Step 1 — Baseline check.** Confirm the earlier units' commands run from a clean tree (`pytest backend/tests infra/tests -q`, and `npx vitest run` in `frontend`) before any change, and record the starting numbers in `code-summary.md`. Stories: NFR9.
- [x] **Step 2 — Backend: the real usage guard.** In `usage_guard.py` add `DynamoUsageGuard` behind the existing interface and keep `NoLimitGuard` for tests. `reserve(session_id, day)` is one `update_item` on the item `{sessionId, sk = "USAGE#<day>"}` that sets `journeysCreated` to `if_not_exists(journeysCreated, 0) + 1` and sets `expiresAt` with `if_not_exists` (the end of the UTC date plus one further day, in epoch seconds), with the condition "the item does not exist or `journeysCreated` < 5"; a failed condition means not granted with 0 left. A granted result carries the slots left and an opaque reservation id that encodes the session ID and the date. `release(reservation_id)` is one `update_item` that subtracts 1 with the condition "the item exists and `journeysCreated` > 0"; a failed condition is swallowed and logged at info level. Any other store error or a call that takes longer than the 2-second store limit makes `reserve` answer granted with no reservation id and `guardSkipped` true, and writes one `guard_skipped` log line (outcome, error class and a short session prefix only); a failed release is logged and never changes the answer. Add `DAILY_CAP = 5` to `config.py`. Rules: BR20.1 to BR20.5.
- [x] **Step 3 — Backend: generator and wiring.** Edit `generator.py` so the day passed to the guard is the server's UTC date, the `DAILY_LIMIT` path makes no model call and saves nothing (already so for a refused slot), a skipped guard carries on, and release-once logic is kept; edit `handler.py`'s `build_app` to use `DynamoUsageGuard` on the same table (the stand-in stays available for tests). Keep the request log line complete on a DAILY_LIMIT answer. Rules: BR20.2, BR20.3, BR21.1.
- [x] **Step 4 — Backend: delete.** In `store.py` add `JourneyStore.delete(session_id)` as one `delete_item` of the `JOURNEY` item only, with the 2-second total limit, safe to repeat (no condition, no error when absent); a store failure becomes `DELETE_FAILED`. Add `DELETE_FAILED` (500) to `errors.py`. Expose the C5 name `delete`. Rules: BR23.1, BR20.5.
- [x] **Step 5 — Backend: the delete route.** Edit `handler.py`: route `DELETE /api/v1/journey`; check the session ID; answer 204 with an empty body whether or not a journey was there; map `DELETE_FAILED` to 500 with the C1 error shape; keep the structured request log line. Make sure the create route's `DAILY_LIMIT` answer is 429 with the error shape. Rules: BR23.1, BR21.1.
- [x] **Step 6 — Backend tests (after the code).** Extend `test_usage_guard.py` (first request creates the item at 1; fifth is granted with 0 left; sixth refused; two reservations at the cap from threads leave the count at 5; release lowers the count and never below 0; a second day starts at 0; a count from another day is ignored; the reservation id finds the right key; a store error or timeout gives granted with no id and a `guard_skipped` line; a failed release is swallowed), `test_generator.py` (refused slot makes no model call and saves nothing and leaves an existing journey; slot kept on a template journey; released once on refusal, save failure and unexpected error; skipped guard carries on), `test_store.py` (delete removes only the `JOURNEY` item and leaves the count; delete when absent succeeds; a store failure is `DELETE_FAILED`; delete leaves the count at its value) and `test_handler.py` (DELETE 204 twice, 400 for a bad session ID, 500 `DELETE_FAILED`; create answers 429 `DAILY_LIMIT` at the cap; the log line carries the outcome and no full session ID or reservation id). Standard strategy: 5 to 8 tests per component plus the handler to guard to store integration with the fake model. Update any earlier test that used the stand-in guard to expect the cap.
- [x] **Step 7 — Frontend: client.** Edit `api.ts`: `createJourney` returns a distinct daily-limit result for a 429 with the code `DAILY_LIMIT` (kept apart from the throttle result for `RATE_LIMITED` or no code); add `deleteJourney` (header, 10-second wait, one automatic retry on a network failure, result kinds: deleted, failed, rate-limited). Edit `types.ts` to match. Rules: BR21.2, BR23.2.
- [x] **Step 8 — Frontend: controller.** Edit `state.ts`: a daily-limit phase that keeps the typed topic and the existing journey; the replace flow (a saved-journey screen offers "Start a new journey", the confirmation, then the topic screen with a way back that reloads the stored journey and shows the home screen with a plain note if it is gone, and the stored journey kept on every non-success end); the delete flow (the confirmation, a busy state that ignores a second press, success to the home screen with focus on the topic box, failure kept inside the dialog). Rules: BR21.1, BR22.1, BR22.2, BR23.2.
- [x] **Step 9 — Frontend: page.** Edit `render.ts`, `app.ts`, `index.html` and `styles.css` (a small `confirm-dialog.ts` is allowed): a native `dialog` opened with `showModal()` for both confirmations, labelled by its title and described by its explanation, Cancel first with the initial focus, Escape cancels, the confirm button shows "Working…" while it runs, an error shows inside the dialog, and focus returns to the opener (or the topic box after a delete); the "Start a new journey" and "Delete my journey" controls only when a journey is shown, with `data-testid`; the plain, not-blaming limit message (today's limit of 5 reached, come back tomorrow, current journey still available) announced politely and kept apart from the "please wait" message; the topic screen's way back. All text with `textContent`; the topic named in a dialog is plain text; targets at least 44 by 44 pixels; no colour-only status; works from 320 pixels wide. Rules: BR21.2, BR22, BR23.2, BR24.1, BR24.2.
- [x] **Step 10 — Frontend tests (after the code).** Extend the client, controller, render and app tests with vitest and jsdom: the daily-limit result versus the throttle result, the delete client (204, 400, 500, 429, timeout, one retry); the controller (limit keeps topic and journey, replace confirmed and cancelled, replace ending in a refusal, a limit, a throttle and a failure leaves the stored journey, way back with the journey gone, delete confirmed, failed and cancelled, a second confirm press ignored); the dialogs (Cancel has the initial focus, Escape cancels, busy state, error inside, focus returns, the named topic shown as plain text for a `<script>` topic); the controls appear only with a journey. 5 to 8 tests per module.
- [x] **Step 11 — CDK stack.** Edit `infra/stacks/journey_stack.py` per the infrastructure specification: add `DELETE` to the existing `/api/v1/journey` route's methods; add `dynamodb:DeleteItem` on the one table to the role (no other change to permissions); add the two log metric filters `DailyLimitHit` (event `request`, outcome `DAILY_LIMIT`) and `GuardSkipped` (event `guard_skipped`) in the existing namespace with default value 0; add the guard-skipped alarm (1 or more in 1 hour, missing data not breaching, same email topic) and a dashboard line. No reserved concurrency, no new resource. Rules: NFR6, NFR10.
- [x] **Step 12 — CDK tests (after the code).** Extend `infra/tests/test_stack.py`: the route has `DELETE`; the role's table actions are exactly GetItem, PutItem, UpdateItem and DeleteItem on the table ARN with no wildcard action or resource; the front door still allows `DELETE` and forwards the session header; the two metric filters with their patterns and default value 0; the alarm's threshold and missing-data setting; no reserved concurrency; the earlier assertions unchanged except the permission list and the filter and alarm counts. 5 to 8 tests.
- [x] **Step 13 — Pipeline and checks.** No workflow change is planned: confirm `.github/workflows/ci.yml` still runs the new tests in its Python and frontend jobs and that `cdk synth` still builds. Run the lint, format, coverage and build commands and keep the 80% floors. If a change to the workflow turns out to be needed, name it in `code-summary.md` and make it only when the person asks.
- [x] **Step 14 — Documentation, run notes and traceability.** Inline docstrings on new public functions; `unit-test-instructions.md` kept current; `source-manifest.json`; `traceability.json` from the sensor with each AC, NFR and BR row set to its test or implementation file. Record in `code-summary.md` any test not run here and why (the live cap, delete and replace checks need the person's AWS account), the moto findings for the conditional increment and decrement, and the starting and ending test numbers.

## Story and rule traceability

| Plan step | Stories | Rules and requirements |
|---|---|---|
| 2, 3, 6 | US9.2 (daily cap) | BR20.1 to BR20.5, BR21.1 |
| 4, 5, 6 | US7.2 | BR23.1 |
| 7, 8, 9, 10 | US7.1, US7.2, US9.2 | BR21.2, BR22.1, BR22.2, BR23.2, BR24.1, BR24.2 |
| 11, 12 | US9.2 | NFR6, NFR10, NFR11 |
| 13 | all | NFR9 |

## Assumptions & Open Questions

- [assumption] The guard's reserve and release are written as the infrastructure specification says (`if_not_exists`, a condition on the count, the reservation id encoding the session and the date). If the pinned moto does not support one of these expressions the way the real service does, that branch is tested with a stubbed client and the real behaviour is confirmed by the deploy smoke checks.
- [assumption] The confirmation dialog code may live in `render.ts` or in a small new `confirm-dialog.ts`; either is within this plan, and a new file is listed in the source manifest.
- [assumption] The way back from the topic screen reloads the stored journey from the server, as the functional design says, rather than reusing the copy on the page.
- None otherwise.
