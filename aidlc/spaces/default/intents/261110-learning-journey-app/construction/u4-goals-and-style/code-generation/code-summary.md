# Code Summary — u4-goals-and-style

## Sources

- `code-generation-plan.md` and `unit-test-instructions.md` in this folder
- `rules.md` and `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/functional-design/`
- `infrastructure-specification.md` and `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/infrastructure-design/`

## Files created or modified

| Area | Paths |
|---|---|
| Backend | `backend/src/learning_journey/`: `config.py`, `models.py`, `validation.py`, `prompt.py`, `bedrock_client.py`, `generator.py`, `store.py`, `handler.py` (edited) |
| Backend tests | `backend/tests/test_goal_validation.py` (new); `test_reply_validation.py`, `test_prompt_and_client.py`, `test_template.py`, `test_generator.py`, `test_store.py`, `test_handler.py`, `fixtures/__init__.py` (extended) |
| Frontend | `frontend/src/goal.ts` (new); `api.ts`, `state.ts`, `render.ts`, `app.ts`, `types.ts` (edited); `frontend/index.html`, `frontend/styles.css` (edited) |
| Frontend tests | `frontend/tests/goal.test.ts` (new); `api.test.ts`, `state.test.ts`, `render.test.ts`, `app.test.ts` (extended) |
| Stack | `infra/stacks/journey_stack.py`, `infra/tests/test_stack.py` (edited) |

No existing file of yours was changed; `.gitignore`, `AGENTS.md`, `intent.md` and `recordings/` were left alone. Local only, not committed: `frontend/dist/` (rebuilt).

## Key implementation decisions

- **Test-first areas** (the team's practice): the style reply checks (red: 33 failed), the server goal-date check (red: the function did not exist) and the browser goal and pace maths (red: the module did not exist) were each written and seen failing before the code. Everything else was built first and tested after.
- **Style:** the create call reads an optional `style` (absent means guide, anything else is INVALID_REQUEST before any slot or model call). The prompt changes only tone and emphasis. The instructor reply must have at least 2 exercises and 1 quiz item per stage; the planner reply must have the four hours on every stage, adding up to the stage hours within 0.1 (a float margin of 1e-9 keeps exactly 0.1 valid). A `hoursByKind` on a guide or instructor reply is dropped. The template is the same for every style. The chosen style (one of three fixed words) is in the generator's journey line and the request line.
- **Output cap:** 4096 tokens for the guide, 5000 for instructor and planner (`MAX_OUTPUT_TOKENS_LONG` in `config.py`). A reply cut off by the cap raises a truncation error that is logged as an invalid reply and gets the same one retry and then the template.
- **Goal date:** `PUT /api/v1/journey/goal` is one conditional update that sets the date or removes it for null and moves `lastActivityAt` and `expiresAt`; a missing or expired journey is NOT_FOUND. `save` now omits the goal date (no stored null); a stored null or a missing attribute reads as none; a replacement journey has none.
- **Goal rules** are pure functions in `frontend/src/goal.ts`: the allowed range, the messages, the state and whole calendar days remaining (date arithmetic safe across daylight-saving changes), and the pace.
- **Page:** three style radios that start empty on every opening; the button disabled with a visible hint until a style is chosen; the header with the style name, the goal line, the pace and the goal form; the planner hours beside each stage's total (total only for other styles and for the template); "Goal date saved" announced only after the server answers; one goal change at a time, with "Start a new journey" and "Delete my journey" ignoring presses while one saves and Save and Clear ignoring presses while a delete runs; a late goal answer for a journey no longer on the page is dropped; a refresh at the next local midnight and when the tab becomes visible.
- **Stack:** the `PUT` goal route on the existing integration and the metric filters `GoalChangeFailed` (default 0) and `GoalChangeTimeMs` (no default) with a dashboard line. No permission change, no reserved concurrency and no new resource.

## Test coverage summary

| Suite | Result |
|---|---|
| Starting point (before any change) | 358 Python tests and 180 frontend tests passed |
| Backend and stack (`pytest backend/tests infra/tests --cov`) | 532 passed; 99.76% line coverage (80% floor met); stack tests 33 |
| Frontend (`npm run coverage`) | 289 passed; 99.72% line coverage (80% floor met) |
| Test-first files | red before the code, then green: the two Python files together 161 passed; `goal.test.ts` 22 passed at first green, 25 at the end |
| Lint, format, build | Ruff, Black, ESLint, Prettier and the frontend build pass |

## Tests written but not executed in this stage

- The live goal calls, the three-style smoke journeys and the first-day template-fallback watch against the deployed stack, and `cdk deploy`: they need the person's AWS account (the deploy smoke checks in `cicd-pipeline.md`).
- `cdk synth` through the CDK command line was not run; the stack tests build the template in process and the CI workflow has the synth job.
- Accessibility: no axe or Lighthouse run, no manual keyboard or screen-reader pass, and no real-browser check of the date field, the radios or the 320 px layout (jsdom tests only). The accessibility pass belongs to U6.

## Deviations from the plan

- **Output cap figure:** there was no network access to check the model's documented maximum; 5000 is a figure recalled from memory (about 5K for Nova Lite). **Please confirm it against the Bedrock documentation.** It is one constant.
- **Generate button:** it is disabled while no style is chosen (and while generating), but not until the topic is valid; the topic is still checked when the button is pressed, as the first unit built it.
- **Wording:** the goal line says "N days left", as `rules.md` says (the mockups say "N days remaining"); the pace says "about 1 hour per week" in the singular, matching the existing hours wording.
- **Moto:** it handled the conditional SET and REMOVE of the goal date in one update correctly; stubbed clients are used only for failures moto cannot produce.
- **A race fixed on the way:** an overlapping stage change's answer no longer overwrites a goal date saved in between.
- **Earlier tests changed:** the first unit's "every style gets the guide voice" test was removed (it no longer holds); the stored-fields test no longer expects `goalDate`; a render test that asserted no goal or style controls was replaced; the app and state tests pick a style before submitting; the stack test's metric filter count went from 12 to 14.
- **Shell edits:** some multi-line edits were made with small scripts and one line with `sed -i`; the full test, lint and build runs were used to check the result.

## Open items for the person

- Confirmed by the person: 5000 is the documented maximum output tokens for Amazon Nova Lite v1, so the 5000-token output cap for the instructor and planner styles (`MAX_OUTPUT_TOKENS_LONG`) stands as built.
- Run the new deploy smoke checks after the first `cdk deploy`, in particular one journey per style (time and AI or template), and watch the template-fallback metric on the first day.
- The earlier open items still stand (update the CDK command line before deploying, check the pinned GitHub Action versions, pass `-c budget_email=...`, and the TLS, Lambda-concurrency and rollback notes).

## Changes after the review

The reviewer passed the work as ready (`reviews/review-01.md`) with three Minor findings. Two were fixed straight away, the first test-first (8 of the 12 new cases failed before the fix):

- **Huge numbers in a reply:** a very large whole number in a stage's `hours` or in a `hoursByKind` value made the reply check raise instead of marking the reply invalid, which would have given the learner a server error instead of the retry and the template. Every numeric check now treats a value that cannot become a finite float as invalid, including a sum that overflows. After the fix: 544 Python tests passed at 99.77% coverage.
- **Header layout:** the goal line and the weekly pace now sit together inside the "Details" disclosure under 768 pixels, as the rule says; the progress bar, percentage and count stay outside it and always visible. One consequence to know: on a narrow screen with Details collapsed, "Set a goal date" is only reachable after opening Details.
- **Not changed:** the unverified 5000-token output cap (still an open item for the person above). The frontend remains at 289 tests and 99.72% line coverage.
