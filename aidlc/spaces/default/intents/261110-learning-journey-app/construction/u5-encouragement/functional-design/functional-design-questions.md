# Functional Design — u5-encouragement — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U5, u5-encouragement)
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US5.1, US5.2, US6.1)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (FR5.1 to FR5.4, FR6.1 to FR6.3, NFR1, NFR9)
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` (LearningProgress milestone, nudge and certificate rules; JourneyStore milestones shown)
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 `PUT /journey/milestones`, C2 `milestonesShown`, C5 `markMilestoneShown`)
- Interaction spec: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (Banner, CertificateView)
- Built so far: the first four units' designs and code (the progress rules, the goal state and days remaining, the header, the one-change-at-a-time page controller)

This stage designs what U5 does, as rules and shapes, before any code. A lot is already settled: a milestone shows the first time the learner completes a first stage, the first time at least half of the stages are done, and when all are done; once shown it never returns (FR5.2); the certificate shows the topic, today's date and the number of stages, plus an optional name held in the browser only, never sent, stored or logged, and unmarking a stage after completion returns to the journey view at the lower value (FR5.3, FR5.4); the nudge shows only when progress is below 50% and a goal date is set and it is 0 to 3 calendar days away, never after the date has passed, is encouraging, has a keyboard-reachable dismiss control, avoids a starter list of blocked words and is shown in the page only (FR6.1 to FR6.3); one banner at a time, oldest first, with no countdown and no red styling; and the nudge is the first thing cut for time, then the milestones and certificate, so the nudge and the milestones are kept apart from each other. These four questions are the places where earlier stages left a real choice. Everything else I could settle with a sensible default is listed under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] If a learner finishes several milestones in one step, which banners should they see?

Stages can be marked in any order. A learner who marks stage 4 of 5 first has, in one step, completed a first stage and reached at least half. A learner who marks the last unmarked stage of a journey whose other four are done reaches the final milestone, having never seen "first stage" or "halfway".

A. Show only the highest milestone newly reached, and record the lower ones as shown too (Recommended): the learner sees one fitting message ("You're halfway there", not "You've started" after they are already past it), nothing stale is queued, and a lower milestone can never appear later out of order.
B. Queue every newly reached milestone and show them one at a time, oldest first, as the interaction spec says for banners: nothing is skipped, but a learner can be shown "You've started" after they have already finished the journey.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Behaviour] How long should a dismissed nudge stay dismissed?

The nudge depends on today's date, the goal date and the progress, so it can be true again on a reload or the next day. The contract has no field for a nudge, and only milestones are stored with the journey.

A. Remember the dismissal in the browser for the rest of that calendar day and that goal date: a dismissed nudge stays away on reload, and returns the next day only if the conditions still hold; nothing is sent to the server or stored in the journey (Recommended): it respects "dismiss" without nagging on every reload, and it needs no change to the stored record.
B. Remember it in page memory only: simplest, but every reload shows it again, which could feel like pressure, the opposite of the goal.
C. Remember it on the server with the journey: it survives a change of browser, but it needs a new stored field and a new call that the contract does not have.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] What next step should the nudge name?

FR6.2 asks for an encouraging next step. The stage titles come from the AI (or the template), and the starter blocked list includes plain words such as "late" and "behind" that could appear inside any title.

A. Name the next stage by its number and the count of what is left ("Stage 2 is your next step; 4 stages to go. Even a short session moves you forward.") and never put the AI's own words in the nudge (Recommended): the nudge text is fully ours, so the blocked-list rule can be proven by a test over every possible message, and the stage panel below shows the title anyway.
B. Name the next stage by its title: friendlier to read, but the title is AI text, so a blocked word could slip into a nudge and the guarantee would depend on checking the AI's words at show time.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Rules] Should the blocked-word list for nudges and milestones be longer than the starter list?

FR6.2 gives a starter list ("behind", "failed", "failure", "late", "overdue", "lazy", "slacking", "falling short", "wasted", "guilty", "you must", "hurry", "running out of time") and lets functional design extend it. The same list is used to check the milestone and nudge texts and the limit and goal-passed messages are written to avoid it too.

A. Extend it with a few more pressure and loss words: "urgent", "deadline is close", "last chance", "don't miss", "miss out", "panic", "countdown", "only N days", "time is running", "ticking" (Recommended): these are the other ways a message can add pressure that the starter list does not catch, and the check is a simple test over every message the unit can show.
B. Keep exactly the starter list: the least to maintain, but pressure words outside the list would pass the check.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The three milestones are first-stage (the first time any stage is completed), halfway (completed stages are at least half of the stages, so 3 of 5 and 3 of 6) and complete (every stage done). A milestone is "reached" when its condition becomes true after a mark; it is "newly reached" when it is not yet in the journey's `milestonesShown` set.
- [assumption] A milestone is recorded as shown the moment its banner is displayed, not when it is dismissed (FR5.2: "once dismissed or shown"), by the contract's `PUT /api/v1/journey/milestones` with `{"milestone": ...}`, one at a time, idempotent, a partial set-based change of `milestonesShown` only, on a live journey; a missing or expired journey answers NOT_FOUND and creates nothing; a milestone name that is not one of the three is INVALID_REQUEST. The page shows the banner first and records afterwards; if recording fails the banner stays and the page retries once quietly, and an unrecorded milestone may show again on a later visit, which is accepted.
- [assumption] The complete milestone is shown as a banner on the completion view, which also holds the certificate. The completion view's heading receives focus on arrival as the interaction spec says; the banner is announced politely and does not take focus.
- [assumption] The certificate shows the topic as plain text, today's date in the learner's local date (read from the browser, written in a plain long form), and the number of stages ("5 stages", "6 stages"). The optional name is typed into a labelled field ("Name on certificate (optional, not saved)"), kept in page memory only, shown on the certificate while the page is open, and lost on reload. It is never sent, stored in the browser, logged, or put in a request, an error message or an announcement.
- [assumption] The completion view is derived from the journey: whenever every stage is done the page shows it, including on a reload of a finished journey; unmarking any stage returns the journey view at the lower percentage, with focus handled as the second unit says. Marking the last stage again shows the certificate again; the complete milestone does not show again.
- [assumption] The certificate prints with the browser's print dialog; a print stylesheet shows only the certificate panel in black and white. A button "Print or save certificate" opens it. Nothing is generated on the server.
- [assumption] The nudge condition is exactly FR6.1 and is worked out from the existing rules: progress below 50% (completed over stages, so 2 of 5 is 40% and shows, 3 of 5 is 60% and does not, 3 of 6 is exactly 50% and does not), a goal date set, and days remaining 0, 1, 2 or 3 in the learner's local calendar. After the goal date has passed, or with no goal date, there is no nudge. The nudge is re-evaluated whenever a stage changes, the goal changes, the page loads, and at local midnight.
- [assumption] The nudge texts are a small fixed set written for this unit, chosen by days remaining (0, 1, 2 or 3), each warm and forward-looking with the next step from Q3 and no countdown wording. A test checks every possible message and every milestone message against the blocked list from Q4, ignoring case.
- [assumption] One banner is shown at a time (milestone before nudge when both apply, because a milestone is the newer event); a dismissed or recorded banner is not shown again by the rule that applies to it. Banners use a polite status region, a real-text message, an icon that is hidden from assistive technology, a Dismiss button reachable by keyboard, and no red styling.
- [assumption] The nudge is shown in the page only: no email, no push notification, no request to the server for it (FR6.3).
- [assumption] The cut order is kept in how the work is built: the nudge, the milestones, and the certificate are separate pieces of the page and the rules so that the nudge can be left out first, then the milestones and certificate, without touching the others.
- [assumption] The stored record gains no field. `milestonesShown` already exists from the first unit and is read as a set of the three names.
- None otherwise.
