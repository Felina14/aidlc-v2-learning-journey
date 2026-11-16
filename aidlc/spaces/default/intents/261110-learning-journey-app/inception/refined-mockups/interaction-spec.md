# Interaction Specification — Learning Journey App

## Sources

- `wireframes.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- `user-flow.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/user-flow.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- `mockups.md` in this folder, for the screens these components appear on

Component entries follow the component specification template. Built with plain HTML, CSS and TypeScript, native elements first. [Q1]

## Page-Level Behaviour

### Focus Management

| Event | Where focus goes |
|---|---|
| Page load, Home | The Topic field |
| Journey generated | The `h1` of the Journey screen |
| Journey restored on return | The `h1` of the Journey screen |
| A stage is marked complete | The heading of the stage that opens next (the next stage not yet complete). If it was the last stage, the `h1` "Journey complete". Focus never stays on a control inside a stage that has just closed |
| A stage is unmarked | Stays on the button, now reading "Mark stage N complete"; the stage stays open. After an unmark, the first stage not yet complete opens; if the stage just unmarked is now the earliest one not yet complete it stays open, otherwise the stage that was open before stays open |
| Another stage is opened | The stage heading button that was activated |
| Dialog opens | The Cancel button inside the dialog |
| Dialog closes | The control that opened it |
| Journey becomes complete | The `h1` "Journey complete" |
| Banner dismissed | The next focusable control after the banner, or the stage heading if none |
| Error shown | The error text is linked to its control; focus is not moved unless the learner submitted a form, in which case focus moves to the first field in error |

### Live Announcements (polite unless stated)

| Moment | Text announced |
|---|---|
| Generation starts | "Generating your journey" |
| Generation takes over 5 seconds | "This is taking a little longer than usual. Your journey will be ready soon." |
| Journey ready | "Your journey is ready" |
| Stage marked | "Stage N complete. X of Y stages complete, Z percent. Stage M is open." (or, for the last stage, the percentage only) |
| Stage unmarked | "Stage N marked as not complete. X of Y stages complete, Z percent." |
| Milestone | The banner text |
| Nudge | The banner text |
| Save, load or delete error | The error text |
| Goal date saved | "Goal date saved" |
| Goal date cleared | "Goal date cleared" |

One live region (`aria-live="polite"`, visually hidden) carries these, so announcements are never doubled. Nothing is announced assertively.

### Timing and Motion

- Generation: show "Generating…" at once; add the 5-second message once; after 15 seconds across all attempts the template is used (FR1.6) and nothing extra is announced beyond "Your journey is ready".
- Marking a stage updates the page within 1 second and the save finishes within 2 seconds (NFR2).
- Banners fade in over 200 milliseconds and stage panels open with a height change of at most 200 milliseconds. With reduced motion requested, both happen instantly.
- No animation flashes, loops or plays sound. [Q3]

### Keyboard Map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Move through controls in visual order |
| Enter or Space | Activate buttons, open or close a stage |
| Arrow keys | Move between the three teaching-style radios |
| Escape | Close a dialog or the More menu |
| Enter in the Topic field | Submits the form only if the button would be enabled |

No custom shortcuts and no keys that work only with a mouse.

---

## Components

### TopicField

| Field | Value |
|---|---|
| Component | TopicField |
| Description | Single-line text input for the learning topic |
| Category | input |

**States**

| State | Description | Trigger |
|---|---|---|
| default | Empty, label and hint visible | page load |
| focus | 3-pixel amber outline with 2-pixel gap | Tab or click |
| filled | Contains text | typing |
| error | Border thickened, warning icon and message below | invalid on blur or submit |
| disabled | Greyed, not editable | generating |

**Inputs**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| value | string | yes | "" | Trimmed on submit |
| min | number | no | 2 | Minimum characters |
| max | number | no | 100 | Maximum characters; also stops typing beyond 100 |

**Responsive:** full width at every size.
**Accessibility:** native `input type="text"` with a visible `label`; hint and error linked with `aria-describedby`; `aria-invalid="true"` in the error state; `autocomplete="off"`; error text announced politely; validation runs on blur and on submit, not on every key. Satisfies FR1.1, US1.1.

### StyleChoice

| Field | Value |
|---|---|
| Component | StyleChoice |
| Description | Radio group for the teaching style |
| Category | input |

**States:** default (none selected), focus (outline on the focused radio), selected, disabled (while generating).
**Inputs:** options (guide, instructor, planner), each with a label and one-line description.
**Responsive:** stacked on every width.
**Accessibility:** `fieldset` with a `legend` "Choose your teaching style"; native radios; arrow keys move; descriptions linked with `aria-describedby`. Hidden entirely when US1.2 is cut. Satisfies FR1.3, US1.2.

### GenerateButton and GenerationStatus

| Field | Value |
|---|---|
| Component | GenerateButton, GenerationStatus |
| Description | Primary action and its progress text |
| Category | input, feedback |

**States:** disabled (topic or style missing; the hint says why), enabled, busy ("Generating…", disabled, a second press sends nothing), rate-limited, daily-limit, error.
**Accessibility:** native `button`; disabled state uses the `disabled` attribute plus a visible hint in text; busy status in a `role="status"` line; a spinner is `aria-hidden` and always paired with words. Satisfies FR1.7, US1.5.

### StageItem (the ladder)

| Field | Value |
|---|---|
| Component | StageItem |
| Description | One stage: marker, title, status words and an expandable panel |
| Category | display, navigation |

**States**

| State | Marker | Words | Panel |
|---|---|---|---|
| done | Check mark in filled circle | "Done" | Closed unless opened |
| up next | Number with thick outline | "Up next" | Open by default |
| to do | Number in outlined circle | "To do" | Closed |
| open | Any of the above | Same | Visible |

**Behaviour:** one panel open at a time (opening one closes another); the first stage not yet complete opens by default; if all are complete, none is open. Any Done stage can be opened to read it again, and its only action is "Mark stage N as not complete". After an unmark, the first stage not yet complete opens; if the stage just unmarked is now the earliest one not yet complete it stays open, otherwise the stage that was open before stays open. [Q4, person's decision]
**Panel content:** what it is, why it matters, what you can do after it; materials (reading, exercises, mini project, quiz); about N hours (planner style: hours for each material kind); the complete button.
**Responsive:** the joining line sits 16 pixels from the left edge at narrow widths; text wraps; no sideways scroll.
**Accessibility:** each stage is a native `details`/`summary` pair grouped with a shared `name` so only one is open, or a `button` with `aria-expanded` and `aria-controls` if the browser support for grouped `details` is not enough; the summary text is "Stage N: title, status"; the line and the marker graphic are `aria-hidden`; the marker's meaning is carried by the words "Done", "Up next" and "To do". Satisfies FR2.1, FR2.2, FR3.1, US2.1, US3.1.

### CompleteButton

| Field | Value |
|---|---|
| Component | CompleteButton |
| Description | Marks a stage complete or not complete |
| Category | input |

**States:** "Mark stage N complete" (default), "Mark stage N as not complete" (when done), busy (while saving, label unchanged), error (inline "We couldn't save that change. Try again." with a "Try again" button).
**Behaviour:** pressing it twice, or from two tabs, gives the same result as once (FR3.5); a failed save leaves the stage looking not saved. After marking, focus moves to the heading of the stage that opens next, because the stage holding the button closes.
**Accessibility:** native `button`; label includes the stage name; result announced through the live region. Satisfies FR3.1, FR3.2, FR3.3, US3.1, US3.2.

### MyJourneyHeader

| Field | Value |
|---|---|
| Component | MyJourneyHeader |
| Description | Sticky summary: topic, style, progress, hours, goal and pace |
| Category | display |

**States:** with goal date; without goal date (shows "Set a goal date"); goal due today ("Due today"); goal passed ("Goal date passed — choose a new date"); loading (skeleton).
**Responsive:** under 768 pixels it shows two lines and a "Details" disclosure; it stops sticking when it would cover more than a third of the window.
**Accessibility:** progress uses the native `progress` element with an accessible name "Journey progress" and the percentage also written as text; the days-remaining text is plain text, not an icon or colour alone; the block is a `section` with an `aria-labelledby` pointing at the `h1`. Satisfies FR3.3, FR4.2, FR4.3, US4.2.

### GoalDateField

| Field | Value |
|---|---|
| Component | GoalDateField |
| Description | Inline form to set, change or clear the goal date |
| Category | input |

**States:** closed (button "Set a goal date" or "Change"), open (date field, Save, Clear), error ("Choose a date from today up to 365 days ahead."), saved (closes, announces "Goal date saved").
**Inputs:** earliest = today in the learner's local time; latest = today plus 365 days.
**Accessibility:** native `input type="date"` with a visible `label` "Goal date"; hint linked with `aria-describedby`; Save and Clear are buttons; Escape closes without saving. If the browser shows a plain text field, the hint "Use the format YYYY-MM-DD" is shown. Satisfies FR4.1, US4.1.

### Banner (milestone, nudge, limit)

| Field | Value |
|---|---|
| Component | Banner |
| Description | One short message with an icon and a Dismiss button |
| Category | feedback |

**States:** hidden, shown, dismissed (not shown again for milestones).
**Rules:** one banner at a time, oldest first; nudge text is from the approved set and avoids the blocked list in FR6.2; no countdown, no red styling.
**Accessibility:** `role="status"` region; icon is `aria-hidden`; message is real text; Dismiss is a button reachable by keyboard. Satisfies FR5.1, FR5.2, FR6.1 to FR6.3, US5.1, US6.1.

### ConfirmDialog

| Field | Value |
|---|---|
| Component | ConfirmDialog |
| Description | Modal confirmation for replacing or deleting a journey |
| Category | feedback |

**States:** closed, open, busy (the confirm button shows "Working…"), error (message inside the dialog, journey kept).
**Accessibility:** native `dialog` opened with `showModal()` so focus is trapped and the page behind is inert; `aria-labelledby` the title and `aria-describedby` the explanation; Cancel is first and has initial focus; Escape closes; focus returns to the opener. Satisfies FR7.1, FR7.3, US7.1, US7.2.

### CertificateView

| Field | Value |
|---|---|
| Component | CertificateView |
| Description | Completion screen with a printable certificate |
| Category | display |

**States:** with name, without name, printing.
**Behaviour:** the optional name is held in memory only; it is never sent, stored or logged. The print stylesheet shows only the certificate panel in black and white. [FR5.3, Q7]
**Accessibility:** `h1` "Journey complete" receives focus on arrival; the certificate panel is a labelled `section`; the name field has a visible label "Name on certificate (optional, not saved)". Satisfies FR5.3, FR5.4, US5.2.

### InlineError and Skeleton

| Field | Value |
|---|---|
| Component | InlineError, Skeleton |
| Description | Error text with a retry, and loading placeholders |
| Category | feedback |

**Rules:** an error sits next to what failed and offers "Try again" where retrying helps; a skeleton matches the shape of what is loading and is replaced, not overlaid; neither relies on colour.
**Accessibility:** error text in a `role="alert"`-free polite region (no assertive announcements); skeleton blocks are `aria-hidden` with one polite "Loading your journey" announcement. Satisfies FR3.4, US3.3.

---

## Edge and Corner Behaviour

| Case | Behaviour |
|---|---|
| Very long topic or very long stage text | Wraps; no sideways scrolling; the topic is shown in full in the header |
| Topic contains markup or the AI reply contains markup | Always shown as plain text; nothing runs |
| One tab marks a stage, another tab is open | The second tab shows the new state on its next load or save; marking the same stage again is harmless |
| Journey has 5 stages versus 6 | The ladder, count and percentage use the real number |
| Template journey | Same layout and fields; template label; same for every style |
| Goal date earlier than today after returning | "Goal date passed — choose a new date"; no nudge |
| Browser blocks local storage | A message "This browser is blocking storage, so your journey can't be saved between visits." and the journey works for the current visit only [assumption] |
| No saved journey on return | The Home screen, not an error |

## Assumptions & Open Questions

- [assumption] Grouped `details` elements (one open at a time) work in the latest two releases of all four supported browsers; if testing shows otherwise, the button-based accordion is used.
- [assumption] The message for blocked storage is new copy added in this stage; it is not in the requirements and will be reviewed in functional design.
- Open: wording of all on-screen messages is finalised in functional design; this document fixes the meaning, not the last word.
