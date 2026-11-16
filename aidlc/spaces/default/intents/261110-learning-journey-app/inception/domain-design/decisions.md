# Architecture Decision Records — Domain Design

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- `components.md` in this folder, and the design answers Q1 to Q6 in `domain-design-questions.md`

Each record uses the same four parts: Context, Decision, Consequences and Alternatives Rejected, with a short note on security and privacy where it matters. All decisions below were confirmed in the answers, except that ADR-006 follows the person's earlier Refined Mockups answer (Q1). ADR-007 was added by the architect to meet FR5.2 and the person accepted it as written at the gate.

---

## ADR-001: Five building blocks

**Status:** Accepted (Q1: A)

**Context.** The product needs journey generation with an AI and a template fallback, saved journeys with expiry, progress and goal rules, a daily cap, and the screens. The team practices ask for tests first on journey validation, progress maths and the nudge rule. A solo builder has four days.

**Decision.** Split the work into five blocks: JourneyGenerator, JourneyStore, LearningProgress, UsageGuard and WebApp.

**Consequences.**
- Positive: each block has one reason to change; the two tests-first areas sit in blocks with no storage or network (LearningProgress) or a fakeable AI call (JourneyGenerator); the store and the cap can be built and tested on their own.
- Negative: five blocks means some wiring, and the generator depends on two others.
- Security and privacy: only JourneyStore touches journey data at rest and only UsageGuard touches counts, so personal-data rules (none stored) have two places to enforce, not one.

**Alternatives Rejected.**
- Three blocks (one journey service holding generation, storage and the cap, plus progress rules and the web app): quicker to start, but the backend block would mix three reasons to change and three kinds of failure, and make the tests-first area harder to isolate.
- Seven blocks (split the generator into topic checker, prompt builder, reply checker, template factory): each part is tiny, but the extra wiring costs more than it saves in a four-day build and the parts never change independently.

---

## ADR-002: Progress rules run in the browser

**Status:** Accepted (Q2: A)

**Context.** Progress, milestones, hours and pace, days remaining, the nudge rule and the certificate details all derive from the saved journey, the completed stages, the goal date and today's date. The backend is Python and the screens are TypeScript, so one set of code cannot serve both. Stage changes must update the page within 1 second (NFR2).

**Decision.** Write the rules once, in TypeScript, in LearningProgress, and run them in the browser. The server stores which stages are complete, the goal date and which milestones were shown, and does not compute progress.

**Consequences.**
- Positive: one copy of the rules, written and tested first; screen updates need no round trip; the server stays small.
- Negative: the rules cannot be used by a future non-browser client without re-writing; "today" comes from the learner's own clock, so a wrong device clock gives wrong days remaining.
- Security and privacy: the rules take no secrets and the browser holds no more data than the learner already sees.

**Alternatives Rejected.**
- Rules on the server only: one copy in Python, but each change waits for a response before the screen updates, which strains the 1-second target on slow connections.
- Rules in both places: instant screens and server checks, but two copies that can drift apart, which breaks the single-source rule for the nudge and pace.

---

## ADR-003: One Journey record owns stages, progress and the goal date

**Status:** Accepted (Q3: A)

**Context.** Marking a stage and setting a goal date both change data about one learner's one journey. Deleting or expiring a journey must remove everything (FR7.2, FR7.3).

**Decision.** JourneyStore owns one Journey record per session holding the stages, the completed stages, the goal date and the milestones shown.

**Consequences.**
- Positive: one write per change; expiry and delete remove everything at once; no records to keep in step.
- Negative: because the record is shared, updates to the completed stages, the goal date and the milestones shown must be partial, set-based changes to that one field, never a rewrite of the whole record. Otherwise a change made from an older copy in another tab (for example tab A marks stage 2, then tab B, loaded earlier, marks stage 3 and writes back its copy) would undo the newer one. If journeys ever grow large or need history, the shape must change.
- Security and privacy: a single expiry clock and a single delete cover all learner data, which makes the 90-day expiry and the delete button easy to verify.

**Alternatives Rejected.**
- Separate progress and goal records owned by the progress rules block: tidier on paper, but two saves per change, a second thing to expire and delete, and a place where partial deletion could leave data behind.
- An append-only log of completions rebuilt into progress: safe from lost updates by design, but more to build and read than a set field on the record, for a feature this small.
- Keeping the goal date as its own attribute outside the Journey record: one more item to save, expire and delete, with no benefit since it is only ever read with the journey.

---

## ADR-004: A separate usage guard owns the daily cap

**Status:** Accepted (Q4: A)

**Context.** Each session may create 5 new journeys a day (FR8.2). The count resets daily and expires with the rest. Two requests at once must not push it past 5.

**Decision.** UsageGuard is its own block and owns the session-and-day count. JourneyGenerator reserves a slot with it before doing any work. The reservation is a conditional increment that refuses once the count is 5, so two requests at the same moment cannot take it past 5. The slot is kept when a journey (AI or template) is created and released when the request ends with no journey, either because the topic was refused or because of an unexpected error.

**Consequences.**
- Positive: the "may I?" decision lives apart from the store, so the store never has to explain refused creations; the count has its own short life; the cap cannot be passed by simultaneous requests.
- Negative: one more block, and the generator must remember to release a slot on every path that ends with no journey. Where the count is stored, and the table layout, is left to Infrastructure Design.
- Security and privacy: the cap is a courtesy limit only; the session ID is created in the browser, so a script can reset it. The API-wide rate limit and the budget alert (FR8.1, FR8.3) are the real protection against cost abuse. The count holds no personal information.

**Alternatives Rejected.**
- Counting inside JourneyStore: one fewer block, but the store would mix saved learner data with abuse control and have to explain refusals to its callers.
- A managed API-level usage quota (a daily quota on an API key): no code to write, but a quota is per key, not per anonymous session, and giving each learner a key needs a sign-up step that does not exist in this product.

---

## ADR-005: The AI call sits behind a small interface inside the generator

**Status:** Accepted (Q5: A)

**Context.** The team rule is to always fake Bedrock in automated tests. The generator must keep to a 15-second budget across attempts and never send model output on as markup.

**Decision.** Keep the Amazon Nova call behind a small interface inside JourneyGenerator, with a real version and a fake version used in tests.

**Consequences.**
- Positive: tests run free and repeatable; the generator stays one block; timing and retry rules can be tested with a fake that is slow or returns invalid output.
- Negative: the real version can only be tested against the live service, so a manual check of the first live call is still needed (open issue I-01).
- Security and privacy: the topic is passed as delimited data and the reply is treated as untrusted text, so the interface is also where prompt-injection and markup rules are enforced (NFR6).

**Alternatives Rejected.**
- Making the AI call its own block: a clear boundary, but a block that does almost nothing else and adds a hop between the generator and the model.
- Calling the model directly from the browser: no extra backend, but the browser would need model access of its own, the generator's time budget, retry and fallback rules could not be enforced, and the topic and reply handling would sit outside the code that tests fake.

---

## ADR-006: One web app block holds the screens and the session

**Status:** Accepted (Q6: A)

**Context.** The browser side creates and keeps the anonymous session ID, calls the backend, shows five screens and handles focus and announcements. The person decided, in the Refined Mockups questions (Q1), that the browser side is built from plain HTML, CSS and TypeScript with hand-made components and no frontend framework. This record does not make that choice; it follows it.

**Decision.** Keep the screens, the anonymous session handling and the backend calls together in one WebApp block, built as the person decided in the Refined Mockups questions (Q1).

**Consequences.**
- Positive: fewer files and a simple mental model for an app of this size.
- Negative: if the app grows, the session and API code may need to be split out later; keeping them in separate modules inside the block makes that easy.
- Security and privacy: the session ID is random and holds no personal information; the optional certificate name stays in memory only.

**Alternatives Rejected.**
- A separate session and API client block: a cleaner seam for tests, but more files for a small app, and the calls are easy to fake without it.
- Building the web app on a frontend framework such as React: the person chose against this in the Refined Mockups questions (Q1), as it adds build tooling and weight for five screens that native elements cover.

---

## ADR-007: The Journey record remembers which milestones were shown

**Status:** Accepted (added by the architect; accepted by the person at the gate)

**Context.** FR5.2 says a dismissed milestone does not return. A learner may reload or come back later, so the memory of what was shown has to outlive the page.

**Decision.** Keep a `milestonesShown` list on the Journey record in JourneyStore. LearningProgress reports which milestone is due, and the WebApp records that it was shown.

**Consequences.**
- Positive: the memory survives reloads and expires and deletes with the journey; it follows the learner across tabs.
- Negative: one more field to save; showing a milestone causes a small write.
- Security and privacy: the field holds only milestone names, no personal information.

**Alternatives Rejected.**
- Remembering in the browser's own storage only: simpler, but lost if storage is cleared, and the journey could then show a milestone twice across devices.
- Not remembering at all and showing a milestone whenever its threshold is crossed in a visit: no extra field, but it would show again after every reload, which breaks FR5.2.

---

## Assumptions & Open Questions

- [assumption] ADR-007 was added by the architect, not asked in the questions; the person accepted it as written at the gate.
- Open: whether the daily-cap day is the server's calendar day or the learner's local day (components.md assumption); settled in functional design.
