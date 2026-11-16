# Rough Mockups — Questions

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Scope document — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- Intent backlog — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/intent-backlog.md`
- [scope] Workflow-selected scope: `feature`.

---

## Q1. [Design] Layout style and tone

The app serves an individual professional who is self-motivated but time-constrained. What overall visual/layout tone fits best?

A. Clean and minimal — white space, clear typography, nothing that competes with the journey content
B. Structured and focused — a sidebar or header always shows progress and goal date at a glance
C. Warm and encouraging — friendly colors and micro-copy that feel supportive, not clinical
D. All three: clean structure with warm, encouraging tone (not a dashboard, not a productivity app)
E. No preference — recommend what fits the use case
X. Other (please specify)

[Answer]: D

---

## Q2. [Design] Layout pattern for the main journey view

Once a journey is generated, what layout makes it easiest to work through?

A. Vertical list — stages stacked from top to bottom; click a stage to expand it
B. Card grid — stages as cards in a 2–3 column grid; each card shows stage name and progress
C. Stepper / wizard — one stage displayed at a time with Previous/Next navigation
D. Split view — stage list on the left, selected stage detail on the right (desktop); single column on mobile
E. No preference — recommend the layout that best matches how the learner will actually use it
X. Other (please specify)

[Answer]: A — vertical "ladder" of stages from fundamentals (top) to mastery (bottom); click a stage to expand it

---

## Q3. [Design] Existing brand or design system

Is there an existing design system, brand kit, color palette, or component library this app should follow?

A. No — greenfield, no existing brand. Use a clean, neutral palette (shades of white/grey/blue or similar)
B. Yes — there is an existing palette or brand I want to apply
C. Use a well-known component library (e.g. Tailwind CSS, Material Design, shadcn/ui) as the base
D. No strong opinion — suggest a simple, accessible default
X. Other (please specify)

[Answer]: A — greenfield, clean neutral palette with one warm accent colour; must pass WCAG AA contrast

---

## Q4. [Design] Device priority

The description says web front end (no native mobile). What is the primary device the learner will use?

A. Desktop — the journey is a focused reading + study task; design desktop-first, ensure mobile works
B. Mobile — learners will check progress on their phone; design mobile-first
C. Both equally — full responsive design required; no primary device
D. Desktop-first with a responsive layout that works on mobile (not degraded, but optimized for desktop)
E. No preference — recommend based on the use case
X. Other (please specify)

[Answer]: D

---

## Q5. [Design] Progress and goal visibility

Where should the learner's overall progress and goal date be shown?

A. Top of the journey page at all times — always visible as a banner or header area
B. Shown only on the journey overview screen (not on individual stage views)
C. Persistent sidebar or sticky footer showing progress bar and days remaining
D. In a dedicated "My Journey" header section that stays visible while scrolling
E. No preference — recommend the most effective placement for the use case
X. Other (please specify)

[Answer]: D

---

## Consolidated Summary Confirmation

- Layout tone: clean and minimal structure with warm, encouraging tone — not a dashboard, not a productivity app (Q1: D)
- Main journey layout: vertical "ladder" of stages from fundamentals (top) to mastery (bottom); click to expand (Q2: A/Other)
- Design system: greenfield; clean neutral palette with one warm accent colour; WCAG AA contrast required (Q3: A/Other)
- Device priority: desktop-first with a fully responsive layout that works well on mobile (Q4: D)
- Progress and goal visibility: dedicated "My Journey" header section that stays visible while scrolling (Q5: D)

- Looks correct
- Request changes

[Answer]: Looks correct

