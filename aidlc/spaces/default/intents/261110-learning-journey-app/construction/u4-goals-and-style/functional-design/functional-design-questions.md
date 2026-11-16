# Functional Design — u4-goals-and-style — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U4, u4-goals-and-style)
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US1.2, US4.1, US4.2)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (FR1.3, FR2.3, FR2.4, FR4.1 to FR4.3)
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` (LearningProgress goal part, JourneyStore goal date, JourneyGenerator style)
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 `PUT /journey/goal` and the optional `style` on create, C2 `goalDate` and `hoursByKind`, C3, C5 `setGoalDate`)
- Interaction spec: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (the header's goal line, GoalDateField, the style radios)
- Built so far: the first three units' designs and code (the guide-only prompt and the reply checks, the progress rules, the header, the one-change-at-a-time page controller, replace and delete)

This stage designs what U4 does, as rules and shapes, before any code. A lot is already settled: the learner must choose one of three styles before a journey is made, with no style preselected, and the button stays disabled with the reason written beside it until one is chosen (AC1.2.1); the instructor style gives every stage at least 2 exercises and at least 1 quiz, the planner style gives every stage hours for reading, exercises, mini project and quiz, and the guide style is encouraging and analogy-led (AC1.2.2 to AC1.2.4); the template journey is identical whatever the style (AC1.2.5); the goal date is optional, today or later and no more than 365 days ahead in the learner's local date, can be changed or cleared, and stays in the sticky header with the days remaining counted in calendar days, "due today" on the day and "goal date passed" after it (FR4.1 to FR4.3); the server checks only that a goal date is a real calendar date; and the weekly pace is shown only with a goal date. These four questions are the places where earlier stages left a real choice. Everything else I could settle with a sensible default is listed under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] How should the weekly pace be worked out?

AC4.2.3 says 16 hours in total and a goal date 4 weeks away gives 4 hours per week, and no goal date means no pace. It does not say what happens once some stages are done, or when the goal date is only a few days away.

A. Divide the hours of the stages not yet done by the number of whole weeks left, counting the days remaining over 7 and rounding up, with a minimum of 1 week; write it as "about N hours per week" using the hours-writing rule from the second unit (Recommended): with nothing done it gives exactly AC4.2.3 (16 hours, 28 days, 4 weeks, 4 hours); as stages are done the pace falls, which is what a learner wants to see; and a goal 2 days away reads as the whole remaining work in one week instead of a huge figure per week.
B. Divide the total hours of all stages by the weeks left, whatever has been done: simpler, but the pace never falls as the learner makes progress, so it stops being a useful target.
C. Divide the hours not yet done by the exact fraction of a week left (days over 7, not rounded): the most exact, but a goal 2 days away gives about 56 hours per week for 16 hours of work, which looks alarming and unhelpful.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] How strictly should the planner style's hours breakdown be checked?

For the planner style the model must give, for every stage, hours for reading, exercises, mini project and quiz, as well as the stage's total hours. The reply checks from the first unit reject a reply that breaks a rule and then retry once or use the template.

A. Require all four numbers on every stage, each at least 0, and require that they add up to the stage's total hours within 0.1 of an hour; otherwise the reply is invalid and goes through the same one-retry-then-template path (Recommended): the page can show the four numbers beside a total that matches them, and the learner never sees a breakdown that contradicts the hours.
B. Require all four numbers on every stage, each at least 0, but do not check that they add up; show the four numbers and the stage total as sent: fewer fallbacks to the template, but a stage could show 3 hours in total with a breakdown that adds up to 5.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Behaviour] Should a replacement journey keep the goal date of the one it replaces?

Starting a new journey (the third unit) replaces the whole stored record, so the new journey starts with no goal date. A goal date is set per journey today.

A. No: a new journey starts with no goal date and the learner sets one if they want it (Recommended): a new topic is a new plan, an old date may no longer fit it, and it keeps replace simple, with nothing carried from the old journey (as the third unit already does for completed stages).
B. Yes: carry the old goal date into the new journey: handy when the learner is still working to the same date, but it needs the create request to read the old record and a rule for a date that has meanwhile passed.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Behaviour] When a learner starts a new journey, should the style they used last time be preselected?

The style is required and starts with nothing chosen (AC1.2.1). On the topic screen reached through "Start a new journey" the learner has just had a journey in some style.

A. No: the style radios start empty every time, and the button is disabled with its reason until one is chosen (Recommended): it matches AC1.2.1 exactly, there is only one rule to test and describe, and the learner makes the choice for each new topic.
B. Yes: preselect the style of the journey being replaced: one click fewer, but it is a second rule for the same screen, the page must hold the old style, and it contradicts "no style chosen" for that screen.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The create call sends the chosen style as `style` (`guide`, `instructor` or `planner`). A request without a style (an older cached page) is made in the guide style, as contract C1 says; a style that is none of the three is INVALID_REQUEST. The server never trusts the page for the rules: the style decides the prompt and the reply check, and the stored journey records it.
- [assumption] The prompt differs by style only in tone and emphasis (guide: encouraging, analogy-led; instructor: at least 2 exercises and at least 1 quiz in every stage; planner: hours for reading, exercises, mini project and quiz in every stage); the stages and kinds of materials stay the same. The instructor and planner rules are also checked on the reply, and a reply that breaks them is invalid and goes through the one-retry-then-template path.
- [assumption] The template journey is the same for every style and carries no hours breakdown. For a planner journey made from the template the page shows the stage total only, because the template has no breakdown to show.
- [assumption] The header shows the chosen style's name beside the topic, as the interaction spec says, for journeys of every style.
- [assumption] The goal date is stored as a calendar date (YYYY-MM-DD) or none. The page applies the range (from today to 365 days ahead in the learner's local date); the server checks only that the value is a real calendar date or null, answers INVALID_REQUEST otherwise, and treats a repeat as harmless. The update changes only the goal date, in one conditional update that needs a live, unexpired journey, and moves the last-activity time and the expiry like any other write; no live journey answers NOT_FOUND and creates nothing.
- [assumption] "Days remaining" counts calendar days in the learner's local date: the goal date's calendar date minus today's. On the goal date the header reads "Due today"; after it, "Goal date passed — choose a new date", in an encouraging tone. A stored date that has passed stays stored until changed or cleared.
- [assumption] Setting, changing or clearing the date changes the header at once and is saved; if the save fails the date is put back and an inline error with "Try again" shows; if the journey is gone the "no longer saved" message of the second unit shows. A goal change is independent of a stage mark, because they change different fields and each answer carries only its own field, so the two may overlap; two goal changes do not overlap.
- [assumption] The pace is shown only while there is a goal date in the future (at least 1 day remaining) and at least one stage is not done. On the goal date, after it, or when every stage is done, no pace is shown.
- [assumption] The nudge, milestones and certificate stay out of U4; they belong to U5, and the nudge needs the goal date this unit adds.
- None otherwise.
