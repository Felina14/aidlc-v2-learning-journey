# Accessibility Checklist — Learning Journey App

## Sources

- `wireframes.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- `user-flow.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/user-flow.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- `mockups.md`, `interaction-spec.md` and `design-system-mapping.md` in this folder

Target: WCAG 2.1 Level AA (NFR1). Boxes start empty and are ticked during Build and Test. "Auto" means an axe or Lighthouse run; "Keys" means a keyboard-only pass; "SR" means a manual screen-reader pass; "Visual" means a check by eye or with a contrast tool.

## Test Setup

| Item | Choice |
|---|---|
| Automated | axe or Lighthouse on every screen and state in `mockups.md`; pass = no critical or serious violations (AC8.3.5) |
| Keyboard | Whole main flow with the mouse unplugged (AC8.1.1) |
| Screen reader | The main flow with VoiceOver in Safari (macOS) and NVDA in Firefox (Windows) if available; one of the two as a minimum (AC8.2.4) |
| Browsers | Latest two releases of Chrome, Firefox, Safari and Edge (AC8.3.2) |
| Zoom and width | 200% and 400% zoom; 320 pixel width (AC8.3.3) |

## Perceivable

| # | Check | Method | Done |
|---|---|---|---|
| P1 | Every image or icon that carries meaning has a text alternative; decorative icons and the ladder line are hidden from assistive technology | Auto, SR | [ ] |
| P2 | Body text contrast is at least 4.5 to 1 and large text 3 to 1, including text on the amber button | Visual, Auto | [ ] |
| P3 | Control borders, the progress fill, markers and focus rings are at least 3 to 1 against their background | Visual | [ ] |
| P4 | Done, Up next, To do, errors, milestones and nudges each have words or a shape as well as colour | Visual | [ ] |
| P5 | Text resizes to 200% without loss of content or function; reflow at 320 pixels and 400% zoom without sideways scrolling | Visual | [ ] |
| P6 | No information is conveyed only by position or by the ladder line | SR | [ ] |
| P7 | Language of the page is declared | Auto | [ ] |

## Operable

| # | Check | Method | Done |
|---|---|---|---|
| O1 | Every function works from the keyboard: topic, style, generate, open a stage, mark or unmark, goal date, More menu, dialogs, dismiss, certificate, print | Keys | [ ] |
| O2 | A skip link is the first focusable item and works | Keys | [ ] |
| O3 | Focus order follows the visual order; focus is always visible with the 3-pixel ring | Keys | [ ] |
| O4 | No keyboard trap; dialogs trap focus only while open and Escape closes them | Keys | [ ] |
| O5 | Focus lands where `interaction-spec.md` says after generating, opening a dialog, closing it, marking a stage (the next stage's heading, never a control in a closed stage), unmarking a stage and finishing | Keys, SR | [ ] |
| O6 | Touch targets are at least 44 by 44 pixels with 8 pixels between | Visual | [ ] |
| O7 | Nothing flashes more than three times a second; animations last 200 milliseconds or less and stop with reduced motion | Visual | [ ] |
| O8 | There are no time limits on the learner; the 15-second generation limit is system-side only | Keys | [ ] |
| O9 | The sticky block never hides focused content; it stops sticking when it would cover over a third of the window | Keys, Visual | [ ] |

## Understandable

| # | Check | Method | Done |
|---|---|---|---|
| U1 | Every input has a visible label and its hint is linked to it | Auto, SR | [ ] |
| U2 | Errors name the field, say what is wrong and how to fix it, and keep what the learner typed | Keys, SR | [ ] |
| U3 | Validation runs on leaving the field and on submit, not on every keystroke | Keys | [ ] |
| U4 | Destructive actions confirm and name what will be deleted | Keys | [ ] |
| U5 | The same action has the same label everywhere ("Try again", "Dismiss", "Cancel") | Visual | [ ] |
| U6 | Nothing changes context on focus or on typing | Keys | [ ] |
| U7 | Nudge and limit wording is encouraging and has no word from the FR6.2 blocked list | Visual | [ ] |

## Robust

| # | Check | Method | Done |
|---|---|---|---|
| R1 | Native elements are used first; ARIA appears only where a native element cannot express it | Auto | [ ] |
| R2 | One `h1` per screen and no skipped heading levels | Auto, SR | [ ] |
| R3 | Landmarks `header`, `main` and `footer` are present once each | Auto, SR | [ ] |
| R4 | Stage controls report expanded or collapsed; the progress element reports its value and name | SR | [ ] |
| R5 | One polite live region carries all announcements in `interaction-spec.md`; none is assertive and none is spoken twice | SR | [ ] |
| R6 | Model-written text and typed text appear as text only and cannot add markup or break the page | Auto | [ ] |
| R7 | IDs are unique and every `aria-*` reference points at something that exists | Auto | [ ] |

## Per-Screen Checks

| Screen | Extra checks |
|---|---|
| S1 Home | Generate button hint explains why it is disabled; generating status is announced; focus starts on the Topic field |
| S2 Journey | Only one stage open; marker words present; goal line readable in the collapsed 320 pixel header; load and save errors keep other controls usable |
| S3 Banners | Dismiss reachable by keyboard; banner does not move the stage being read |
| S4 Dialogs | Cancel has initial focus; Escape closes; focus returns to the opener; the page behind is inert |
| S5 Certificate | `h1` receives focus; print output readable in black and white; name field label says it is not saved |

## Story Coverage

| Story | Checks |
|---|---|
| US8.1 | O1 to O5, O9 |
| US8.2 | P1, P6, U1, R1 to R5, R7 |
| US8.3 | P2 to P5, O6, P7; Auto, browser and zoom runs |
| US1.5 | R5, per-screen S1 |
| US7.1, US7.2 | U4, O4, O5, per-screen S4 |
| US5.1, US6.1 | P4, U7, R5, per-screen S3 |

## Assumptions & Open Questions

- [assumption] VoiceOver in Safari and NVDA in Firefox are the pairings tried first; if only one is available, one pass is the minimum the team practices require.
- [assumption] The contrast values in `design-system-mapping.md` were worked out by hand and are confirmed by checks P2 and P3.
- Open: whether a second round of testing on a physical phone is wanted; native mobile apps are out of scope, but the page is responsive.
