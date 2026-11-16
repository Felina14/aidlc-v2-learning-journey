# Functional Design — u1-skeleton — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U1, u1-skeleton)
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US1.1, US1.3, US1.4, US1.5, US2.1, US2.3, US9.1, US9.2 throttle part, US9.3)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 to C5)
- Corner checklist: `.kiro/knowledge/aidlc-product-agent/corner-checklist.md`

This stage designs what the first unit does, as rules and shapes, before any code. Most of the unit is already settled by earlier stages: the 2 to 100 character topic, the 15-second budget with one retry, the 5-stage template, the refusal outcome, the labels, the throttle and the budget alerts. These four questions are the places where the earlier stages left a real choice. Everything else I could settle with a sensible default is listed under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Rules] What should happen to a topic that has no letters or numbers in it, such as `!!!!` or `?? ??`?

The length rule (2 to 100 characters after trimming) would accept it. Sending it to the AI costs a call and ends in a refusal or a nonsense journey.

A. Reject it in the browser and on the server with the same "needs 2 to 100 characters" style message, saying it must contain letters or numbers, and send no request (Recommended): a topic with no letter or digit in any script is never a professional topic, and this saves a Bedrock call.
B. Send it to the AI and let the model refuse it: simplest rule, but spends a call and up to 15 seconds on something we can see is empty.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Rules] What should happen if the AI's journey is well-formed but one text field is very long (for example a stage explanation of 10,000 characters)?

A single saved journey must stay small, and a very long field makes the page hard to read. Stories only say a 2,000-character field must wrap without sideways scrolling (AC2.1.2).

A. Treat it as an invalid reply: it goes through the same one-retry-then-template path as any other invalid reply (Recommended): the rule is the same as for a wrong stage count, nothing is cut mid-sentence, and the learner never sees clipped text.
B. Cut the field to a maximum length and keep the journey: the learner always gets the AI journey, but a sentence may end abruptly.
C. Accept any length: simplest, but a journey could grow towards the database item limit.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Rules] How many study materials per stage, and how many hours per stage, should the check accept?

The reply check must say what "valid" means for the lists and the hours. Instructor-style exercises and quizzes (at least 2 and at least 1) arrive later in U4; this is the rule for every journey in U1.

A. Each of reading, exercises and quiz lists holds 1 to 5 items, the mini project is exactly one item, and each stage has hours above 0 and at most 20 (Recommended): a stage can never be empty or absurd, the total stays believable, and the template (2, 3, 3, 4, 4 hours) passes the same check.
B. Each list holds 1 to 10 items and each stage has hours above 0 and at most 40: more room for the AI, a looser check.
C. Only check that each list is not empty and that hours are positive numbers: the lightest rule; unbounded sizes and hours get through.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Behaviour] Until U3 adds the replace-and-delete dialogs, what should a learner who already has a saved journey be able to do on the home page?

U1 saves one journey per session and shows it again on reload. The confirmation before replacing it (US7.1) and the delete action (US7.2) are in U3, two Bolts later. Only the builder sees this app between B1 and B3, but the deployed address is public.

A. Show the saved journey on load and offer no way to start another one until U3 (Recommended): nothing can be lost by accident, and the builder can clear the browser's saved session ID to start over while testing.
B. Add a "Start a new journey" button that replaces the saved one straight away, and have U3 put the confirmation in front of it later: easier to test, but a mis-click loses a journey with no warning, and U3 then changes a button U1 shipped.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The topic is trimmed of leading and trailing white space only; spaces inside it are kept as typed. Length is counted in visible characters (an emoji or an accented letter counts as one), so 100 visible characters pass and 101 do not. Control characters are removed before the check.
- [assumption] The topic is given to the model between fixed delimiters; any text in the topic that looks like the delimiter is removed first, so the topic cannot close the data block and add instructions.
- [assumption] The anonymous session ID is a random UUID made in the browser. The server accepts only that format and answers anything else with INVALID_REQUEST. It is never sent to the model.
- [assumption] The model is asked to reply in English whatever the topic's language. A topic in another language is accepted (multiple languages are out of scope for the interface, not for the topic).
- [assumption] A reply marked `refused: true` is a refusal even if it also carries stages; refusal is checked before the structure check, as the domain design says.
- [assumption] The template has five fixed stage titles (Foundations; Core ideas; Hands-on practice; A real project; Mastery and next steps), each with the topic name inserted into its text, the same fields as an AI journey, and hours of 2, 3, 3, 4 and 4 (16 in total).
- [assumption] The 20-second browser wait and the 18-second backend cap come from the contract. A journey made but not saved by 18 seconds ends as SAVE_FAILED; the template is used otherwise.
- [assumption] If two tabs create a journey at the same moment, the later save wins; there is one journey per session and nothing is merged.
- [assumption] Loading a saved journey in U1 shows the journey or, if the load fails, a short error with "Try again". The skeleton and the full return-visit behaviour (US3.3) belong to U2.
- [assumption] If the browser blocks storage for the session ID, the home page says so and offers no journey, as the web app component describes.
- [assumption] The API-wide throttle (5 requests a second, burst 10) and the budget alerts (2 dollars a day, 8 dollars a month) are stack settings with no business logic. They get acceptance criteria and a design note here and are detailed in Infrastructure Design. The alert email is a deploy-time value that is never committed.
- Open: the exact Amazon Nova Lite model identifier is confirmed in the first live call (contract C3, issue I-01 is closed for access only).

---

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
