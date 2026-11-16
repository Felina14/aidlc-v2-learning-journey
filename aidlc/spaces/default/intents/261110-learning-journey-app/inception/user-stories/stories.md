# User Stories — Learning Journey App

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `personas.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/personas.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Story plan answers Q1 to Q6 — `user-stories-questions.md` in this folder

Priorities use MoSCoW. Must: topic entry, generation, fallback, stage content, progress, saved journeys, data deletion, accessibility, misuse protection. Should: persona choice, then goal date (persona choice ranks higher). Could: milestones and certificate, then nudges. The MVP line is decided later in Delivery Planning.

Cut order if time runs short (first to be cut at the top):

1. Nudges (US6.1)
2. Milestones and certificate (US5.1, US5.2)
3. Goal date (US4.1, US4.2)
4. Teaching style choice (US1.2); the friendly guide becomes the default

## Story Index

| Group | Stories |
|---|---|
| 1 Start a journey | US1.1, US1.2, US1.3, US1.4, US1.5 |
| 2 Read a journey | US2.1, US2.2, US2.3 |
| 3 Work through it | US3.1, US3.2, US3.3 |
| 4 Set and keep a goal | US4.1, US4.2 |
| 5 Celebrate and finish | US5.1, US5.2 |
| 6 Encouragement | US6.1 |
| 7 Own my data | US7.1, US7.2, US7.3 |
| 8 Use it with any ability, browser and size | US8.1, US8.2, US8.3 |
| 9 Run it safely (builder) | US9.1, US9.2, US9.3 |

---

## Group 1 — Start a journey

### US1.1 Enter a topic
As Dana, I want to type any professional topic and be told clearly if it cannot be used, so that I never wonder why nothing happened.
- **Priority:** Must Have. **Covers:** FR1.1, FR1.2, NFR6.
- AC1.1.1 — Given the topic box is empty or holds only spaces, When I press "Generate my journey", Then a message says the topic needs 2 to 100 characters and no request is sent.
- AC1.1.2 — Given a topic of exactly 100 characters, Then the request is sent. Given 101 characters, Then the message appears and what I typed is kept.
- AC1.1.3 — Given a non-professional or unsafe topic, When I submit it, Then no journey is shown and I see a polite "try a different topic" message.
- AC1.1.4 — Given the topic contains markup such as `<script>alert(1)</script>`, Then it is shown as plain text wherever it appears and nothing runs.
- AC1.1.5 — Given the AI reply contains markup such as `<img src=x onerror=alert(1)>` in a stage explanation, Then it is shown as plain text and nothing runs.
- AC1.1.6 — Given a request to the app over plain HTTP, Then it is redirected to HTTPS or refused.
- AC1.1.7 — Given the deployed app, Then the backend role allows only invoking the chosen Nova model and the specific table actions it needs, and a secret scan of the repository finds no keys, tokens or passwords.

### US1.2 Choose a teaching style
As Sam, I want to choose a friendly guide, a structured instructor or a planner focused on tracking before the journey is made, so that the journey speaks to me the way I like to learn.
- **Priority:** Should Have (ranks above goal date). **Covers:** FR1.3, FR2.3.
- **If cut for time:** the style choice is not shown and the app uses the friendly guide as the default style. The template journey is the same for every style.
- AC1.2.1 — Given a topic is typed and no style is chosen, Then the "Generate my journey" button is disabled and says why.
- AC1.2.2 — Given I chose the instructor style, Then every stage lists at least 2 exercises and at least 1 quiz.
- AC1.2.3 — Given I chose the planner style, Then every stage shows hours for reading, exercises, mini project and quiz separately.
- AC1.2.4 — Given I chose the guide style, Then the explanations use an encouraging, analogy-led tone, checked by reading a sample of stages.
- AC1.2.5 — Given the template journey is shown, Then it is identical whichever style I chose.
- AC1.2.6 — Given this story is not built, Then every AI journey is made in the friendly guide style and no style choice is shown.

### US1.3 Get a generated journey
As Dana, I want a journey of 5 to 6 stages from fundamentals to practical mastery, so that I have a path I can follow.
- **Priority:** Must Have. **Covers:** FR1.4, FR1.5, NFR7.
- AC1.3.1 — Given a valid topic and style, When the journey is made, Then it has 5 or 6 stages in order from fundamentals to practical mastery, each with the fields in US2.1 and US2.2.
- AC1.3.2 — Given the AI returns 7 stages after 6 seconds, Then the answer is retried once; if the retry is valid, that journey is shown.
- AC1.3.3 — Given any generated journey, Then the request log shows only an Amazon Nova model on Amazon Bedrock was called.

### US1.4 Always get a journey
As Sam, I want a journey even when the AI is slow or unavailable, so that I am never left with an error instead of a path.
- **Priority:** Must Have. **Covers:** FR1.6, NFR2, NFR3.
- AC1.4.1 — Given Amazon Bedrock is unreachable, When I submit a valid topic, Then a 5-stage template journey with my topic name is shown and labelled as a template.
- AC1.4.2 — Given no valid journey has come back after 15 seconds across all attempts, Then the template is shown, and the whole response arrives within 20 seconds.
- AC1.4.3 — Given the AI returns invalid output after 12 seconds, Then no retry starts and the template is shown by the 15-second mark.
- AC1.4.4 — Given the template, Then it has the same fields per stage as an AI journey.

### US1.5 See that something is happening
As Riley, I want to be told that my journey is being made, so that I know the page has not frozen.
- **Priority:** Must Have. **Covers:** FR1.7.
- AC1.5.1 — Given generation takes more than 5 seconds, Then a reassuring message is visible.
- AC1.5.2 — Given generation starts and finishes, Then a screen reader announces "Generating your journey" politely at the start and announces the result at the end.
- AC1.5.3 — Given generation is running, When I press the button again, Then no second request is sent.

---

## Group 2 — Read a journey

### US2.1 Understand and study each stage
As Dana, I want each stage to explain what it is, why it matters and what I can do after it, with materials to use, so that I know what to do next.
- **Priority:** Must Have. **Covers:** FR2.1, FR2.2.
- AC2.1.1 — Given a journey, When I expand a stage, Then I see its name, what it is, why it matters, what I can do after it, and reading, exercises, a mini project and a quiz.
- AC2.1.2 — Given a stage with 2,000 characters of text, Then it wraps without sideways scrolling.

### US2.2 See time estimates
As Dana, I want hours for each stage and a total, so that I can plan my weeks.
- **Priority:** Must Have. **Covers:** FR2.4 (hours and total; the weekly pace is US4.2).
- AC2.2.1 — Given stages of 2, 3, 3, 4 and 4 hours, Then the total reads 16 hours.
- AC2.2.2 — Given a stage whose hours are missing from the AI output, Then the output fails the check in US1.3 rather than showing a blank.

### US2.3 Know whether a journey is AI-made or a template
As Sam, I want a clear label, so that I know how far to trust the content.
- **Priority:** Must Have. **Covers:** FR2.5.
- AC2.3.1 — Given an AI journey, Then it shows "AI-generated content · May need verification".
- AC2.3.2 — Given a template journey, Then it shows "Template-based journey — AI generation was unavailable" and not the AI label.

---

## Group 3 — Work through it

### US3.1 Mark a stage complete
As Dana, I want to mark a stage complete and see my progress change, so that I can see I am getting somewhere.
- **Priority:** Must Have. **Covers:** FR3.1, FR3.3, FR3.5, NFR2.
- AC3.1.1 — Given 5 stages with none complete, When I mark stage 1 complete, Then the bar reads 20% and the count reads "1 of 5 complete" within 1 second.
- AC3.1.2 — Given the save fails, Then I see a message that it could not be saved with a way to try again, and the page does not claim it was saved.
- AC3.1.3 — Given I mark stage 2 complete in two tabs, Then it shows complete once and progress counts it once.

### US3.2 Undo a completed stage
As Sam, I want to unmark a stage, so that a mistaken click is not permanent.
- **Priority:** Should Have. **Covers:** FR3.2.
- AC3.2.1 — Given stage 1 is complete, When I unmark it, Then the bar returns to 0%.

### US3.3 Come back later and carry on
As Dana, I want my journey waiting when I return, so that I can continue where I stopped.
- **Priority:** Must Have. **Covers:** FR3.4, NFR2.
- AC3.3.1 — Given a saved journey, When I return, Then a loading skeleton shows and then my journey within 3 seconds.
- AC3.3.2 — Given the fetch fails, Then an inline error with "Try again" appears and the other controls stay usable.
- AC3.3.3 — Given there is no saved journey, Then the home screen shows, not an error.

---

## Group 4 — Set and keep a goal

### US4.1 Set, change and clear a goal date
As Dana, I want to set a goal date, so that I have a target to work to.
- **Priority:** Should Have. **Covers:** FR4.1.
- AC4.1.1 — Given today, Then today and today plus 365 days are accepted, and yesterday and today plus 366 days are rejected with a message.
- AC4.1.2 — Given a goal date is set, When I change or clear it, Then the header updates straight away.
- AC4.1.3 — Given the entry is not a date, Then a message names the format expected.

### US4.2 Keep the goal in view
As Dana, I want my goal date and days remaining always visible, with a weekly pace, so that I know how much to do each week.
- **Priority:** Should Have. **Covers:** FR4.2, FR4.3, FR2.4 (weekly pace).
- AC4.2.1 — Given a goal date, When I scroll through the stages, Then the goal date and days remaining stay visible.
- AC4.2.2 — Given the goal date is today, Then the header reads "due today". Given it was yesterday, Then it reads "goal date passed" and offers a new date, in an encouraging tone.
- AC4.2.3 — Given 16 hours in total and a goal date 4 weeks away, Then a pace of 4 hours per week is shown. Given no goal date, Then no pace is shown.

---

## Group 5 — Celebrate and finish

### US5.1 See milestones
As Sam, I want a short celebration at key points, so that progress feels rewarding.
- **Priority:** Could Have (cut after nudges). **Covers:** FR5.1, FR5.2.
- AC5.1.1 — Given 5 stages, Then a milestone shows after the first stage, after the third (at least half), and after the fifth.
- AC5.1.2 — Given I dismissed a milestone, Then it does not return.
- AC5.1.3 — Given a milestone appears, Then a screen reader announces it politely and it does not rely on colour alone.

### US5.2 Get a completion certificate
As Sam, I want a certificate when I finish, so that I have something to keep.
- **Priority:** Could Have (cut after nudges). **Covers:** FR5.3, FR5.4.
- AC5.2.1 — Given all 5 stages are complete, Then the certificate shows the topic, today's date and "5 stages".
- AC5.2.2 — Given I type a name, Then it shows on the certificate; after a reload it is gone, and no stored record or log holds it.
- AC5.2.3 — Given I unmark stage 5, Then the journey view returns at 80%.

---

## Group 6 — Encouragement

### US6.1 Get a gentle nudge when progress stalls
As Dana, I want an encouraging nudge when my goal is close and I am under half way, so that I get a push without guilt.
- **Priority:** Could Have (cut first). **Covers:** FR6.1, FR6.2, FR6.3.
- AC6.1.1 — Given 1 of 5 stages complete (20%) and a goal date 3 days away, Then a nudge shows. Given 3 of 5 (60%), 4 days away, no goal date, or a passed goal date, Then no nudge shows.
- AC6.1.2 — Given a nudge, Then its text offers an encouraging next step, contains no word from the starter blocked list in FR6.2, and has a dismiss control reachable by keyboard.
- AC6.1.3 — Given a nudge, Then it appears in the page only; no email or push notification is sent.

---

## Group 7 — Own my data

### US7.1 Start a new journey without losing one by accident
As Sam, I want to be asked before a new journey replaces my old one, so that I do not lose progress.
- **Priority:** Must Have. **Covers:** FR7.1.
- AC7.1.1 — Given a journey exists, When I start a new one, Then I am asked to confirm and the old journey is replaced only if I confirm.
- AC7.1.2 — Given I cancel, Then my journey is unchanged.

### US7.2 Delete my journey
As Sam, I want to delete my journey whenever I choose, so that my data is gone when I want it gone.
- **Priority:** Must Have. **Covers:** FR7.3.
- AC7.2.1 — Given a saved journey, When I choose "Delete my journey", Then the confirmation names what will be deleted, and after I confirm the home screen shows and the journey cannot be loaded.
- AC7.2.2 — Given the delete fails, Then I see a message and my journey is kept.

### US7.3 Have my journey expire, with no personal information kept
As Sam, I want old journeys to expire and nothing personal stored, so that I can use the app without leaving a trail.
- **Priority:** Must Have. **Covers:** FR7.2, FR7.4, NFR6.
- AC7.3.1 — Given a journey last changed 91 days ago, When it is read, Then it is not returned even if the database has not yet removed it. Given 89 days ago, Then it is returned and the save extends its expiry.
- AC7.3.2 — Given a stored record, Then it holds no name or email field.

---

## Group 8 — Use it with any ability, browser and size

### US8.1 Do everything with the keyboard
As Riley, I want to complete the whole flow with the keyboard alone, so that I never need a mouse.
- **Priority:** Must Have. **Covers:** NFR1.
- AC8.1.1 — Given only the keyboard, Then I can enter a topic, choose a style, generate, expand a stage, mark it, set a goal date and reach the certificate.
- AC8.1.2 — Given any screen, Then focus is always visible, the order is logical and nothing traps the keyboard.
- AC8.1.3 — Given any page, Then a skip-to-content link is the first focusable item.

### US8.2 Hear what is happening with a screen reader
As Riley, I want labels and announcements, so that I know what each control does and when things change.
- **Priority:** Must Have. **Covers:** NFR1.
- AC8.2.1 — Given any screen, Then every input has a label, headings are in order, and the main regions are marked.
- AC8.2.2 — Given a stage, Then its button reports whether it is expanded, and the progress bar reports its value.
- AC8.2.3 — Given a change in progress, a milestone, a nudge or an error, Then a polite announcement is made.
- AC8.2.4 — Given the main flow, Then a manual pass with a screen reader has been completed on it and recorded as done.

### US8.3 Read it comfortably in any supported browser and size
As Riley, I want good contrast, resizable text and a layout that works anywhere, so that I can read and use it on my setup.
- **Priority:** Must Have. **Covers:** NFR1, NFR8.
- AC8.3.1 — Given any text, Then contrast is at least 4.5:1 and no status relies on colour alone.
- AC8.3.2 — Given the latest two releases of Chrome, Firefox, Safari and Edge, Then the main flow completes in each.
- AC8.3.3 — Given a 320 pixel wide window, Then there is no sideways scrolling. Given 200% zoom, Then the page stays usable.
- AC8.3.4 — Given any button, link or input, Then its touch target is at least 44 by 44 CSS pixels.
- AC8.3.5 — Given each screen, Then an automated check (axe or Lighthouse) reports no critical or serious violations.

---

## Group 9 — Run it safely (builder)

### US9.1 Be alerted when spend grows
As Alex, I want alerts on spend, so that a bill never surprises me.
- **Priority:** Must Have. **Covers:** FR8.3.
- AC9.1.1 — Given actual spend reaches 2 dollars in one day, Then I am notified. Given actual spend reaches 8 dollars in the month, Then I am notified.

### US9.2 Limit misuse of the public address
As Alex, I want the API throttled and each session capped, so that one script cannot run up the AI bill.
- **Priority:** Must Have. **Covers:** FR8.1, FR8.2.
- AC9.2.1 — Given 11 requests arrive in the same instant, Then the 11th is rejected with a "please wait" message.
- AC9.2.4 — Given a client sends 6 requests per second for 10 seconds, Then requests above the 5 per second rate are rejected once the burst of 10 is used.
- AC9.2.2 — Given a session has made 5 journeys today, When it asks for a sixth, Then the learner is told the daily limit is reached and the current journey is unchanged.
- AC9.2.3 — Given the limit message, Then its wording is plain and not blaming.

### US9.3 Remove everything with one command
As Alex, I want one command to remove the whole app, so that nothing is left running or costing money after the demo.
- **Priority:** Must Have. **Covers:** NFR5.
- AC9.3.1 — Given the app is deployed, When I run `cdk destroy`, Then listing the stack's resources and the project's tagged resources in us-east-1 returns none.
- AC9.3.2 — Given the data table holds records and the site bucket holds files, Then both are removed with no manual step.

---

## INVEST and Dependencies

- Each story can be built and tested on its own, except where a dependency is listed below. Sizes are one sitting for a solo builder.
- US1.3 needs US1.1; US1.4 needs US1.1, and its template path depends only on the shared journey shape defined with US1.3, not on the AI output, so the template works when the AI is down; US2.1 to US2.3 need US1.3 or US1.4.
- US3.1 needs a journey (US1.3 or US1.4) and storage; US3.2 and US3.3 need US3.1.
- US4.2, US5.1, US5.2 and US6.1 need US3.1; US4.2 and US6.1 also need US4.1.
- US7.1 to US7.3 need stored journeys (US3.3).
- US8.1 to US8.3 apply to every screen, so each story is checked against them.
- The walking skeleton slice is US1.1, US1.3, US1.4, US2.1 and US2.3, using the friendly guide as the default teaching style until US1.2 is built.

## Assumptions & Open Questions

- [assumption] Requirements FR2.3 and FR1.3 (teaching style) are covered by US1.2 only, which is a Should Have. The person decided that if it is cut, the app uses the friendly guide as the default style, no style choice is shown, and the template journey is the same for every style. FR1.3 in the requirements describes the full-scope behaviour; this story note covers the cut case.
- [assumption] Teardown (NFR5) has a builder story (US9.3) because the person asked for builder stories on teardown, while the detailed design of teardown stays with the later NFR and infrastructure stages.
- [assumption] NFR9 (quality gates), NFR10 (observability), NFR11 (deployment), NFR4 (cost) and NFR2 beyond the learner-facing timings are deferred to later stages, as the plan said.
- Open: whether the daily-limit case (US9.2) should instead give a free template journey; settled in functional design.
