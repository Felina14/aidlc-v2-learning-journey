# Refined Mockups — Learning Journey App

## Sources

- `wireframes.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- `user-flow.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/user-flow.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Design answers Q1 to Q8 — `refined-mockups-questions.md` in this folder

The companion files are `interaction-spec.md` (behaviour and components), `design-system-mapping.md` (colours, type, spacing, native elements) and `accessibility-checklist.md`. Wording shown in quotes is the exact on-screen text.

## Principles

- Calm, clean and encouraging. One primary action per screen. [Q3, wireframes]
- Native elements first: button, details, dialog, progress, input, label, fieldset. [Q1]
- Desktop-first, one column, content width capped at 880 pixels, usable from 320 pixels. [NFR8]
- Light theme only. Deep amber accent. Status is always text or an icon plus colour, never colour alone. [Q2, Q5, NFR1]
- Every screen has one `h1`, a skip link, and `header`, `main` and `footer` regions.

## Screen Map

| Screen | Stories | Notes |
|---|---|---|
| S1 Home: topic and style | US1.1, US1.2, US1.5 | First screen; also shows generating and error states |
| S2 Journey | US1.3, US1.4, US2.1 to US2.3, US3.1, US3.2, US3.3, US4.1, US4.2 | Main screen; holds the sticky "My Journey" header |
| S3 Banners | US5.1, US6.1, US9.2 | Milestone, nudge and limit messages shown inside S2 |
| S4 Confirm dialogs | US7.1, US7.2 | Replace journey, delete journey |
| S5 Certificate | US5.2 | Shown when every stage is complete |

---

## S1 Home: topic and style

```
+----------------------------------------------------------+
| Skip to main content   (visible on focus)                |
+----------------------------------------------------------+
| Learning Journey                                         |
+----------------------------------------------------------+
|                                                          |
|  h1  What do you want to learn?                          |
|                                                          |
|  Topic                                                   |
|  [ e.g. Kubernetes, data storytelling, negotiation  ]    |
|  2 to 100 characters                                     |
|                                                          |
|  Choose your teaching style                              |
|  (o) Friendly guide                                      |
|      Encouraging, with everyday examples                 |
|  ( ) Structured instructor                               |
|      Step by step, with exercises and quizzes            |
|  ( ) Progress planner                                    |
|      Detailed time estimates and checkpoints             |
|                                                          |
|  [ Generate my journey ]                                 |
|                                                          |
|  Journeys are made by AI and may need verification       |
|  for authoritative topics.                               |
+----------------------------------------------------------+
```
<!-- Text fallback: Home screen. Skip link first. Header with the site name. Main has an h1 "What do you want to learn?", a labelled Topic text box with a hint "2 to 100 characters", a group of three radio buttons for teaching style each with a one-line description, a primary button "Generate my journey", and a short note that journeys are made by AI. -->

Notes:
- If the style choice is cut (US1.2 not built), the radio group is not shown and the friendly guide style is used. [US1.2]
- The note under the button uses a plain paragraph, not a tooltip, so it is readable by everyone.

### S1 states

| State | What the learner sees | Announced |
|---|---|---|
| Empty | Button disabled; hint "Enter a topic and choose a style" under the button | none |
| Ready | Button enabled in amber | none |
| Topic error | Under the field: "Enter a topic between 2 and 100 characters." with a warning icon; typed text kept | polite via the error text linked to the field |
| Unsafe topic | Under the field: "That topic isn't one I can build a journey for. Try a different topic." | polite |
| Generating | Button reads "Generating…" and is disabled; a status line "Generating your journey…" with a small spinner | polite: "Generating your journey" |
| Generating, over 5 seconds | Status line adds: "This is taking a little longer than usual. Your journey will be ready soon." | polite |
| Rate limited | Under the button: "Lots of requests at once. Please wait a moment and try again." | polite |
| Daily limit | Under the button: "You've reached today's limit of 5 new journeys. Your current journey is still here." with a link "Go to my journey" | polite |
| Unexpected error | Under the button: "Something went wrong. Please try again." and "Try again" | polite |

---

## S2 Journey

```
+----------------------------------------------------------+
| Skip to main content                                     |
+----------------------------------------------------------+
| Learning Journey                         [ More v ]      |
+==========================================================+
| STICKY  My Journey                                       |
|  h1  Your Kubernetes journey                             |
|  Style: Structured instructor                            |
|  [=========================--------]  33%                |
|  2 of 6 stages complete  ·  about 22 hours in total      |
|  Goal date: 15 Dec 2026 · 35 days remaining [Change]     |
|  Suggested pace: about 5 hours a week                    |
+==========================================================+
|  AI-generated content · May need verification            |
|                                                          |
|  ladder                                                  |
|   (v) 1  Kubernetes fundamentals              Done       |
|    |                                                     |
|   (v) 2  Pods, deployments and services       Done       |
|    |                                                     |
|   [3]    Configuration and secrets            Up next    |
|    |     +-------------------------------------------+  |
|    |     | What it is        ...                     |  |
|    |     | Why it matters    ...                     |  |
|    |     | After this        ...                     |  |
|    |     | Materials                                 |  |
|    |     |  Reading   ...                            |  |
|    |     |  Exercises ...                            |  |
|    |     |  Mini project ...                         |  |
|    |     |  Quiz ...                                 |  |
|    |     | About 4 hours                             |  |
|    |     | [ Mark stage 3 complete ]                 |  |
|    |     +-------------------------------------------+  |
|    |                                                     |
|   ( ) 4  Networking and ingress               To do      |
|    |                                                     |
|   ( ) 5  Storage and state                    To do      |
|    |                                                     |
|   ( ) 6  Running it in production             To do      |
+----------------------------------------------------------+
| Journeys are made by AI and may need verification.       |
+----------------------------------------------------------+
```
<!-- Text fallback: Journey screen. Header with the site name and a More menu. Sticky My Journey block showing the topic as h1, the teaching style, a progress bar with percentage, a count of stages complete and total hours, the goal date with days remaining and a Change button, and a suggested weekly pace. Below it the AI-generated label and a vertical ladder of numbered stages joined by a line. Done stages show a check mark and the word Done. The current stage shows a filled outline and the words Up next and is open, showing what it is, why it matters, what you can do after it, four kinds of material, the hours, and a Mark complete button. Later stages show To do and are closed. A footer repeats the AI note. -->

Notes:
- Markers: a check mark in a filled circle for Done, the stage number in an outlined circle for To do, and a thicker outline plus the words "Up next" for the current stage. The joining line is decorative. [Q5]
- One stage is open at a time; the first stage not yet complete opens by default. Selecting another stage closes the open one. [Q4]
- If the journey is a template, the label reads "Template-based journey — AI generation was unavailable" and the AI label is not shown. [FR2.5]
- The "More" menu (a native details element) holds "New journey" and "Delete my journey". On every width these two sit there, not in the sticky block. [US7.1, US7.2]
- "Suggested pace" and "Goal date" lines appear only when a goal date is set. The hours total reads "about 22 hours in total". [FR2.4]
- Teaching style differences: the instructor journey lists at least 2 exercises and 1 quiz per stage; the planner journey shows separate hours for reading, exercises, mini project and quiz inside the open stage. [FR2.3]

### S2 an opened Done stage (where undo lives)

```
|   (v) 2  Pods, deployments and services       Done       |
|    |     +-------------------------------------------+  |
|    |     | What it is        ...                     |  |
|    |     | Why it matters    ...                     |  |
|    |     | After this        ...                     |  |
|    |     | Materials  ...                            |  |
|    |     | About 3 hours                             |  |
|    |     | [ Mark stage 2 as not complete ]          |  |
|    |     +-------------------------------------------+  |
```
<!-- Text fallback: A Done stage that has been opened. It shows the same content as any stage, and its button reads Mark stage 2 as not complete. -->

- Any Done stage can be opened to read it again; opening one closes the one that was open. The only action in it is "Mark stage N as not complete". [US3.2]
- After an unmark, the first stage not yet complete is the one that opens. If the stage just unmarked is now the earliest one not yet complete, it stays open; otherwise the stage that was open before the unmark stays open. [person's decision]

### S2 goal date, inline

```
|  Goal date                                               |
|  [ 15/12/2026 ]   [ Clear ]   [ Save ]                   |
|  Choose a date from today up to 365 days ahead.          |
```
<!-- Text fallback: Inline goal date form opened by the Change or Set a goal date button. A labelled native date field, a Clear button and a Save button, with a hint that the date must be from today to 365 days ahead. -->

- The sample value matches the header example (15 December 2026). The native date field shows the date in the browser's own format, so the drawn format is a sample, not a promise.

- When no goal date is set the sticky block shows a button "Set a goal date" instead of the date line.
- The date field's earliest value is today and its latest is today plus 365 days. An out-of-range or invalid entry shows "Choose a date from today up to 365 days ahead." beside the field. [FR4.1]
- Days remaining text: "5 days remaining", "1 day remaining", "Due today", or "Goal date passed — choose a new date" with a "Choose a new date" button. [FR4.3]

### S2 goal line states in the sticky block

| Goal state | Goal line shown | Pace line | Nudge possible |
|---|---|---|---|
| No goal date | A "Set a goal date" button | Not shown | No |
| More than 3 days away | "Goal date: 15 Dec 2026 · 35 days remaining" and a "Change" button | "Suggested pace: about 5 hours a week" | No |
| 1 to 3 days away | "Goal date: 12 Nov 2026 · 2 days remaining" and a "Change" button | Shown | Yes, if progress is below 50% |
| Today | "Goal date: today · Due today" and a "Change" button | Shown | Yes, if progress is below 50% |
| Passed | "Goal date passed — choose a new date" and a "Choose a new date" button | Not shown | No |

"Due today" is written with a capital D when it starts a line, matching FR4.3's wording in sentence case.

### S2 states

| State | What the learner sees | Announced |
|---|---|---|
| Loading | Skeleton blocks in the shape of the sticky block and three stages; no spinner over content | polite: "Loading your journey" |
| Populated | As drawn above | none |
| Load error | In place of the ladder: "We couldn't load your journey." and a "Try again" button; the More menu still works | polite |
| Save error | Under the stage button: "We couldn't save that change. Try again." and a "Try again" button; the stage is not shown as saved | polite |
| Stage marked | Marker becomes a check mark; bar and count update at once; the next stage not yet complete opens and the marked stage closes; focus moves to the heading of the stage that opened | polite: "Stage 3 complete. 3 of 6 stages complete, 50 percent. Stage 4 is open." |
| Stage marked, last stage | Same, but no stage opens; the certificate view S5 appears and focus moves to its h1 | polite: "Stage 6 complete. 6 of 6 stages complete, 100 percent." |
| Stage unmarked | The stage you unmarked stays open (the button is inside it). Marker returns to its number; bar and count update. If it is now the earliest stage not yet complete it is the stage that stays open; otherwise the stage that was open before stays open. Focus stays on the button, now reading "Mark stage N complete" | polite: "Stage 2 marked as not complete. 1 of 6 stages complete, 17 percent." |
| Template journey | Template label instead of the AI label | none |
| Journey complete | The certificate view S5 replaces the ladder | focus moves to its h1 |
| Empty (no saved journey) | The Home screen S1 is shown instead | none |

---

## S3 Banners

Banners sit between the sticky block and the ladder, one at a time, and are dismissed with a "Dismiss" button. They never cover content and never move the ladder while the learner is reading a stage (they appear above it and push content down once).

```
+----------------------------------------------------------+
|  (*)  Halfway there. Keep going at your own pace.        |
|                                           [ Dismiss ]    |
+----------------------------------------------------------+
```
<!-- Text fallback: A banner with an icon, one line of encouraging text and a Dismiss button. -->

| Banner | Text | Trigger |
|---|---|---|
| Milestone, first stage | "First stage done. A great start." | First time one stage is complete |
| Milestone, halfway | "Halfway there. Keep going at your own pace." | First time complete stages reach at least half |
| Milestone, finished | "Journey complete." | All stages complete (shown with S5) |
| Nudge | "Your goal date is coming up. Finishing one more stage this week is a great next step." | Progress below 50%, goal date set and 0 to 3 days away |
| Daily limit | "You've reached today's limit of 5 new journeys. Your current journey is still here." | Sixth journey requested in a day |

- A banner has an icon and words, so it never relies on colour. The nudge uses the neutral style, not a warning colour, and has no countdown. [FR6.2]
- A dismissed milestone does not return. A dismissed nudge may show again on a later day while its conditions still hold; that repeat rule is an assumption (see below), not a requirement. [FR5.2, FR6.1]
- A milestone appears with a gentle fade-in of 200 milliseconds; with reduced motion requested it appears at once. [Q3]

---

## S4 Confirm dialogs

```
+------------------------------------------+
|  Start a new journey?                    |
|                                          |
|  Your current journey about Kubernetes   |
|  and its progress will be replaced.      |
|                                          |
|        [ Cancel ]  [ Replace journey ]   |
+------------------------------------------+
```
<!-- Text fallback: A modal dialog titled Start a new journey, with a sentence naming the topic that will be replaced, and two buttons Cancel and Replace journey. -->

```
+------------------------------------------+
|  Delete your journey?                    |
|                                          |
|  This deletes your Kubernetes journey,   |
|  your progress and your goal date. It    |
|  can't be undone.                        |
|                                          |
|        [ Cancel ]  [ Delete journey ]    |
+------------------------------------------+
```
<!-- Text fallback: A modal dialog titled Delete your journey, naming what will be deleted: the journey, progress and goal date, stating it can't be undone, with buttons Cancel and Delete journey. -->

- Focus starts on Cancel in both dialogs. The destructive button is the last in the order. Escape closes. Focus returns to the control that opened the dialog. [Q8]
- If the delete fails: "We couldn't delete your journey. Your journey is still saved. Try again." appears inside the dialog and the journey is kept. [AC7.2.2]

---

## S5 Certificate

```
+----------------------------------------------------------+
| Learning Journey                         [ More v ]      |
+----------------------------------------------------------+
|  h1  Journey complete                                    |
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |            Certificate of completion               |  |
|  |                                                    |  |
|  |                 [Your name]                        |  |
|  |         has completed the learning journey         |  |
|  |                  Kubernetes                        |  |
|  |            6 stages · 10 November 2026             |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Name on certificate (optional, not saved)               |
|  [                                          ]            |
|                                                          |
|  [ Print or save as PDF ]   [ Start a new journey ]      |
|                                                          |
|  [ Back to my journey ]                                  |
+----------------------------------------------------------+
```
<!-- Text fallback: Completion screen. h1 Journey complete. A bordered certificate panel reading Certificate of completion, an optional name, the sentence has completed the learning journey, the topic, and the number of stages with the date. Below it an optional name text box labelled not saved, then buttons to print or save as PDF, start a new journey, and go back to the journey. -->

- When no name is typed, the name line and the words "has completed the learning journey" are replaced by "Learning journey completed". [Q7]
- The typed name is shown only in the page; it is not sent or stored and is lost on reload. [FR5.3, US5.2]
- "Print or save as PDF" opens the browser print dialog. A print stylesheet hides everything except the certificate panel and uses black text on white with a thin black border so it reads in black and white. [Q7]
- "Back to my journey" returns to S2; if a stage is then unmarked the certificate view is replaced by the ladder. [FR5.4]

---

## Responsive Behaviour

| Width | Behaviour |
|---|---|
| 1024 pixels and wider | Single column, content 880 pixels wide, centred. Sticky block shows all lines. |
| 768 to 1023 pixels | Same layout; side margins shrink. |
| Under 768 pixels | The sticky block collapses to two lines: the topic with the percentage, and the goal line. The bar, count, hours and pace move into a "Details" disclosure inside the block. Buttons are full width. |
| 320 pixels | No sideways scrolling; long words wrap; the ladder line moves closer to the edge; 44 by 44 pixel targets are kept. |
| 200% and 400% zoom | Layout reflows to one column with no clipped text and no overlap with the sticky block. |

If the sticky block would cover more than a third of a short window, it stops sticking so content stays readable. [NFR1]

---

## Story Coverage

| Story | Where it is drawn |
|---|---|
| US1.1, US1.2, US1.5 | S1 |
| US1.3, US1.4, US2.1, US2.2, US2.3 | S2 (open stage, label) |
| US3.1, US3.2, US3.3 | S2 states |
| US4.1, US4.2 | S2 goal date and sticky block |
| US5.1, US6.1, US9.2 | S3 |
| US5.2 | S5 |
| US7.1, US7.2 | S4 and the More menu |
| US7.3 | No screen: expiry and storage are behind the scenes |
| US8.1 to US8.3 | Every screen; see `accessibility-checklist.md` |
| US9.1, US9.3 | No screen: builder tasks |

## Assumptions & Open Questions

- [assumption] There is no dark theme in this build.
- [assumption] A dismissed nudge may show again on a later day while its conditions still hold. This repeat rule is added in this stage and is not in FR5.2 or FR6.1; it is to be confirmed in functional design.
- [assumption] Exact wording on screen may be adjusted in functional design; the nudge text must stay clear of the blocked list in FR6.2.
- [assumption] The collapsed 320 pixel header keeps the goal date visible, as FR4.2 requires, inside the two-line summary.
- Open: whether the daily-limit message should offer a free template journey instead (same open question as in the requirements).
