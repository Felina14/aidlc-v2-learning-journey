# Entities — u5-encouragement

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 milestones call, C2 `milestonesShown`, C5 `markMilestoneShown`)
- The earlier units' `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/entities.md`, `.../u2-progress/functional-design/entities.md`, `.../u3-protection/functional-design/entities.md` and `.../u4-goals-and-style/functional-design/entities.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

U5 adds no stored record. The Journey already holds `milestonesShown`; U5 starts to write it, one milestone at a time, and stores it the way the second unit stores completed stages. The other entities are values worked out on the page, or small pieces of page state. Nothing here holds a name, email or other personal information in the stored record; the certificate name lives in page memory only.

## Machine-Readable Entities

```yaml
entities:
  - name: Journey
    owner: JourneyStore
    description: The one learning journey a session holds, as defined in the earlier units. In U5 its milestonesShown set is written, one milestone at a time, after the save.
    identifier: sessionId
    attributes:
      - name: milestonesShown
        type: string set (a DynamoDB string set), absent when empty
        required: true
        default: empty (the attribute is not stored at all)
        allowed_values: [first-stage, halfway, complete]
        constraints: no duplicates; sent to the browser as a list in the fixed order first-stage, halfway, complete (the load and the 200 answer both sort it into that order), empty when absent; changed one milestone at a time with the database's own add action on the set, never by writing the whole set back; a set cannot be empty, so the save omits the attribute instead of writing an empty list, and a load treats a missing attribute, a set or an empty list as empty; a milestone once in the set is never removed. The first unit has not been deployed, so no record saved with an empty list exists anywhere; U5's code generation changes the save, and a milestone call on a record that does still hold an empty list is refused by the database and ends as SAVE_FAILED (an accepted limit, not a case to build for)
      - name: lastActivityAt
        type: date and time (ISO 8601 text)
        required: true
        constraints: moved to the time of each successful milestone record, like every write
      - name: expiresAt
        type: whole number of seconds since 1 January 1970 UTC (epoch seconds)
        required: true
        constraints: moved to 90 days after each successful milestone record, but only for a journey that is still live
    entity_constraints:
      - A milestone record never creates a journey and never revives an expired or deleted one.
      - A replacement journey starts with no milestones shown, as it starts with no completed stages and no goal date.
      - The stored record holds no name, email or other personal information, and U5 adds no field to it.

  - name: MilestoneChange
    owner: WebApp
    description: One request to record that a milestone was shown. Held only while the request runs; never stored.
    attributes:
      - name: milestone
        type: enum
        required: true
        allowed_values: [first-stage, halfway, complete]
        constraints: anything else is invalid
      - name: sessionId
        type: text (random UUID)
        required: true
        constraints: sent in the X-Session-Id header and checked as in the first unit (its session-ID rule)
    relationships:
      - target: Journey
        cardinality: many MilestoneChanges to one Journey over time
        direction: a MilestoneChange adds one name to the milestonesShown of one Journey

  - name: MilestoneStatus
    owner: LearningProgress
    description: Which milestones the completed stages have reached, and which of them are new. Worked out on the page; never stored.
    attributes:
      - name: reached
        type: set of milestone names
        required: true
        constraints: first-stage when at least one stage is done; halfway when completed stages times 2 is at least the stage count; complete when every stage is done
      - name: newlyReached
        type: set of milestone names
        required: true
        constraints: reached and not counted as shown, where the page's shown set counts a milestone as shown when it is in the set or is lower than any milestone in the set
      - name: toShow
        type: milestone name or none
        required: true
        constraints: the highest of newlyReached (complete over halfway over first-stage), or none; the lower newly reached ones are recorded as shown without being shown (functional design Q1)
    relationships:
      - target: Journey
        cardinality: one MilestoneStatus per Journey
        direction: derived from the Journey's completed stages and the page's shown set

  - name: PageShownSet
    owner: WebApp
    description: The page's own copy of which milestones have been shown. Held in page memory; rebuilt from the load on every visit.
    attributes:
      - name: shown
        type: set of milestone names
        required: true
        constraints: filled from the journey's milestonesShown when the journey is loaded; a milestone is added the moment its banner is shown, before any recording; every 200 answer of the milestone call is merged in; never reduced during a visit; replaced (emptied and refilled from the loaded journey) whenever the journey on the page changes without a reload, that is when a new journey is saved to replace the old one or the journey is deleted. The milestone check is made against this set, so a failed recording only affects later page loads

  - name: PageView
    owner: WebApp
    description: Which of the two views of a journey the page is showing. Held in page memory only.
    attributes:
      - name: view
        type: enum
        required: true
        allowed_values: [journey, completion]
        constraints: completion when every stage is done on a load or when a confirmed mark completes the journey; journey otherwise; set to journey by "Back to my journey"; reset by any confirmed stage change (a mark sets it again to completion if that completes the journey), by a reload and by a new journey; never stored

  - name: CertificateView
    owner: WebApp
    description: The completion view with the certificate. Worked out on the page whenever every stage is done; never stored.
    attributes:
      - name: topic
        type: text
        required: true
        constraints: the journey's topic, shown as plain text
      - name: date
        type: calendar date
        required: true
        constraints: today's date in the learner's local calendar, read from the browser, written in a plain long form
      - name: stageCount
        type: whole number
        required: true
        min: 5
        max: 6
        constraints: written as "5 stages" or "6 stages"
      - name: name
        type: text
        required: false
        constraints: typed by the learner into the labelled field; held in page memory only; shown on the certificate while the page is open; never sent, never put in browser storage, never logged, never announced or put in a message; lost on reload
    relationships:
      - target: Journey
        cardinality: one CertificateView per completed Journey
        direction: derived from the Journey when every stage is done

  - name: NudgeStatus
    owner: LearningProgress
    description: Whether a nudge applies now and which message it is. Worked out on the page; never stored.
    attributes:
      - name: applies
        type: true or false
        required: true
        constraints: true only when progress is below 50% (completed over stages, so 3 of 6 is not below), a goal date is set, and days remaining in the learner's local calendar is 0, 1, 2 or 3
      - name: daysRemaining
        type: whole number or none
        required: false
        min: 0
        max: 3
        constraints: present only when applies is true
      - name: messageKey
        type: text or none
        required: false
        constraints: names one message of the fixed set, chosen by days remaining; the message names the next stage by its number and how many stages are left, and holds no text written by the AI
    relationships:
      - target: Journey
        cardinality: one NudgeStatus per Journey
        direction: derived from the Journey's completed stages and goal date and today's date

  - name: NudgeDismissal
    owner: WebApp
    description: The learner's wish not to see today's nudge again. Kept in the browser's own storage, never sent to the server.
    attributes:
      - name: key
        type: text
        required: true
        constraints: made from the goal date and today's local date only (for example the two joined), so it holds nothing about the topic or the learner; kept in the browser's local storage under one fixed prefix so all of them can be found; markers for earlier days are removed whenever a marker is written, and all of them are removed when the journey is deleted or replaced
      - name: dismissed
        type: true or false
        required: true
        constraints: true once dismissed; the entry stops mattering when the local date changes, because the key then no longer matches
    relationships:
      - target: Journey
        cardinality: zero or one NudgeDismissal per goal date and day
        direction: applies to the nudge of one goal date on one day
    entity_constraints:
      - If the browser blocks storage, the dismissal is kept in page memory only.

  - name: Banner
    owner: WebApp
    description: The one message currently shown above the journey. Held only on the page.
    attributes:
      - name: kind
        type: enum
        required: true
        allowed_values: [milestone, nudge]
        constraints: one banner at a time; a milestone before a nudge when both apply
      - name: text
        type: text
        required: true
        constraints: always one of the unit's own fixed messages, shown as plain text, and checked against the blocked-word list
    relationships:
      - target: MilestoneStatus
        cardinality: zero or one Banner per milestone shown
        direction: made from the milestone chosen to show

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

U5 stores one thing: which milestones have been shown, as a small set on the journey, written one name at a time like the completed stages. The milestone status, the certificate, the nudge and the banner are all worked out on the page from the journey, the goal date and today's date. The certificate name and the nudge dismissal are the only things kept outside the server, the first in page memory and the second in the browser's own storage, and neither holds anything personal.

## Assumptions & Open Questions

- [assumption] The fixed order of the three milestone names in the list sent to the browser is first-stage, halfway, complete, so the page and the tests compare lists simply.
- [assumption] The certificate's date is read from the browser at the moment the completion view is shown and again at local midnight; it is the date of viewing, not a stored completion date, as the story says.
- None otherwise.
