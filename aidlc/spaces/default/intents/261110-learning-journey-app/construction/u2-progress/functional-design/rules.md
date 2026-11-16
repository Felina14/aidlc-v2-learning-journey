# Business Rules — u2-progress

## Sources

- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US2.2, US3.1, US3.2, US3.3, US7.3
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: FR2.4, FR3.1 to FR3.5, FR7.2, FR7.4, NFR2
- `components.md` and `decisions.md` (ADR-003) — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1, C2, C5)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (the stage ladder, focus, announcements)
- `entities.md` in this folder, and the first unit's `rules.md` (BR1 to BR7, which stay in force)
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

These rules are numbered from BR10 so they never clash with the first unit's BR1 to BR7. The progress rules (BR10) are pure rules with no storage and are written and tested first, as the team practices require.

## Machine-Readable Rules

```yaml
rules:
  - id: BR10.1
    statement: The count of completed stages is the number of stored stage numbers the journey really has, and the percentage is that count over the stage count, rounded to the nearest whole percent, with 0 shown only for none and 100 only for all.
    category: calculation
    applies_to: LearningProgress, WebApp header and bar
    trigger: The journey is shown, or a stage is marked or unmarked.
    logic: count = how many numbers in completedStages are between 1 and the stage count. percent = count divided by stage count, times 100, rounded to the nearest whole number. IF count is 0 THEN percent is 0. IF count equals the stage count THEN percent is 100. IF count is below the stage count THEN percent is at most 99, and IF count is above 0 THEN percent is at least 1. The written count reads "n of N complete" with the exact numbers.
    violation: Not applicable; the figures are always worked out, never entered.
    source: FR3.3 (functional design Q1)

  - id: BR10.2
    statement: The hours total is the sum of the stages' hours, and hours are written as a whole number when whole and otherwise rounded to one decimal place.
    category: calculation
    applies_to: LearningProgress, WebApp header and stage panels
    trigger: The journey is shown.
    logic: total = the sum of every stage's hours. A value that is a whole number is written without a decimal point ("16 hours"); any other value is rounded to one decimal place ("16.5 hours"). A stage's own hours follow the same writing rule. Sums are rounded before they are written, so a float tail such as 10.100000000000001 never shows.
    violation: Not applicable.
    source: FR2.4 (functional design Q4)

  - id: BR10.3
    statement: Each stage is done, up next or to do, and the first stage not yet done is the one that is up next.
    category: calculation
    applies_to: LearningProgress, WebApp stage ladder
    trigger: The journey is shown, or a stage is marked or unmarked.
    logic: A stage whose number is in completedStages is done. The lowest-numbered stage that is not done is up next. Every other stage is to do. IF every stage is done THEN no stage is up next. The status words "Done", "Up next" and "To do" are written, never shown by colour or marker alone.
    violation: Not applicable.
    source: FR3.1, FR3.3

  - id: BR10.4
    statement: After a stage is marked or unmarked, exactly one stage panel is open, chosen by a fixed rule.
    category: policy
    applies_to: LearningProgress, WebApp stage ladder
    trigger: A stage is marked complete or not complete.
    logic: One panel is open at a time. Opening a panel closes the other. On first showing, the up-next stage is open; if all stages are done none is open. After MARKING a stage, the panel of the stage that is now up next opens (none if all are done) and focus moves to its heading, or to the "Journey complete" heading when the last stage was marked. After UNMARKING a stage, the panel of the stage the learner pressed in stays open, because the button lives in that panel and it is the panel that was open; no other panel opens, and focus stays on the button, which now reads "Mark stage N complete". (The interaction spec's wording "the stage that was open before stays open" means this same panel.) After a FAILED change, a NOT_FOUND or an INVALID_REQUEST, the panel of the stage the learner pressed reopens, the panel opened by the optimistic change closes, focus returns to the pressed stage's button, and the error or message shows in that panel, so it is always visible. Any done stage can be opened to read it again, and its only action is to unmark it.
    violation: Not applicable.
    source: FR3.1, FR3.2 (interaction spec, StageItem)

  - id: BR11.1
    statement: Marking or unmarking a stage adds or removes that one stage number in the stored set, and repeating it gives the same result as doing it once.
    category: constraint
    applies_to: JourneyStore (setStageCompletion)
    trigger: A completion change reaches the store.
    logic: Marking adds the stage number to the stored number set completedStages; unmarking removes it. The change touches that one field only and is made as one conditional update of the stored record using the database's own add and delete actions on the set, never by reading the set, changing it and writing the whole set back. Removing the last number removes the attribute; a missing attribute is an empty set. Doing the same change twice, or from two tabs, leaves the set the same as doing it once. A change to stage 3 from an older copy of the page leaves a stage 2 marked in another tab as it is.
    violation: Not applicable; a repeat is a success with an unchanged set.
    source: FR3.5 (ADR-003)

  - id: BR11.2
    statement: A completion change is applied only to a journey that exists, has not expired and has the stage; otherwise nothing is created or revived and the answer says why.
    category: constraint
    applies_to: JourneyStore (setStageCompletion)
    trigger: A completion change reaches the store.
    logic: The one update carries three conditions: the record exists, its expiresAt is greater than the store's current time in whole epoch seconds, and the stage number is no more than the stored stageCount. IF a condition fails THEN nothing is written, and the database returns the record as it was in the same answer, so no second call is needed. IF there is no record, or expiresAt is at or before now, THEN the store reports NOT_FOUND. IF the record is live but the stage number is above stageCount (or the record has no stageCount) THEN the store reports INVALID_REQUEST. A journey replaced by a new one between the page's view and the call is covered: the new record has its own stageCount and no completed stages, so a stage number it does not have is refused and none ever enters the set.
    violation: The API answers 404 NOT_FOUND or 400 INVALID_REQUEST with the error shape from contract C1.
    source: FR3.5, FR7.2 (contract C5)

  - id: BR11.3
    statement: The completion call is checked before it reaches the store, and its answer carries the authoritative list of completed stages.
    category: validation
    applies_to: request handler (PUT /api/v1/journey/stages/{stageNumber}/completion)
    trigger: A completion call arrives.
    logic: The session ID must be a standard UUID (the first unit's session-ID rule). The stage number in the address must be plain ASCII digits with no sign, no decimal point and no leading zero, and a value from 1 to 6 ("02", "+2", "2.0" and digits of another script are INVALID_REQUEST). The body must be one JSON object whose completed is exactly true or false; any other key in the object is ignored, as contract C1 asks of consumers. Whether the journey has that stage is decided inside the one update (BR11.2), not by a separate read. On success the call answers 200 with the full completedStages list in ascending order after the change (an empty list when none), whether or not this call changed anything.
    violation: INVALID_REQUEST (400) for a bad session ID, a stage number that is not in the allowed form or that the journey does not have, or a body without a true or false completed; NOT_FOUND (404) when there is no live journey.
    source: FR3.1, FR3.2, FR3.5 (contract C1)

  - id: BR11.4
    statement: A successful completion change moves the last-activity time to now and the expiry to 90 days after it; a read changes neither.
    category: policy
    applies_to: JourneyStore
    trigger: A completion change succeeds, or a journey is read.
    logic: In the same update that changes completedStages, lastActivityAt is set to now (ISO text) and expiresAt to now plus 90 days (7,776,000 seconds) as epoch seconds, where now is the store's own clock. A load never writes. A repeat that changes nothing still counts as a save and moves both times, because the learner was active.
    violation: Not applicable.
    source: FR7.2

  - id: BR11.5
    statement: A completion change that fails or takes longer than 2 seconds in total ends as SAVE_FAILED and changes nothing the learner can see as saved.
    category: constraint
    applies_to: JourneyStore, request handler
    trigger: The store cannot be reached, errors, or does not answer within 2 seconds.
    logic: One call, one attempt, with a total limit of 2 seconds (the first unit's save-limit rule and the store timeout: connect and read limits that add up to 2 seconds). The stage check and the existence and expiry checks are inside that one call (BR11.2), so no read comes first. IF it fails or is too slow THEN the API answers SAVE_FAILED (500). A write that timed out may still have reached the database, so the stored set can differ from what the page last showed; the page's "Try again" repeats the same idempotent change, which is the correction, and a reload shows the stored truth.
    violation: SAVE_FAILED (500).
    source: NFR2, FR3.3

  - id: BR12.1
    statement: A journey of 90 days or more since its last change is never returned, even if the database has not removed it yet; one of 89 days is returned.
    category: policy
    applies_to: JourneyStore (load)
    trigger: A journey is read, on a return visit or for any call that needs it.
    logic: IF the store's current time in whole epoch seconds is at or after the journey's expiresAt (set 90 days after the last change) THEN the load returns nothing; this is the opposite of the test a completion change uses (expiresAt greater than now), so the two never disagree. Exactly 90 days counts as expired. The check uses the record's own expiry time, not the database's removal. A read does not extend the expiry.
    violation: Not applicable; an expired journey looks like no journey, so the home screen shows.
    source: FR7.2

  - id: BR12.2
    statement: The stored record holds no name, email or other personal information; U2 adds only a stage count and changes the type of completedStages.
    category: constraint
    applies_to: JourneyStore, the Journey record
    trigger: Any save or completion change.
    logic: The fields written by U2 are completedStages (a number set, absent when empty), stageCount, lastActivityAt and expiresAt. No field can hold a name or email. The optional certificate name (a later unit) is never part of the record.
    violation: Not applicable.
    source: FR7.4

  - id: BR13.1
    statement: The page changes straight away when a stage is marked or unmarked, then takes the server's list; if the save fails it puts the stage back and shows an inline error with "Try again".
    category: policy
    applies_to: WebApp, CompleteButton, header
    trigger: The learner presses "Mark stage N complete" or "Mark stage N as not complete".
    logic: The stage, the bar, the percentage and the "n of N complete" count change at once (within 1 second). When the answer comes, the page uses the answer's completedStages list as the truth. IF the save fails THEN the stage is put back as it was before the press, the figures follow, the pressed stage's panel reopens with focus on its button (BR10.4), and an inline "We couldn't save that change. Try again." appears beside the button with a "Try again" button that repeats the same change; the page never claims it was saved. A change stays shown without the server's confirmation for at most about 20 seconds (two waits of 10 seconds with the one retry), after which it is put back. A polite announcement says what happened ("Stage N complete. X of Y stages complete, Z percent. Stage M is open.", "Stage N marked as not complete. X of Y stages complete, Z percent.").
    violation: The stage looks as it did before, with the inline error.
    source: FR3.1, FR3.2, FR3.3 (functional design Q3)

  - id: BR13.2
    statement: While any change is being saved, every mark and unmark button ignores presses, so changes are saved one at a time.
    category: constraint
    applies_to: WebApp, CompleteButton
    trigger: A button is pressed while a change is saving.
    logic: The pressed button keeps its label and shows a busy state, and every other mark or unmark button ignores presses until the answer comes (or the failure is shown). A second press on the same button, and a press on another stage, therefore send nothing. This keeps each answer's list from overwriting a later optimistic change, because only one change is ever in flight. A press after the answer starts the next change.
    violation: Not applicable.
    source: FR3.5

  - id: BR13.3
    statement: If a completion change finds the journey gone, the page says the journey is no longer saved and offers the home screen; the stage is not shown as complete.
    category: policy
    applies_to: WebApp
    trigger: The completion call answers NOT_FOUND.
    logic: The optimistic change is undone. The pressed stage's panel reopens with focus on its button (BR10.4). A plain message in that panel says this journey is no longer saved, with a button back to the home screen where a new journey can be made. No "Try again" is offered for this case.
    violation: Not applicable.
    source: FR3.5, FR7.2 (functional design Q2)

  - id: BR13.4
    statement: On a return visit the page shows a loading skeleton and then the saved journey, shows an inline error with "Try again" if the load fails, and shows the home screen if there is no journey.
    category: policy
    applies_to: WebApp
    trigger: The page opens and a session ID exists.
    logic: A skeleton shaped like the journey shows with one polite announcement "Loading your journey". The saved journey replaces it within 3 seconds for 95% of loads. IF the load fails (LOAD_FAILED, or no answer in 10 seconds) THEN an inline error with "Try again" replaces the skeleton and the other controls stay usable. IF the answer is NOT_FOUND (no journey, or an expired one) THEN the home screen shows, not an error. The journey shows with its saved completed stages applied.
    violation: The inline error with "Try again".
    source: FR3.4, NFR2

  - id: BR13.5
    statement: A repeatable call that fails on the network is tried once more by itself; a throttle with no error code shows the "please wait" message.
    category: policy
    applies_to: WebApp
    trigger: A completion change or a load fails on the network, or the API answers 429.
    logic: One automatic retry for a completion change and for a load. After that the inline error with "Try again" shows. A 429 with no error code is RATE_LIMITED and shows the same "please wait" message as in the first unit (the throttle rule there); the stage is put back as in BR13.1.
    violation: The inline error, or the "please wait" message.
    source: NFR2 (contract C1 retries)

  - id: BR13.6
    statement: The first unit's rules for the page still hold, including that a saved journey is shown on load and no way to start another is offered until U3.
    category: constraint
    applies_to: WebApp
    trigger: Always.
    logic: BR1 to BR7 of the first unit stay in force. U2 adds the mark and unmark control, the header progress and the return-visit skeleton; it adds no goal date, pace, milestone, certificate, nudge, replace or delete.
    violation: Not applicable.
    source: FR3.1 (unit definition)

  - id: BR13.7
    statement: If a completion change is answered with INVALID_REQUEST, the page puts the stage back and offers to reload the journey.
    category: policy
    applies_to: WebApp
    trigger: The completion call answers INVALID_REQUEST (for example the journey was replaced in another tab by one with fewer stages, or the session ID is not accepted).
    logic: The optimistic change is undone and the pressed stage's panel reopens with focus on its button (BR10.4). A plain message in that panel says the journey has changed and offers a "Reload" button that repeats the return-visit load (BR13.4). No "Try again" is offered, because repeating the same request cannot succeed.
    violation: Not applicable.
    source: FR3.5 (contract C1)
```

## Rules Summary

| Group | Rules | What it covers |
|---|---|---|
| BR10 | BR10.1 to BR10.4 | Progress maths: count and percentage, hours, stage status, which panel is open |
| BR11 | BR11.1 to BR11.5 | The completion change in the store and API: set-based, live journey only, checks, expiry moved, 2-second limit |
| BR12 | BR12.1, BR12.2 | Expiry on read, no personal data |
| BR13 | BR13.1 to BR13.7 | The page: instant change with rollback, one change at a time, journey gone, return visit, retries, the first unit's rules, invalid request |

## Assumptions & Open Questions

- [assumption] The exact wording of the messages follows the refined mockups; only the meaning is fixed here.
- [assumption] A repeat completion that changes nothing still moves the last-activity time and expiry (BR11.4), because it is a save by an active learner.
- [assumption] Retrying once by itself applies to network failures only, not to a server answer such as SAVE_FAILED.
- None otherwise.
