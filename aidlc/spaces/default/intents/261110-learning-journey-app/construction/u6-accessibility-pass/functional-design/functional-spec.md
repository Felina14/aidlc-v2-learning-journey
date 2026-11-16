# Functional Specification — u6-accessibility-pass

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U6: "no new features")
- `unit-of-work-story-map.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US8.1, US8.2, US8.3
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: NFR1, NFR9
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` (WebApp)
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (no change)
- `accessibility-checklist.md`, `interaction-spec.md`, `mockups.md` and `design-system-mapping.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/`
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder (all A)
- `frontend-components.md` in this folder (the pieces the checks touch)

This unit is a UI-only verification unit, so this file is self-contained: it holds the workflows, the rules (numbered BR50.1 to BR50.8, also in `rules.md`), the states and the result record. It adds no feature, no stored field, no server route and no stack change.

## Rules

| ID | Rule | Source |
|---|---|---|
| BR50.1 | Every screen and state in the scope table below is checked by an automated axe run in the test suite; a critical, serious or moderate violation fails the build. | AC8.3.5, AC8.2.1, Q1 |
| BR50.2 | The Lighthouse run in Chrome on the built page covers what jsdom cannot see (rendered contrast, target size, zoom, reflow). Its result is recorded, not assumed. | AC8.3.5, AC8.3.1, AC8.3.4, Q1 |
| BR50.3 | A test reads the colour tokens from `styles.css` and works out the contrast ratio for every pair in the contrast table below. Text must reach 4.5 to 1; borders, the progress fill, status markers and the focus ring must reach 3 to 1. The test fails if a token is changed to a failing value. | AC8.3.1, P2, P3, Q2 |
| BR50.4 | The keyboard behaviour that jsdom can show (tab order, skip link first, focus targets after each action, Escape in dialogs, no trap, every function reachable) is tested in the suite. What it cannot show (the visible 3-pixel ring, sticky-block overlap) is a manual check. | AC8.1.1 to AC8.1.3, O1 to O5, O9 |
| BR50.5 | Announcements are checked as text: the page has exactly two live regions, both polite (the banner area and the page's announcement region), and no assertive one; each announcement in the interaction spec is sent once. The dialog's error line is currently `role="alert"` (assertive); it becomes a polite status line, the smallest fix that meets the checklist (R5). Whether a real screen reader speaks them is a manual check. | AC8.2.3, R5 |
| BR50.6 | Each manual pass (keyboard, VoiceOver, the four browsers, 200% and 400% zoom, 320 pixels) has a written script with an expected result per step. The person runs it. A pass that was not run is recorded as "not run" with the reason and never as a pass; the checklist box stays unticked. | AC8.2.4, AC8.3.2, AC8.3.3, Q3 |
| BR50.7 | A critical, serious or moderate finding is fixed in this unit by the smallest change that meets the check, with a test that would have caught it. A bigger or cosmetic change is written down as an open item for the person with the reason; it is not made. | US8.1 to US8.3, Q4 |
| BR50.8 | The pass changes behaviour only where a check requires it. No new control, message, route or stored field is added. A new development-only dependency (axe) is pinned to an exact version and is never in the built page. | Unit boundary |

## Scope: screens and states checked

| Screen | States |
|---|---|
| S1 Home | empty; topic error shown; style not chosen (button disabled with its hint); style chosen; generating, before and after the 5-second reassurance; daily-limit message; generation failed |
| S2 Journey | all panels closed; one open (up next, to do, done); marked; unmarked; load error; save error ("not saved" and "no longer saved"); goal line (none, upcoming, due today, passed); goal form closed, open, with an error; header collapsed and open at 320 pixels |
| S3 Banners | each milestone banner; each nudge banner; dismissed |
| S4 Dialogs | delete confirmation; replace confirmation |
| S5 Completion | with and without a name; "Back to my journey" view |
| All | skip link, landmarks, headings, language, the live region |

## Contrast table checked by BR50.3

Written from the built `frontend/styles.css`, which has these colour tokens: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-contrast`, `--color-border`, `--color-divider` (decorative, not checked) and `--color-error`. There is no `--color-done` token: the design system's tightest pair does not exist in the built page, and the Done marker is words plus a shape in the existing text colours. The focus ring is `--focus-ring` (a literal `#8a4b08` inside the value), and the progress fill is the browser's `accent-color: var(--color-accent)`.

| Foreground | Background | Needs |
|---|---|---|
| `--color-text` | `--color-bg`, `--color-surface` | 4.5 to 1 |
| `--color-text-muted` | `--color-bg`, `--color-surface` | 4.5 to 1 |
| `--color-accent` (text and links) | `--color-bg`, `--color-surface` | 4.5 to 1 |
| `--color-accent-contrast` | `--color-accent` (button text) | 4.5 to 1 |
| `--color-error` | `--color-bg`, `--color-surface` | 4.5 to 1 |
| `--color-border` | `--color-bg`, `--color-surface` | 3 to 1 |
| the colour in `--focus-ring` | `--color-bg`, `--color-surface` | 3 to 1 |
| `--color-accent` as the progress fill | `--color-bg`, `--color-surface` | 3 to 1 |

Also checked by the test from the stylesheet text: the colour inside `--focus-ring` equals `--color-accent` (so one token cannot drift from the other), every `@media (prefers-reduced-motion)` rule exists, and declared sizes of buttons, inputs, radios and links are at least 44 by 44 pixels (`min-height`, `min-width` or padding that adds up to it), because Lighthouse and axe check only a 24-pixel minimum. Disabled controls (`opacity: 0.75`) are exempt from the contrast rule by WCAG, but the hint text beside the disabled Generate button is checked as ordinary text. The dialog backdrop (`rgba`) carries no text and is not checked.

## Workflow 1 — Automated checks

Stories: US8.2, US8.3. Rules: BR50.1, BR50.3, BR50.5, BR50.8.

1. Add axe as a pinned development dependency of the frontend tests.
2. A test helper opens the page in jsdom with the fake `fetch` and puts it into each state in the scope table, using the controller as the earlier tests do.
3. For each state, axe runs on the document with the WCAG 2.1 A and AA tags (and best-practice rules). Rules that need real layout (`color-contrast`, `target-size`, `scrollable-region-focusable` if it misfires) are turned off in jsdom and covered by BR50.3 and BR50.2 instead; every other rule stays on. Code Generation first confirms axe runs under jsdom 31 and vitest 5; if it does not, the fallback is to run the same states through the structure tests and Lighthouse only, and that is recorded.
4. The test fails on any critical, serious or moderate violation and prints the rule, the element and the state.
5. Separate tests check heading order (one `h1` per screen, no skipped levels), landmarks (one each of header, main, footer), unique IDs, every `aria-*` reference pointing at an element that exists, and that the live region is polite and single.
6. The contrast test (BR50.3) runs on `styles.css` tokens.

Result states: all states clean; a violation found (then Workflow 4).

## Workflow 2 — Keyboard and focus in the suite

Stories: US8.1. Rules: BR50.4.

1. The skip link is the first focusable item on every screen (AC8.1.3) and moves focus to the main region.
2. A keyboard-only run through jsdom events covers: enter a topic, choose a style, generate, open a stage, mark it, unmark it, open the goal form, save and clear a goal date, dismiss a banner, reach the certificate, use "Back to my journey", and cancel and confirm both dialogs (AC8.1.1).
3. After each action focus lands where the interaction spec says (after generating, opening and closing a dialog, marking a stage, unmarking, banner dismissed, arrival at the completion view).
4. Dialogs: the tests check the labels, that `showModal()` is called, that Cancel has initial focus, that Escape and Cancel close the dialog and that focus returns to the opener. jsdom has no `showModal()`, so the focus trap and the inert page behind are checked only in the manual keyboard script.
5. The narrow-screen header: "Set a goal date" sits inside the Details disclosure under 768 pixels. The test confirms that Details is a native, keyboard-operable control that reports expanded or collapsed, so the goal control is reachable by keyboard and screen reader in two steps. Whether two steps satisfies AC8.1.1 is judged in the manual pass and recorded; if it does not, it is a finding (BR50.7). The header's collapsed state at 320 pixels cannot be reproduced in jsdom (no media queries, and Details carries a static `open`), so it is checked only in the manual pass and Lighthouse.

Result states: every function reachable; a trap or lost focus found (then Workflow 4).

## Workflow 3 — Manual passes (run by the person)

Stories: US8.1, US8.2, US8.3. Rules: BR50.2, BR50.6.

1. The unit writes `manual-pass-scripts.md` (in the Code Generation folder): for each pass, numbered steps, the expected result per step, and a results table with columns Check, Method, Browser or reader, Date, Result (pass, fail, not run) and Notes.
2. Passes: Lighthouse in Chrome on every screen (AC8.3.5, contrast, target size); keyboard only with the mouse unplugged (AC8.1.1 to AC8.1.3); VoiceOver in Safari on macOS through the main flow (AC8.2.1 to AC8.2.4); the main flow in the latest two releases of Chrome, Firefox, Safari and Edge (AC8.3.2); 200% and 400% zoom and a 320-pixel window (AC8.3.3); touch-target size by eye and with the browser's inspector (AC8.3.4); print preview of the certificate in black and white.
3. The person runs them after the build and fills the results. An unavailable browser is recorded as "not run" with the reason.
4. A fail becomes a finding (Workflow 4). The checklist's boxes are ticked only for checks with a recorded pass.

Result states: pass; fail; not run.

## Workflow 4 — A finding

Rules: BR50.7, BR50.8.

1. Record the finding: check, screen and state, what was seen, severity (critical, serious, moderate, minor).
2. Critical, serious or moderate: write a test that fails for it, make the smallest fix, see the test pass, and re-run the checks that cover it.
3. Minor, or a change to how something looks or behaves beyond the smallest fix: write it into the results as an open item with the reason; the person decides.
4. Re-run Workflow 1 and Workflow 2 after the fixes; the manual passes are re-run for any finding they raised.

Result states: fixed and re-checked; open item for the person.

## State machine — a check

| From | Event | To |
|---|---|---|
| Not run | Automated check runs and passes | Passed (automated) |
| Not run | Automated check runs and finds a problem | Finding |
| Not run | Manual script run by the person and passes | Passed (manual) |
| Not run | Manual script cannot be run (no browser or reader) | Not run, with the reason recorded |
| Finding (critical, serious, moderate) | Fixed with a test and re-run | Passed |
| Finding (minor or larger change) | Written as an open item | Open item |

## Business scenarios

| Scenario | Expected result |
|---|---|
| A new journey state is added later and has an unlabelled input | The axe run fails the build and names the state |
| A colour token is changed to a lighter grey | The contrast test fails and names the pair |
| Tab from the address bar on any screen | The first stop is the skip link; Enter moves focus to the main region |
| Open a stage with the keyboard and mark it | The stage button reports expanded; focus goes to the next stage's heading |
| Open the delete dialog and press Escape | The dialog closes and focus returns to the "Delete my journey" button |
| 320-pixel window, Details closed | No sideways scrolling; progress bar, percentage and count are visible; "Set a goal date" is inside Details |
| Dismiss a milestone banner with the keyboard | The banner goes and focus lands on the page heading |
| Screen reader on the completion view | "Journey complete" is read first; the name field says it is not saved |
| The pass is finished with AC8.2.4 or AC8.3.2 never run | They are recorded as human-gated and not met; the unit's code is complete and its results file says which two items remain open; they are closed only by the person's recorded pass |
| Edge is not available to the person | The Edge row says "not run: no Edge available"; the box stays unticked; AC8.3.2 is recorded as partly met |
| The person is asked to run VoiceOver and does not | AC8.2.4 is recorded as not met; it is never ticked from automated results |
| Axe reports a moderate problem | It is fixed with a test in this unit |
| A finding would need a redesign of the header | It is written up as an open item; no redesign is made |

## Derived views

Rules summary (derived from the Rules table above): BR50.1 and BR50.2 automated checks; BR50.3 contrast; BR50.4 and BR50.5 keyboard and announcements in the suite; BR50.6 manual passes; BR50.7 findings; BR50.8 no new features.

## Assumptions & Open Questions

- [assumption] The unit adds no data and no entities, so there is no ER diagram and no `entities.md`; `rules.md` holds the same eight rules in machine-readable form.
- [assumption] axe rules that depend on layout are disabled in jsdom and covered by the contrast test and the Lighthouse run; every other rule runs.
- [assumption] Lighthouse is run by the person in Chrome on the built page (`frontend/dist`), served locally, because no browser is available to the build.
- [assumption] AC8.2.2 is checked by explicit structure assertions (`aria-expanded` present and changing on each stage button; the progress element has an accessible name and a value), not by axe alone.
- [assumption] AC8.2.4 and AC8.3.2 are human-gated: the traceability marks them covered by the scripts (BR50.6), and the unit's results file states they stay open until the person records a pass.
- [assumption] The physical phone check is out of scope, as the checklist leaves it open.
- [assumption] "Moderate" is included in the must-fix severities (Q4: critical, serious and moderate), which is stricter than NFR1's "critical or serious".
- None otherwise.
