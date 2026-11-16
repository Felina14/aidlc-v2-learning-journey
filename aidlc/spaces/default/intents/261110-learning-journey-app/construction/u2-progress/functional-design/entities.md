# Entities — u2-progress

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 completion call, C2 Journey shape, C5 `setStageCompletion`)
- `entities.md` of the first unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/entities.md` (the Journey, Stage and BrowserSession defined there)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

U2 adds no stored record. The Journey, with its `completedStages` set, already exists from the first unit; U2 changes only that one field, and only through partial, set-based updates, and adds one stored number (the stage count) to the record. The other entities here are values worked out from the Journey for the page, or the shape of one change request. Nothing here holds a name, email or other personal information.

## Machine-Readable Entities

```yaml
entities:
  - name: Journey
    owner: JourneyStore
    description: The one learning journey a session holds, as defined in the first unit. In U2 only its completedStages, lastActivityAt and expiresAt change after the save, and only through the completion change below. The save also stores a stageCount.
    identifier: sessionId
    attributes:
      - name: completedStages
        type: number set (a DynamoDB number set), absent when empty
        required: true
        default: empty (the attribute is not stored at all)
        min: 0
        max: 6
        constraints: only stage numbers the journey has; no duplicates; sent to the browser in ascending order, as an empty list when absent; changed one stage number at a time, by adding or removing that number with the database's own add and delete actions on the set, never by writing the whole set back. A set cannot be empty, so removing the last number removes the attribute, and a load treats a missing attribute as empty. U2 changes the first unit's save to omit the field instead of writing an empty list. A record written by the first unit with an empty list cannot exist in any environment, because the first unit has not been deployed; a load still reads an empty list as empty, and a completion change on such a record is refused by the database and ends as SAVE_FAILED (an accepted limit, not a case to build for).
      - name: stageCount
        type: whole number
        required: true
        min: 5
        max: 6
        constraints: stored with the record by the save, equal to the number of stages saved; stored only, never sent to the browser; used by the completion change to check, in the same conditional update, that the stage number is one the journey has; a journey saved before U2 has none (see completedStages above)
      - name: lastActivityAt
        type: date and time (ISO 8601 text, as in the first unit)
        required: true
        constraints: set to the time of each successful completion change; a read never changes it
      - name: expiresAt
        type: whole number of seconds since 1 January 1970 UTC (epoch seconds), as in the first unit
        required: true
        constraints: 90 days (7,776,000 seconds) after the time of the last change; stored only and never sent to the browser; moved forward by each successful completion change; a load treats the journey as gone when expiresAt is at or before the store's current time in whole epoch seconds, so exactly 90 days is expired; a completion change uses the opposite test (expiresAt greater than the same current time) so the two never disagree
    entity_constraints:
      - A completion change never creates a journey and never revives an expired or deleted one.
      - The stored record holds no name, email or other personal information, and U2 adds no personal field to it. The only stored additions are the stage count and the type of completedStages.
      - Stages, topic, source and teaching style are not changed by U2.

  - name: CompletionChange
    owner: WebApp
    description: One request to mark a stage complete or not complete. Held only while the request runs; never stored.
    attributes:
      - name: stageNumber
        type: whole number
        required: true
        min: 1
        max: 6
        constraints: must be a stage the journey has; sent in the address of the call as plain ASCII digits with no sign, no decimal point and no leading zero ("2", never "02", "+2", "2.0" or digits of another script)
      - name: completed
        type: true or false
        required: true
        constraints: true adds the stage number to completedStages and false removes it; anything that is not true or false is invalid; any other key in the body is ignored
      - name: sessionId
        type: text (random UUID)
        required: true
        constraints: sent in the X-Session-Id header and checked as in the first unit (its session-ID rule)
    relationships:
      - target: Journey
        cardinality: many CompletionChanges to one Journey over time
        direction: a CompletionChange changes the completedStages of one Journey

  - name: StageStatus
    owner: LearningProgress
    description: What the page shows for one stage, worked out from the set of completed stages. Never stored.
    attributes:
      - name: stageNumber
        type: whole number
        required: true
      - name: status
        type: enum
        required: true
        allowed_values: [done, up-next, to-do]
        constraints: done when the number is in completedStages; up-next for the first stage that is not done; to-do for every other stage not done; when every stage is done there is no up-next
    relationships:
      - target: Journey
        cardinality: one StageStatus per Stage of the Journey
        direction: derived from the Journey's stages and completedStages

  - name: ProgressSummary
    owner: LearningProgress
    description: The figures for the sticky header, worked out from the Journey. Never stored.
    attributes:
      - name: completeCount
        type: whole number
        required: true
        min: 0
        max: 6
        constraints: the number of completed stage numbers that the journey really has
      - name: stageCount
        type: whole number
        required: true
        min: 5
        max: 6
      - name: percent
        type: whole number
        required: true
        min: 0
        max: 100
        constraints: completeCount over stageCount rounded to the nearest whole percent; 0 only when completeCount is 0 and 100 only when completeCount equals stageCount
      - name: totalHours
        type: number
        required: true
        constraints: the sum of the stages' hours
      - name: allComplete
        type: true or false
        required: true
        constraints: true only when completeCount equals stageCount
    relationships:
      - target: Journey
        cardinality: one ProgressSummary per Journey
        direction: derived from the Journey

  - name: BrowserSession
    owner: WebApp
    description: The anonymous identity of one browser, as defined in the first unit. Unchanged in U2.
    identifier: sessionId
    attributes:
      - name: sessionId
        type: text (random UUID)
        required: true
        unique: true
        constraints: made on the first visit; never sent to the model; contains nothing about the learner
    relationships:
      - target: Journey
        cardinality: one BrowserSession to zero or one Journey
        direction: BrowserSession owns at most one Journey
```

## Summary

U2 stores nothing new except one number, the stage count, saved with the journey so a completion change can check the stage number in a single update. The Journey's `completedStages` becomes a number set that is absent when empty, and it is the only thing that changes, one stage number at a time. Three other things exist only while the page works: the CompletionChange request, the StageStatus of each stage, and the ProgressSummary for the header. The percentage is rounded to the nearest whole number, with 0 and 100 kept for none and all (Q1); hours are written as whole numbers or with one decimal (Q4).

## Assumptions & Open Questions

- [assumption] "The journey really has" a stage number means it is between 1 and the journey's stage count; numbers outside that range never enter `completedStages`.
- [assumption] The set is sent to the browser in ascending order so the page and the tests can compare lists simply.
- None otherwise.
