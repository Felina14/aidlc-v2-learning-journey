# Business Rules — u4-goals-and-style

## Sources

- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US1.2, US4.1, US4.2
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: FR1.3, FR2.3, FR2.4, FR4.1 to FR4.3
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1, C2, C3, C5)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (header goal line, GoalDateField, style radios)
- `entities.md` in this folder, and the earlier units' rules, which stay in force
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

These rules are numbered from BR30 so they never clash with the earlier units' rules. The goal and pace rules (BR30) are pure rules with no storage; they are the "progress maths" the team practices ask to be written and tested first.

## Machine-Readable Rules

```yaml
rules:
  - id: BR30.1
    statement: A goal date is allowed only if it is a real calendar date from today up to 365 days ahead in the learner's local date.
    category: validation
    applies_to: LearningProgress, WebApp goal form
    trigger: The learner saves a goal date.
    logic: The entry must be a real calendar date in the form YYYY-MM-DD. IF it is before today (local date) or more than 365 days after today THEN it is not allowed. Today and today plus 365 days are allowed; yesterday and today plus 366 days are not. IF the entry is not a date at all THEN the message names the format expected.
    violation: The form shows "Choose a date from today up to 365 days ahead." for a date out of range, or a message naming the format YYYY-MM-DD for text that is not a date. Nothing is sent and what was typed is kept.
    source: FR4.1

  - id: BR30.2
    statement: The goal state is none, upcoming, due today or passed, and days remaining are counted in calendar days of the learner's local date.
    category: calculation
    applies_to: LearningProgress, WebApp header
    trigger: The journey is shown, or the goal date changes, or the local date changes.
    logic: IF there is no goal date THEN the state is none. Otherwise days remaining is the goal date's calendar date minus today's calendar date, both in the learner's local date and counted in whole calendar days (not 24-hour periods, so a daylight-saving change does not shift it). The state is recalculated when the journey is shown, when the goal date changes, at the next local midnight (the page sets a timer for it and also recalculates when the tab becomes visible again), so a page left open overnight stays right. IF days remaining is more than 0 THEN the state is upcoming. IF it is 0 THEN the state is due today and the header reads "Due today". IF it is below 0 THEN the state is passed and the header reads "Goal date passed — choose a new date", in an encouraging tone.
    violation: Not applicable; the state is always worked out, never entered.
    source: FR4.3

  - id: BR30.3
    statement: The weekly pace is the hours of the stages not yet done divided by the whole weeks left, shown only while a goal is upcoming and work remains.
    category: calculation
    applies_to: LearningProgress, WebApp header
    trigger: The journey is shown, a goal date is set or changed, or a stage is marked or unmarked.
    logic: weeks left = days remaining divided by 7, rounded up, and at least 1. hours left = the sum of the hours of the stages that are not done. pace = hours left divided by weeks left, written with the hours-writing rule (a whole number without a decimal point, otherwise one decimal place) as "about N hours per week"; a pace under 0.1 hours reads "less than 0.1 hours per week" instead of "about 0". The pace is shown only when the goal state is upcoming and at least one stage is not done. With no goal date, on the goal date, after it, or with every stage done, no pace is shown. With nothing done, 16 hours and a goal date 28 days away give 4 hours per week.
    violation: Not applicable.
    source: FR2.4 (functional design Q1)

  - id: BR30.4
    statement: The sticky header always shows the goal line: the goal date and days remaining, or a way to set a goal date.
    category: policy
    applies_to: WebApp header
    trigger: The journey is shown or the page scrolls.
    logic: With a goal date the header shows the date and, by its state, "N days left", "Due today" or "Goal date passed — choose a new date", as plain text that does not depend on colour or an icon, and it stays visible while the learner scrolls through the stages. Without a goal date it shows a "Set a goal date" button. Under 768 pixels the header keeps the goal line inside its "Details" disclosure as the interaction spec says. The pace, when shown, sits beside the goal line.
    violation: Not applicable.
    source: FR4.2

  - id: BR31.1
    statement: The goal date form sets, changes and clears the date, and the header updates straight away.
    category: policy
    applies_to: WebApp, GoalDateField
    trigger: The learner chooses "Set a goal date", "Change", Save or Clear.
    logic: The form opens from the button with a visible label "Goal date", a native date field limited from today to 365 days ahead (with the hint "Use the format YYYY-MM-DD" when the browser shows a plain text field), Save and Clear. Escape closes it without saving. Save checks BR30.1; on success the header changes at once (the date, days remaining and pace) and the form closes. The polite announcement "Goal date saved" is made only when the server's answer confirms the save; until then nothing says it was saved (a failed save announces that it could not be saved instead). Clear removes the date at once and announces "Goal date cleared" the same way, after the answer. Focus returns to the button that opened the form. While the form's change is saving, the "Start a new journey" and "Delete my journey" controls ignore presses, and while a delete is running Save and Clear ignore presses, so a goal change can never be in flight when the journey is replaced or deleted from this page; a late answer for a journey that is no longer the one on the page is dropped.
    violation: The message of BR30.1 beside the field; focus is not moved unless the form was submitted, in which case it goes to the field.
    source: FR4.1

  - id: BR31.2
    statement: A goal change is saved after the page has changed; if the save fails the old value is put back and an inline error with "Try again" shows.
    category: policy
    applies_to: WebApp
    trigger: A goal change is sent.
    logic: The page changes first and then sends the change. The answer's goalDate is the truth. A network failure is repeated once by itself. IF the save fails (SAVE_FAILED, or no answer in 10 seconds) THEN the old goal date is put back, the header follows, the form reopens or the error shows beside the goal line with "Try again" repeating the same change, and the page never claims it was saved. A 429 with no error code shows the "please wait" message and puts the old value back. Two goal changes never overlap: while one is saving, Save and Clear ignore presses. A goal change may overlap a stage mark, because they change different fields and each answer carries only its own field.
    violation: The old value with the inline error.
    source: FR4.1 (functional design assumption on independence)

  - id: BR31.3
    statement: If a goal change finds the journey gone or the request invalid, the page puts the old value back and says so.
    category: policy
    applies_to: WebApp
    trigger: The goal call answers NOT_FOUND or INVALID_REQUEST.
    logic: The change is undone. NOT_FOUND shows the same plain "this journey is no longer saved" message with a button to the home screen as for a stage change, with no "Try again". INVALID_REQUEST (for example a date the server does not accept) shows that the date could not be used and reopens the form with the old value, with no "Try again" for the same date.
    violation: Not applicable.
    source: FR4.1

  - id: BR32.1
    statement: The goal call changes only the goal date, in one conditional update that needs a live journey.
    category: constraint
    applies_to: JourneyStore (setGoalDate), request handler (PUT /api/v1/journey/goal)
    trigger: A goal call arrives.
    logic: The session ID must be a standard UUID (the first unit's session-ID rule). The body must be one JSON object that has the key goalDate, whose value is either null or a string in the form YYYY-MM-DD that is a real calendar date (so a missing key, 2026-02-30 and 26-11-10 are refused); other keys are ignored. The server does not apply the 365-day range; it checks only the date is real. The update sets goalDate to the date, or removes the attribute for null, in one conditional update of that one field only, and in the same update moves lastActivityAt and expiresAt (90 days later) like every write. The condition is that the record exists and its expiresAt is greater than now in whole epoch seconds (the same test as for a stage change). Setting the same value again, or clearing an absent date, is a success and changes nothing else. One attempt only, with the 2-second total store limit. On success the call answers 200 with {"goalDate": the stored date or null}.
    violation: INVALID_REQUEST (400) for a bad session ID or a goalDate that is not null or a real date; NOT_FOUND (404) when there is no live journey (nothing is created or revived); SAVE_FAILED (500) when the store fails or is too slow.
    source: FR4.1 (contract C1, C5)

  - id: BR33.1
    statement: The learner must choose a style before a journey is made, none is preselected, and the button says why it is disabled.
    category: validation
    applies_to: WebApp topic screen
    trigger: The topic screen opens, a topic is typed, or a style is picked.
    logic: The screen shows three style radios (friendly guide, structured instructor, planner) with nothing selected, every time it opens, including through "Start a new journey" (the style of a journey being replaced is not preselected). While no style is chosen the "Generate my journey" button is disabled and a visible hint beside it says a style must be chosen. A style is chosen with the keyboard or the pointer. Choosing a style enables the button once the topic is valid.
    violation: The button stays disabled with its hint; no request is sent.
    source: FR1.3 (functional design Q4)

  - id: BR33.2
    statement: The create call carries the chosen style; an absent style means the guide style, and any other value is invalid.
    category: validation
    applies_to: request handler, JourneyGenerator
    trigger: A create call arrives.
    logic: The body's style is one of guide, instructor and planner. IF it is absent THEN the guide style is used, so an older cached page still works. IF it is anything else THEN the call answers INVALID_REQUEST and makes no model call. The style is passed to the prompt and recorded as the journey's teaching style. The server decides the rules from the style; it never trusts the page for them.
    violation: INVALID_REQUEST (400).
    source: FR1.3 (contract C1)

  - id: BR33.3
    statement: The style changes the tone and emphasis of the model request, and not the stages or the kinds of materials.
    category: policy
    applies_to: JourneyGenerator, prompt
    trigger: The model request is built.
    logic: All styles ask for the same 5 or 6 stages with the same fields and kinds of materials. The guide asks for an encouraging, analogy-led voice. The instructor asks for at least 2 exercises and at least 1 quiz in every stage and a structured, step-by-step voice. The planner asks for hours for reading, exercises, mini project and quiz in every stage and a tracking-focused voice. The topic is still passed only as delimited data.
    violation: Not applicable.
    source: FR2.3

  - id: BR33.4
    statement: An AI reply for the instructor or planner style is valid only if it has what that style promises.
    category: validation
    applies_to: JourneyGenerator, reply checks
    trigger: A model reply arrives for an instructor or planner request.
    logic: The checks for every reply still apply. IF the style is instructor THEN every stage must have at least 2 exercises and at least 1 quiz item (the upper limits still apply). IF the style is planner THEN every stage must have hoursByKind with all four numbers (reading, exercises, miniProject, quiz), each at least 0, and their sum must be within 0.1 of the stage's hours. A reply that fails these is invalid and goes through the same one-retry-then-template path (functional design Q2). For the guide style nothing more is checked; its tone is judged by reading a sample of stages. A hoursByKind that a guide or instructor reply happens to include is ignored and not stored, so only a planner-style AI journey ever carries it. The stored stage shape and the page's model of a stage gain the optional hoursByKind in code generation.
    violation: The reply is invalid; the request retries once if time allows, otherwise the template is used.
    source: FR2.3 (functional design Q2)

  - id: BR33.5
    statement: The template journey is the same for every style and has no hours breakdown.
    category: policy
    applies_to: JourneyGenerator, template, WebApp
    trigger: The template is used.
    logic: The template has the same fixed stages, the same fields and the same hours (2, 3, 3, 4, 4) whichever style was chosen. It carries no hoursByKind. For a planner-style journey made from the template the page shows each stage's total only, because there is no breakdown to show. The journey is labelled as a template as before.
    violation: Not applicable.
    source: FR2.3

  - id: BR33.6
    statement: The chosen style is stored with the journey and its name is shown in the header, and a planner journey shows each stage's four hours.
    category: policy
    applies_to: JourneyStore, WebApp
    trigger: A journey is saved, loaded or shown.
    logic: The save records the style as the journey's teaching style, as it already does. The header shows the style's name beside the topic. In a planner-style AI journey each open stage shows its hours for reading, exercises, mini project and quiz beside the stage total, in plain text written with the hours-writing rule. The other styles show only the stage total.
    violation: Not applicable.
    source: FR2.3, FR2.4

  - id: BR34.1
    statement: A replacement journey starts with no goal date.
    category: policy
    applies_to: JourneyStore, JourneyGenerator
    trigger: A new journey replaces the saved one.
    logic: The save of a new journey writes a record with no goal date, as it writes no completed stages. Nothing is read from the old record. The learner sets a goal date again if they want one.
    violation: Not applicable.
    source: FR4.1 (functional design Q3)
```

## Rules Summary

| Group | Rules | What it covers |
|---|---|---|
| BR30 | BR30.1 to BR30.4 | Goal rules: allowed dates, state and days remaining, weekly pace, the header goal line |
| BR31 | BR31.1 to BR31.3 | The goal form and its save: instant change, rollback, journey gone or invalid |
| BR32 | BR32.1 | The goal call in the store and API |
| BR33 | BR33.1 to BR33.6 | The style: the choice, the call, the prompt, the reply checks, the template, what is shown |
| BR34 | BR34.1 | A replacement journey starts with no goal date |

## Assumptions & Open Questions

- [assumption] The exact wording of the messages follows the refined mockups; only the meaning is fixed here.
- [assumption] The 0.1-hour tolerance of the planner check allows for rounding by the model; it is set here and can be changed in code generation with a test.
- [assumption] The goal date's 365-day range is applied only in the browser, as the contract says, so a script can store a date outside it; that is accepted, since the goal is the learner's own value and affects nothing else.
- None otherwise.
