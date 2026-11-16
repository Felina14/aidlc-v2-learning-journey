# Functional Design — u6-accessibility-pass — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U6, u6-accessibility-pass)
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US8.1, US8.2, US8.3)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1, NFR2, NFR9)
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` (WebApp)
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (no contract changes in this unit)
- Accessibility checklist: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/accessibility-checklist.md` (checks P1 to P7, O1 to O9, U1 to U7, R1 to R7 and the per-screen checks S1 to S5)
- Interaction spec and design system: `interaction-spec.md` and `design-system-mapping.md` in the same refined-mockups folder
- Built so far: the first five units' pages, with their jsdom tests (the frontend has vitest and jsdom, and no axe or Lighthouse tool yet)

This unit adds no feature (unit boundary: "no new features"). It checks every screen and state against the checklist, records what it finds, and fixes it. The target is WCAG 2.1 AA and the stories US8.1 to US8.3. Most of the checklist is already settled by the earlier units, which each built to it; the page already has a skip link, a declared language, a reduced-motion rule, one polite announcement region, native controls, and the certificate heading that takes focus. What was left open is how the checks are run and recorded, because three of them (a real screen reader, real browsers, a real zoom) need you and your machine, and no code can do them for you. These four questions are those choices. Everything else I could settle with a sensible default is under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Behaviour] How should the automated checks (axe or Lighthouse) be run?

AC8.3.5 asks for an automated check on each screen that finds no critical or serious problem. The project has jsdom tests but no accessibility tool. jsdom has no layout engine, so it cannot judge colour contrast or whether something is really visible; a real browser can.

A. Add axe to the existing test run, over every screen and state the page can show in jsdom (home, generating, journey, each banner, the dialogs, the goal form, the completion view, the error views), and run Lighthouse by hand in Chrome on the built page for the checks jsdom cannot do (contrast, target size, zoom). Record both in the unit's results (Recommended): the first part runs in CI on every merge and guards against regressions, the second covers what only a real browser can see.
B. Only run Lighthouse by hand in a browser, no new test tooling: nothing new to install, but nothing stops a later change from breaking accessibility unnoticed.
C. Add axe to the tests only and skip Lighthouse: automated and repeatable, but blind to contrast and layout.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] How should text contrast and touch-target sizes be proven?

The design system's contrast figures were worked out by hand and this unit has to confirm them (P2, P3, AC8.3.1, AC8.3.4). Touch targets must be at least 44 by 44 pixels (O6, AC8.3.4). jsdom cannot measure either.

A. Check the colours with a small test that reads the colour values from `styles.css` and works out the contrast ratio for every text and background pair the design system lists (4.5 to 1 for text, 3 to 1 for borders, the progress fill and the focus ring), and check target sizes in a real browser with Lighthouse and by eye at 320 pixels, recording the result (Recommended): the contrast numbers become a permanent test that fails if a colour is ever changed to something unreadable, and the size check uses a tool that can really measure.
B. Check both only by hand once with a browser tool and record the numbers: quick, but not repeated if the colours change later.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] Who runs the manual passes (keyboard, screen reader, browsers, zoom), and how is it recorded?

The keyboard-only pass, the screen-reader pass (AC8.2.4), the latest two releases of Chrome, Firefox, Safari and Edge (AC8.3.2) and 200% and 400% zoom need a person and a real machine. I can write the exact script for each pass, run the keyboard behaviour in jsdom tests, and read the code for ARIA mistakes, but I cannot hear VoiceOver or open Edge. The checklist says one screen reader (VoiceOver in Safari on macOS, or NVDA in Firefox) is the minimum.

A. I write a step-by-step script for each pass (keyboard, VoiceOver, the four browsers, zoom and 320 pixels) with the expected result for each step, you run them on your machine after the build and tick the results in the checklist; where a browser is not available to you, that row is recorded as "not run" with the reason, not as a pass (Recommended): it keeps the record honest, and your time stays on the one thing only you can do.
B. I mark the manual passes as done from the automated results and a code read: faster, but it would claim a screen-reader pass nobody ran, which AC8.2.4 does not allow.
C. Skip the browser matrix and keep one browser plus VoiceOver: least effort, but AC8.3.2 would be recorded as not met.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] What should happen to a problem the pass finds?

The unit's job is "fixes and a re-run" (US8.1 to US8.3), but also "no new features". A finding can be a small fix (a missing label, a colour a shade too light), or it can change how something looks or behaves (moving the "Set a goal date" button so it is reachable on a narrow screen without opening Details, which the fourth unit's review already noted).

A. Fix every critical, serious and moderate problem in this unit with a test that would have caught it, keep each fix to the smallest change that meets the check, and write anything bigger or purely cosmetic into the results as an open item for you to decide, with the reason (Recommended): the accessibility bar is met, a fix never turns into a redesign, and you decide anything that changes the look.
B. Fix everything found, including cosmetic and design changes: the most complete, but the least predictable for a deadline of 14 November 2026, and it risks the "no new features" boundary.
C. Only record problems and fix none: safest for the schedule, but the stories ask for fixes and a re-run, and NFR1 would not be met.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The unit adds no feature, no stored field, no server route and no stack change. The only code changes are fixes the checks justify, plus the new automated checks (an axe run in the test suite and a contrast test). A new development-only dependency for axe is allowed; it is pinned to an exact version and never shipped in the built page.
- [assumption] "Every screen and state" means the states listed in `mockups.md` and `interaction-spec.md`: home with and without a topic error, generating (before and after the reassurance at 5 seconds), journey with panels closed, one open, marked and unmarked, the load and save error views, the goal form (closed, open, with an error), the style choice, the banners (milestone and nudge), the delete and replace dialogs, the "no longer saved" message, the daily-limit message and the completion view with and without a name.
- [assumption] Contrast pairs come from `design-system-mapping.md`: body text, large text, text on the amber button, control borders, the progress fill, status markers and the focus ring. A pair that fails is a finding and is fixed under Q4.
- [assumption] The supported browsers are the latest two releases of Chrome, Firefox, Safari and Edge (AC8.3.2), on a laptop or desktop. A physical phone is not part of this pass; the checklist leaves it as an open question, and I will leave it out unless you want it added.
- [assumption] The pass confirms what the earlier units noted: the narrow-screen header keeps "Set a goal date" inside "Details", so a keyboard or screen-reader user reaches it by opening Details first. I will check whether this meets AC8.1.1 and record the result; if it does not, it is a finding under Q4.
- [assumption] Results are recorded in this unit's own files (a results table per check with Auto, Keys, SR or Visual, the date, what was run, and pass, fail or not run), and the checklist's boxes are ticked only for checks that were actually run. A check that was not run stays unticked with the reason.
- [assumption] No test calls any AWS service. The page is checked with the existing fake `fetch`, as in the earlier units.
- None otherwise.
