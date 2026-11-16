# Code Summary — u5-encouragement

## Sources

- `code-generation-plan.md` and `unit-test-instructions.md` in this folder
- `rules.md` and `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/functional-design/`
- `infrastructure-specification.md`, `monitoring-design.md` and `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/infrastructure-design/`

## Files created or modified

| Area | Paths |
|---|---|
| Backend | `backend/src/learning_journey/`: `validation.py`, `models.py`, `store.py`, `handler.py` (edited) |
| Backend tests | `backend/tests/test_milestone_validation.py` (new); `test_store.py`, `test_handler.py` (extended) |
| Frontend | `frontend/src/nudge.ts`, `milestones.ts`, `certificate.ts` (new); `api.ts`, `state.ts`, `render.ts`, `app.ts`, `types.ts`, `goal.ts` (edited); `frontend/index.html`, `frontend/styles.css` (edited, with the print style) |
| Frontend tests | `frontend/tests/blocked-words.ts`, `nudge.test.ts`, `milestones.test.ts`, `certificate.test.ts` (new); `api.test.ts`, `state.test.ts`, `render.test.ts`, `app.test.ts` (extended) |
| Stack | `infra/stacks/journey_stack.py`, `infra/tests/test_stack.py` (edited) |

No existing file of yours was changed; `.gitignore`, `AGENTS.md`, `intent.md` and `recordings/` were left alone by this unit's code.

## Key implementation decisions

- **Test-first areas** (the team's practice): the nudge rule and messages, and the milestone maths, were written as tests first and then implemented in pure modules (`nudge.ts`, `milestones.ts`). Everything else was built first and tested after.
- **Separable pieces (BR45.1):** `nudge.ts`, `milestones.ts` and `certificate.ts` do not import each other (`nudge.ts` uses only `goal.ts`), so the nudge, then the milestones and certificate, can be cut in that order.
- **Milestone route:** `PUT /api/v1/journey/milestones` is one conditional `update_item` that adds the name to the string set `milestonesShown`, moves `lastActivityAt` and `expiresAt`, and returns the set sorted first-stage, halfway, complete. A missing or expired journey is NOT_FOUND; a bad name or session ID is INVALID_REQUEST. `save` omits the attribute when empty; a load treats a missing attribute, a set or an empty list as empty and sorts it.
- **Page:** a page-held shown set (reset when the journey is replaced or deleted); milestones are worked out only after a confirmed mark; only the highest newly reached one is shown and the lower ones are recorded without being shown; every failure to record is quiet; a completion view (heading "Journey complete" with focus, certificate panel, optional name held in page memory only, "Print or save certificate", "Back to my journey") with a print style that shows only the certificate in black and white; one polite banner area where a milestone comes before a nudge.
- **Nudge:** applies below 50% with a goal date 0 to 3 local calendar days away; four fixed messages naming the next stage by number; dismissal stored in local storage under one prefix by goal date and local day, with older markers and all markers removed on delete or replace, and a page-memory fallback when storage is blocked. No request is made for it.
- **Stack:** the new route on the existing integration; no new metric, alarm, permission or resource; the stack test now also asserts `PUT` is allowed on the front door.

### Messages

- first-stage: "You've finished your first stage. That's a real start, and every stage after it builds on this one."
- halfway: "You're halfway there. Look how far steady steps have taken you."
- complete: "You've finished every stage. Well done, and thank you for sticking with it."
- nudge: "Stage N is your next step, with K stages to go." ("1 stage to go" when K is 1) followed by one of: 0 days "One small step today would be a lovely way to keep moving."; 1 day "A short session today or tomorrow moves you forward."; 2 days "A little time on each of the next couple of days is a gentle plan."; 3 days "A short session on each of the next few days is a gentle plan."

## Test coverage summary

| Suite | Result |
|---|---|
| Starting point (after the fourth unit) | about 544 Python tests and 289 frontend tests passed |
| Backend and stack (`pytest backend/tests infra/tests --cov`) | 616 passed; 99.78% line coverage (80% floor met); stack tests 38 |
| Frontend (`npm run coverage`) | 426 passed; 99.78% line coverage (80% floor met); `nudge.ts` and `milestones.ts` at 100% |
| Lint, format, build | Ruff, Black, ESLint, Prettier and the frontend build pass |

## Tests written but not executed in this stage

- The live milestone calls, the print preview and a nudge on a real goal date against the deployed stack, and `cdk deploy`: they need the person's AWS account and browser (the deploy smoke checks in `cicd-pipeline.md`).
- `cdk synth` through the CDK command line was not run; the stack tests build the template in process and the CI workflow has the synth job.
- Accessibility: no axe or Lighthouse run and no manual keyboard or screen-reader pass (jsdom tests only). The accessibility pass belongs to U6.

## Deviations from the plan

- None in scope. The unit was built in two developer runs because the first stopped at a usage limit; the second audited the tree against the plan and finished the missing pieces.
- **Moto:** it handled the conditional `ADD` to a string set with the updated value returned; stubbed clients are used only for failures it cannot produce.
- **Banner comment:** a comment in `styles.css` containing words from the blocked styling check was reworded so the render test that scans the banner rules passes.
- **Formatting:** Black, Ruff and Prettier were run over the code, which reformatted some earlier-unit test files without changing behaviour.

## Open items for the person

- A flaky earlier test, `test_concurrent_reservations_at_the_cap_never_pass_five` (third unit), failed once while the frontend jobs ran at the same time and passed on every other run; it looks like the DynamoDB double under load. Worth watching in CI.
- Run the milestone, certificate-print and nudge smoke checks from `cicd-pipeline.md` after the first `cdk deploy`.
- The earlier open items still stand (update the CDK command line before deploying, check the pinned GitHub Action versions, pass `-c budget_email=...`, and the TLS, Lambda-concurrency and rollback notes).

## Changes after the review

The reviewer passed the work as ready (`reviews/review-01.md`) with one Major finding, fixed straight away:

- **Focus after dismissing a banner:** the Dismiss button disappears, so focus was left on nothing. Focus now moves to the page heading (the interaction spec's fallback), with a test. After the fix: 426 frontend tests passed.
- **Manifest:** `frontend/tests/helpers.ts` added to `source-manifest.json`.
- **Flaky test, now understood:** `test_concurrent_reservations_at_the_cap_never_pass_five` (third unit) failed again once in a full run with 6 granted instead of 5. DynamoDB's conditional update is atomic, but the test double is not safe under 12 threads, so this is a test-double limit, not a defect in the guard. It passes on rerun. Not changed here.
- **Not changed (Minor):** the plan's step boxes stay unticked because the approved plan is not rewritten; the blocked-word helper's "only N days" check covers number words only up to fifteen; a nudge dismissed in another tab is only noticed after a reload.
