# Code Generation Plan — u2-progress

## Summary

- Builds: marking and unmarking stages with live progress: one new `PUT` completion route that changes the stored set in a single conditional update, and the page's progress header, stage ladder, optimistic change with rollback, and return-visit skeleton.
- Touches: `backend/src/learning_journey/` (store, handler, models, config), `backend/tests/`, `frontend/src/` and `frontend/tests/` (a new `progress.ts` and its tests, plus api, state, render, app), `infra/stacks/journey_stack.py` and `infra/tests/`; no new folder and no existing project file of yours is changed.
- Tests: about 60 new automated tests (the progress rules written first), Bedrock faked, DynamoDB doubled, the 80% line-coverage floor kept.

## Sources

- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/functional-design/` (rules BR10 to BR13)
- `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/infrastructure-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 completion call, C2, C5)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (ladder, header, focus, announcements, skeleton, inline error)
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U2)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- The first unit's built code (`backend/`, `frontend/`, `infra/`), which U2 extends
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

How the ordering applies here: the progress maths (BR10.1 to BR10.4: count and percentage, hours writing, stage status, which panel opens) is pure, rule-heavy logic, so its tests are written first and seen failing before the code (steps 2 and 3). The nudge rule does not exist in U2. The first unit's topic and reply checks are unchanged. Everything else (store update, route, page, stack) is written first and tested after. The test runners already exist from the first unit, so no runner bootstrap is needed; the exact commands are in `unit-test-instructions.md`.

## Layout

All work is inside folders the first unit created. New files: `frontend/src/progress.ts`, `frontend/tests/progress.test.ts`. Everything else is an edit of an existing file.

```
backend/src/learning_journey/   store.py, handler.py, models.py, config.py, errors.py (edited)
backend/tests/                  test_store.py, test_handler.py (edited and extended)
frontend/src/                   progress.ts (new); api.ts, state.ts, render.ts, app.ts, types.ts (edited)
frontend/tests/                 progress.test.ts (new); api, state, render, app tests (extended)
infra/stacks/journey_stack.py   route, permission, metric filters, dashboard widget (edited)
infra/tests/test_stack.py       extended
```

## Steps

- [x] **Step 1 — Skeleton check.** Confirm the first unit's commands run from a clean tree (`pytest backend/tests infra/tests -q`, and `npx vitest run` in `frontend`) before any change, and record the starting numbers in `code-summary.md`. Stories: NFR9.
- [x] **Step 2 — Tests first: progress rules (red).** `frontend/tests/progress.test.ts` for BR10.1 to BR10.4: count of the stage numbers the journey has (numbers above the stage count are ignored); percentage rounded to the nearest whole percent with 0 only for none and 100 only for all (5 stages: 20, 40, 60, 80, 100; 6 stages: 17, 33, 50, 67, 83, 100); hours total and writing (2, 3, 3, 4, 4 reads 16; 2.5 stays 2.5; 3.25 reads 3.3; 10.100000000000001 reads 10.1; 0.5 stays 0.5); stage status words (done, up next = the lowest stage not done, to do; none up next when all are done); and the panel/focus decision table: first showing (up-next open, none when all done), after marking (the new up-next opens, none when the last was marked, focus target is the heading or the "Journey complete" heading), after unmarking (the pressed stage stays open, focus stays on its button), after a failure, NOT_FOUND or INVALID_REQUEST (the pressed stage's panel reopens). Run it and keep the failing output. Rules: BR10.1 to BR10.4.
- [x] **Step 3 — Implementation: progress rules (green).** `frontend/src/progress.ts` with pure functions (`completeCount`, `percent`, `formatHours`, `totalHours`, `stageStatuses`, `openPanelAfter`) and no DOM or network use. Make step 2 pass with the smallest code, then refactor while green.
- [x] **Step 4 — Backend: stored shape.** Edit `models.py`, `store.py` and `config.py`: `save` no longer writes `completedStages` (the attribute stays absent when empty) and stores `stageCount`; `load` reads a missing attribute, a number set or an empty list as an empty list of completed stages, returns the stage numbers as ascending whole numbers, and keeps the expiry test `expiresAt <= now` in whole epoch seconds; `to_public_dict` still sends `completedStages` as a list. Rules: BR11.4, BR12.1, BR12.2; entities `completedStages`, `stageCount`.
- [x] **Step 5 — Backend: the completion update.** `JourneyStore.set_stage_completion(session_id, stage_number, completed)` as one `update_item` with add (mark) or delete (unmark) on the number set, `lastActivityAt` and `expiresAt` set in the same update, a condition (record exists, `expiresAt` greater than now in whole epoch seconds, `stageCount` no less than the stage number), the old record returned on a failed condition, and the 2-second total limit already set on the table. Return the ascending list read from the update's result. Classify a failed condition from the returned record: absent or expired is NOT_FOUND, a stage above the stage count (or a record with no stage count) is INVALID_REQUEST; any other store failure is SAVE_FAILED. Also expose the C5 name `setStageCompletion`. Rules: BR11.1, BR11.2, BR11.4, BR11.5.
- [x] **Step 6 — Backend: the route.** Edit `handler.py`: route `PUT /api/v1/journey/stages/{stageNumber}/completion` alongside the existing `POST` and `GET /api/v1/journey`; check the session ID, the stage number form (plain ASCII digits, no sign, no leading zero, 1 to 6), and a JSON object body whose `completed` is exactly true or false (other keys ignored); answer 200 with `{"completedStages": [...]}` in ascending order; map NOT_FOUND to 404, INVALID_REQUEST to 400, SAVE_FAILED to 500 with the C1 error shape; keep the structured request log line (route, outcome, total time, short session prefix; no typed text). Rules: BR11.3, BR11.5.
- [x] **Step 7 — Backend tests (after the code).** Extend `test_store.py` (save omits the field and stores the stage count; load of a missing attribute, a set and an empty list; mark, repeat mark, unmark, unmark the last number removes the attribute; two interleaved marks keep both numbers; expired and absent journeys return NOT_FOUND and create nothing; stage above the count is INVALID_REQUEST; the old record is read from a failed condition, with a stubbed client for that branch if the pinned test double does not return it; the expiry boundary at 89, 90 and 91 days; the extension of expiry on a write and none on a read) and `test_handler.py` (the route's status codes, the stage number forms "02", "+2", "2.0" and another script's digits, a body without a true or false completed, extra body keys ignored, the answer list order, a save failure, the log line for the new route with no full session ID). Standard strategy: 5 to 8 tests per component plus the handler to store integration with the fake model. Update any first-unit test that expected the old stored shape.
- [x] **Step 8 — Frontend: API client and controller.** Edit `api.ts` (add `setStageCompletion` with the session header, a 10-second wait, one automatic retry on a network failure, and the same result kinds as the first unit plus NOT_FOUND, INVALID_REQUEST, SAVE_FAILED and RATE_LIMITED for a 429 with no code; make `loadJourney` retry once on a network failure) and `state.ts`/`types.ts` (the controller's one-change-at-a-time rule, the optimistic change and the use of the server's list, the rollback with the right panel reopened, and the states Settled, Failed, Gone and Changed from the functional spec). Rules: BR13.1, BR13.2, BR13.3, BR13.5, BR13.7.
- [x] **Step 9 — Frontend: page.** Edit `render.ts`, `app.ts`, `index.html` and `styles.css`: the sticky header with the topic, a native progress bar named "Journey progress", the percentage as text, "n of N complete" and the hours total; the ladder with the markers and the words "Done", "Up next" and "To do", one panel open at a time, the complete and not-complete buttons with `data-testid`, busy and error states, the inline "We couldn't save that change. Try again." with its button, the "no longer saved" message with a home button, the "journey has changed" message with a Reload button, the return-visit skeleton with one polite "Loading your journey" announcement, the inline load error with "Try again", the polite announcements for marked and unmarked, and the focus moves from the interaction spec. All text with `textContent`; targets at least 44 by 44 pixels; status never by colour alone; works from 320 pixels wide. Rules: BR10.3, BR10.4, BR13.1 to BR13.7.
- [x] **Step 10 — Frontend tests (after the code).** Extend `api.test.ts`, `state.test.ts`, `render.test.ts` and `app.test.ts` with vitest and jsdom: the completion client (200, 400, 404, 500, 429 with and without a code, timeout, one retry), the controller (optimistic change, answer replaces the list, rollback and reopened panel on failure, NOT_FOUND, INVALID_REQUEST, second press ignored while any change saves, two-tab list replaced by the answer), the ladder and header render (5 and 6 stages, all done, none done), the skeleton and the return-visit outcomes, announcements and focus targets. 5 to 8 tests per module.
- [x] **Step 11 — CDK stack.** Edit `infra/stacks/journey_stack.py` per the infrastructure specification: add the route `PUT /api/v1/journey/stages/{stageNumber}/completion` to the existing integration; add `dynamodb:UpdateItem` on the one table to the role; add the three log metric filters (`CompletionOk`, `CompletionSaveFailed`, `CompletionTimeMs`) in the existing namespace with the JSON patterns and the route wildcard, with **no default value** on `CompletionTimeMs`; add the completion widget to the existing dashboard. No reserved concurrency, no new resource, no other permission. Rules: NFR2, NFR6, NFR10.
- [x] **Step 12 — CDK tests (after the code).** Extend `infra/tests/test_stack.py`: the new route and method, `UpdateItem` on the table ARN with no wildcard action or resource, the front door still allows `PUT` and forwards the session header, the three metric filters with their patterns and `CompletionTimeMs` having no default value, no reserved concurrency, the first unit's assertions unchanged. 5 to 8 tests.
- [x] **Step 13 — Pipeline and checks.** No workflow change is planned: confirm `.github/workflows/ci.yml` still runs the new tests in its Python and frontend jobs and that `cdk synth` still builds. Run the lint, format, coverage and build commands and keep the 80% floors. If a change to the workflow turns out to be needed, name it in `code-summary.md` and make it only when the person asks.
- [x] **Step 14 — Documentation, run notes and traceability.** Inline docstrings on new public functions; `unit-test-instructions.md` kept current; `source-manifest.json`; `traceability.json` from the sensor with each AC, NFR and BR row set to its test or implementation file. Record in `code-summary.md` any test not run here and why (the live completion call and the deploy smoke checks need the person's AWS account), and the starting and ending test numbers.

## Story and rule traceability

| Plan step | Stories | Rules and requirements |
|---|---|---|
| 2, 3 | US2.2, US3.1, US3.2 | BR10.1 to BR10.4 |
| 4 | US7.3 | BR11.4, BR12.1, BR12.2 |
| 5, 6 | US3.1, US3.2 | BR11.1 to BR11.5 |
| 8, 9, 10 | US3.1, US3.2, US3.3 | BR13.1 to BR13.7, NFR2 |
| 11, 12 | US3.1 | NFR2, NFR6, NFR10, NFR11 |
| 13 | all | NFR9 |

## Assumptions & Open Questions

- [assumption] The progress rules live in one browser module, `frontend/src/progress.ts`, with no network or page code, so they are written and tested first as the team practices require.
- [assumption] The pinned DynamoDB test double (moto) is checked for set add and delete and for a failed condition; if it does not return the old record on a failed condition, that one branch is tested with a stubbed client and the real behaviour is confirmed by the deploy smoke checks (see the infrastructure specification).
- [assumption] The change to the first unit's `save` (omit `completedStages`, store `stageCount`) is part of this unit's work, as the functional design says, and is listed in the source manifest.
- None otherwise.
