# Code Summary — u6-accessibility-pass

## Sources

- `code-generation-plan.md` and `unit-test-instructions.md` in this folder
- `rules.md`, `functional-spec.md` and `frontend-components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/`
- `infrastructure-specification.md`, `monitoring-design.md` and `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/infrastructure-design/`
- `accessibility-results.md` and `manual-pass-scripts.md` in this folder (the full record of every check, finding and manual script)

## Files created or modified

| Area | Paths |
|---|---|
| Frontend tests (new) | `frontend/tests/a11y-states.ts`, `a11y.test.ts`, `structure.test.ts`, `contrast.test.ts`, `keyboard.test.ts` |
| Frontend tests (edited) | `frontend/tests/confirm-dialog.test.ts` (the old assertion of the dialog error role) |
| Frontend (fixes) | `frontend/index.html`, `frontend/styles.css`, `frontend/src/render.ts`, `frontend/src/state.ts` |
| Dependency | `frontend/package.json`, `frontend/package-lock.json` (`axe-core` 4.14.0, development only) |
| Workflow | `.github/workflows/ci.yml` (the placeholder accessibility job removed) |
| Documents | `accessibility-results.md`, `manual-pass-scripts.md` (new, in this folder) |

No backend, stack or contract file changed, and no existing file of yours was touched by this unit; `.gitignore`, `AGENTS.md`, `intent.md` and `recordings/` were left alone by its code. Local only, not committed: `frontend/dist/` (rebuilt, with no axe code in it).

## Key implementation decisions

- **axe under jsdom:** `axe-core` is pinned to the exact version 4.14.0 and runs under jsdom 31 and vitest 5 (proved by a first test that flags an unlabelled input and passes once it is labelled). Rule tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`. Disabled rules: `color-contrast` and `target-size` only, because jsdom has no layout; they are covered by the stylesheet test and the manual Lighthouse run.
- **Every screen and state:** axe runs over 36 states (home, generating, journey in each panel and goal state, banners, dialogs, completion), and each run also checks the state is really on screen. The build fails on a critical, serious or moderate violation.
- **Structure, contrast and keyboard tests:** headings, landmarks, unique IDs, `aria-*` references, live regions, `aria-expanded`, the progress element, labels and language; the contrast of every colour pair in the design, the focus ring colour, reduced motion, animation length and declared 44-pixel sizes read from `styles.css`; and a keyboard-event run through the main flow with focus targets, dialog Escape and Cancel, and the Details disclosure.
- **Test-first fixes (BR50.7):** four moderate findings, each caught by a check already in the suite, seen failing, then fixed with the smallest change (below).
- **No new feature:** no route, stored field, stack change or inline style or script; the page's content security policy is respected.
- **Workflow:** the placeholder accessibility job is removed; the accessibility tests run in the frontend job's coverage run with the 80% floor.
- **Manual passes:** `manual-pass-scripts.md` holds numbered steps, expected results and a results table for Lighthouse, the keyboard-only pass, VoiceOver, the four browsers, zoom, 320 pixels, touch targets, the dialog focus trap and the print preview. Every manual result is `not run`.

## Findings and fixes

| # | Finding | Found by | Fix |
|---|---|---|---|
| F1 | The dialog error line was `role="alert"` (assertive) | `structure.test.ts` | Changed to `role="status"` in `index.html`; an older test updated |
| F2 | Stage detail headings skipped a level (`h2` then `h4`), in 22 states | axe `heading-order`, `structure.test.ts` | The sub-headings are `h3` in `render.ts`, the style rule renamed in `styles.css`; appearance unchanged |
| F3 | Focus did not start on the Topic field when the home screen loaded | `keyboard.test.ts` | `state.ts` `start()` asks for focus on the topic field |
| F4 | After a rejected topic, focus stayed on the button | `keyboard.test.ts` | `state.ts` `submit()` asks for focus on the topic field; the typed text is kept |

The contrast tests (34) passed first time.

## Test coverage summary

| Suite | Result |
|---|---|
| Starting point (after the fifth unit) | 616 Python tests and 426 frontend tests passed |
| Backend and stack (`pytest backend/tests infra/tests --cov`) | 616 passed (unchanged); 99.78% line coverage (80% floor met) |
| Frontend (`npm run coverage`) | 629 passed (+203: structure 65, a11y 75, contrast 34, keyboard 29); 99.78% line coverage (80% floor met) |
| Lint, format, build | ESLint, Prettier and the frontend build pass |

About 200 new tests instead of the planned 60, because each of the 36 states runs through the same checks.

## Tests written but not executed in this stage

- **Not run, for the person:** Lighthouse in Chrome, the keyboard-only pass, VoiceOver in Safari, the main flow in Chrome, Firefox, Safari and Edge, 200% and 400% zoom, the 320-pixel window, the touch-target inspector check, the dialog focus trap and inert page, and the certificate print preview.
- `cdk synth` through the CDK command line was not run; the Python and stack suites pass and the workflow file parses, with nothing still referring to the removed job.

## Deviations from the plan

- **Live regions:** the plan said "exactly two live regions". The dialog is modal, so the page's two regions are inert while it is open; the test requires exactly two outside the dialog, one polite status inside it, and no assertive element anywhere.
- **Test count:** about 200 new tests instead of 60 (see above).
- **Shell edits:** two mechanical edits were made with `sed -i` (the plan's box ticks and one typing fix in a new test); nothing else in those files changed.

## Open items for the person

- **AC8.2.4 (a screen-reader pass) and AC8.3.2 (the four browsers) stay open** until you run the scripts in `manual-pass-scripts.md` after the deploy and record the results; nothing is ticked from automated results, and a browser you cannot run is recorded as "not run".
- Observations left unchanged: `main` is `position: sticky` (check the sticky header at 320 pixels and 200% zoom); the radio buttons reach 44 pixels only through their margin (check with the inspector); the checklist mentions a "More menu" that the page replaced with the Details disclosure.
- The narrow-screen header still keeps "Set a goal date" inside Details; the keyboard script covers that path and records whether two steps is acceptable.
- The earlier open items still stand (update the CDK command line before deploying, check the pinned GitHub Action versions, pass `-c budget_email=...`, and the TLS, Lambda-concurrency and rollback notes).

## Changes after the review

The reviewer passed the work as ready (`reviews/review-01.md`) with two Major findings, fixed straight away:

- **Reached-state checks:** 13 of the 36 states were only checked as "the page has text". Every state now has its own check that it is really on screen (the right stage open, the goal text, the dialog title for delete against replace, and so on), a banner-dismissed driver that fails unless a banner was visible first, and a test that every state has an entry. All 36 drivers reached their states; two of my own first-draft checks needed wording fixes. After the fix: 629 frontend tests passed.
- **Traceability:** AC8.3.3 (zoom and 320 pixels) and BR50.2 (the Lighthouse run) are now `Deferred` to the person's manual pass, alongside AC8.2.4 and AC8.3.2, since the automated tests do not test zoom, reflow or Lighthouse.
- **Not changed (Minor):** the skip-link tests follow the DOM order, so they are close to tautologies (the manual keyboard script covers the real order); contrast tests cover token pairs only, so disabled controls at 75% opacity are left to Lighthouse and the inspector; the stale "40 states" count in the results file was corrected to 36.
