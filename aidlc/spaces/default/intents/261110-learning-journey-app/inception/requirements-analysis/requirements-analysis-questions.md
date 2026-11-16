# Requirements Analysis — Questions

## Sources

- Intent statement: `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Scope document: `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- Team practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Wireframes: `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- Workflow-selected scope: `feature`.

---

## Q1. [Product] What should the topic box accept?

A learner types any professional topic. The app needs a rule for empty input, very long input, and topics that are not professional subjects, because that text goes straight into the AI prompt.

A. Trim spaces; require 2 to 100 characters; the AI prompt refuses non-professional or unsafe topics, and the learner sees a polite "try a different topic" message
B. Trim spaces; require 2 to 100 characters; no content check beyond that
C. Trim spaces; allow up to 200 characters, with the same polite refusal for non-professional or unsafe topics
D. Not sure — suggest a sensible limit
X. Other (please specify)

[Answer]: A

---

## Q2. [Product] What does the teaching style change?

The learner picks a friendly guide, a structured instructor, or a planner focused on tracking before the journey is generated.

A. Only the tone and wording of the explanations (the same 5 to 6 stages and the same kinds of materials for every style)
B. Tone plus emphasis: the guide uses more encouragement and analogies, the instructor more exercises and quizzes, the planner more detailed time estimates and checkpoints
C. Tone plus a different layout of each stage for each style
D. Not sure — suggest what is achievable by 14 November
X. Other (please specify)

[Answer]: B

---

## Q3. [Product] How should the goal date work?

The goal date is optional in the wireframes and drives the "days remaining" display and the nudge (progress below 50% with the goal date 3 days away or less).

A. Optional; must be today or later and no more than 365 days ahead; the learner can change or clear it at any time
B. Optional; must be today or later with no upper limit; the learner can change or clear it at any time
C. Required when the journey is created
D. Not sure — suggest the simplest safe rule
X. Other (please specify)

[Answer]: A

---

## Q4. [Product] What are the milestones and what does the certificate show?

The description asks for milestones as the learner progresses and a completion certificate. No personal accounts exist, so the certificate cannot pull in a stored name.

A. Milestones at the first stage done, halfway, and complete; the certificate shows the topic, the completion date and the number of stages, with an optional name the learner types in and that is not stored
B. Milestones at every stage completed; the certificate shows the topic and completion date only, with no name
C. Milestones at the first stage done, halfway, and complete; the certificate shows the topic, completion date and an optional typed name that is saved with the journey
D. Not sure — suggest the simplest version
X. Other (please specify)

[Answer]: A

---

## Q5. [Product] What does the study plan with time estimates include?

Each stage needs a study plan with time estimates. With a goal date set, the plan could also spread the work over the time left.

A. Per-stage estimated hours only, plus a total for the journey
B. Per-stage estimated hours plus, when a goal date is set, a suggested number of hours per week to finish on time
C. Per-stage estimated hours and a suggested session length and count for each stage, with the weekly pace when a goal date is set
D. Not sure — suggest what fits the deadline
X. Other (please specify)

[Answer]: B

---

## Q6. [Operations] How long do journeys and progress stay stored, and can a learner delete them?

The practices say storage is anonymous with no personal information, and the scope adds an automatic expiry. The repository is public, and a learner may want their data gone.

A. Expire automatically 90 days after the last activity; also a "Delete my journey" button that removes it straight away
B. Expire automatically 30 days after the last activity; also a "Delete my journey" button
C. Expire automatically 90 days after the last activity; no delete button
D. Not sure — suggest sensible defaults
X. Other (please specify)

[Answer]: A

---

## Q7. [Operations] How long should the learner wait for the AI before the template is used?

If the AI is slow or unavailable, the app falls back to a structured template. The API endpoint caps a single request at roughly 30 seconds, and a longer wait hurts the experience.

A. Fall back to the template after 15 seconds; the learner sees "Generating…" with a reassuring message after 5 seconds
B. Fall back after 25 seconds, using nearly all the time available
C. Fall back after 10 seconds, favouring a fast response over richer AI content
D. Not sure — suggest a limit
X. Other (please specify)

[Answer]: A

---

## Q8. [Security] How should the public endpoint be protected from misuse?

Anyone who finds the site's address can trigger paid Bedrock calls, and there are no accounts. At tens of users the cost is small, but one script could run it up before 14 November.

A. A rate limit on the API plus a cap of 5 new journeys per anonymous session per day, and a daily AWS budget alert
B. A rate limit on the API only, plus a daily AWS budget alert
C. A shared demo access code that learners must enter, plus the rate limit and budget alert
D. Not sure — suggest a proportionate level
X. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

- Topic input: trimmed, 2 to 100 characters; the AI prompt refuses non-professional or unsafe topics with a polite "try a different topic" message (Q1: A)
- Teaching style: changes tone plus emphasis — the guide leans on encouragement and analogies, the instructor on exercises and quizzes, the planner on detailed time estimates and checkpoints (Q2: B)
- Goal date: optional, today or later and at most 365 days ahead, and can be changed or cleared at any time (Q3: A)
- Milestones and certificate: milestones at first stage done, halfway and complete; the certificate shows the topic, completion date and number of stages, with an optional name the learner types that is not stored (Q4: A)
- Study plan: per-stage estimated hours and a journey total, plus suggested hours per week when a goal date is set (Q5: B)
- Data retention: journeys expire 90 days after the last activity, and a "Delete my journey" button removes one immediately (Q6: A)
- AI wait: fall back to the template after 15 seconds, with a reassuring message after 5 seconds (Q7: A)
- Misuse protection: API rate limit, a cap of 5 new journeys per anonymous session per day, and a daily AWS budget alert; the API-wide limit and the alert are the real backstop because the session ID is created in the browser (Q8: A)

- Looks correct
- Request changes

[Answer]: Looks correct
