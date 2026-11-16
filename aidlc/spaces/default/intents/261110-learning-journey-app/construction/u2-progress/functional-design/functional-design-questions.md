# Functional Design — u2-progress — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U2, u2-progress)
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US2.2, US3.1, US3.2, US3.3, US7.3)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (FR2.4, FR3.1 to FR3.5, FR7.2, FR7.4, NFR2)
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` and `decisions.md` (ADR-003, partial set-based updates)
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 `PUT /journey/stages/{stageNumber}/completion`, C2, C5 `setStageCompletion`)
- Interaction spec: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (the stage ladder, focus, announcements, skeleton, inline error)
- Built in U1: `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/` (rules BR1 to BR7, the Journey record, the create flow) and the code in `backend/`, `frontend/`

This stage designs what U2 does, as rules and shapes, before any code. Most of it is already settled: marking and unmarking are idempotent set changes to the one `completedStages` field, a failed save leaves the stage looking not saved, one stage panel is open at a time, focus and announcements follow the interaction spec, the 90-day expiry is checked on read, and nothing live is created or revived by a partial write. These four questions are the places where earlier stages left a real choice. Everything else I could settle with a sensible default is listed under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] How should the percentage be rounded when the stage count does not divide evenly (for example 1 of 6 stages)?

With 5 stages every step is a whole number (20, 40, 60, 80, 100). With 6 stages, 1 of 6 is 16.67 percent. The bar and the written percentage must agree, and the written "n of N complete" count is always exact.

A. Round to the nearest whole percent, but show 100% only when every stage is complete and 0% only when none is (Recommended): 1 of 6 reads 17%, 5 of 6 reads 83%; the number is easy to read, and the bar never claims "done" before the last stage.
B. Round down to a whole percent: 1 of 6 reads 16%, 5 of 6 reads 83%; it never overstates progress, but the steps look uneven (16, 33, 50, 66, 83, 100).
C. Show one decimal place: 1 of 6 reads 16.7%; exact, but busier to read and to announce to a screen reader.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Behaviour] What should the learner see if they mark or unmark a stage after their journey has gone (it expired, or was deleted from another tab)?

The save answers NOT_FOUND because there is no live journey to change; nothing is created or revived (C5). Expiry is 90 days after the last change, so this is rare, and U3 adds the delete action, which can make it happen from a second tab.

A. Show a plain message that this journey is no longer saved, with a button back to the home screen where a new one can be made; the stage is not shown as complete (Recommended): it tells the truth, never leaves the learner marking stages that will not be kept, and uses the same "no journey" home screen as a first visit (AC3.3.3).
B. Treat it like any failed save: the inline "We couldn't save that change. Try again." message with a "Try again" button: simplest, but "Try again" can never succeed and would loop.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Behaviour] When the learner marks or unmarks a stage, should the page change straight away or wait for the save?

FR3.3 says the bar, the percentage and the count update immediately and the change is saved; AC3.1.2 says that if the save fails the page must not claim it was saved. Saving has 2 seconds, and the page must update within 1 second for 95% of actions (NFR2).

A. Change the page straight away, then replace it with the list of completed stages the server sends back; if the save fails, put the stage back as it was and show the inline error with "Try again" (Recommended): meets the 1-second target even on a slow save, the server's list also corrects a stale second tab, and a failed save is never shown as done.
B. Wait for the server's answer before changing anything: never shows something that is not saved, but a slow save (up to 2 seconds, up to 10 with a retry) leaves the click looking ignored, which misses the 1-second target.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] How should the hours total be written when stage hours are not whole numbers (for example 2.5 hours)?

The check from U1 accepts any number above 0 and at most 20 per stage, so an AI journey can hold 2.5 or 3.25. The template is always whole (2, 3, 3, 4, 4 = 16, which AC2.2.1 requires to read "16 hours").

A. Show whole numbers without a decimal point (16 hours), and any other value rounded to one decimal place (16.5 hours); stage hours follow the same rule (Recommended): the total always matches AC2.2.1, and a stage of 3.25 hours reads 3.3 without a long tail of digits.
B. Always show exactly what the model sent, with no rounding: exact, but a total like 16.75 or a sum such as 10.100000000000001 can appear.
C. Round every figure to a whole number: very tidy, but a stage of 0.5 hours would read 1 and the total could be off by several hours.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The progress rules (percentage, count, hours total, which stage opens next) are pure rules in the browser, written and tested first, as the domain design and the team practices say. The server only stores the set of completed stages.
- [assumption] The completion call is `PUT /api/v1/journey/stages/{stageNumber}/completion` with `{"completed": true|false}`; it answers 200 with the authoritative `completedStages` list in ascending order, 400 INVALID_REQUEST for a stage number the journey does not have or a body without a true/false `completed`, 404 NOT_FOUND when no live journey exists, and 500 SAVE_FAILED when the save fails or takes more than 2 seconds. A stage number that is not a whole number is also INVALID_REQUEST.
- [assumption] Marking adds the stage number to the set and unmarking removes it, in one conditional update of that one field only, so repeating it, or doing it from two tabs, gives the same result as once. The same update refuses to touch a record that has expired or is missing.
- [assumption] A write extends the expiry to 90 days after the time of the write (and updates the time of last activity), but only for a journey that is still live. A read never extends the expiry, because only a save counts as activity (AC7.3.1).
- [assumption] A journey counts as expired once 90 days or more have passed since its last change: 89 days is returned, 91 days is not, and exactly 90 days is treated as expired. The check is made on read, so the page never sees an expired record even if the database has not yet removed it.
- [assumption] A returning learner with a live journey sees the loading skeleton and then the journey. If the load fails (LOAD_FAILED or no answer in 10 seconds) an inline error with "Try again" is shown and the other controls stay usable. With no journey, or an expired one, the home screen shows, not an error (AC3.3.3).
- [assumption] On a network failure the page retries a mark or unmark once by itself, because it is safe to repeat; after that it shows the inline error with "Try again". A 429 with no error code shows the same "please wait" message as in U1.
- [assumption] While one mark or unmark for a stage is saving, that stage's button ignores a second press, so two quick clicks send one request. Different stages can be saved one after the other.
- [assumption] The other tab is not refreshed on its own. A tab shows what its own last answer from the server said, and the next mark or unmark from that tab brings it up to date, because the answer always carries the full list. Nothing is lost or undone, because the server only adds or removes the one stage.
- [assumption] The stored record holds no personal information (FR7.4): U2 adds no field and keeps `completedStages` as the only changed field.
- [assumption] The goal date, pace, milestones, certificate and nudge stay out of U2; the sticky header shows the topic, the progress bar, "n of N complete", the percentage and the hours total only.
- None otherwise.
