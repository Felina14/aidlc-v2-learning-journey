# Code Summary — u3-protection

## Sources

- `code-generation-plan.md` and `unit-test-instructions.md` in this folder
- `rules.md` and `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/functional-design/`
- `infrastructure-specification.md` and `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/infrastructure-design/`

## Files created or modified

| Area | Paths |
|---|---|
| Backend | `backend/src/learning_journey/`: `usage_guard.py` (rewritten), `config.py`, `errors.py`, `generator.py`, `store.py`, `handler.py` (edited) |
| Backend tests | `backend/tests/test_usage_guard.py`, `test_generator.py`, `test_store.py`, `test_handler.py` (extended); `conftest.py` (a real-guard fixture) |
| Frontend | `frontend/src/confirm-dialog.ts` (new); `types.ts`, `api.ts`, `state.ts`, `render.ts`, `app.ts` (edited); `frontend/index.html`, `frontend/styles.css` (edited) |
| Frontend tests | `frontend/tests/confirm-dialog.test.ts` (new); `helpers.ts`, `api.test.ts`, `state.test.ts`, `render.test.ts`, `app.test.ts` (extended) |
| Stack | `infra/stacks/journey_stack.py`, `infra/tests/test_stack.py` (edited) |

No existing file of yours was changed; `.gitignore`, `AGENTS.md`, `intent.md` and `recordings/` were left alone.

## Key implementation decisions

- **Usage guard:** `DynamoUsageGuard` reserves a slot with one conditional `update_item` on `{sessionId, USAGE#<UTC date>}` (count set with `if_not_exists`, condition "absent or below 5", expiry set only when absent) and releases with one conditional decrement whose failed condition is swallowed. The reservation id is opaque and encodes the session and the date. A store error, or a successful reserve that took over 2 seconds, gives "granted, no reservation id" and one `guard_skipped` log line (outcome, error class, short session prefix). The date is the server's UTC date.
- **Generator and wiring:** a refused slot ends as DAILY_LIMIT with no model call and nothing saved; the slot is kept for any saved journey and released once otherwise; `build_app` uses the real guard on the same table.
- **Delete:** `JourneyStore.delete` removes only the `JOURNEY` item and succeeds when nothing is there; the route answers 204 with an empty body, 400 for a bad session ID and 500 `DELETE_FAILED`. A count is never touched by a delete.
- **Page:** a distinct daily-limit result and message (plain, not blaming, kept apart from "please wait"); "Start a new journey" with a confirmation, then the topic screen with "Back to my journey", which reloads the stored journey; "Delete my journey" with a confirmation naming the topic. Both confirmations are native modal dialogs from a small `confirm-dialog.ts`: Cancel first with the initial focus, Escape cancels, "Working…" while it runs, an error inside the dialog, and focus returned to the opener (the topic box after a delete).
- **Stack:** `DELETE` on the existing route, `dynamodb:DeleteItem` added (the table actions are exactly GetItem, PutItem, UpdateItem and DeleteItem), metric filters `DailyLimitHit` and `GuardSkipped` (default 0), a guard-skipped alarm, and a dashboard line. No reserved concurrency and no new resource.

## Test coverage summary

| Suite | Result |
|---|---|
| Starting point (before any change) | 312 Python tests (99.70% coverage) and 121 frontend tests passed |
| Backend and stack (`pytest backend/tests infra/tests --cov`) | 358 passed; 99.73% line coverage (80% floor met); stack tests 25 |
| Frontend (`npm run coverage`) | 180 passed in 8 files; 99.41% line coverage (80% floor met), after the review fixes below |
| Lint, format, build | Ruff, Black, ESLint, Prettier and the frontend build pass |
| Concurrency | 12 threads reserving at once leave the count at exactly 5 (against the test double) |

This unit touches none of the team's tests-first areas, so every layer was built first and tested after, as the plan says.

## Tests written but not executed in this stage

- The live cap, delete and replace checks against the real table, and `cdk deploy`: they need the person's AWS account (the deploy smoke checks in `cicd-pipeline.md`).
- `cdk synth` through the CDK command line was not run; the stack tests build the template in process and the CI workflow has the synth job.
- Accessibility: no axe or Lighthouse run, no manual keyboard or screen-reader pass, and no real-browser check of the dialogs or the 320 px layout (jsdom tests only). The accessibility pass belongs to U6.

## Deviations from the plan

- **Test double and the real service:** moto supports `if_not_exists`, the "absent or below 5" condition, the release condition and a failed condition. Store errors and connect timeouts cannot be produced by moto, so those branches (a reserve error, a failed release, a delete failure) use a stubbed table. Whether the real DynamoDB behaves the same is for the deploy smoke checks.
- **A slow reserve:** a reserve that succeeds but takes over 2 seconds is treated as skipped (granted, no reservation id, outcome `timeout` in the log), so that slot cannot be released. This is accepted by the design.
- **Extra log events:** release writes a `guard_release` line (outcome `nothing_to_release`, `error` or `unknown_reservation`). Only `guard_skipped` feeds a metric.
- **Existing tests updated:** the unknown-route test uses PATCH (DELETE is now a route); the client test that expected DAILY_LIMIT to be a plain failure now expects the daily-limit result; the render test that asserted there were no replace or delete controls was inverted; the stack tests now count 4 alarms, 12 metric filters and four table actions.
- **Wording:** the replace dialog reads "…will be replaced once your new journey is ready. Until then it stays saved", since the old journey is replaced only by a successful save. The way back is labelled "Back to my journey". The mockup's "More" menu is not built: the two controls are plain buttons below the stage list.
- **Test stand-in:** jsdom has no `showModal()` or `close()`, so a small stand-in in `tests/helpers.ts` records the calls; the page code falls back to the `open` attribute when `showModal` is missing.

## Open items for the person

- Run the new deploy smoke checks after the first `cdk deploy`, in particular the cap (six journeys in a fresh session), delete and replace checks, and confirm the `GuardSkipped` metric stays at 0.
- The earlier open items still stand (update the CDK command line before deploying, check the pinned GitHub Action versions, pass `-c budget_email=...`, and the first unit's TLS and Lambda-concurrency notes).

## Changes after the review

The reviewer passed the work as ready (`reviews/review-01.md`) with one Major and two Minor findings, which were fixed straight away in `frontend/src/state.ts`, `frontend/src/render.ts` and their tests:

- **Major, way back during a create:** "Back to my journey", "Start a new journey" and the replace confirmation are now ignored while a create is in flight, the way-back button is disabled then, and no second create (and so no second daily slot) can be sent while one is pending. Tests cover each.
- **Minor, a stale answer after a delete:** a stage change that was in flight before a delete can no longer put the deleted journey back on the home screen; a generation counter drops its late answer or rollback. Two tests cover a completed and a failed late answer.
- **Minor, the two 429 messages end to end:** an app-level test shows the limit message for `DAILY_LIMIT` and the "please wait" message for a throttle.
- The fix also bumps the counter whenever a journey is entered, so a stale change answer cannot overwrite a journey reloaded through "Back to my journey". This goes slightly beyond the findings.
