# Domain Design — Questions

## Sources

- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- Team practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`

This stage names the logical building blocks (code you write) and who owns which data. It does not choose how they are deployed, which is the next stage's job. Databases, the AI service and the budget service are things components use, not components. The recommended option is listed first and marked (Recommended).

The pieces of work in the stories are: build a journey from a topic with an AI call and a template fallback; store and expire journeys; progress, milestones, hours and pace, the nudge rule and the certificate details; the goal date; the daily journey limit; and the browser screens. The team practices call for tests first on journey validation, progress maths and the nudge rule.

---

## Q1. [Architect] How should the work be split into building blocks?

More blocks keep each one small and easy to test but add wiring. Fewer blocks are quicker to build but mix concerns.

A. Five blocks (Recommended): a journey generator (topic check, prompt, AI reply check, retry, template fallback); a journey store (saving, loading, expiry, deleting, replacing); learning progress rules (progress, milestones, hours and pace, goal date days, nudge rule, certificate details); a usage guard (the daily journey cap); and the web app (the screens). Each can be tested alone, and the three tests-first areas sit in the generator and the progress rules.
B. Three blocks: a journey service (generation, storage and the daily cap together), learning progress rules, and the web app. Fewer parts but a larger backend block.
C. Seven blocks: split the generator further into a topic checker, a prompt builder, a reply checker and a template factory. Very small parts but more wiring than a four-day build needs.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Architect] Where do the progress rules run?

The progress rules work from the saved journey, the completed stages, the goal date and today's date. The backend is Python and the screens are TypeScript, so the same rules cannot be shared as code.

A. In the browser only (Recommended): the server stores which stages are complete and the goal date; the browser works out percentages, milestones, pace, days remaining, the nudge and the certificate details. One copy of the rules, written in TypeScript and tested first.
B. On the server only: the server returns ready-made progress, milestone and nudge values with every response. One copy in Python, but every change needs a round trip before the screen updates.
C. In both: the server checks and the browser predicts for instant updates. Two copies that can disagree.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Architect] Which block owns progress and the goal date?

Marking a stage complete and setting a goal date both change data about one learner's one journey.

A. The journey store owns a single Journey record that holds the stages, the list of completed stages and the goal date together (Recommended). One save per change, nothing to keep in step, and deleting or expiring the journey removes everything at once.
B. Progress and the goal date are separate records owned by the progress rules block. Cleaner on paper but two saves per session and a second place to expire and delete.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Architect] Where does the daily journey cap live?

The cap is 5 new journeys per session per day. It needs a count that resets each day and expires with the rest.

A. In its own usage guard block (Recommended): it owns a small session-and-day count and answers "may this session create another journey today". The generator asks it first.
B. Inside the journey store: the store counts journeys it has created. One fewer block, but the store then has to explain refused creations.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q5. [Architect] How should the AI call be kept apart so it can be faked in tests?

The team rule is to always fake Bedrock in automated tests. The Amazon Nova call is a service the generator uses.

A. Keep the AI call behind a small interface inside the journey generator, with a real version and a fake version (Recommended). The generator stays one block and tests swap in the fake.
B. Make the AI call its own block that the generator depends on. Clear boundary, but a block that does almost nothing else.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q6. [Design] How should the browser side be structured?

The screens need to create and remember an anonymous session ID, call the backend, show the five screens, and handle focus and announcements.

A. One web app block that includes the session ID handling and the backend calls (Recommended): simple for a plain TypeScript app of this size, and the screens stay together.
B. Two blocks: the web app (screens) and a separate session and API client block. Cleaner seam for tests but more files.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

- Building blocks: five — a journey generator, a journey store, learning progress rules, a usage guard, and the web app (Q1: A)
- Progress rules run in the browser only; the server stores which stages are complete and the goal date, and the browser works out percentages, milestones, pace, days remaining, the nudge and the certificate details (Q2: A)
- Ownership: the journey store owns one Journey record that holds the stages, the completed stages and the goal date together (Q3: A)
- Daily cap: the usage guard is its own block and owns the session-and-day count; the generator asks it before building a journey (Q4: A)
- AI call: kept behind a small interface inside the journey generator, with a real version and a fake version for tests (Q5: A)
- Browser side: one web app block that includes the anonymous session ID handling and the backend calls (Q6: A)
- Added by the architect, not asked: the Journey record also keeps which milestones have been shown, so a dismissed milestone does not return after a reload (needed for FR5.2)

- Looks correct
- Request changes

[Answer]: Looks correct
