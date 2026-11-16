# User Stories — Story Plan and Questions

## Sources

- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Team practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`

## Story plan

Stories follow the INVEST checklist (independent, negotiable, valuable, estimable, small, testable). Each story names a persona, a goal and a benefit, and carries Given/When/Then acceptance criteria with at least one failure or edge case. Priorities use MoSCoW. The MVP line is decided later, in Delivery Planning.

---

## Q1. [Product] How should the learner be described?

Every story needs a persona. The learner is one kind of person, but they arrive in different situations.

A. One primary persona, the self-directed professional learner, used for every learner story
B. Three personas by situation: a learner working to a deadline, a learner exploring at their own pace, and a learner who uses only the keyboard or a screen reader
C. One persona per teaching style (guide, instructor, planner)
D. Not sure — suggest what keeps the stories useful and short
X. Other (please specify)

[Answer]: B

---

## Q2. [Product] How should the stories be grouped?

Grouping decides how the backlog is read and how the later units are cut.

A. By the learner's workflow: enter a topic, get a journey, work through it, set a goal, finish and get the certificate, come back later
B. By feature area, following the requirement groups (generation, content, progress, goals, milestones, nudges, data, misuse protection)
C. By persona
D. Not sure — suggest the grouping that helps most with the 14 November deadline
X. Other (please specify)

[Answer]: A

---

## Q3. [Product] How small should each story be?

The requirements hold 38 numbered items. Stories can map one to one, or combine related items.

A. About 20 to 25 stories, each combining closely related requirements, small enough to build in one sitting
B. About 38 stories, one per numbered requirement
C. About 12 to 15 larger stories, each a whole capability
D. Not sure — suggest a size that fits a solo build
X. Other (please specify)

[Answer]: A

---

## Q4. [Product] How should the stories be prioritised?

The agreed cut order if time runs short is nudges first, then milestones and certificate, then goal date, then persona choice.

A. Must: topic entry, generation, fallback, stage content, progress, saved journeys, data deletion, accessibility and misuse protection. Should: goal date, persona choice. Could: milestones and certificate, then nudges. Won't: everything out of scope
B. Everything in the description is Must, with the cut order recorded as a note
C. Must only the core loop (topic, generation, fallback, progress); everything else is Should or Could
D. Not sure — suggest a mapping that follows the cut order
X. Other (please specify)

[Answer]: A

---

## Q5. [Quality] How should the non-functional requirements be covered?

Accessibility, speed, security, cost and similar needs are not features, but they must show up somewhere testable.

A. Accessibility gets its own stories; speed, security and privacy appear as criteria on the stories they touch; cost, teardown and deployment are deferred to the later NFR stages
B. All of them appear as criteria on the stories they touch, and nothing is deferred
C. All of them are deferred to the later NFR stages and only features get stories
D. Not sure — suggest what keeps the criteria testable
X. Other (please specify)

[Answer]: A

---

## Q6. [Product] Should the builder get stories too?

Some requirements are for the person running the app, not the learner: the budget alerts, the one-command teardown, the rate limit and the deployment pipeline.

A. Yes — add a small "builder" persona with a few stories for budget alerts, teardown and the rate limit; deployment and the pipeline stay with later stages
B. Yes — add a builder persona with stories for all of these, including deployment
C. No — keep the stories learner-only and treat these as non-functional work for later stages
D. Not sure — suggest what is useful
X. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

- Personas: three learner personas by situation (a learner working to a deadline, a learner exploring at their own pace, and a learner who uses only the keyboard or a screen reader), plus the builder (Q1: B, Q6: A)
- Grouping: by the learner's workflow — enter a topic, get a journey, work through it, set a goal, finish and get the certificate, come back later (Q2: A)
- Size: about 20 to 25 stories, each combining closely related requirements (Q3: A)
- Priorities: Must for topic entry, generation, fallback, stage content, progress, saved journeys, data deletion, accessibility and misuse protection; Should for persona choice and goal date, with persona choice ranking above goal date; Could for milestones and certificate, then nudges (nudges are cut first); Won't for everything out of scope (Q4: A)
- Non-functional coverage: accessibility gets its own stories; speed, security and privacy appear as criteria on the stories they touch; cost, teardown and deployment are deferred to the later NFR stages (Q5: A)
- Builder stories: a small builder persona with a few stories for budget alerts, teardown and the rate limit; deployment and the pipeline stay with later stages (Q6: A)

- Looks correct
- Request changes

[Answer]: Looks correct
