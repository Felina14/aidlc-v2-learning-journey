# Accessibility Results — u6-accessibility-pass

## Sources

- `accessibility-checklist.md`, `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/`
- `functional-spec.md`, `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/` (BR50.1 to BR50.8)
- `code-generation-plan.md` and `manual-pass-scripts.md` in this folder
- The new tests: `frontend/tests/structure.test.ts`, `a11y.test.ts`, `a11y-states.ts`, `contrast.test.ts`, `keyboard.test.ts`

## Plain statement

The automated checks all pass after four fixes (below). No manual pass has been run: Lighthouse, the keyboard-only pass, VoiceOver, the four browsers, 200% and 400% zoom, 320 pixels, touch-target inspection and the certificate print preview are all `not run` and are for the person. **AC8.2.4 (a screen-reader pass) and AC8.3.2 (the four browsers) stay open until the person records a pass in `manual-pass-scripts.md`.** No checklist box has been ticked; a box is ticked only from a recorded pass.

## The tool

| Item | Value |
|---|---|
| Package | `axe-core`, development dependency of `frontend`, pinned exactly to `4.14.0` (the latest on npm when chosen) |
| Proof it runs | `a11y.test.ts` first tests: under jsdom 31 and vitest 5 axe reports an unlabelled input in a test-local fragment as a `label` violation (critical), and reports nothing once the label is added |
| Rule tags | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice` |
| Disabled rules | `color-contrast` and `target-size` only (they need real layout; covered by `contrast.test.ts` and the manual Lighthouse run). No other rule was disabled |
| Fails the build on | critical, serious and moderate violations |
| In the built page | No. `dist/` holds only `index.html`, `main.js`, `styles.css` and contains no axe code |
| Page head in tests | `loadPage()` copies only the body, so `a11y-states.ts` copies `lang` and `<title>` from the real `index.html` into jsdom before axe runs; `structure.test.ts` also checks `lang` and `<title>` in the file |

## States checked by axe (BR50.1)

36 states, each driven through the real controller with the fake `fetch` (no AWS call): Home (empty, topic error, style chosen, generating before and after 5 seconds, daily limit, generation failed, replacing with Back to my journey), loading, load error, Journey (first stage open, all closed, to-do open, done open, marked, unmarked, save error "not saved", save error "no longer saved", goal upcoming, due today, passed, goal form open, goal form with an error, goal save error, header details closed), Banners (first-stage, halfway, nudge due today, nudge three days, dismissed), Dialogs (delete, delete with an error, replace), Completion (without a name, with a name, Back to my journey view). A second block checks each state is really on screen, so a quiet axe run is not a blank page.

Not reproducible in jsdom: the header collapsed at 320 pixels (no media queries; Details carries a static `open`). Manual only.

## Test counts

| | Before | After |
|---|---|---|
| Python (`backend/tests`, `infra/tests`) | 616 | 616 |
| Frontend | 426 | 628 (+202: `structure` 65, `a11y` 74, `contrast` 34, `keyboard` 29) |

Coverage after: Python 99.78% (floor 80%); frontend lines 99.78% (floor 80%).

## Findings

First failing runs (before any fix). Four findings, each found by a check already in the suite, then fixed with the smallest change (BR50.7).

### F1 — The dialog error line is an assertive alert (moderate; checklist R5, BR50.5)

- Found by: `structure.test.ts`, "has exactly two live regions, both polite, and none assertive" in 11 states, and "the dialog error line … is a polite status line".
- First failing output: `AssertionError: expected [ Array(3) ] to deeply equal [ 'banner-area', 'live-region' ]` with the extra entry `+ "confirm-error"`; after the test was narrowed to the page's own regions, `expected 'alert' to be 'status'`.
- Fix: `frontend/index.html`, `#confirm-error`: `role="alert"` changed to `role="status"` (implicitly polite). One older test in `confirm-dialog.test.ts` asserted the old `alert` role and was updated to `status`.
- Status: fixed, tests pass.
- Note: the plan said "exactly two live regions". The dialog is modal, so the page's two regions are inert while it is open; a third, polite region inside the dialog is what lets its error be heard. The test therefore requires exactly two live regions outside the dialog and exactly one polite status inside it, and no assertive element anywhere. Whether VoiceOver actually speaks the dialog line (a region that is revealed rather than present from the start) is in the manual script (script 3, step 16) and is not claimed.

### F2 — Stage detail headings skip a level (moderate; checklist R2, WCAG 1.3.1)

- Found by: axe rule `heading-order` in 22 of the 36 states, and `structure.test.ts` "shows one h1 and no skipped heading levels" in 5 states.
- First failing output: `[S2 journey: first stage up next, open] heading-order (moderate): #stage-panel-1 > .detail:nth-child(1) > h4` (same element in every journey state); `heading levels in order: 1,2,4,4,4,4,4,4,4,2,2,2,2: expected [ 4 ] to deeply equal []`.
- Fix: the stage panel's sub-headings ("What it is", "Why it matters", …) are `h3` instead of `h4` (`frontend/src/render.ts`), and the matching size rule in `frontend/styles.css` is renamed from `h4` to `h3`. Appearance is unchanged.
- Status: fixed, tests pass.

### F3 — Focus does not start on the Topic field when the home screen loads (moderate; interaction spec "Page load, Home", checklist S1)

- Found by: `keyboard.test.ts`, "goes from topic to a generated journey, …".
- First failing output: `AssertionError: expected <body><a …(3)></a> …</body> to be <input id="topic-input" …(6)></input>` (focus was on the page body).
- Fix: `frontend/src/state.ts`, `start()`: when no journey is stored, the update also asks for focus on the topic field.
- Status: fixed, tests pass.

### F4 — After a rejected topic is submitted, focus stays on the button (moderate; interaction spec "Error shown", WCAG 3.3.1)

- Found by: `keyboard.test.ts`, "moves focus to the topic field after a rejected topic is submitted".
- First failing output: `AssertionError: expected <button type="submit" …(4)></button> to be <input id="topic-input" …(6)></input>`.
- Fix: `frontend/src/state.ts`, `submit()`: an invalid topic also asks for focus on the topic field. What was typed is kept (checked by the same test).
- Status: fixed, tests pass.

### Checks that passed the first time

- `contrast.test.ts`: all 34 tests passed on the first run (every pair in the contrast table, the focus ring colour equal to `--color-accent`, the `prefers-reduced-motion` rule, durations of 200 ms or less, declared 44-pixel sizes). Recorded green, not as a finding.
- axe: 14 of the 36 states reported nothing (the 8 Home states, loading, load error and the 3 Completion states, and the journey with every panel closed, which shows no stage detail headings). The other 22 reported only `heading-order` (F2).
- No other axe rule reported anything in any state.

## Open items

None raised at moderate or above and left unfixed. Items for the person to decide:

- O-1 (observation, not changed): `main`, `.site-header` and `.journey-header` share one rule with `position: sticky`. `main` is sticky although it holds the whole page; it has no visible effect, and the sticky header's behaviour at 320 pixels and 200% zoom (checklist O9) can only be judged in the manual keyboard and zoom passes.
- O-2 (observation, not changed): the radio buttons are 24 pixels with a 10-pixel margin, which the stylesheet test counts as a 44-pixel area, and the label row is 44 pixels high. Whether that is a satisfactory touch target is for the inspector check (script 6).
- O-3 (observation, not changed): the checklist (O1) mentions a "More menu"; the built page has the Details disclosure instead. The scripts cover Details.

## Checklist: every item, method and result

"Auto" = the result from this unit's suite. Manual = `not run` for every item that lists a manual method; the box stays unticked.

### Perceivable

| # | Automated result | Manual result |
|---|---|---|
| P1 | Pass: `structure.test.ts` checks the banner star, the loading skeleton and the stage-number circles are `aria-hidden`; axe passes `image-alt` and related rules | not run (screen reader, script 3 step 18) |
| P2 | Pass: `contrast.test.ts` (text 4.5 to 1, button text on accent) | not run (Lighthouse, script 1) |
| P3 | Pass: `contrast.test.ts` (borders, focus ring, progress fill 3 to 1) | not run |
| P4 | Partly automated: status words Done, Up next, To do are text (`render.test.ts`, `app.test.ts`) | not run (by eye) |
| P5 | Not testable in jsdom | not run (zoom, script 5) |
| P6 | Not testable in jsdom | not run (screen reader) |
| P7 | Pass: `structure.test.ts` (`lang="en"` and a title) | n/a |

### Operable

| # | Automated result | Manual result |
|---|---|---|
| O1 | Pass: `keyboard.test.ts` main flow with native controls and focus checks | not run (keyboard, script 2) |
| O2 | Pass: skip link first in the tab order on five screens; target `#main` can take focus | not run |
| O3 | Pass for order (no positive `tabindex`, document order); the visible ring is `contrast.test.ts` (3px, accent) | not run (ring seen by eye) |
| O4 | Partly: Escape and Cancel close both dialogs and return focus (`showModal()` is stubbed) | not run (focus trap, inert page) |
| O5 | Pass: focus targets after generate, restore, open, mark, unmark, goal form, banner dismiss, dialogs, completion, Back to my journey | not run |
| O6 | Pass for declared sizes (`contrast.test.ts`) | not run (inspector, script 6) |
| O7 | Pass: durations 200 ms or less; reduced-motion rule present | not run |
| O8 | Not automated (the 15-second generation limit is system-side; not re-checked here) | not run |
| O9 | Not testable in jsdom | not run |

### Understandable

| # | Automated result | Manual result |
|---|---|---|
| U1 | Pass: every visible field has a label; hints linked; references resolve | not run (screen reader) |
| U2 | Pass: topic error keeps the typed text and (after F4) takes focus | not run |
| U3 | Pass: typing does not validate or move focus (`keyboard.test.ts`, existing `validation` tests) | not run |
| U4 | Pass: both dialogs name what will be replaced or deleted | not run |
| U5 | Not automated | not run (by eye) |
| U6 | Pass: typing and focus change nothing on the page | not run |
| U7 | Existing `milestones.test.ts`, `nudge.test.ts` and `render.test.ts` import the blocked-word list; not re-run as a separate check | not run |

### Robust

| # | Automated result | Manual result |
|---|---|---|
| R1 | Pass: axe; native `button`, `details`, `dialog`, `progress`, `fieldset` used; ARIA only for expanded, controls, labels, status | n/a |
| R2 | Pass after F2: one `h1` per screen and no skipped level in 11 screens | not run |
| R3 | Pass: one `header`, `main`, `footer` | not run |
| R4 | Pass: `aria-expanded` on every stage button and changing; progress has a name and a value | not run (screen reader) |
| R5 | Pass after F1: two polite page regions, no assertive element anywhere; announcement text is covered by existing `app.test.ts` and `state.test.ts` | not run (spoken once) |
| R6 | Pass: existing `render.test.ts` and `confirm-dialog.test.ts` check model and typed text appear as text only; no inline style, script or handler is in the page (`structure.test.ts`) | n/a |
| R7 | Pass: unique ids and every `aria-labelledby`, `describedby`, `controls`, `owns` resolves in 11 states | n/a |

### Per-screen checks

| Screen | Automated result | Manual result |
|---|---|---|
| S1 Home | Pass: disabled-button hint is text; generating status shown; focus on Topic after F3 | not run |
| S2 Journey | Pass: one stage open at a time; marker words present; errors keep other controls usable | not run (320 pixel header) |
| S3 Banners | Pass: Dismiss reachable and moves focus to the heading; milestone banner does not take focus | not run |
| S4 Dialogs | Pass: Cancel focused, Escape and Cancel close, focus returns to the opener | not run (inert page) |
| S5 Certificate | Pass: heading takes focus; name field label says it is not saved | not run (print preview) |

## Story acceptance criteria

| Criterion | Status |
|---|---|
| AC8.1.1 to AC8.1.3 | Automated part passes; keyboard-only pass not run |
| AC8.2.1 to AC8.2.3 | Automated part passes; screen-reader confirmation not run |
| **AC8.2.4** | **Open: human-gated, not met until the person records a VoiceOver (or NVDA) pass** |
| AC8.3.1, AC8.3.4 | Contrast and declared sizes pass; Lighthouse and inspector not run |
| **AC8.3.2** | **Open: human-gated, not met until the person records the four-browser pass** |
| AC8.3.3 | Not run (zoom and 320 pixels) |
| AC8.3.5 | Automated axe part passes (no critical, serious or moderate violation in any state); Lighthouse not run |

## Not run

Lighthouse in Chrome; the keyboard-only pass; VoiceOver in Safari (and NVDA); the main flow in Chrome, Firefox, Safari and Edge; 200% and 400% zoom; the 320-pixel window including the collapsed header; touch targets by inspector; the dialog focus trap and inert page; the certificate print preview. All are for the person, using `manual-pass-scripts.md`.

## Assumptions & Open Questions

- [assumption] The severity of F3 and F4 is moderate (a stated interaction-spec behaviour that affects keyboard and screen-reader users); both are one-line changes.
- [assumption] A polite status role on the dialog error is the intended reading of "polite status line"; the page's two other regions stay as they were.
- None otherwise.
