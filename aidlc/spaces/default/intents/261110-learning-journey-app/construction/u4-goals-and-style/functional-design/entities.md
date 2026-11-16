# Entities — u4-goals-and-style

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 goal call and the optional `style`, C2 `goalDate`, `teachingStyle`, `hoursByKind`, C5 `setGoalDate`)
- The earlier units' `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/entities.md`, `.../u2-progress/functional-design/entities.md` and `.../u3-protection/functional-design/entities.md` (the Journey, its Stages, the progress values and the usage count)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

U4 adds no stored record and no new stored field. The Journey already holds `teachingStyle`, `goalDate` and, per stage, an optional `hoursByKind`; U4 starts to use them. The other entities here are values worked out from the Journey for the page, or the shape of one change request. Nothing here holds a name, email or other personal information.

## Machine-Readable Entities

```yaml
entities:
  - name: Journey
    owner: JourneyStore
    description: The one learning journey a session holds, as defined in the earlier units. In U4 the teaching style is chosen by the learner and stored with it, and the goal date can be set, changed and cleared after the save.
    identifier: sessionId
    attributes:
      - name: teachingStyle
        type: enum
        required: true
        allowed_values: [guide, instructor, planner]
        default: guide
        constraints: chosen by the learner before the journey is made; recorded by the save; a request without a style is made in the guide style; never changed after the save
      - name: goalDate
        type: calendar date (YYYY-MM-DD) or none
        required: false
        default: none
        constraints: the learner's own date; the page allows today up to 365 days ahead in the learner's local date; the server checks only that it is a real calendar date or null; stored as plain text, absent when none; changed only through the goal change below. A record saved by the earlier code with a stored null reads as none, as an absent attribute does; the goal change removes the attribute for none
      - name: lastActivityAt
        type: date and time (ISO 8601 text)
        required: true
        constraints: moved to the time of each successful goal change, like every write
      - name: expiresAt
        type: whole number of seconds since 1 January 1970 UTC (epoch seconds)
        required: true
        constraints: moved to 90 days after each successful goal change, but only for a journey that is still live
    entity_constraints:
      - A goal change never creates a journey and never revives an expired or deleted one.
      - A replacement journey starts with no goal date; nothing is carried over from the journey it replaces.
      - The stored record holds no name, email or other personal information, and U4 adds no field to it.

  - name: Stage
    owner: JourneyStore
    description: One step of the journey, as defined in the first unit. In U4 the optional hoursByKind is filled for planner-style journeys.
    attributes:
      - name: hoursByKind
        type: reading, exercises, miniProject and quiz hours, all numbers
        required: false
        constraints: present on every stage of a planner-style AI journey and absent on every other journey, including the template; each number at least 0; the four add up to the stage's hours within 0.1 of an hour
      - name: materials
        type: Materials
        required: true
        constraints: for an instructor-style AI journey the exercises list holds at least 2 items and the quiz list at least 1; the upper limits from the first unit still apply

  - name: GoalChange
    owner: WebApp
    description: One request to set, change or clear the goal date. Held only while the request runs; never stored.
    attributes:
      - name: goalDate
        type: calendar date (YYYY-MM-DD) or null
        required: true
        constraints: a date sets or changes the goal; null clears it; anything else, or a date that is not a real calendar date, is invalid
      - name: sessionId
        type: text (random UUID)
        required: true
        constraints: sent in the X-Session-Id header and checked as in the first unit (its session-ID rule)
    relationships:
      - target: Journey
        cardinality: many GoalChanges to one Journey over time
        direction: a GoalChange changes the goalDate of one Journey

  - name: GoalStatus
    owner: LearningProgress
    description: What the header shows about the goal, worked out from the goal date and today's date in the learner's local calendar. Never stored.
    attributes:
      - name: state
        type: enum
        required: true
        allowed_values: [none, upcoming, due-today, passed]
        constraints: none when there is no goal date; upcoming when the goal date is after today; due-today when it is today; passed when it was before today
      - name: daysRemaining
        type: whole number or none
        required: false
        min: 0
        constraints: the calendar days from today to the goal date, counted in the learner's local date; present only when the state is upcoming (at least 1) or due-today (0)
      - name: dateAllowed
        type: true or false
        required: true
        constraints: true only for a real calendar date from today up to 365 days ahead in the learner's local date
    relationships:
      - target: Journey
        cardinality: one GoalStatus per Journey
        direction: derived from the Journey's goalDate

  - name: PaceFigure
    owner: LearningProgress
    description: The suggested hours per week to finish by the goal date. Never stored.
    attributes:
      - name: hoursPerWeek
        type: number or none
        required: false
        constraints: the hours of the stages not yet done divided by the whole weeks left (days remaining over 7, rounded up, at least 1); present only when the goal state is upcoming and at least one stage is not done; written with the hours-writing rule
      - name: weeksLeft
        type: whole number or none
        required: false
        min: 1
        constraints: days remaining over 7, rounded up, at least 1
    relationships:
      - target: GoalStatus
        cardinality: zero or one PaceFigure per GoalStatus
        direction: derived from the goal status, the stage hours and the completed stages

  - name: StyleChoice
    owner: WebApp
    description: The style the learner has picked on the topic screen. Held only on the page; sent with the create call.
    attributes:
      - name: style
        type: enum or none
        required: true
        allowed_values: [guide, instructor, planner, none]
        default: none
        constraints: starts at none every time the topic screen opens, including through "Start a new journey"; the "Generate my journey" button stays disabled, with its reason in words, while it is none
    relationships:
      - target: Journey
        cardinality: one StyleChoice becomes the teachingStyle of one new Journey
        direction: sent with the create call

  - name: BrowserSession
    owner: WebApp
    description: The anonymous identity of one browser, as defined in the first unit. Unchanged.
    identifier: sessionId
    relationships:
      - target: Journey
        cardinality: one BrowserSession to zero or one Journey
        direction: BrowserSession owns at most one Journey
```

## Summary

U4 stores nothing new. The Journey already has room for the style and the goal date; U4 makes the style a choice before a journey is made and makes the goal date something the learner sets, changes and clears. The goal status and the pace are worked out on the page each time from the date, today and the stages. The style also decides what a valid AI reply must contain (BR33.4).

## Assumptions & Open Questions

- [assumption] "Today" is the learner's local calendar date, read from the browser; the server never needs it.
- [assumption] A stored goal date that has passed stays stored until the learner changes or clears it.
- None otherwise.
