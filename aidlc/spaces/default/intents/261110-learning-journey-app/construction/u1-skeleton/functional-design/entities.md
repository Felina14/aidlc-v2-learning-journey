# Entities — u1-skeleton

## Sources

- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C2 Journey shape, C3 ModelReply)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

This unit holds the Journey and its stages, the transient model reply, and the browser's session. Fields that later units fill in (`completedStages`, `goalDate`, `milestonesShown`) exist on the record from the start with their empty values, so later units only change them; U1 never changes them after the save.

## Machine-Readable Entities

```yaml
entities:
  - name: Journey
    owner: JourneyStore
    description: The one learning journey a session holds. Made by the JourneyGenerator, saved by the JourneyStore, shown by the WebApp.
    identifier: sessionId
    attributes:
      - name: sessionId
        type: text (random UUID)
        required: true
        unique: true
        constraints: made in the browser; the key of the record; stored only, never sent back to the browser
      - name: topic
        type: text
        required: true
        constraints: the trimmed topic; 2 to 100 visible characters; at least one letter or digit; control characters removed
      - name: teachingStyle
        type: enum
        required: true
        allowed_values: [guide, instructor, planner]
        default: guide
        constraints: U1 always stores guide because the style choice arrives in U4
      - name: source
        type: enum
        required: true
        allowed_values: [ai, template]
        constraints: decides which label the WebApp shows
      - name: stages
        type: ordered list of Stage
        required: true
        min: 5
        max: 6
        constraints: AI journeys hold 5 or 6 stages; a template journey holds exactly 5; in order from fundamentals to practical mastery
      - name: completedStages
        type: set of whole numbers
        required: true
        default: empty
        constraints: only stage numbers the journey has; no duplicates; U1 saves it empty
      - name: goalDate
        type: calendar date or none
        required: false
        default: none
      - name: milestonesShown
        type: set of first-stage, halfway, complete
        required: true
        default: empty
      - name: createdAt
        type: date and time
        required: true
      - name: lastActivityAt
        type: date and time
        required: true
        constraints: set to the time of the save
      - name: expiresAt
        type: date and time
        required: true
        constraints: 90 days after lastActivityAt; used by the database for removal; never sent to the browser
    entity_constraints:
      - Holds no name, email or other personal information.
      - All text fields are plain text; none is ever treated as markup.
      - One Journey per session; a new save replaces the earlier one.

  - name: Stage
    owner: JourneyStore
    description: One step of the journey, from fundamentals towards practical mastery.
    identifier: stageNumber within its Journey
    attributes:
      - name: stageNumber
        type: whole number
        required: true
        unique: true
        min: 1
        max: 6
        constraints: unique within the journey; the stages are numbered 1 to N with no gap
      - name: title
        type: text
        required: true
        max: 2000 characters
      - name: whatItIs
        type: text
        required: true
        max: 2000 characters
      - name: whyItMatters
        type: text
        required: true
        max: 2000 characters
      - name: afterThis
        type: text
        required: true
        max: 2000 characters
      - name: materials
        type: Materials
        required: true
      - name: hours
        type: number
        required: true
        min: above 0
        max: 20
        constraints: estimated hours for the whole stage; a number, never text
      - name: hoursByKind
        type: reading, exercises, miniProject and quiz hours, all numbers
        required: false
        constraints: used by the planner style in U4; U1 does not ask for it and does not require it
    relationships:
      - target: Journey
        cardinality: many Stages to one Journey
        direction: Journey contains Stages

  - name: Materials
    owner: JourneyStore
    description: What the learner can study in one stage. Part of a Stage, not stored on its own.
    attributes:
      - name: reading
        type: list of text
        required: true
        min: 1
        max: 5
        constraints: each item at most 2000 characters
      - name: exercises
        type: list of text
        required: true
        min: 1
        max: 5
        constraints: each item at most 2000 characters
      - name: miniProject
        type: text
        required: true
        constraints: exactly one; at most 2000 characters
      - name: quiz
        type: list of text
        required: true
        min: 1
        max: 5
        constraints: each item at most 2000 characters
    relationships:
      - target: Stage
        cardinality: one Materials to one Stage
        direction: Stage contains Materials

  - name: ModelReply
    owner: JourneyGenerator
    description: What Amazon Nova Lite sends back. Held only while a request runs; never stored.
    attributes:
      - name: refused
        type: true or false
        required: true
        constraints: when true the reply is a refusal whatever else it holds
      - name: reason
        type: text
        required: false
        constraints: used only when refused is true; short plain text; never shown to the learner and never logged with the topic
      - name: stages
        type: list of Stage-shaped items
        required: false
        constraints: used only when refused is false; checked by the reply rules before use
    entity_constraints:
      - Anything that is not one JSON object with `refused` true, or `refused` false and valid stages, is invalid. The object may be wrapped in a single Markdown code fence (BR2.4).

  - name: BrowserSession
    owner: WebApp
    description: The anonymous identity of one browser. Kept in the browser's storage; it is the only link between a learner and a Journey.
    identifier: sessionId
    attributes:
      - name: sessionId
        type: text (random UUID)
        required: true
        unique: true
        constraints: made on the first visit; never sent to the model; contains nothing about the learner
    relationships:
      - target: Journey
        cardinality: one BrowserSession to zero or one Journey
        direction: BrowserSession owns at most one Journey
```

## Summary

Four things are stored or held in this unit. The Journey is the only stored record, with its Stages and their Materials inside it. The ModelReply exists only while a request runs. The BrowserSession is the learner's anonymous key. Limits on lists, hours and text length are set here so the reply rules in `rules.md` and the template can use the same numbers: 1 to 5 items per list, hours above 0 and at most 20, and at most 2,000 characters per text field.

## Assumptions & Open Questions

- [assumption] The 2,000-character cap per text field was chosen to match the story that a 2,000-character field must wrap without sideways scrolling (AC2.1.2); it is for you to adjust.
- [assumption] Q2 and Q3 (answered A) set the long-field and list-size rules above; Q4 (answered A) is a behaviour of the WebApp, written in `functional-spec.md`.
- None otherwise.
