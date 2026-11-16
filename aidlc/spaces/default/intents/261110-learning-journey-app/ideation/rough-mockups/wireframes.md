# Wireframes — Learning Journey App

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Scope document — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- Intent backlog — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/intent-backlog.md`
- [Q1]–[Q5] Rough mockups questions

---

## Design Principles (applied throughout)

- **Tone**: Clean, minimal, warm and encouraging — not a productivity dashboard. [Q1]
- **Layout**: Desktop-first, fully responsive for mobile. [Q4]
- **Colour**: Neutral palette (white, light grey, dark grey) with one warm accent colour. All text meets WCAG AA contrast (4.5:1 minimum). [Q3]
- **Progress/goal**: Dedicated "My Journey" header visible at all times on the journey screen. [Q5]
- **Accessibility**: Every screen is keyboard-navigable. Focus order follows visual layout. ARIA landmarks on each screen. [desc]

---

## Screen 1: Home / Topic Entry

**Purpose**: The entry point. The learner types their topic, chooses a teaching persona, and starts the journey.

**Heading level**: h1 = "What do you want to learn?"
**Landmarks**: `<header>` (site name), `<main>` (input + persona choice + CTA)

```
+------------------------------------------------------+
| [Site name: Learning Journey]           [About]      |
+------------------------------------------------------+
|                                                      |
|   h1: What do you want to learn?                     |
|                                                      |
|   [ Topic input field                           ]    |
|   e.g. "Kubernetes", "data storytelling"             |
|                                                      |
|   Choose your teaching style:                        |
|   ( ) Friendly Guide    [i tooltip]                  |
|   ( ) Structured Instructor  [i tooltip]             |
|   ( ) Progress Planner  [i tooltip]                  |
|                                                      |
|   [ Generate my journey  (primary button)      ]     |
|                                                      |
|   AI-generated journeys · Content may need          |
|   verification for authoritative topics              |
|                                                      |
+------------------------------------------------------+
```

<!-- Text fallback: Single-column centered layout. Top: site header with logo/name and an About link. Main area: large h1 heading, a text input field for the topic, three radio button options for teaching style (each with an info tooltip), a primary CTA button. Below the button: a small disclaimer line about AI-generated content. -->

**States:**
- **Empty (default)**: Input blank, no persona selected, button disabled.
- **Persona selected, no topic**: Button still disabled; input hint shown.
- **Topic + persona selected**: Button enabled, accent colour active.
- **Loading (after submit)**: Button becomes "Generating…" with spinner; input disabled. If > 5s, secondary text: "Taking a moment — we'll have your journey ready soon."
- **Fallback**: If Bedrock fails/times out, a template journey is returned silently; no error shown to learner.
- **Error (catastrophic only)**: Inline error below input: "Something went wrong. Please try again."

**Accessibility notes:**
- Topic input: `<label>` associated via `for`/`id`. Not placeholder-only.
- Persona radios: `<fieldset>` + `<legend>` grouping. Arrow keys navigate options.
- CTA button: `aria-disabled="true"` while inputs incomplete; updates to enabled when ready.
- AI disclaimer: `role="note"` for screen readers.
- Loading spinner: `aria-live="polite"` region announces "Generating your journey…"

---

## Screen 2: Journey View (Main App Screen)

**Purpose**: Shows the full journey with the "My Journey" header and the vertical stage ladder. The learner marks stages complete here.

**Heading level**: h1 = journey topic (e.g. "Your Kubernetes Journey"), h2 = each stage name
**Landmarks**: `<header>` (site + nav), `<main>` (My Journey header + stage ladder), `<footer>` (small disclaimer)

```
+------------------------------------------------------+
| [Learning Journey]                    [New Journey]  |
+------------------------------------------------------+
| My Journey: Kubernetes                               |
| [===========================----] 42%  3/7 complete  |
| Goal: 15 Nov 2026 · 5 days remaining                 |
| Teaching style: Structured Instructor                |
+------------------------------------------------------+
|                                                      |
| Stage 1: Kubernetes Fundamentals        [x] Done     |
| +-------------------------------------------------+  |
| | What it is: Container orchestration platform   |  |
| | Why it matters: Automate deployment at scale   |  |
| | After this: You can describe core K8s objects  |  |
| |                                                |  |
| | Materials:                                     |  |
| |  - Reading: official docs / intro article      |  |
| |  - Exercise: run a local cluster               |  |
| |  - Mini project: deploy a 2-service app        |  |
| |  - Quiz: 5-question K8s concepts check         |  |
| |                                                |  |
| | Estimated time: 3-4 hours                      |  |
| +-------------------------------------------------+  |
|                                                      |
| Stage 2: Pods, Deployments and Services [x] Done     |
| [collapsed - click to expand]                        |
|                                                      |
| Stage 3: Configuration & Secrets       [ ] To do     |
| [collapsed - click to expand]                        |
|  ... (stages 4-7 collapsed)                          |
|                                                      |
| --- MILESTONE: Halfway there!          (at 50%)     |
|                                                      |
| Stage 4: Networking & Ingress          [ ] To do     |
| [collapsed]                                          |
|                                                      |
+------------------------------------------------------+
| AI-generated content · May need verification         |
| (fallback journeys instead read: "Template-based     |
|  journey — AI generation was unavailable")           |
+------------------------------------------------------+
```

<!-- Text fallback: Two-zone layout. Top: sticky "My Journey" header showing topic name, progress bar with percentage and count, goal date and days remaining, and teaching style. Below: vertical list of stages as an accordion. Each stage has a checkbox/status badge, a stage name, and expands to show: what/why/after, materials (reading, exercise, mini project, quiz), and time estimate. Milestones appear inline between stages at relevant progress points. Footer shows the AI-generated content disclaimer. -->

**States:**
- **Stage: completed** — Checkbox checked, green accent badge "Done", stage header dimmed slightly but still readable.
- **Stage: in progress (expanded)** — Checkbox unchecked, expanded content visible, "Mark complete" button at bottom.
- **Stage: not started (collapsed)** — Checkbox unchecked, single-line header, click to expand.
- **Milestone reached** — Inline banner between stages: "🎉 Halfway there! Keep going." Dismissible.
- **Journey complete** — All stages done; certificate banner appears below final stage.
- **Nudge** — Show a nudge when progress is below 50% AND the goal date is 3 days away or less. An encouraging banner: "Your goal is close — just one more stage this week makes a big difference." Never guilt-driven. Dismissible.
- **Loading (initial)** — Skeleton screens for stage list while journey loads from DynamoDB.

**Accessibility notes:**
- Stage accordion: each stage header is a `<button>` with `aria-expanded="true/false"` and `aria-controls` pointing to the detail panel.
- Progress bar: `<progress>` element or `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a text label.
- Checkbox: `<input type="checkbox">` with `<label>`. Not a custom div.
- Milestone/nudge banners: `role="status"` or `aria-live="polite"`.
- "Mark complete" button: descriptive `aria-label` includes stage name ("Mark Stage 3: Configuration & Secrets as complete").
- Skip-to-content link as first focusable element (links to `<main>`).

---

## Screen 3: Completion Certificate

**Purpose**: Shown when all stages are marked complete. Celebrates the learner's achievement.

**Heading level**: h1 = "Journey Complete!"
**Landmarks**: `<main>` (certificate content + actions)

```
+------------------------------------------------------+
| [Learning Journey]                    [New Journey]  |
+------------------------------------------------------+
|                                                      |
|   [Certificate illustration / icon]                  |
|                                                      |
|   h1: Journey Complete!                              |
|   You've completed your Kubernetes journey.          |
|                                                      |
|   [===================================] 100%         |
|   7 of 7 stages complete                             |
|                                                      |
|   [ Start a new journey (primary button)       ]     |
|   [ Print / save certificate (secondary button)]     |
|                                                      |
+------------------------------------------------------+
```

<!-- Text fallback: Centered congratulations screen. Certificate icon or illustration at top. h1 heading with topic name. Progress bar at 100%. Two buttons: start a new journey (primary), and print/save certificate (secondary). -->

**Accessibility notes:**
- On completion, focus moves to the h1 heading so screen reader users hear the achievement announcement.
- Certificate illustration: `alt="Certificate of completion for [topic]"`.
- Print button: standard browser print dialog, no custom print logic required.

---

## Mobile Adaptation (responsive, desktop-first)

The layout is a single column at all viewport widths below 768px. [Q4]

- **Home screen**: Input and persona radios stack vertically. Full-width button.
- **Journey view**: "My Journey" header collapses to a compact bar (progress % and goal date on one line). Stage accordion is full-width. Materials list stays readable.
- **Touch targets**: All interactive elements ≥ 44×44 CSS px (WCAG 2.1 AA).
- **No horizontal scroll** at any viewport width from 320px up.

---

## Component Inventory

| Component | Used On | Notes |
|---|---|---|
| Topic input field | Home | Required, labelled, autofocus on load |
| Persona radio group | Home | Fieldset + legend, keyboard navigable |
| Primary CTA button | Home, Completion | Disabled state until inputs complete |
| "My Journey" header | Journey view | Sticky on scroll; contains progress bar + goal |
| Progress bar | Journey view, Completion | Native `<progress>` or ARIA progressbar |
| Stage accordion item | Journey view | Button trigger, expandable panel, checkbox |
| "Mark complete" button | Journey view (expanded stage) | Descriptive aria-label per stage |
| Milestone banner | Journey view | Dismissible, `role="status"` |
| Nudge banner | Journey view | Dismissible, never guilt-driven |
| Certificate view | Completion | Focus on h1 on render |
| AI-generated disclaimer | Home, Journey footer | `role="note"`. For journeys generated by Bedrock the label reads "AI-generated content · May need verification". For fallback-template journeys it reads "Template-based journey — AI generation was unavailable" |

---

## Assumptions & Open Questions

- [assumption] The app has a single page per session (no multi-page routing required): Home screen and Journey view are the two primary states; Completion is a state of the Journey view.
- [assumption] The print/save certificate button uses the browser's native print dialog. No custom PDF generation is required.
- [assumption] The nudge logic runs client-side using one rule: show the nudge banner when progress is below 50% AND the goal date is 3 days away or less.
- [assumption] The "New Journey" link in the header returns the learner to the Home screen. It does not clear the existing journey without a confirmation prompt ("Starting a new journey will replace your current progress. Continue?").
