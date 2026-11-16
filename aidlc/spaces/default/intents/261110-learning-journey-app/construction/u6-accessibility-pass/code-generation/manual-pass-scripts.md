# Manual Pass Scripts — u6-accessibility-pass

## Sources

- `accessibility-checklist.md` and `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/`
- `functional-spec.md` and `rules.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/` (BR50.2, BR50.6, Workflow 3)
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US8.1 to US8.3)

These scripts are for you to run on the deployed site (or on `frontend/dist` served locally, for example `npx serve frontend/dist` from the repository root). The build ran none of them. Every result starts as `not run`; write `pass`, `fail` or `not run` with the reason in Notes. A `fail` is a finding: tell the builder, and it is fixed test-first (BR50.7). Tick a box in `accessibility-checklist.md` only for a recorded `pass`. A screen-reader pass is never recorded from the automated results.

Before you start, have a journey with 5 or 6 stages, and know how to reach each of these states: no journey (home), a journey in progress, a goal date set, a banner showing, both dialogs open, and a finished journey (the certificate).

Result columns used in every table: Check, Method, Browser or reader, Date, Result (`pass`, `fail`, `not run`), Notes.

## 1. Lighthouse in Chrome (BR50.2, AC8.3.5, AC8.3.1, AC8.3.4)

Covers what jsdom cannot see: rendered contrast, target size, zoom and reflow.

1. Open the site in Chrome in a new window with no extensions (or an Incognito window). Expected: the home screen loads.
2. Open DevTools, choose the Lighthouse tab, tick only Accessibility, choose Desktop, press Analyze. Expected: a score and a list of passed and failed audits. Write the score in Notes.
3. Repeat step 2 with Mobile.
4. Repeat steps 2 and 3 on the journey screen (make or reload a journey), then with a goal date set and a banner showing, then on the finished journey (certificate).
5. Open both confirmation dialogs and run Lighthouse on each (it runs on the page behind a dialog; note that in Notes).
6. For each failed audit write its name and the element. Expected: no critical or serious failure. Contrast and target-size audits in particular must pass.

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| Home, desktop | Lighthouse | Chrome | 2026-11-12 | pass | Score 100, no failed audits. Lighthouse CLI 12.8.2, headless Chrome, accessibility category only, live site |
| Home, mobile | Lighthouse | Chrome | 2026-11-12 | pass | Score 100, no failed audits. Same run, mobile preset |
| Journey, desktop and mobile | Lighthouse | Chrome | | not run | Needs a journey in the browser's own session; run from DevTools |
| Journey with goal date and banner | Lighthouse | Chrome | | not run | |
| Finished journey and certificate | Lighthouse | Chrome | | not run | |
| Dialogs (delete and replace) | Lighthouse | Chrome | | not run | |

## 2. Keyboard only (AC8.1.1 to AC8.1.3, checklist O1 to O5, O9)

Unplug the mouse or do not touch the trackpad. Use Tab, Shift+Tab, Enter, Space, the arrow keys and Escape.

1. Reload the home screen and press Tab once. Expected: the "Skip to main content" link appears, with a visible 3-pixel amber ring. Press Enter. Expected: focus moves to the main region and the next Tab lands on the first control inside it.
2. On a fresh load with no journey, expected: focus is already in the Topic field. Type a topic.
3. Tab to the three teaching styles; use the arrow keys to move between them; Space selects one. Expected: the Generate button becomes enabled and every control shows a visible ring.
4. Press Enter in the Topic field with no style chosen. Expected: nothing is submitted.
5. Choose a style and press Enter in the Topic field. Expected: generation starts, the page does not change context before that, and when the journey arrives focus is on the journey heading.
6. Tab through the journey from the top. Expected: order follows the visual order; the sticky header never hides the focused control (O9); no control is reached that is inside a closed stage.
7. Press Enter on a stage button to open it, then Enter again to close it. Expected: one stage open at a time; focus stays on the button.
8. Open a stage, Tab to "Mark stage N complete", press Enter. Expected: the stage closes, the next stage opens, and focus is on the next stage's heading.
9. Open a done stage and press its "Mark stage N as not complete". Expected: focus stays on the button, now reading "Mark stage N complete".
10. Reach "Set a goal date" (on a narrow window it is inside Details: Tab to Details and press Enter first; on a wide window it is already visible). Press Enter. Expected: the goal form opens and focus is in the date field.
11. Press Escape in the goal form. Expected: the form closes and focus returns to the goal button.
12. Open the form again, type a date up to 365 days ahead, press Enter. Expected: saved, focus on the goal button. Use Clear to remove it.
13. When a banner shows, Tab to Dismiss and press Enter. Expected: the banner goes and focus lands on the page heading.
14. Press "Delete my journey". Expected: a dialog opens with focus on Cancel; Tab and Shift+Tab stay inside the dialog (the focus trap); the page behind cannot be reached. Press Escape. Expected: the dialog closes and focus returns to "Delete my journey". Repeat with "Start a new journey" and with Cancel.
15. Confirm "Start a new journey". Expected: the topic screen opens with focus in the Topic field and "Back to my journey" is reachable.
16. Finish a journey (mark every stage). Expected: the "Journey complete" heading takes focus; Tab reaches the name field, "Print or save certificate" and "Back to my journey"; activate "Back to my journey" and expected: focus on the page heading.
17. Check that at no point focus gets stuck anywhere other than the open dialog. Expected: no keyboard trap.
18. Check there is no time limit anywhere on a learner's action (O8).

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| Skip link first and works (O2) | Keyboard | | | not run | |
| Every function by keyboard (O1) | Keyboard | | | not run | |
| Focus order and visible ring (O3) | Keyboard | | | not run | |
| Dialog focus trap, Escape, focus return, page inert (O4) | Keyboard | | 2026-11-12 | not run | Partly seen in the automated run (Chromium): focus starts on Cancel, Escape and Cancel close, focus returns to the opening button. Trap and inert not checked |
| Focus after each action (O5) | Keyboard | Chromium (automated) | 2026-11-12 | pass | Mark stage: next stage heading. Goal save/clear: goal button. Dialog close: opening button. Finish: "Journey complete" heading. Back: journey title. Delete: topic field |
| Sticky header never hides focus (O9) | Keyboard | | | not run | |
| Goal control reachable in two steps when Details is closed (AC8.1.1) | Keyboard, 320 px | Chromium (automated) | 2026-11-12 | pass | At 320 px the goal button is inside Details; Details then Set a goal date |

## 3. VoiceOver in Safari on macOS (AC8.2.1 to AC8.2.4, checklist P1, P6, R2 to R5, U1, U2)

Turn VoiceOver on with Command+F5. Use Control+Option with the arrow keys, and the rotor (Control+Option+U) for headings, landmarks and form controls. If you also have NVDA in Firefox on Windows, repeat the table once for it; one of the two is the minimum.

1. Load the home screen. Open the rotor and list landmarks. Expected: banner (header), main and footer, once each, plus the skip link first.
2. List headings. Expected: one level-1 heading, "What do you want to learn?".
3. Move to the Topic field. Expected: it is announced as "Topic", with the hint "2 to 100 characters" read with it.
4. Move to the teaching styles. Expected: announced as a group "Choose your teaching style", each option with its description.
5. Move to the Generate button before choosing a style. Expected: it is dimmed and "Choose a teaching style to continue" is read as its description.
6. Submit a topic that is invalid (for example `!!!!`). Expected: the error names the field and says how to fix it, and it is announced once.
7. Generate. Expected: "Generating your journey" is announced; after 5 seconds the longer-than-usual note; then "Your journey is ready" once each.
8. On the journey, list headings. Expected: the journey title as level 1, stages as level 2, the stage detail headings as level 3, in order with no level skipped.
9. Move to a stage button. Expected: it reads the stage number, title, status word (Done, Up next or To do), hours, and "collapsed" or "expanded". Open it: expected "expanded".
10. Find the progress element. Expected: "Journey progress" with its value.
11. Mark a stage. Expected: "Stage N complete. X of Y stages complete, Z percent. Stage M is open." spoken once, not twice.
12. Unmark it. Expected: "Stage N marked as not complete..." spoken once.
13. Cause a save error if you can (turn the network off in DevTools and mark a stage). Expected: the error text is spoken.
14. Open the goal form and save a date. Expected: "Goal date saved" spoken once. Clear it: "Goal date cleared".
15. Reach a banner (a milestone or a nudge). Expected: the banner text is spoken when it appears, without moving focus.
16. Open the delete dialog. Expected: the dialog title and explanation are read, focus is on Cancel. Trigger the delete error if you can (network off, press Delete journey): expected the error line is read politely (this is the changed line, see `accessibility-results.md`, finding F1; record here whether it is spoken at all).
17. Finish a journey. Expected: "Journey complete" is read first. The name field's label reads "Name on certificate (optional, not saved)".
18. Decorative items: the star in the banner, the stage number circles and the loading skeleton are not read.

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| Landmarks and headings (R2, R3) | Screen reader | VoiceOver, Safari | | not run | |
| Form labels, hints and errors (U1, U2) | Screen reader | VoiceOver, Safari | | not run | |
| Stage state and progress value (R4, AC8.2.2) | Screen reader | VoiceOver, Safari | | not run | |
| Each announcement spoken once (R5, AC8.2.3) | Screen reader | VoiceOver, Safari | | not run | |
| Dialog error line spoken (F1) | Screen reader | VoiceOver, Safari | | not run | |
| Decorative items not read (P1) | Screen reader | VoiceOver, Safari | | not run | |
| Main flow end to end (AC8.2.4) | Screen reader | VoiceOver, Safari | | not run | |

## 4. The main flow in four browsers (AC8.3.2)

Run on the latest two releases of each browser. For each: generate a journey, open and mark a stage, set and clear a goal date, open and cancel both dialogs, finish a journey, print preview the certificate.

1. Note the browser name and version in the table.
2. Home: Topic, style, Generate. Expected: a journey appears.
3. Open, mark and unmark a stage. Expected: figures update, the progress bar moves.
4. Goal date: set, save, clear. Expected: the date field works (in a browser that shows a text box, the format hint "Use the format YYYY-MM-DD" shows).
5. Delete and replace dialogs: open, Escape, open, Cancel. Expected: they behave as in script 2.
6. Mark every stage. Expected: the completion view and the certificate.

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| Main flow, latest | Manual | Chrome | 2026-11-12 | pass | Run as an automated Chromium (Playwright) session at 320 px, not by hand in Chrome: generate, mark, goal set and clear, both dialogs (Escape and Cancel), finish, certificate print view (only the certificate prints), delete. Screenshots in recordings/ |
| Main flow, previous | Manual | Chrome | | not run | |
| Main flow, latest | Manual | Firefox | | not run | |
| Main flow, previous | Manual | Firefox | | not run | |
| Main flow, latest | Manual | Safari | | not run | |
| Main flow, previous | Manual | Safari | | not run | |
| Main flow, latest | Manual | Edge | | not run | |
| Main flow, previous | Manual | Edge | | not run | |

If a browser is not available, write `not run: no <browser> available` in Result. The box in the checklist stays unticked and AC8.3.2 stays only partly met.

## 5. Zoom and narrow window (AC8.3.3, checklist P5)

1. In Chrome, set the zoom to 200% (Command or Control and plus). On the home screen and a journey, expected: all text still readable, no content lost, every control usable, no sideways scrolling.
2. Set the zoom to 400%. Expected: the same, with no sideways scrolling (reflow).
3. Reset the zoom. Make the window 320 pixels wide (DevTools device toolbar, width 320). Expected: no sideways scrolling.
4. At 320 pixels with Details closed. Expected: the title, the progress bar, the percentage and the count are visible; "Set a goal date" is inside Details.
5. At 320 pixels open Details with the keyboard or a tap. Expected: the style, the total hours, the goal line and "Set a goal date" are shown. Record whether reaching the goal control in two steps is acceptable (AC8.1.1); if not, it is a finding.
6. At 320 pixels with a banner and with the goal form open. Expected: nothing is cut off and the sticky header does not cover over a third of the window.

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| 200% zoom | Manual | Chrome | | not run | |
| 400% zoom | Manual | Chrome | 2026-11-12 | pass | By equivalence: 400% at 1280 px is a 320 px layout; no sideways scroll in any state (see next row). Not run with the browser zoom control |
| 320 pixels wide | Manual | Chromium (automated) | 2026-11-12 | pass | scrollWidth stayed 320 on home, journey, goal form open, banner showing, both dialogs, finished journey |
| Collapsed header and goal control via Details at 320 px | Manual | Chromium (automated) | 2026-11-12 | pass | Title, progress bar, percentage and count visible with Details closed; style, hours and goal control inside Details |

## 6. Touch targets (AC8.3.4, checklist O6)

1. In DevTools, inspect each kind of control: Generate and other buttons, the stage buttons, the Details summary, the date and text fields, the style options, the Dismiss button, the dialog buttons and the skip link. Read the computed height and width in the box model.
2. Expected: each is at least 44 by 44 pixels, with about 8 pixels between neighbours. The style radio circle itself is 24 pixels; with its margin and its label row it must give a 44-pixel target.
3. Turn on the mobile device toolbar and check by eye that nothing is hard to hit.

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| Buttons, toggles, summary, fields | DevTools | Chrome | | not run | |
| Style radio options | DevTools | Chrome | | not run | |
| Spacing between targets | Visual | Chrome | | not run | |

## 7. Certificate print preview (checklist S5, BR41.3)

1. Finish a journey, type a made-up name, press "Print or save certificate".
2. In the print preview, choose black and white (or greyscale). Expected: only the certificate panel prints, the name, the topic, the number of stages and the date are legible, and nothing else (header, buttons, footer) appears.

| Check | Method | Browser or reader | Date | Result | Notes |
|---|---|---|---|---|---|
| Print preview in black and white | Manual | | | not run | |

## Assumptions & Open Questions

- [assumption] The person runs these passes after the build; nothing here was run by the build.
- [assumption] The "More menu" in the checklist (O1) does not exist in the built page: it was replaced by the Details disclosure, so script 2 covers Details instead.
- Open: whether a physical phone check is wanted (the checklist leaves it open).

## Run log

- 2026-11-12: automated proxies run from the builder's machine against the live site (Lighthouse CLI on the home page; a scripted Chromium session for the main flow at 320 px). Recorded above with the method named. Still to run by a person: VoiceOver (section 3), Firefox, Safari and Edge (section 4), 200% zoom, the Lighthouse journey states, the keyboard rows not listed as pass, and touch targets (section 6). Checklist boxes stay unticked for screen-reader rows.
