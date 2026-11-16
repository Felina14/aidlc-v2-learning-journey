# Business Rules — u1-skeleton

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md`
- `entities.md` in this folder
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

## Machine-Readable Rules

```yaml
rules:
  - id: BR1.1
    statement: A topic is trimmed, stripped of control characters, and must be 2 to 100 visible characters long.
    category: validation
    applies_to: topic (browser and server)
    trigger: The learner presses "Generate my journey", and again when the server receives the request.
    logic: IF the trimmed topic has fewer than 2 or more than 100 visible characters THEN it is invalid. An emoji or accented letter counts as one character. Spaces inside the topic are kept. IN ADDITION, IF the cleaned topic has more than 200 code points (marks, skin tones and joiners add no visible length) THEN it is invalid, so a flood of them cannot get past the 100-character limit.
    violation: The browser shows a message that the topic needs 2 to 100 characters, keeps what was typed, and sends no request. The server answers TOPIC_INVALID.
    source: FR1.1

  - id: BR1.2
    statement: A topic must contain at least one letter or digit, in any script.
    category: validation
    applies_to: topic (browser and server)
    trigger: Same as BR1.1.
    logic: IF the trimmed topic contains no letter and no digit THEN it is invalid.
    violation: The browser shows a message that the topic must contain letters or numbers, keeps what was typed, and sends no request. The server answers TOPIC_INVALID. No AI call is made.
    source: FR1.1 (functional design Q1)

  - id: BR1.3
    statement: The topic reaches the model only as delimited data, with any text that looks like the delimiter removed first.
    category: constraint
    applies_to: JourneyGenerator, request to the model
    trigger: The generator builds the model request.
    logic: Remove from the topic any text equal to the delimiter. Place the topic between the fixed delimiters. The instructions say that text between the delimiters is data to write a journey about and never an instruction.
    violation: Not applicable; the rule shapes the request.
    source: NFR6

  - id: BR1.4
    statement: A topic the model refuses ends the request as "topic not allowed", with no retry, template or save.
    category: policy
    applies_to: JourneyGenerator
    trigger: A model reply has `refused` true.
    logic: IF the reply is a refusal, checked before the structure check, THEN end the request as TOPIC_NOT_ALLOWED. Do not retry. Do not use the template. Do not save. Release the reserved daily-cap slot (BR3.5).
    violation: The learner sees a polite "try a different topic" message and no journey. The reason in the reply is not shown.
    source: FR1.2

  - id: BR1.5
    statement: Everything typed by the learner or written by the model is shown as plain text.
    category: constraint
    applies_to: WebApp, all screens in this unit
    trigger: Any topic, stage text or material is put on the page.
    logic: Insert text as text, never as markup. Markup characters appear on screen as the characters they are.
    violation: Not applicable; the rule shapes the rendering.
    source: NFR6

  - id: BR1.6
    statement: Until the style choice is built (U4), every journey is made in the friendly guide style and no style choice is shown.
    category: policy
    applies_to: JourneyGenerator, WebApp
    trigger: A create request in U1.
    logic: The browser sends no style and shows no style control. The server uses the guide style when none is supplied and stores `guide` as the teaching style. The template is the same for every style.
    violation: Not applicable.
    source: FR1.3, FR2.3 (cut case in US1.2)

  - id: BR2.1
    statement: A model reply is a valid journey only when it has 5 or 6 stages numbered 1 to N in order, with every required field and numeric hours on every stage.
    category: validation
    applies_to: JourneyGenerator, ModelReply
    trigger: A reply arrives with `refused` false.
    logic: IF the stage count is not 5 or 6, or a stage number is missing, repeated or out of order, or a required text field is missing or empty, or hours is not a number THEN the reply is invalid.
    violation: Go to BR3.1 (retry or template).
    source: FR1.4, FR1.5

  - id: BR2.2
    statement: Lists and hours must be within the agreed sizes.
    category: validation
    applies_to: JourneyGenerator, ModelReply
    trigger: Same as BR2.1.
    logic: IF reading, exercises or quiz holds fewer than 1 or more than 5 items, or the mini project is not exactly one item, or hours is not above 0 or is more than 20 THEN the reply is invalid.
    violation: Go to BR3.1.
    source: FR1.5 (functional design Q3)

  - id: BR2.3
    statement: A reply with any text field longer than 2,000 characters is invalid; it is never cut.
    category: validation
    applies_to: JourneyGenerator, ModelReply
    trigger: Same as BR2.1.
    logic: IF any title, explanation or material item has more than 2,000 characters THEN the reply is invalid.
    violation: Go to BR3.1.
    source: FR1.5 (functional design Q2)

  - id: BR2.4
    statement: Anything that is not one JSON object in one of the two accepted shapes is invalid. The one object may be wrapped in a single Markdown code fence (models often add one); any other surrounding text, a second object or a list is invalid.
    category: validation
    applies_to: JourneyGenerator, ModelReply
    trigger: A reply arrives.
    logic: IF the reply is not a single object with `refused` true, or with `refused` false and stages, THEN it is invalid. A model error or throttle is treated the same way.
    violation: Go to BR3.1.
    source: FR1.5, NFR3

  - id: BR3.1
    statement: The generator works to one 15-second budget across all attempts; one retry starts only if at least 5 seconds remain.
    category: constraint
    applies_to: JourneyGenerator
    trigger: An attempt ends invalid, failed or throttled.
    logic: Count 15 seconds from the moment the request starts. IF at least 5 seconds remain and no retry has been made THEN try once more with the time left. OTHERWISE use the template (BR3.2).
    violation: Not applicable.
    source: FR1.5, FR1.6

  - id: BR3.2
    statement: The learner always gets a journey for a valid topic; the template is used whenever the AI cannot deliver one.
    category: policy
    applies_to: JourneyGenerator
    trigger: The call fails, the reply is invalid with no time to retry, it is invalid twice, or 15 seconds pass with no valid journey.
    logic: Build the template journey (BR4.1) with source `template`. When the AI is unavailable the topic has not been screened by the model, so the template carries only the topic as plain text (BR1.5) and no generated content; this follows the contract and is accepted.
    violation: Not applicable.
    source: FR1.6, NFR3

  - id: BR3.3
    statement: The whole create request ends within 18 seconds on the server and the browser waits at most 20 seconds.
    category: constraint
    applies_to: JourneyGenerator, WebApp
    trigger: A create request runs.
    logic: The 15-second AI budget and the 2-second save limit already keep a normal request near 17 seconds, so the 18-second cap applies to the save phase only: the 15-second budget always ends generation first, with a journey (AI or template) in hand. IF the cap is reached while that journey is not yet saved THEN end the request as SAVE_FAILED. The browser treats no answer in 20 seconds as failed and checks for a journey made in the last minute before offering another attempt.
    violation: The learner sees the failure message with "Try again".
    source: NFR2, contract C1

  - id: BR3.4
    statement: Only an Amazon Nova model on Amazon Bedrock is ever called, and the log shows which.
    category: constraint
    applies_to: JourneyGenerator
    trigger: Any AI call.
    logic: The model identifier is a Nova Lite identifier set in one place. No other provider or model family is configured. The topic and style are the only content sent; no session ID and nothing about the learner. Each AI attempt writes the model identifier to the request log (BR4.3).
    violation: Not applicable.
    source: NFR7

  - id: BR3.5
    statement: A reserved daily-cap slot is kept when a journey is saved and released once when the request ends without one.
    category: constraint
    applies_to: JourneyGenerator
    trigger: The request ends.
    logic: The generator reserves a slot through the usage guard interface before any other work. IF a journey (AI or template) is saved THEN keep the slot and call nothing more. IF the request ends as TOPIC_NOT_ALLOWED, as SAVE_FAILED, or on an unexpected error THEN call release once for that reservation and never again. In U1 the guard is a stand-in that always grants, so the reserve and release calls are wired but have no effect; the real cap, and the DAILY_LIMIT outcome, arrive in U3.
    violation: Not applicable.
    source: FR8.2 (contract C4, wired here so U3 only swaps the guard)

  - id: BR4.1
    statement: The template journey has five fixed stages with the topic name inserted, the same fields as an AI journey, and the same content for every style.
    category: policy
    applies_to: JourneyGenerator
    trigger: BR3.2.
    logic: Stage titles are Foundations; Core ideas; Hands-on practice; A real project; Mastery and next steps. Each stage has fixed explanation sentences for what it is, why it matters and what the learner can do after it, and one fixed item for reading, exercises, mini project and quiz, each with the topic name inserted. The exact wording is settled in code generation. Hours are 2, 3, 3, 4 and 4, totalling 16. The template passes BR2.1 to BR2.3.
    violation: Not applicable.
    source: FR1.6, FR2.5

  - id: BR4.2
    statement: Every journey carries its source, and the label follows the source.
    category: policy
    applies_to: JourneyGenerator, WebApp
    trigger: A journey is made and shown.
    logic: IF source is `ai` THEN the label reads "AI-generated content · May need verification". IF source is `template` THEN the label reads "Template-based journey — AI generation was unavailable" and the AI label is not shown.
    violation: Not applicable.
    source: FR2.5

  - id: BR4.3
    statement: Each journey and each AI attempt, including one that ends in a refusal, is logged, and no typed text or learner detail goes in the log.
    category: policy
    applies_to: JourneyGenerator
    trigger: An AI attempt is made (whatever it returns), and a journey is made.
    logic: Write a log line for each AI attempt with the Nova model identifier and its outcome (journey, refusal, invalid or failed), and one line per journey with its source, `ai` or `template`. Nothing else about the learner, the topic or the session goes in the log. Further detail of the log is settled in NFR Requirements.
    violation: Not applicable.
    source: NFR10, NFR7

  - id: BR5.1
    statement: Saving a new journey replaces any earlier one for the session and sets its times.
    category: constraint
    applies_to: JourneyStore
    trigger: The generator saves a journey.
    logic: Write the whole Journey record for the session, with createdAt and lastActivityAt set to now, expiresAt 90 days later, completedStages and milestonesShown empty and goalDate none. A save that does not finish in 2 seconds counts as failed.
    violation: The request ends as SAVE_FAILED and the learner sees that the journey could not be saved.
    source: FR7.1, contract C5

  - id: BR5.2
    statement: Loading returns the journey for the session, or nothing.
    category: constraint
    applies_to: JourneyStore
    trigger: The WebApp asks for the journey.
    logic: IF no record exists THEN return nothing, which the WebApp shows as the home screen. IF the store cannot be reached or does not answer in 2 seconds THEN report LOAD_FAILED.
    violation: The WebApp shows a short error with "Try again" and the other controls stay usable.
    source: FR3.4 (basic load only), contract C5

  - id: BR5.3
    statement: A session ID must be a UUID in its standard text form.
    category: validation
    applies_to: server, every request
    trigger: A request arrives.
    logic: IF the X-Session-Id header is missing or is not a UUID THEN answer INVALID_REQUEST and do nothing else.
    violation: INVALID_REQUEST.
    source: contract C1

  - id: BR5.4
    statement: Nothing personal is stored.
    category: constraint
    applies_to: JourneyStore
    trigger: Any save.
    logic: The record holds only the fields in entities.md. No name, email or other personal data field exists.
    violation: Not applicable.
    source: FR7.4, NFR6

  - id: BR6.1
    statement: While a journey is being made, the page shows that work is happening and accepts no second request.
    category: policy
    applies_to: WebApp
    trigger: A valid topic is submitted.
    logic: Disable the generate button. Announce "Generating your journey" politely to screen readers at the start. IF the wait passes 5 seconds THEN show a reassuring message. Announce the result when it arrives.
    violation: Not applicable.
    source: FR1.7

  - id: BR6.2
    statement: Each stage can be opened to show its name, explanation and four kinds of material, and long text wraps.
    category: policy
    applies_to: WebApp
    trigger: The learner opens a stage.
    logic: Show title, what it is, why it matters, what the learner can do after it, reading, exercises, mini project and quiz. A 2,000-character field wraps with no sideways scroll.
    violation: Not applicable.
    source: FR2.1, FR2.2

  - id: BR6.3
    statement: A saved journey is shown on load, and no way to start another one is offered until U3.
    category: policy
    applies_to: WebApp
    trigger: The page opens.
    logic: IF a journey exists THEN show it and do not offer a new-journey control; replace and delete arrive in U3. IF none exists THEN show the home screen.
    violation: Not applicable.
    source: FR7.1 (functional design Q4)

  - id: BR6.4
    statement: If the browser blocks storage for the session ID, the page says so and offers no journey.
    category: policy
    applies_to: WebApp
    trigger: The page opens or the session ID is needed.
    logic: IF the session ID cannot be kept in the browser THEN show a clear message and do not send a request.
    violation: Not applicable.
    source: FR7.1

  - id: BR7.1
    statement: The whole API is throttled at 5 requests a second with a burst of 10.
    category: constraint
    applies_to: the deployed API
    trigger: Requests reach the API.
    logic: Requests above the rate, once the burst of 10 is used, are rejected with RATE_LIMITED. A 429 answer that carries an error code is handled by that code (for example DAILY_LIMIT, added in U3); only a 429 with no error code, which is what the API front door sends when it throttles, is RATE_LIMITED. The browser shows a plain "please wait" message for it on every call (create, load), keeps the typed topic, and lets the learner try again. The throttle is set in the stack from the first deploy.
    violation: RATE_LIMITED and the "please wait" message.
    source: FR8.1

  - id: BR7.2
    statement: The owner is told when actual spend passes 2 dollars in a day and 8 dollars in the month.
    category: policy
    applies_to: the deployed stack
    trigger: Actual spend passes either amount.
    logic: Two budget alerts are set in the stack. The alert email is a deploy-time value (`alertEmail`) and is never written in a committed file.
    violation: Not applicable.
    source: FR8.3

  - id: BR7.3
    statement: One `cdk destroy` removes every resource, including the data table and the site files.
    category: constraint
    applies_to: the stack
    trigger: The builder removes the app.
    logic: The data table and the site bucket are set to be deleted with the stack, and the bucket empties itself. Listing the stack's and the project's tagged resources in us-east-1 afterwards returns none.
    violation: Not applicable.
    source: NFR5

  - id: BR7.4
    statement: The site and API are served over HTTPS only.
    category: constraint
    applies_to: the deployed stack
    trigger: A request arrives over plain HTTP.
    logic: The request is redirected to HTTPS or refused.
    violation: Not applicable.
    source: NFR6

  - id: BR7.5
    statement: The backend role can only call the chosen Nova model and the specific table actions it needs, and no secret is committed.
    category: authorization
    applies_to: the deployed stack, the repository
    trigger: Deploy, and every commit.
    logic: The role's permissions name the one model and the table actions it uses, and nothing broader. A secret scan of the repository finds no keys, tokens or passwords.
    violation: Not applicable.
    source: NFR6
```

## Rules Summary

| Group | Rules | What it covers |
|---|---|---|
| BR1 | BR1.1 to BR1.6 | The topic: length, letters, delimiter, refusal, plain text, default style |
| BR2 | BR2.1 to BR2.4 | Checking the model's reply |
| BR3 | BR3.1 to BR3.5 | Time budget, retry, fallback, Nova only, slot release |
| BR4 | BR4.1 to BR4.3 | Template, labels, logging the source |
| BR5 | BR5.1 to BR5.4 | Saving, loading, session ID, no personal data |
| BR6 | BR6.1 to BR6.4 | What the page shows and does |
| BR7 | BR7.1 to BR7.5 | Stack protection and removal |

## Assumptions & Open Questions

- [assumption] The delimiter and the exact wording of messages other than the two labels are settled in code generation, using the wording in the refined mockups.
- [assumption] Which cases count as "letter or digit" follows the Unicode letter and digit classes.
- [assumption] Known limitation, for the person to accept at the gate: when Bedrock is unreachable or its replies are invalid, the topic has not been screened by the model, so the template is shown for it (BR3.2). The template holds only the topic as plain text and fixed wording, never generated content.
- Open: the exact Amazon Nova Lite model identifier is confirmed in the first live call (C3).
