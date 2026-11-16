# Functional Design — u3-protection — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U3, u3-protection)
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US7.1, US7.2, and the daily-cap part of US9.2: AC9.2.2, AC9.2.3)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (FR7.1, FR7.3, FR7.4, FR8.2, NFR4)
- Components and decisions: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md` (UsageGuard) and `decisions.md` (ADR-004, the cap is a courtesy limit)
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 delete and DAILY_LIMIT, C4 reserve and release, C5 delete, and the open question on the guard's own store)
- Interaction spec: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (ConfirmDialog, limit messages)
- Built so far: the first unit's design and code (the always-grant stand-in guard, the create flow, the generator's slot reserve and release) and the second unit's design (rules BR10 to BR13)

This stage designs what U3 does, as rules and shapes, before any code. A lot is already settled: the cap is 5 new journeys per session per day and is a courtesy limit (the session ID is made in the browser, so the API-wide throttle and the budget alert remain the real protection); a slot is reserved with a conditional increment so two requests at the same moment cannot pass 5; it is kept when a journey (AI or template) is made and released once when a request ends with a refused topic or an unexpected error; the count carries no personal information and expires a day or two after its date; the dialogs are native modal dialogs with Cancel first; Delete is safe to repeat. These four questions are the places where earlier stages left a real choice, and three of them were carried forward as open questions. Everything else I could settle with a sensible default is listed under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] Which "day" does the daily cap of 5 count?

The guard counts new journeys per session per day. The session ID is made in the browser; the server's clock is the one the guard can trust. This was left open by Domain Design.

A. The server's calendar day in UTC: the count starts again at midnight UTC (Recommended): one clock, nothing the browser can influence, trivial to test, and it matches the day the count record is keyed by; for a learner in New Zealand that is the middle of the day, which is acceptable for a courtesy limit.
B. The learner's own local day, sent by the browser: it matches what the learner expects, but the browser can send any date, so the cap could be reset at will, and it adds a field to the create call.
C. A rolling 24 hours from the first journey of the window: fair to every time zone, but it needs a window start stored per session and is harder to explain in the message.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Behaviour] What should a learner get when they reach the daily cap?

FR8.2 says the learner sees a plain message and the journey they already have stays usable. Requirements Analysis also wondered whether a capped learner should get a free template journey instead. This was left open.

A. Only the message: "You have reached today's limit of 5 new journeys. Please come back tomorrow." with the existing journey untouched and no new journey made (Recommended): it matches FR8.2 and AC9.2.2 exactly, makes no model call, and never swaps the learner's journey for a generic one they did not ask for.
B. A free template journey for the topic they typed, labelled as a template, replacing their current journey: nothing is ever refused, but it would overwrite a good AI journey with a generic template and contradicts "the current journey is unchanged".
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] If the guard's own store cannot be reached, should the request go ahead?

The guard keeps its count in the same table as the journeys. If it cannot be read or written (a store failure, or a call that takes more than 2 seconds), the generator cannot tell whether a slot is free. This was left open by Contract Design.

A. Let the request through and write a log line saying the guard was skipped (Recommended): the cap is only a courtesy limit, the API throttle and the budget alert are the real protection, and a hiccup in our own storage should not stop a learner from getting a journey.
B. Refuse the request with a plain "please try again in a moment" message: the cap can never be bypassed by a failure, but a store problem would block every journey, including the learner's first of the day.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Behaviour] When a learner with a saved journey starts a new one, when do they confirm the replacement?

U1 and U2 offer no way to start another journey while one is saved. U3 adds it. FR7.1 and AC7.1.1 say the learner is asked to confirm and the old journey is replaced only if they confirm. The old journey must not be lost if the new one then fails to be made.

A. A "Start a new journey" button opens the confirmation first ("Replace your journey on <topic>?"); on Confirm the topic screen appears with the saved journey still safe, and the old journey is replaced only when the new one has been made and saved; Cancel at the dialog, or leaving the topic screen, keeps everything as it was (Recommended): the learner confirms once, before spending effort on a topic, and a failed or refused attempt costs them nothing.
B. Let the learner type a topic first and show the confirmation when they press "Generate my journey": the confirmation sits right before the real replacement, but the learner may type a topic and then change their mind, and a refused topic would end in a confirmation for nothing.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The guard keeps one count per session per day in the existing table, under the session ID and a sort key made of `USAGE#` and the date. It carries no personal information and expires one to two days after its date, using the table's existing expiry attribute.
- [assumption] Reserving a slot is one conditional increment that refuses once the count is 5, so two requests at the same moment cannot take it past 5; the second is told the limit is reached. A refused reservation makes no model call and changes nothing.
- [assumption] A slot is kept when a journey (AI or template) is saved; it is released once when the request ends with a refused topic, a save failure, or an unexpected error. A release that fails is logged and does not change the answer the learner gets. Starting a new journey to replace the old one uses a slot like any other new journey.
- [assumption] Deleting a journey does not give slots back: the count belongs to the session and the day, not to the journey, so delete-and-recreate cannot be used to get around the cap.
- [assumption] The daily-limit answer is `DAILY_LIMIT` (429) with the error shape from contract C1. The page shows plain, not-blaming wording (AC9.2.3) and the existing journey stays usable. The API-wide throttle keeps answering `RATE_LIMITED` with the separate "please wait" wording, and the page tells the two apart by their codes.
- [assumption] "Delete my journey" appears only when a journey is shown. Its confirmation names the topic that will be deleted. On Confirm the delete call (`DELETE /api/v1/journey`) removes the whole record (the journey, its progress and the other fields it holds) and the home screen shows; on failure a message shows inside the dialog and the journey is kept. Deleting when nothing is saved is a success, so it is safe to repeat (contract C1, C5).
- [assumption] The dialogs are the native modal kind from the interaction spec: Cancel is first and has the initial focus, Escape cancels, the confirm button shows "Working…" while it runs, an error shows inside the dialog, and focus returns to the control that opened it.
- [assumption] After a successful delete the browser keeps its session ID, so the same browser can make a new journey right away; the day's count is not reset (see above).
- [assumption] A mark, unmark or load that finds the journey gone behaves as the second unit's design says; U3 adds no new rule for it.
- None otherwise.
