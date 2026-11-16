# Contract Summary — Learning Journey App

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `unit-of-work-dependency.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-dependency.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Contract answers Q1 to Q5 — `contract-design-questions.md` in this folder

Everything ships in one codebase and one deploy. Five boundaries need a written agreement; one crosses the network (C1), one crosses to an outside service (C3), and three are agreements between pieces of code (C2, C4, C5). Field limits and the finer detail of each field are settled in Functional Design; this document fixes the names, shapes, meanings and failure behaviour.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | u1-skeleton (base), extended by u2-progress, u3-protection, u4-goals-and-style and u5-encouragement | The web app (browser) | REST over HTTPS with JSON bodies, versioned under `/api/v1` | u1-skeleton |
| C2 | u1-skeleton | The journey generator, the journey store and the web app | Shared data shape (the Journey, as stored and as sent) | u1-skeleton |
| C3 | External: Amazon Bedrock (Amazon Nova Lite) | The journey generator (u1-skeleton) | Bedrock runtime request and reply, one JSON object back | u1-skeleton (owns the reply shape it requires) |
| C4 | u3-protection | The journey generator (u1-skeleton) | In-code interface (reserve and release a slot) | u3-protection |
| C5 | u1-skeleton, extended by u2-progress, u3-protection, u4-goals-and-style and u5-encouragement | The journey generator and the request handlers | In-code interface (the journey store) | u1-skeleton |

The dependency edges in `unit-of-work-dependency.md` map onto these as follows: u2, u3, u4 and u5 depend on u1 because they add to C1, C2 and C5 and use the generator and store from u1; u3 provides C4 to the generator that u1 builds, which is why the generator is built against a "no limit" stand-in until u3 arrives; u6 consumes every contract by checking the screens that use them.

---

## C1 — Browser to backend

Decisions applied: the session ID travels in a header and the journey is one fixed resource (Q1); every address is under `/v1` with additive-only change (Q2); one error shape with stable codes (Q3); a relative address on the same site, `/api/v1/...`, with routing left to Infrastructure Design (Q4); journey creation is one request that waits for the finished journey (Q5).

```yaml
openapi: 3.0.3
info:
  title: Learning Journey API
  version: 1.0.0
  description: >
    One journey per anonymous session. The browser sends its session ID in the X-Session-Id header.
    Text in every response is plain text and must be shown as text, never as markup.
servers:
  - url: /api/v1
paths:
  /journey:
    post:
      operationId: createJourney
      summary: Make a journey for a topic, replacing any earlier one. (added in u1; style used from u4; limits from u3)
      parameters:
        - $ref: '#/components/parameters/SessionId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [topic]
              properties:
                topic:
                  type: string
                  description: Trimmed by the backend; 2 to 100 characters.
                style:
                  allOf:
                    - $ref: '#/components/schemas/TeachingStyle'
                  description: Optional only until u4-goals-and-style adds the style choice; when omitted the guide style is used, which is also what an older cached page gets.
      responses:
        '201':
          description: The journey (AI-made or template). Always returned for a valid topic.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Journey'
        '400':
          description: TOPIC_INVALID (empty, or outside 2 to 100 characters) or INVALID_REQUEST.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '422':
          description: TOPIC_NOT_ALLOWED. The AI refused the topic; no journey is made, nothing is saved, and no slot is used.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: DAILY_LIMIT (5 new journeys a day reached; added in u3) or RATE_LIMITED (API-wide throttle). On DAILY_LIMIT the learner's existing journey is unchanged and stays usable.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: SAVE_FAILED. The journey was made but could not be saved.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    get:
      operationId: getJourney
      summary: Load the session's journey. (added in u1; expiry from u2)
      parameters:
        - $ref: '#/components/parameters/SessionId'
      responses:
        '200':
          description: The journey.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Journey'
        '404':
          description: NOT_FOUND. No journey exists, or it has expired.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '400':
          description: INVALID_REQUEST (missing or malformed X-Session-Id).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: LOAD_FAILED. The journey could not be read; it is not known to be missing. The web app shows an inline error with "Try again".
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    delete:
      operationId: deleteJourney
      summary: Delete the session's journey with its progress, goal date and milestone memory. (added in u3)
      parameters:
        - $ref: '#/components/parameters/SessionId'
      responses:
        '204':
          description: Deleted, or there was nothing to delete. Safe to repeat.
        '400':
          description: INVALID_REQUEST (missing or malformed X-Session-Id).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: DELETE_FAILED. The journey is still saved.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /journey/stages/{stageNumber}/completion:
    put:
      operationId: setStageCompletion
      summary: Mark a stage complete or not complete. Idempotent. (added in u2)
      parameters:
        - $ref: '#/components/parameters/SessionId'
        - name: stageNumber
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            maximum: 6
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [completed]
              properties:
                completed:
                  type: boolean
      responses:
        '200':
          description: The authoritative list of completed stages after the change.
          content:
            application/json:
              schema:
                type: object
                required: [completedStages]
                properties:
                  completedStages:
                    type: array
                    items:
                      type: integer
        '400':
          description: INVALID_REQUEST (for example a stage number the journey does not have).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: NOT_FOUND.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: SAVE_FAILED.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /journey/goal:
    put:
      operationId: setGoalDate
      summary: Set, change or clear the goal date. (added in u4)
      parameters:
        - $ref: '#/components/parameters/SessionId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [goalDate]
              properties:
                goalDate:
                  type: string
                  format: date
                  nullable: true
                  description: A calendar date, or null to clear it. The range rule (today to 365 days ahead) is applied in the browser; the backend checks only that it is a real calendar date.
      responses:
        '200':
          description: The goal date now stored.
          content:
            application/json:
              schema:
                type: object
                required: [goalDate]
                properties:
                  goalDate:
                    type: string
                    format: date
                    nullable: true
        '400':
          description: INVALID_REQUEST (not a calendar date).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: NOT_FOUND.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: SAVE_FAILED.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  /journey/milestones:
    put:
      operationId: markMilestoneShown
      summary: Record that a milestone was shown, so it does not return. Idempotent. (added in u5)
      parameters:
        - $ref: '#/components/parameters/SessionId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [milestone]
              properties:
                milestone:
                  $ref: '#/components/schemas/Milestone'
      responses:
        '200':
          description: The milestones shown so far.
          content:
            application/json:
              schema:
                type: object
                required: [milestonesShown]
                properties:
                  milestonesShown:
                    type: array
                    items:
                      $ref: '#/components/schemas/Milestone'
        '400':
          description: INVALID_REQUEST.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '404':
          description: NOT_FOUND.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: SAVE_FAILED.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  parameters:
    SessionId:
      name: X-Session-Id
      in: header
      required: true
      description: The anonymous session ID made in the browser (a random UUID). Holds no personal information.
      schema:
        type: string
        format: uuid
  schemas:
    TeachingStyle:
      type: string
      enum: [guide, instructor, planner]
      description: Defaults to guide when omitted.
    Milestone:
      type: string
      enum: [first-stage, halfway, complete]
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              enum: [TOPIC_INVALID, TOPIC_NOT_ALLOWED, DAILY_LIMIT, RATE_LIMITED, NOT_FOUND, LOAD_FAILED, SAVE_FAILED, DELETE_FAILED, INVALID_REQUEST]
            message:
              type: string
              description: Plain text for logs and developers. The web app chooses its own wording from the code.
    Journey:
      $ref: '#/components/schemas/JourneyShape'
    JourneyShape:
      type: object
      description: See contract C2 for the full meaning of each field.
      required: [topic, teachingStyle, source, stages, completedStages, goalDate, milestonesShown, createdAt, lastActivityAt]
      properties:
        topic:
          type: string
        teachingStyle:
          $ref: '#/components/schemas/TeachingStyle'
        source:
          type: string
          enum: [ai, template]
        stages:
          type: array
          minItems: 5
          maxItems: 6
          items:
            $ref: '#/components/schemas/Stage'
        completedStages:
          type: array
          items:
            type: integer
        goalDate:
          type: string
          format: date
          nullable: true
        milestonesShown:
          type: array
          items:
            $ref: '#/components/schemas/Milestone'
        createdAt:
          type: string
          format: date-time
        lastActivityAt:
          type: string
          format: date-time
    Stage:
      type: object
      required: [stageNumber, title, whatItIs, whyItMatters, afterThis, materials, hours]
      properties:
        stageNumber:
          type: integer
          minimum: 1
          maximum: 6
        title:
          type: string
        whatItIs:
          type: string
        whyItMatters:
          type: string
        afterThis:
          type: string
        materials:
          type: object
          required: [reading, exercises, miniProject, quiz]
          properties:
            reading:
              type: array
              items:
                type: string
            exercises:
              type: array
              items:
                type: string
            miniProject:
              type: string
            quiz:
              type: array
              items:
                type: string
        hours:
          type: number
          description: Estimated hours for the whole stage.
        hoursByKind:
          type: object
          description: Present in planner-style journeys; hours for reading, exercises, miniProject and quiz.
          properties:
            reading:
              type: number
            exercises:
              type: number
            miniProject:
              type: number
            quiz:
              type: number
```

Behaviour notes for C1:
- The backend caps the whole `POST /journey` request at 18 seconds from the moment it arrives. The 15-second AI budget counts from the same moment, so the slot reservation counts against it; the save then has at most 2 seconds, which gives a worst case of 17 seconds, inside the 18-second cap and under the browser's 20-second limit. If the 18-second cap is reached, the request ends as SAVE_FAILED when the journey was made but not saved, or with the template if no journey was made yet.
- The browser waits up to 20 seconds for `POST /journey` and 10 seconds for the other calls; the 20-second figure matches NFR2. The calls that set a stage, the goal date or a milestone, and the delete, are safe to repeat, so the web app may retry them once on a network failure and offers "Try again" otherwise. `POST /journey` is never retried automatically.
- An abandoned create (the learner closes the page, or the connection drops) may still complete on the backend, replacing the journey and using a slot. Before offering another attempt after a failed or timed-out create, the web app checks `GET /journey`: if a journey made in the last minute exists, it shows that one instead of making a new request.
- The API-wide throttle (5 requests a second, burst 10) is applied by the front door before the backend runs; its reply may not carry the error body. The web app treats any `429` with no error code as `RATE_LIMITED`.
- Every response carries only plain text values. No field holds markup the web app is expected to run.
- A missing or malformed `X-Session-Id` is `INVALID_REQUEST` (400).

---

## C2 — The journey as stored and as sent

```yaml
shared-schema:
  name: Journey
  owner: u1-skeleton
  used_by: [JourneyGenerator, JourneyStore, WebApp]
  sent_to_browser:
    topic: text, the trimmed topic the learner typed
    teachingStyle: guide | instructor | planner
    source: ai | template
    stages: 5 or 6 Stage items in order from fundamentals to practical mastery
    completedStages: set of stage numbers; no duplicates
    goalDate: calendar date or null
    milestonesShown: set of first-stage | halfway | complete
    createdAt: date and time
    lastActivityAt: date and time
  stored_only:
    sessionId: the anonymous session ID; the key of the record
    expiresAt: 90 days after lastActivityAt; used for expiry and never sent
  Stage:
    stageNumber: 1 to 6, unique within the journey
    title: text
    whatItIs: text
    whyItMatters: text
    afterThis: text
    materials: reading list, exercise list, one mini project, quiz list
    hours: number, estimated hours for the whole stage
    hoursByKind: optional; reading, exercises, miniProject, quiz hours (planner style)
  rules:
    - completedStages only holds stage numbers the journey has
    - consumers ignore fields they do not know
    - all text is plain text
    - no field holds a name, email or other personal information
    - the certificate name typed by the learner is never part of this shape
```

---

## C3 — Backend to Amazon Nova on Bedrock

```yaml
shared-schema:
  name: ModelReply
  owner: u1-skeleton
  direction: the journey generator asks Amazon Nova Lite on Amazon Bedrock, once or twice per journey request
  request:
    model: Amazon Nova Lite (the exact model identifier is confirmed in the first live call; see open issue I-01)
    instructions: build a 5 to 6 stage journey from fundamentals to practical mastery, in the requested teaching style; refuse non-professional or unsafe topics
    topic: passed as delimited data that cannot change the instructions
    reply_format: one JSON object and nothing else
    time_allowed: whatever remains of the 15-second budget, shared across all attempts
  reply_accepted_as_a_journey:
    refused: false
    stages: 5 or 6 items, each with every Stage field in C2 and numeric hours
  reply_accepted_as_a_refusal:
    refused: true
    reason: short plain text, not shown to the learner
  everything_else: invalid
  on_invalid: retry once if at least 5 seconds remain, then use the template
  on_refusal: end the request as TOPIC_NOT_ALLOWED; no retry, no template, no save
  on_failure_or_throttle: treated as invalid
  privacy: only the trimmed topic and the style are sent; no session ID and no personal information
  test_rule: always faked in automated tests (ALWAYS fake Bedrock in automated tests)
```

---

## C4 — Journey generator to usage guard

```yaml
shared-schema:
  name: UsageGuardInterface
  owner: u3-protection
  provider: UsageGuard
  consumer: JourneyGenerator
  operations:
    reserve:
      in: sessionId, day (the server's calendar day, YYYY-MM-DD)
      out: granted (true or false), remaining (0 to 5), reservationId (when granted)
      meaning: a conditional increment that refuses once the count is 5, so two requests at the same moment cannot take it past 5
    release:
      in: reservationId
      out: nothing
      meaning: gives the slot back; used when the request ends with a refused topic or an unexpected error
      rule: the generator calls release at most once for a reservation, and never repeats it; the guard does not protect against a repeated release, so a repeat could lower the count below its true value
      reservationId: returned by reserve and passed back to release; it identifies the one slot taken by that request
  kept_slot: a slot is kept when a journey (AI or template) is created; the generator calls nothing more
  until_u3: the generator is built against a stand-in that always grants, so u1 ships without the cap
  failure: see the open question below on what happens when the guard's own store cannot be reached
```

---

## C5 — Journey store

```yaml
shared-schema:
  name: JourneyStoreInterface
  owner: u1-skeleton
  provider: JourneyStore
  consumers: [JourneyGenerator, request handlers]
  operations:
    saveNew:
      in: sessionId, journey
      out: the saved Journey
      added_in: u1-skeleton
      meaning: replaces any earlier journey for the session; sets lastActivityAt and expiresAt
    load:
      in: sessionId
      out: the Journey, or nothing
      added_in: u1-skeleton (expiry check from u2-progress)
      meaning: nothing when no journey exists or when 90 days have passed since lastActivityAt, even if the record is still present
    setStageCompletion:
      in: sessionId, stageNumber, completed
      out: the authoritative completedStages
      added_in: u2-progress
      meaning: a partial, set-based change to completedStages only, applied only to an existing journey that has not expired; repeating it has the same effect as doing it once
      when_no_live_journey: returns a not-found outcome, which the interface reports as NOT_FOUND; nothing is created and nothing expired is revived
    setGoalDate:
      in: sessionId, date or null
      out: the stored date
      added_in: u4-goals-and-style
      meaning: a partial change to goalDate only, applied only to an existing journey that has not expired
      when_no_live_journey: returns not-found (NOT_FOUND); nothing is created or revived
    markMilestoneShown:
      in: sessionId, milestone
      out: the milestones shown so far
      added_in: u5-encouragement
      meaning: a partial, set-based change to milestonesShown only, applied only to an existing journey that has not expired; repeating it is harmless
      when_no_live_journey: returns not-found (NOT_FOUND); nothing is created or revived
    delete:
      in: sessionId
      out: nothing
      added_in: u3-protection
      meaning: removes the whole Journey record; safe to repeat
  every_write: extends expiresAt to 90 days after the time of the write, but only for a journey that is still live; a write never extends or revives a journey whose 90 days have already passed
  failure: an unreachable store is reported to the caller, which turns it into LOAD_FAILED for a load, SAVE_FAILED for a save or a partial write, or DELETE_FAILED for a delete
  time_allowed: a store call that has not finished within 2 seconds is treated as failed
```

---

## Contract Ownership Rules

- Each contract has one owning unit, named in the table. The owner keeps the spec correct and is the one who agrees a change.
- Inside `/v1`, only additive changes are made: a new endpoint, a new optional field, or a new allowed value. Nothing is renamed, removed or made stricter without the owning unit agreeing first.
- Consumers ignore fields and values they do not recognise, so a newer backend cannot break an older cached page.
- A unit that extends a contract (for example u2 adding an endpoint to C1 or an operation to C5) adds it as a new, separately described piece and does not edit the owner's earlier pieces.
- If a breaking change is ever needed, a `/v2` is added beside `/v1`; `/v1` stays until nothing uses it.

## Errors, Timeouts and Retries by Contract

| Contract | Failure | Behaviour |
|---|---|---|
| C1 | Bad topic, refused topic, daily limit, throttle, missing journey, failed load, failed save or delete | The error shape above with a stable code; the web app picks its wording from the code. DAILY_LIMIT leaves the learner's existing journey unchanged and usable |
| C1 | Failed load (LOAD_FAILED) | The web app shows an inline error with "Try again" and keeps the other controls usable (FR3.4) |
| C1 | Network failure on a repeatable call | One automatic retry, then "Try again" |
| C1 | Network failure on `POST /journey` | No automatic retry; the web app checks `GET /journey` before offering another attempt |
| C1 | No answer within 20 seconds (create) or 10 seconds (others) | The web app treats it as failed and offers "Try again" (after checking `GET /journey` for a create) |
| C1 | Create request still running at 18 seconds | The backend ends it: SAVE_FAILED if a journey was made but not saved, otherwise the template |
| C3 | Failure, throttle or invalid reply | One retry if at least 5 seconds of the 15 remain; otherwise the template |
| C3 | Refusal | Ends the request as TOPIC_NOT_ALLOWED |
| C4 | Slot refused | The request ends as DAILY_LIMIT; nothing else runs |
| C4 | Request ends without a journey | The slot is released, at most once |
| C5 | A call not finished in 2 seconds | Treated as failed: LOAD_FAILED for a load, SAVE_FAILED for a save or partial write, DELETE_FAILED for a delete |
| C5 | A partial write when no live journey exists | NOT_FOUND; nothing is created and nothing expired is revived |

## Requirement and Story Coverage

| Contract | Stories | Requirements |
|---|---|---|
| C1 | US1.1, US1.3 to US1.5, US2.x, US3.1 to US3.3, US4.1, US5.1, US7.1 to US7.3, US9.2 | FR1.1 to FR1.7, FR3.1 to FR3.5, FR4.1, FR5.2, FR7.1 to FR7.3, FR8.1, FR8.2, NFR2, NFR6 |
| C2 | US2.1, US2.3, US3.1, US4.1, US5.1 | FR2.1 to FR2.5, FR3.3, FR5.2, FR7.4 |
| C3 | US1.1, US1.3, US1.4 | FR1.2, FR1.4 to FR1.6, NFR3, NFR6, NFR7 |
| C4 | US9.2 | FR8.2 |
| C5 | US3.1, US3.3, US7.1 to US7.3 | FR3.1 to FR3.5, FR7.1 to FR7.4 |

## Open Questions

| Contract | Question | Blocks |
|---|---|---|
| C3 | What is the exact Amazon Nova Lite model identifier or inference profile to use in us-east-1, and is model access switched on in the account (issue I-01)? | u1-skeleton |
| C4 | If the usage guard's own store cannot be reached, should a request be let through or refused? The cap is only a courtesy limit, so letting it through with a log entry is the lighter choice, but that is for the person to confirm | u3-protection |
| C4 | Is the cap's day the server's calendar day (UTC) or the learner's local day? | u3-protection |
| C1 | Should a capped learner get a free template journey instead of the DAILY_LIMIT message? | u3-protection |
| C1 | Should the backend check the goal date against the date range, or only that it is a real date (as written here, because the range rule runs in the browser)? | u4-goals-and-style |
| C1 | When a load fails (LOAD_FAILED), should the web app also keep showing the last journey it already had in memory while "Try again" runs, or show only the inline error? | u2-progress |

## Assumptions & Open Questions

- [assumption] The error codes `LOAD_FAILED`, `DELETE_FAILED` and `INVALID_REQUEST` are added to the six the person named (`TOPIC_INVALID`, `TOPIC_NOT_ALLOWED`, `DAILY_LIMIT`, `RATE_LIMITED`, `NOT_FOUND`, `SAVE_FAILED`), because a failed load, a failed delete and a malformed request need their own codes.
- [assumption] The browser time limits (20 seconds to create, 10 seconds for the other calls), the 18-second backend cap on the create request and the 2-second limit on a store call were chosen here from NFR2 and the 15-second AI budget; they are for the person to adjust.
- [assumption] How the relative `/api/v1` address is routed to the backend is left to Infrastructure Design, as the person decided.
