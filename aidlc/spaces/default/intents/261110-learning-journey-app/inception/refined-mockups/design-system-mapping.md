# Design System Mapping — Learning Journey App

## Sources

- `wireframes.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- `user-flow.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/user-flow.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Design answers Q1 to Q8 — `refined-mockups-questions.md` in this folder

There is no existing design system and no framework. The look is built from a small set of design tokens (CSS custom properties) applied to native HTML elements. [Q1, Q2]

## Colour Tokens

Contrast ratios below were worked out by hand from the hex values and must be confirmed with a contrast checker when the styles are built (NFR1).

| Token | Value | Use | Approx. contrast on white |
|---|---|---|---|
| `--color-bg` | `#FFFFFF` | Page background | — |
| `--color-surface` | `#F6F8FA` | Panels, skeletons, the open stage | — |
| `--color-text` | `#1F2328` | Body text, headings | about 15 to 1 |
| `--color-text-muted` | `#57606A` | Hints, secondary text | about 6.4 to 1 |
| `--color-accent` | `#8A4B08` | Deep amber: primary button fill, progress fill, focus ring, links | about 6.8 to 1 (white text on it passes) |
| `--color-accent-contrast` | `#FFFFFF` | Text on the accent | — |
| `--color-border` | `#6E7781` | Input borders and other lines that identify a control | about 4.5 to 1 (needs 3 to 1) |
| `--color-divider` | `#D0D7DE` | Decorative separators only | decorative |
| `--color-done` | `#1A7F37` | Check-mark marker (always with the word "Done") | about 5.1 to 1 |
| `--color-error` | `#CF222E` | Error text and icon (always with words) | about 5.4 to 1 |

Rules: colour is never the only signal; every coloured state also has words or a shape. Light theme only.

Contrast on the grey surface colour (`#F6F8FA`, used for panels, skeletons and the open stage), worked out by hand and also to be confirmed with a checker:

| Token | Approx. contrast on `--color-surface` | Needs | Result |
|---|---|---|---|
| `--color-text` | about 14.9 to 1 | 4.5 to 1 | passes |
| `--color-text-muted` | about 6.0 to 1 | 4.5 to 1 | passes |
| `--color-accent` (text, links, focus ring) | about 6.4 to 1 | 4.5 to 1 for text, 3 to 1 for the ring | passes |
| `--color-border` | about 4.3 to 1 | 3 to 1 | passes |
| `--color-done` | about 4.8 to 1 | 4.5 to 1 | passes, with little room |
| `--color-error` | about 5.0 to 1 | 4.5 to 1 | passes |

If a check finds `--color-done` falls short on the grey surface, the check-mark colour is darkened; the word "Done" is always shown too.

## Typography

| Token | Value |
|---|---|
| `--font-family` | System font stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-size-base` | `1rem` (16 px), never fixed in pixels |
| `--line-height-body` | `1.6` |
| `--font-size-h1` | `2rem`; `--font-size-h2` `1.5rem`; `--font-size-h3` `1.25rem` |
| `--font-weight-strong` | `600` |
| Measure | Body text lines stay under about 75 characters |

Heading levels follow the page: one `h1`, stage titles at `h2`, panel sub-headings at `h3`; no skipped levels.

## Spacing, Shape and Layout

| Token | Value |
|---|---|
| `--space-1` to `--space-6` | 4, 8, 16, 24, 32, 48 px |
| `--radius` | 8 px (buttons, panels); 999 px for the progress bar ends |
| `--content-max` | 880 px, centred |
| Breakpoints | 768 px and 1024 px; layout is fluid between and below them |
| Touch target | Minimum 44 by 44 px for every button, link, radio and input; at least 8 px between targets |
| Elevation | None; separation uses borders and the surface colour, not shadows |

## Focus and Motion Tokens

| Token | Value |
|---|---|
| `--focus-ring` | `3px solid #8A4B08` with a 2 px offset; never removed |
| `--motion-duration` | 200 ms; ease-out for entering, ease-in for leaving |
| Reduced motion | `prefers-reduced-motion: reduce` sets every duration to 0 |

## Native Element Mapping

| Need | Element | Notes |
|---|---|---|
| Topic input | `input type="text"` + `label` | min 2, max 100 characters |
| Teaching style | `fieldset`, `legend`, `input type="radio"` | Arrow keys move |
| Primary action | `button` | Amber fill, white text |
| Secondary action | `button` | White fill, amber text, 1 px border in `--color-border` |
| Destructive action | `button` | Same as primary but with the error colour and the words "Delete journey" |
| Stage panel | `details` and `summary` with a shared `name`, or `button` + `aria-expanded` | One open at a time |
| Progress | `progress` | Name "Journey progress"; percentage also shown as text |
| Goal date | `input type="date"` with `min` and `max` | Visible label |
| Dialog | `dialog` via `showModal()` | Focus trapped by the browser |
| More menu | `details` and `summary` | Contains "New journey" and "Delete my journey" |
| Banners and status | `div` with `role="status"` | One shared polite live region for announcements |
| Skeleton | `div` blocks, `aria-hidden` | Replaced when loaded |
| Skip link | `a href="#main"` | First focusable item |
| Regions | `header`, `main`, `footer` | One of each |

## Component Class Names

A simple block-element-modifier naming scheme in one stylesheet, for example `.stage`, `.stage__marker`, `.stage--done`, `.banner`, `.banner--milestone`, `.dialog`, `.certificate`. No utility framework and no component library. [Q1]

## Tooling Alignment

Prettier and ESLint apply to the TypeScript and CSS, with Black and Ruff for the Python backend, as in the team practices. Axe or Lighthouse run against each screen; a manual keyboard and screen-reader pass covers the main flow. [`team-practices.md`]

## Story and Requirement Mapping

| Design element | Stories | Requirements |
|---|---|---|
| Colour, type, focus, touch targets, contrast | US8.1 to US8.3 | NFR1, NFR8 |
| Topic field, style radios, generate button | US1.1, US1.2, US1.5 | FR1.1 to FR1.3, FR1.7 |
| Stage ladder and markers | US2.1, US3.1, US3.2 | FR2.1, FR2.2, FR3.1 to FR3.3 |
| Labels for AI and template | US2.3 | FR2.5 |
| Sticky header, goal date | US4.1, US4.2 | FR4.1 to FR4.3, FR2.4 |
| Banners | US5.1, US6.1, US9.2 | FR5.1, FR5.2, FR6.1 to FR6.3, FR8.2 |
| Certificate and print style | US5.2 | FR5.3, FR5.4 |
| Dialogs | US7.1, US7.2 | FR7.1, FR7.3 |

## Assumptions & Open Questions

- [assumption] The system font stack is acceptable and no web fonts are loaded, which keeps the page fast and avoids layout shift.
- [assumption] The hand-computed contrast ratios are close enough to plan with; the build step confirms them with a checker and adjusts a hex value if any falls short.
- [assumption] The destructive button uses the error colour only with the words "Delete journey"; colour is not the signal.
