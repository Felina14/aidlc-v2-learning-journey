# Refined Mockups — Questions

## Sources

- Wireframes: `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- User flow: `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/user-flow.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Team practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`

Already decided and not asked again: desktop-first and responsive, a clean look with a warm and encouraging tone, a neutral palette with one warm accent that passes contrast, a vertical ladder of stages with a sticky "My Journey" header, and an AI-generated label on every journey.

---

## Q1. [Design] How should the screens be built?

There is no existing design system. The frontend approach also decides the tools named in the team practices (Prettier and ESLint apply if JavaScript or TypeScript is used). Whatever is chosen has to give good keyboard and screen-reader behaviour for the accordion, dialogs and progress bar.

A. Plain HTML, CSS and TypeScript with a small set of hand-made components, using native elements (button, details, dialog, progress, input type date) wherever possible
B. React with hand-made CSS and the same native-element approach
C. React with a headless, accessibility-focused component library (for example Radix) and hand-made CSS
D. Not sure — suggest what is lowest risk for a solo build in four days
X. Other (please specify)

[Answer]: A

---

## Q2. [Design] Which warm accent colour?

The accent is used for the primary button, progress bar fill and focus ring. Whatever is chosen must keep text on it at 4.5 to 1 contrast and the bar and focus ring at 3 to 1 against the background.

A. Deep amber (a dark orange-brown that passes contrast with white text)
B. Terracotta (a muted red-orange)
C. Warm gold with dark text on it
D. Not sure — pick one that passes contrast and feels encouraging
X. Other (please specify)

[Answer]: A

---

## Q3. [Design] How much celebration for milestones and the certificate?

Milestones and the certificate are meant to feel rewarding without being childish or distracting. Any motion must switch off for people who ask their device to reduce motion.

A. Calm: a gentle fade-in banner and a check-mark highlight, no confetti or sound
B. A short celebratory animation on milestones and the certificate, switched off when reduced motion is requested
C. None: static banners only
D. Not sure — suggest what fits the tone
X. Other (please specify)

[Answer]: A

---

## Q4. [Design] How do stages open and close?

The ladder shows 5 to 6 stages. Each stage holds a lot of text, so opening them all at once makes a very long page.

A. One stage open at a time: opening another closes the one that was open; the first stage not yet complete is open by default
B. Any number can be open; the first stage not yet complete is open by default
C. All collapsed by default; any number can be open
D. Not sure — suggest what reads best
X. Other (please specify)

[Answer]: A

---

## Q5. [Design] How is a stage's status shown?

Status must never rely on colour alone. The ladder needs to show done, to do, and the stage you are on.

A. A numbered marker per stage: a check mark when done, the number when to do, and a filled outline plus the words "Up next" for the current one, with a joining line down the ladder
B. A status label on each stage ("Done", "To do", "Up next") with no markers or line
C. Check boxes only, as in the rough wireframes
D. Not sure — suggest an accessible option
X. Other (please specify)

[Answer]: A

---

## Q6. [Design] How is the goal date entered?

The date must be today or later and at most 365 days ahead, can be changed or cleared, and the form must be clear in every supported browser.

A. The browser's native date field with the earliest and latest dates set, a visible label, and a clear button
B. A text field with a format hint (for example 24 Dec 2026) and a check on leaving the field, plus a clear button
C. A native date field plus quick choices ("in 1 week", "in 1 month")
D. Not sure — suggest the most accessible option
X. Other (please specify)

[Answer]: A

---

## Q7. [Design] What should the certificate look like?

It shows the topic, completion date, number of stages and an optional typed name, and is printed or saved with the browser.

A. Simple and printable: a plain page with a border, title, topic, date, stage count and name, readable in black and white
B. More decorative: colour, a seal graphic and a decorative border, with a plain print version
C. Not sure — suggest a version that prints reliably
X. Other (please specify)

[Answer]: A

---

## Q8. [Design] How are confirmations shown?

Replacing a journey and deleting a journey both need a confirmation that names what will happen.

A. A modal dialog that traps keyboard focus, closes with Escape, and returns focus to the button that opened it
B. An inline confirmation panel that appears in place of the button, with Confirm and Cancel
C. Not sure — suggest the pattern with the least risk of keyboard problems
X. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

- Build approach: plain HTML, CSS and TypeScript with a small set of hand-made components, using native elements (button, details, dialog, progress, date input) wherever possible; no frontend framework (Q1: A)
- Accent colour: deep amber, a dark orange-brown that passes contrast with white text (Q2: A)
- Celebration: calm — a gentle fade-in banner and a check-mark highlight, no confetti or sound (Q3: A)
- Stages: one open at a time, with the first stage not yet complete open by default (Q4: A)
- Status: a numbered marker per stage — a check mark when done, the number when to do, and a filled outline with the words "Up next" for the current one — joined by a line down the ladder (Q5: A)
- Goal date: the browser's native date field with earliest and latest dates set, a visible label and a clear button (Q6: A)
- Certificate: simple and printable, a plain page with a border, readable in black and white (Q7: A)
- Confirmations: a modal dialog that traps keyboard focus, closes with Escape and returns focus to the button that opened it (Q8: A)

- Looks correct
- Request changes

[Answer]: Looks correct
