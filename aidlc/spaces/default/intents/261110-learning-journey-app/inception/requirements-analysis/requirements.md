# Requirements — Learning Journey App

## Sources

- `intent-statement.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- `scope-document.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- `constraint-register.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- `feasibility-assessment.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`
- `wireframes.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- Requirements Analysis answers Q1 to Q8 — `requirements-analysis-questions.md` in this folder
- The original request, as recorded in `intent-statement.md`

Each requirement names its origin in brackets: the request (`request`), a question answer (`Q1` to `Q8`), an ideation artifact, or a team practice.

---

## Intent Analysis

A self-directed professional types any topic and gets back a staged learning journey they can actually follow: 5 to 6 stages from fundamentals to practical mastery, each with an explanation, learning materials and a study plan. They choose a teaching style first, track progress, set a goal date, see milestones and a certificate, and get encouraging nudges when progress stalls. If the AI is slow or unavailable they still get a journey from a template. The app runs serverless on AWS in us-east-1, uses only Amazon Nova models on Amazon Bedrock, is built for tens of users at near-zero idle cost, and must be accessible. The hard deadline is 14 November 2026, which sets the cut order (nudges first, then milestones and certificate). [request, `intent-statement.md`, `scope-document.md`]

Request type: new application (greenfield). Scope: multi-component. Complexity: standard.

---

## Functional Requirements

### FR1 Topic entry and journey generation

- **FR1.1** The system shall accept a topic after trimming leading and trailing spaces, and shall require 2 to 100 characters. An empty or out-of-range topic shall show a message naming the limit and keep what the learner typed. [Q1, `wireframes.md`]
- **FR1.2** The system shall have the AI refuse non-professional or unsafe topics, and shall then show the learner a polite "try a different topic" message without creating a journey. [Q1]
- **FR1.3** The system shall require the learner to choose one of three teaching styles (friendly guide, structured instructor, planner focused on tracking) before generation. [request, Q2]
- **FR1.4** The system shall generate a journey of 5 to 6 stages that climbs from fundamentals to practical mastery, using Amazon Nova Lite on Amazon Bedrock. [request, `constraint-register.md`]
- **FR1.5** The system shall check the AI output against the journey structure (stage count, required fields per stage, hours as numbers) and shall retry once if it does not match. The retry shall start only if at least 5 seconds remain of the 15-second limit in FR1.6. [`feasibility-assessment.md`, mitigation for risk R-01]
- **FR1.6** The system shall return a structured template journey of 5 stages, with the topic name inserted, when the AI call fails, returns invalid output with no time left to retry, returns invalid output twice, or has not produced a valid journey within 15 seconds. The 15 seconds count all attempts combined, from the moment the request starts. The learner shall always receive a journey for a valid topic. [request, Q7]
- **FR1.7** The system shall show a "Generating…" state while waiting, add a reassuring message after 5 seconds, and announce the state to screen readers. [Q7, `wireframes.md`]

Acceptance criteria:

- FR1.1 — Given the topic box holds only spaces, When the learner presses "Generate my journey", Then a message says the topic needs 2 to 100 characters and no request is sent. Given a 101-character topic, Then the same message appears and the typed text is kept. Given the topic is exactly 2 characters or exactly 100 characters, Then the request is sent.
- FR1.2 — Given the topic is "how to build a weapon", When it is submitted, Then no journey is shown and the learner sees "try a different topic".
- FR1.3 — Given a topic is typed and no style is chosen, Then the "Generate my journey" button is disabled and says why.
- FR1.4 and FR1.5 — Given the AI returns 7 stages after 6 seconds, When the result is checked, Then it is retried once (9 seconds remain), and if the retry is also invalid the template is used.
- FR1.6 — Given Bedrock is unreachable, When a valid topic is submitted, Then a 5-stage template journey is shown and labelled as a template (see FR2.5). Given the AI has produced no valid journey after 15 seconds counted across all attempts, Then the template is shown instead. Given the AI returns invalid output after 12 seconds, Then no retry starts (only 3 seconds remain) and the template is shown by the 15-second mark.
- FR1.7 — Given generation takes 6 seconds, Then a reassuring message is visible and a polite live-region announcement has been made.

### FR2 Journey content

- **FR2.1** Each stage shall show a name and a short explanation covering what it is, why it matters, and what the learner can do after it. [request]
- **FR2.2** Each stage shall list learning materials: reading, exercises, a mini project and a quiz. [request]
- **FR2.3** The chosen teaching style shall change tone and emphasis, and the stages and kinds of materials stay the same. The guide leans on encouragement and analogies. The instructor shows at least 2 exercises and at least 1 quiz in every stage. The planner shows a per-stage time breakdown (reading, exercises, mini project, quiz hours). [Q2]
- **FR2.4** Each stage shall show an estimated number of hours, and the journey shall show a total. When a goal date is set, the journey shall also show a suggested number of hours per week to finish on time. [request, Q5]
- **FR2.5** Every journey shall carry a visible label. An AI journey reads "AI-generated content · May need verification". A template journey reads "Template-based journey — AI generation was unavailable". [`scope-document.md`, `wireframes.md`]

Acceptance criteria:

- FR2.1 and FR2.2 — Given a generated journey, When a stage is expanded, Then it shows name, what/why/after, and all four kinds of material.
- FR2.3 — Given a journey generated with the instructor style, Then every stage lists at least 2 exercises and at least 1 quiz. Given a journey generated with the planner style, Then every stage shows hours for reading, exercises, mini project and quiz separately. Given the guide style, Then the explanations use an encouraging, analogy-led tone, checked by reading a sample of stages.
- FR2.4 — Given 5 stages of 2, 3, 3, 4 and 4 hours and a goal date 4 weeks away, Then the total reads 16 hours and the suggested pace reads 4 hours per week. Given no goal date is set, Then no weekly pace is shown.
- FR2.5 — Given a template journey, Then the template label is shown and the AI label is not.

### FR3 Progress tracking

- **FR3.1** The learner shall be able to mark a stage complete from its expanded panel. [request]
- **FR3.2** The learner shall be able to unmark a completed stage, so a mistaken click can be undone. This is a new requirement added during Requirements Analysis, not taken from an ideation artifact; the reason is user control, so a mistaken click is not permanent. [added in this stage]
- **FR3.3** The progress bar, the percentage and the "n of N complete" count shall update immediately when a stage changes, and the change shall be saved. [request, `wireframes.md`]
- **FR3.4** On a return visit the system shall restore the saved journey, showing a loading skeleton first and an inline error with a "Try again" action if loading fails. [`wireframes.md`, Q6]
- **FR3.5** Marking the same stage twice, or from two browser tabs, shall give the same result as marking it once. [corner checklist: concurrent actors]

Acceptance criteria:

- FR3.1 and FR3.3 — Given 5 stages with none complete, When the learner marks stage 1 complete, Then the bar reads 20% and the count reads "1 of 5 complete" within 1 second.
- FR3.2 — Given stage 1 is complete, When it is unmarked, Then the bar returns to 0%.
- FR3.4 — Given a saved journey, When the learner returns, Then a skeleton shows and then the journey. Given the fetch fails, Then an inline error with "Try again" is shown and the other controls stay usable.
- FR3.5 — Given stage 2 is marked complete in tab A and tab B, Then the journey shows stage 2 complete once and progress counts it once.

### FR4 Goal with a target date

- **FR4.1** The learner shall be able to set an optional goal date that is today or later and no more than 365 days ahead, and to change or clear it at any time. [request, Q3]
- **FR4.2** The goal date and the days remaining shall stay visible in the "My Journey" header while the learner scrolls. [request, `wireframes.md`]
- **FR4.3** Days remaining shall be counted in calendar days using the learner's local date. On the goal date it shall read "due today", and after it the header shall read "goal date passed" with a prompt to choose a new date, in an encouraging tone. [corner checklist: time and deadlines]

Acceptance criteria:

- FR4.1 — Given today is 10 November, When the learner enters yesterday's date, Then the date is rejected with a message. Today's date and today plus 365 days are accepted. Today plus 366 days is rejected.
- FR4.2 — Given a goal date is set, When the learner scrolls through the stages, Then the goal date and days remaining remain visible.
- FR4.3 — Given the goal date is today, Then the header reads "due today". Given the goal date was yesterday, Then it reads "goal date passed" and offers to set a new date.

### FR5 Milestones and completion certificate

- **FR5.1** The system shall show a milestone message the first time the learner completes a first stage, the first time completed stages reach at least half of all stages, and when all stages are complete. [request, Q4]
- **FR5.2** A milestone message shall be dismissible and shall not reappear once dismissed or shown. [`wireframes.md`]
- **FR5.3** When all stages are complete the system shall show a completion view with the certificate: the topic, the completion date and the number of stages, plus an optional name the learner types that is not sent to the server or stored. The learner shall be able to print or save it with the browser. [request, Q4]
- **FR5.4** If a stage is unmarked after completion, the certificate view shall be replaced by the journey and the progress shall return to the lower value. [corner checklist: derived state]

Acceptance criteria:

- FR5.1 — Given 5 stages, Then the "first stage" milestone shows after stage 1, "halfway" after the third stage is complete (3 of 5 is at least half), and the final milestone after stage 5.
- FR5.2 — Given the halfway message was dismissed, When another stage is marked, Then it does not return.
- FR5.3 — Given all 5 stages are complete, Then the certificate shows the topic, today's date and "5 stages". Given the learner types a name, Then it shows on the certificate and a reload does not keep it.
- FR5.4 — Given the journey is complete, When stage 5 is unmarked, Then the journey view returns at 80%.

### FR6 Encouraging nudges

- **FR6.1** The system shall show a nudge only when progress is below 50% and a goal date is set and the goal date is 0 to 3 calendar days away. [`wireframes.md`, request]
- **FR6.2** A nudge shall be encouraging, never guilt-driven: no scolding words, no loss framing, no countdown pressure, and a way to dismiss it. A nudge shall not contain any word or phrase from this starter blocked list: "behind", "failed", "failure", "late", "overdue", "lazy", "slacking", "falling short", "wasted", "guilty", "you must", "hurry", "running out of time". Functional design may extend the list. [request]
- **FR6.3** Nudges shall be shown in the page only, with no email or push notification. [`scope-document.md`]

Acceptance criteria:

- FR6.1 — Given 1 of 5 stages complete (20%) and a goal date 3 days away, Then a nudge shows. Given 3 of 5 complete (60%), Then none shows. Given a goal date 4 days away, Then none shows. Given no goal date, Then none shows. Given the goal date passed, Then no nudge shows (FR4.3 handles it).
- FR6.2 — Given a nudge, Then its text contains an encouraging next step and no word or phrase from the starter blocked list in FR6.2, and a dismiss control is keyboard reachable.

### FR7 Storage, expiry and deletion

- **FR7.1** The system shall identify a learner by an anonymous random session ID kept in the browser, and shall hold one active journey per session. Creating a new journey shall ask for confirmation and then replace the old one. [`feasibility-assessment.md`, `wireframes.md`]
- **FR7.2** Saved data shall expire automatically 90 days after the last activity, and each save shall extend the expiry. Expiry shall also be checked when a record is read, so an expired record is never returned even if the database has not yet removed it. [Q6]
- **FR7.3** A "Delete my journey" action shall remove the saved journey immediately after a confirmation that names what will be deleted. [Q6]
- **FR7.4** The system shall store no personal information: no name, email or account. [`constraint-register.md` RC-01, Q4]

Acceptance criteria:

- FR7.1 — Given a journey exists, When the learner starts a new one, Then they are asked to confirm and, only on confirm, the old journey is replaced.
- FR7.2 — Given a journey last changed 91 days ago, When it is read, Then it is not returned, even if the database has not yet deleted the record. Given a journey last changed 89 days ago, Then it is returned and the save extends its expiry.
- FR7.3 — Given a saved journey, When "Delete my journey" is confirmed, Then loading that session returns no journey and the home screen is shown.
- FR7.4 — Given the stored record, Then it holds no field that contains a name or email.

### FR8 Protection from misuse

- **FR8.1** The public API shall be throttled across the whole API at 5 requests per second with a burst of 10. [Q8]
- **FR8.2** Each anonymous session shall be limited to 5 new journeys per day. The learner shall see a plain message when the limit is reached, and the journey they already have stays usable. [Q8]
- **FR8.3** AWS Budgets shall notify the owner when actual spend passes 2 dollars in one day and when actual spend passes 8 dollars in the month, which is 80 percent of the 10 dollar ceiling in NFR4. [Q8, NFR4]

Acceptance criteria:

- FR8.1 — Given a client sends 11 requests in the same instant, Then the 11th is rejected with a clear "please wait" message. Given a client sends 6 requests per second for 10 seconds, Then requests above the 5 per second rate are rejected once the burst of 10 is used.
- FR8.2 — Given a session has created 5 journeys today, When it asks for a sixth, Then it is told the daily limit is reached and the current journey is unchanged.
- FR8.3 — Given actual spend reaches 2 dollars in one day, Then the owner is notified. Given actual spend reaches 8 dollars in the month, Then the owner is notified.

---

## Non-Functional Requirements

- **NFR1 Accessibility.** The application shall meet WCAG 2.1 AA. Every function shall work with the keyboard alone; text contrast shall be at least 4.5:1; status shall never be shown by colour alone; touch targets shall be at least 44 by 44 CSS pixels; automated checks (axe or Lighthouse) shall report no critical or serious violations, and a manual keyboard and screen-reader pass shall be completed. [request, `constraint-register.md` TC-09, `team-practices.md`]
- **NFR2 Performance.** A valid topic shall produce a journey (AI or template) within 20 seconds in 100% of requests: the AI limit of 15 seconds covers all attempts combined (FR1.6), which leaves 5 seconds for the template and for the page to render. Marking a stage shall update the page within 1 second, and the change shall be saved within 2 seconds, for 95% of actions. A return visit shall show the saved journey within 3 seconds for 95% of loads on a typical broadband connection. [Q7, `wireframes.md`]
- **NFR3 Resilience.** If Amazon Bedrock is slow, throttled or unavailable, the learner shall still receive a journey, so a valid topic never ends in an error screen because of the AI alone. [request]
- **NFR4 Cost and scale.** The app shall serve tens of users, cost close to nothing when idle, and keep total AWS spend for the demo below 10 dollars. Check: with no traffic for 24 hours the daily spend shown in AWS Billing is under 0.10 dollars, and the month-to-date total stays under 10 dollars at the end of the demo. [request, feasibility answers]
- **NFR5 Teardown.** One `cdk destroy` shall remove every resource, including the data table and site bucket, with no orphaned resources. Check: after `cdk destroy`, listing the stack's resources and the project's tagged resources in us-east-1 returns none. [request, `constraint-register.md` OC-04]
- **NFR6 Security and privacy.** All traffic shall use HTTPS. Permissions shall be least-privilege. The topic shall be passed to the model as delimited data that cannot change the instructions. Model output shall be shown as plain text and never run as markup. No secret or credential shall be committed to the public repository. Check: requests over plain HTTP are redirected or refused; the Lambda role allows only the Bedrock model invoke and the table actions it needs; a topic of `<script>alert(1)</script>` and a model reply containing markup both show as text and run nothing; a secret scan of the repository finds nothing. [`team-practices.md`, `constraint-register.md` RC-01, corner checklist: AI output and hostile input]
- **NFR7 AI provider.** All AI generation shall use Amazon Nova models on Amazon Bedrock only, with Nova Lite as the default and no other model provider. [request, `constraint-register.md` TC-01 and TC-08]
- **NFR8 Browser and device support.** The app shall work on the latest two stable releases of Chrome, Firefox, Safari and Edge, desktop-first, and shall be usable from 320 pixels wide without sideways scrolling. Check: the main flow (topic, style, generate, mark a stage, goal date, certificate) completes in each of those eight browser versions, and at a 320 pixel window width the page has no horizontal scrollbar. [`intent-statement.md`, Q4 of intent capture, `wireframes.md`]
- **NFR9 Quality gates.** Line coverage shall be at least 80%. Bedrock shall be faked in automated tests. Tests shall be written before the code for journey validation, progress calculation and the nudge rule. [`team-practices.md`]
- **NFR10 Observability.** Each generated journey shall be logged as AI or template, so the share of fallbacks can be seen. Errors shall be logged without the learner's typed name. Check: after one AI journey and one forced-fallback journey, the logs contain one "ai" entry and one "template" entry, and a log search for the typed certificate name finds nothing. [intent success metric 2, NFR3]
- **NFR11 Deployment.** All infrastructure shall be one AWS CDK stack in Python in us-east-1, deployed with `cdk deploy` from the builder's machine; GitHub Actions shall run the tests on every merge and shall hold no AWS keys. [`team-practices.md`, `constraint-register.md`]

---

## Constraints

- Serverless on AWS in one region (us-east-1), defined as infrastructure as code. [`constraint-register.md` TC-02 to TC-04]
- Only Amazon Nova models on Amazon Bedrock. [`constraint-register.md` TC-01]
- Client-side single-page app on S3 behind CloudFront; DynamoDB for state; Python Lambdas. [`constraint-register.md` TC-05 to TC-07]
- Hard deadline 14 November 2026, with the cut order nudges, then milestones and certificate, then goal date, then persona choice. [`scope-document.md`]
- Public GitHub repository, a solo builder, and no AWS keys in GitHub. [`team-practices.md`]

---

## Corner Conditions Covered

| Area | Condition | Where handled |
|---|---|---|
| Text | Empty, spaces-only, over-long, markup in the topic | FR1.1, NFR6 |
| Text | Model returns markup | NFR6 |
| Numbers | Boundaries 2 and 100 characters, 365 days, 3-day nudge window, 50% | FR1.1, FR4.1, FR6.1, FR5.1 |
| Numbers | Zero stages complete, all stages complete | FR3.3, FR5.3 |
| Time | Today versus goal date, date passed, local date | FR4.3 |
| Network | Slow or hanging AI call, AI down, throttled | FR1.6, NFR2, NFR3 |
| Network | Return-visit fetch fails | FR3.4 |
| Storage | Expiry, delete, replace on new journey | FR7.1 to FR7.3 |
| Concurrency | Same action twice, two tabs | FR3.5 |
| Derived state | Unmark after completion | FR3.2, FR5.4 |
| Screens | Loading, empty, error are separate views; destructive action confirmation | FR1.7, FR3.4, FR7.1, FR7.3 |
| Accessibility | Keyboard, screen reader, contrast, zoom | NFR1 |
| AI output | Malformed output, untrusted content | FR1.5, NFR6 |
| Identity and privacy | No personal data, deletion, public repository | FR7.4, NFR6 |

---

## Assumptions

- [assumption] A browser's local storage keeps the anonymous session ID. If it is cleared, the learner cannot reach the saved journey; this is accepted at demo scale and no account recovery exists.
- [assumption] The template journey has the same 5 stages for every teaching style, with only the topic name inserted.
- [assumption] The session ID is created in the browser, so the 5-per-day cap can be bypassed by a script that changes it. The API rate limit and budget alert are the real backstop (FR8.1, FR8.3).
- [assumption] Nova Lite can produce valid 5 to 6 stage journeys with a well-built prompt; this is checked in the first Bedrock build step.
- [assumption] The nudge wording and any additions to the starter blocked list (FR6.2) will be settled during functional design.

## Out of Scope

Native mobile apps, video generation, multiple languages, instructor or admin consoles, payments, social and community features, memory across separate journeys, links to other learning platforms, user accounts and sign-in, a custom domain, and email or push notifications. [`intent-statement.md`, `scope-document.md`]

## Open Questions

- What should happen when the daily journey limit is reached: only a message (as written in FR8.2), or a template journey that costs nothing? To settle in functional design.
- Bedrock Nova Lite access in us-east-1 is still unverified (issue I-01).
- The frontend is plain HTML, CSS and TypeScript with hand-made components and no framework, as decided in the Refined Mockups questions (Q1); Prettier and ESLint therefore apply to the TypeScript and CSS in the team practices.
- The nudge wording is settled in functional design; FR6.2 already carries a starter blocked list that functional design may extend.
