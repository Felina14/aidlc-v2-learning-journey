# Frontend Components — u6-accessibility-pass

## Sources

- `functional-spec.md` in this folder (rules BR50.1 to BR50.8, workflows 1 to 4)
- `accessibility-checklist.md`, `interaction-spec.md`, `mockups.md` and `design-system-mapping.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US8.1, US8.2, US8.3
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: NFR1
- The built page: `frontend/index.html`, `frontend/styles.css`, `frontend/src/` (`render.ts`, `app.ts`, `state.ts`, `confirm-dialog.ts`, `certificate.ts`)

This unit adds no component. It lists the existing pieces the checks touch, what each must expose to assistive technology, and the new test-only pieces.

## Component hierarchy checked

| Piece | Role | Accessibility contract checked |
|---|---|---|
| Skip link (`a.skip-link`) | First focusable item | First in tab order; target `#main`; visible on focus (AC8.1.3, O2) |
| Header (`header`) | Title, progress, goal line, Details | One `header`; progress element has a name and value (AC8.2.2); Details is a native disclosure reporting expanded or collapsed |
| Main (`main#main`) | All screens | One `main`; one `h1` per screen; headings in order (AC8.2.1, R2, R3) |
| Home form | Topic input, style radios, Generate | Visible labels; hint linked with `aria-describedby`; radios in a labelled group; disabled-button hint is text; focus starts on the topic field (S1, U1) |
| Generating view | Status while waiting | Announced politely; reassurance after 5 seconds announced once (FR1.7, R5) |
| Stage list | Panels, mark and unmark buttons | Stage button reports `aria-expanded`; Done, Up next and To do are words as well as colour (P4, R4); focus targets after mark and unmark (O5) |
| Goal line and form | Date, days left, pace, form | Labelled date field; hint when the browser shows a text field; errors linked to the field; Escape closes; focus returns to the opener (U1, U2) |
| Banner area | Milestone and nudge banners | Polite status region; text is real text; icon hidden from assistive technology; Dismiss reachable by keyboard; never takes focus (S3, R5) |
| Confirm dialogs | Delete and replace | Native `dialog` with `showModal()` (jsdom has none, so the tests only check the call was made and the labels; the focus trap, inert page and native Escape are in the manual keyboard script); labelled and described; Cancel first with initial focus; Escape closes; focus returns to the opener (S4, O4) |
| Completion view | `h1` "Journey complete", certificate, name field, buttons | `h1` takes focus on arrival; certificate panel is a labelled section; name field label says it is not saved; print output readable in black and white (S5) |
| Live regions | All announcements | Two polite regions (banner area, announcement region); none assertive, so the dialog error line moves from alert to polite status; each message spoken once (R5) |
| Footer | AI label and notes | One `footer` (R3) |

## New test-only pieces

| Piece | Path | Purpose | Rule |
|---|---|---|---|
| `a11y.test.ts` | `frontend/tests/a11y.test.ts` | Puts the page into every state in the scope table and runs axe on each | BR50.1 |
| `a11y-states.ts` | `frontend/tests/a11y-states.ts` | Helper that drives the controller into each state with the fake `fetch` | BR50.1 |
| `contrast.test.ts` | `frontend/tests/contrast.test.ts` | Reads the colour tokens from `styles.css`, works out contrast ratios for the pairs in the contrast table | BR50.3 |
| `keyboard.test.ts` | `frontend/tests/keyboard.test.ts` | Keyboard-only run of the main flow, focus targets, dialog focus and Escape | BR50.4 |
| `structure.test.ts` | `frontend/tests/structure.test.ts` | Heading order, landmarks, unique IDs, valid `aria-*` references, the two polite live regions, `aria-expanded` on stage buttons and the progress element's name and value | BR50.1, BR50.5 |
| `manual-pass-scripts.md` | the unit's Code Generation folder | Step-by-step scripts and a results table for the passes the person runs | BR50.6 |
| `accessibility-results.md` | the unit's Code Generation folder | The record of every check: method, result, findings, fixes, open items | BR50.6, BR50.7 |

## Props and state

No component state is added. The tests read the existing controller state (`screen`, `view`, `open`, `banner`, `focus`, `focusSeq`) and the existing DOM.

## Interaction flows

The flows tested are the ones in `functional-spec.md` Workflow 2, with focus targets from `interaction-spec.md`: generate, open a stage, mark, unmark, goal form (open, save, clear, Escape), banner dismiss, delete and replace dialogs, completion view and "Back to my journey".

## Form validation rules

Unchanged from the earlier units. This unit checks only that each error is linked to its field, names the field, says how to fix it and keeps what was typed (U2), and that validation runs on leaving the field and on submit, not on every keystroke (U3).

## API integration points

None. The tests use the existing fake `fetch`.

## Assumptions & Open Questions

- [assumption] axe is added as a pinned development dependency; the exact version is chosen and checked when the dependency is added in Code Generation.
- [assumption] The test-only files above are the only new files in `frontend/`; any fix edits existing files.
- None otherwise.
