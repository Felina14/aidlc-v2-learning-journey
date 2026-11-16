# Entities — u3-protection

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` (UsageGuard, UsageCount)
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 delete and DAILY_LIMIT, C4, C5)
- `entities.md` of the first unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/entities.md` and of the second unit — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/functional-design/entities.md` (the Journey, which U3 only creates a count beside and deletes)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

U3 adds one stored record, the daily UsageCount, and two values that exist only while a request runs. The Journey is not changed except that it can now be deleted. Nothing here holds a name, email or other personal information.

## Machine-Readable Entities

```yaml
entities:
  - name: UsageCount
    owner: UsageGuard
    description: How many new journeys one anonymous session has started on one day. Kept in the existing table beside the journey, never inside it.
    identifier: sessionId and date
    attributes:
      - name: sessionId
        type: text (random UUID)
        required: true
        constraints: the partition key, the same value as the Journey's; made in the browser; never sent to the model
      - name: date
        type: calendar date (YYYY-MM-DD, UTC)
        required: true
        constraints: the server's calendar day in UTC (functional design Q1); part of the sort key `USAGE#<date>`
      - name: journeysCreated
        type: whole number
        required: true
        default: 0
        min: 0
        max: 5
        constraints: raised by one conditional increment that refuses once the value is 5; lowered by one when a slot is released; never below 0 and never above 5
      - name: expiresAt
        type: whole number of seconds since 1 January 1970 UTC (epoch seconds), as for the Journey
        required: true
        constraints: set when the count is first made to the end of its date plus one further day, so the record is removed one to two days after its date; stored only
    relationships:
      - target: BrowserSession
        cardinality: many UsageCounts (one per day) to one BrowserSession
        direction: each UsageCount belongs to one anonymous browser session
    entity_constraints:
      - Holds no name, email or other personal information.
      - Separate from the Journey record: deleting or replacing a journey never changes a UsageCount.
      - The count is a courtesy limit, not protection (the session ID is made in the browser).

  - name: Reservation
    owner: UsageGuard
    description: The result of asking for a slot, held only while the create request runs. Never stored.
    attributes:
      - name: granted
        type: true or false
        required: true
        constraints: false only when the day's count is already 5
      - name: remaining
        type: whole number
        required: true
        min: 0
        max: 5
        constraints: the slots left after this request; 0 when not granted
      - name: reservationId
        type: text
        required: false
        constraints: present only when granted; an opaque value that identifies the one slot this request took (it may encode the session and the date so a release finds the right count); passed back to release at most once by the generator, since the guard cannot tell a repeated release (contract C4); absent when the guard was skipped because its store was unreachable, and then release does nothing
      - name: guardSkipped
        type: true or false
        required: true
        default: false
        constraints: true when the guard's own store could not be reached and the request was let through (functional design Q3); only written to the log
    relationships:
      - target: UsageCount
        cardinality: one Reservation takes at most one slot of one UsageCount
        direction: a granted Reservation raised the count by one

  - name: DeleteRequest
    owner: WebApp
    description: One request to delete the session's journey. Held only while the request runs; never stored.
    attributes:
      - name: sessionId
        type: text (random UUID)
        required: true
        constraints: sent in the X-Session-Id header and checked as in the first unit (its session-ID rule)
    relationships:
      - target: Journey
        cardinality: one DeleteRequest removes at most one Journey
        direction: removes the whole Journey record with its progress, goal date and milestone memory

  - name: Journey
    owner: JourneyStore
    description: The one learning journey a session holds, as defined in the first and second units. U3 can delete it, and replaces it only when a new one has been made and saved.
    identifier: sessionId
    entity_constraints:
      - Deleting removes the whole record in one step and is safe to repeat.
      - Replacing happens only through a successful save of a new journey; a cancelled, failed, refused or capped attempt leaves the old journey exactly as it was.

  - name: BrowserSession
    owner: WebApp
    description: The anonymous identity of one browser, as defined in the first unit. Unchanged; kept after a delete.
    identifier: sessionId
    relationships:
      - target: Journey
        cardinality: one BrowserSession to zero or one Journey
        direction: BrowserSession owns at most one Journey
```

## Summary

U3 stores one new small record per session per day, the UsageCount, beside the journey in the same table. It is kept apart from the journey so that deleting or replacing a journey never gives slots back. The Reservation and the DeleteRequest exist only while a request runs.

## Assumptions & Open Questions

- [assumption] The count's day is the server's UTC calendar day (Q1); the date is part of the record's sort key, so a new day starts a new record and the old one expires by itself.
- [assumption] A count record that has expired but has not yet been removed by the database is treated as absent, as for a journey, so the first reservation of a new date never sees yesterday's count.
- None otherwise.
