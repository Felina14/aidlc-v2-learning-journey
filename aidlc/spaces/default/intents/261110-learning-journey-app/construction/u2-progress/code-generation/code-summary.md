# Code Summary — u2-progress

## Sources

- `code-generation-plan.md` and `unit-test-instructions.md` in this folder
- `rules.md` and `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/functional-design/`
- `infrastructure-specification.md` and `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/infrastructure-design/`

## Files created or modified

| Area | Paths |
|---|---|
| Backend | `backend/src/learning_journey/`: `config.py`, `models.py`, `store.py`, `handler.py` (edited) |
| Backend tests | `backend/tests/test_store.py`, `backend/tests/test_handler.py` (extended) |
| Frontend | `frontend/src/progress.ts` (new); `api.ts`, `types.ts`, `state.ts`, `render.ts`, `app.ts` (edited); `frontend/index.html`, `frontend/styles.css` (edited) |
| Frontend tests | `frontend/tests/progress.test.ts` (new); `api.test.ts`, `state.test.ts`, `render.test.ts`, `app.test.ts` (extended) |
| Stack | `infra/stacks/journey_stack.py`, `infra/tests/test_stack.py` (edited) |

No existing file of yours was changed; `.gitignore`, `AGENTS.md`, `intent.md` and `recordings/` were left alone. Local only, not committed: `frontend/dist/` (rebuilt).

## Key implementation decisions

- **Progress rules** are pure functions in `frontend/src/progress.ts` (`completeCount`, `percent`, `formatHours`, `totalHours`, `stageStatuses`, `openPanelAfter`), written test-first: the first run failed because the module did not exist (0 tests), then 16 of 16 passed after the implementation.
- **Stored shape:** `save` no longer writes `completedStages` and stores `stageCount`; `load` reads a missing attribute, a number set or an empty list as an empty list.
- **Completion change:** one `update_item` with add or delete on the number set, `lastActivityAt` and `expiresAt` set in the same update, a condition on existence, expiry and stage count, and the old record returned on a failed condition, from which NOT_FOUND and INVALID_REQUEST are told apart. It uses `ReturnValues` `ALL_NEW` (not `UPDATED_NEW`) so a repeat that changes nothing still returns the full list; the cost is that the stages text comes back in the response, which is discarded.
- **Route:** `PUT /api/v1/journey/stages/{stageNumber}/completion` with the stage number form, body and status-code rules from BR11.3.
- **Page:** the sticky header (native progress bar named "Journey progress", percentage, "n of N complete", hours), the stage ladder with the words "Done", "Up next" and "To do", one change in flight at a time, the optimistic change replaced by the server's list, rollback with the pressed stage's panel reopened, the three failure messages, the skeleton with one polite announcement, and one automatic retry on a network failure for loads and changes. When every stage is done the single `h1` reads "Journey complete" and takes focus, with the topic in a subtitle.
- **Stack:** the `PUT` route on the existing integration, `dynamodb:UpdateItem` added to the one table statement, three log metric filters (`CompletionOk`, `CompletionSaveFailed`, `CompletionTimeMs` with no default value), and a dashboard widget. No reserved concurrency (the account limit of 10 is the ceiling, as in the first unit), no new resource, no other permission.

## Test coverage summary

| Suite | Result |
|---|---|
| Starting point (before any change) | 238 Python tests and 62 frontend tests passed |
| Backend and stack (`pytest backend/tests infra/tests --cov`) | 312 passed; 99.70% line coverage (80% floor met); backend 293, stack 19 |
| Frontend (`npm run coverage`) | 121 passed in 7 files; 99.73% line coverage (80% floor met) |
| Test-first file (`progress.test.ts`) | red before the code (module missing), 16 passed after |
| Lint, format, build | Ruff, Black, ESLint, Prettier and the frontend build pass |

The test numbers are far above the plan's "about 60" because many cases are parametrised.

## Tests written but not executed in this stage

- The live completion call, the missing-journey 404 and the out-of-range 400 against the real table, and `cdk deploy`: they need the person's AWS account (the deploy smoke checks in `cicd-pipeline.md`).
- `cdk synth` through the CDK command line was not run in this stage; the stack tests build the template in process, and the CI workflow has the synth job.
- Accessibility: no axe or Lighthouse run, no manual keyboard or screen-reader pass, and the 320 px layout was not checked in a real browser (jsdom tests only). The accessibility pass belongs to U6.

## Deviations from the plan

- **Moto and the failed condition:** moto does return the old record on a failed condition (typed form), and a test records that. For an absent record it returns no item, which the code treats as NOT_FOUND. The classification branches are also tested with a stubbed client. Whether the real service behaves the same is for the deploy smoke checks.
- **First unit's assertions updated:** the role's table actions now include `dynamodb:UpdateItem` in one statement; the metric-filter count rose from 7 to 10; the store test's stored-field set has `stageCount` and no `completedStages`.
- **Throttle message:** a 429 without a code shows the "please wait" text with a "Try again" button that repeats the change.
- **Load error screen:** the load error uses the first unit's message screen with "Try again", not an inline error inside the journey layout. The functional design allows this.
- **Progress rules interface:** the exact function signatures were chosen to fit the plan's names.
- **Shell edits:** some multi-line edits were made with small scripts in the shell; the full test, lint and build runs were used to check the result.
- **`unit-test-instructions.md`** was not edited; its commands match what was run.

## Open items for the person

- Run the new deploy smoke checks after the first `cdk deploy`, in particular the 404 and 400 checks, which confirm that the real database returns the old record on a failed condition.
- The earlier open items from the first unit still stand (update the CDK command line before deploying, check the pinned GitHub Action versions, pass `-c budget_email=...`).
