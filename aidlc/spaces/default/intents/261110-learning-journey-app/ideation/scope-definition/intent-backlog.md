# Intent Backlog — Learning Journey App

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Feasibility assessment — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`
- Constraint register — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- [Q1]–[Q5] Scope definition questions

---

## Sequencing Principle

**Risk-first within dependency order.** The Bedrock integration is the highest technical risk; it must be proven end-to-end before any AI-dependent UX is built. The DynamoDB state layer must exist before progress tracking and goals work. The base journey view must exist before milestones and the certificate make sense. [Q2][Q4]

**Hard deadline: 14 November 2026.** Engagement features (nudges, milestones, certificate) are cut before core features if time runs short. [Q3]

---

## Proto-Units (Intent Backlog)

These are the logical units of work, sequenced by dependency and risk. The Units Generation stage will refine these into buildable units with a formal dependency DAG.

| ID | Proto-Unit | Priority | Depends On | Rationale |
|---|---|---|---|---|
| PU-01 | Infrastructure foundation (CDK stack: Lambda, API Gateway, DynamoDB, S3, CloudFront, IAM) | Must Have | — | Everything else depends on this existing [desc][Q4] |
| PU-02 | Bedrock/Nova Lite integration (prompt engineering, journey JSON schema, fallback template) | Must Have | PU-01 | Highest technical risk; prove first before building UX on top [Q2][Q4] |
| PU-03 | Journey generation UI (topic input, persona choice, loading state, journey display with stages, **AI-generated content label**) | Must Have | PU-02 | Core learner-facing experience; depends on working generation; must label content as AI-generated per RC-02 [desc][Q5][Q7-market-research] |
| PU-04 | Progress tracking (mark stage complete, progress bar, DynamoDB state reads/writes, **anonymous session key, no PII, DynamoDB TTL for data expiry**) | Must Have | PU-01, PU-03 | Requires state layer and journey view; privacy-aware storage per RC-01 [desc][Q4][Q7-market-research] |
| PU-05 | Goal date and persistent display | Must Have | PU-04 | Requires progress tracking to be meaningful [desc] |
| PU-06 | Milestones and completion certificate | Must Have (cut second if time-constrained) | PU-04 | Requires progress tracking to show milestones [desc][Q3] |
| PU-07 | Progress nudges (stall detection, encouraging message in UI) | Must Have (cut first if time-constrained) | PU-04, PU-05 | Requires progress and goal date [desc][Q3] |
| PU-08 | Accessibility pass (keyboard navigation, ARIA labels, screen-reader testing, contrast audit) | Must Have | PU-03, PU-04 | Required by constraint TC-09; can be a final pass across all UI [desc] |

---

## Dependency Map

```
PU-01 (Infrastructure)
  |
  +-- PU-02 (Bedrock integration)
       |
       +-- PU-03 (Journey generation UI)
            |
            +-- PU-04 (Progress tracking)
                 |
                 +-- PU-05 (Goal date)
                 |    |
                 |    +-- PU-07 (Nudges)
                 |
                 +-- PU-06 (Milestones + certificate)

PU-08 (Accessibility) depends on PU-03 + PU-04 (applied across all UI)
```

<!-- Text fallback: Linear dependency chain from Infrastructure (PU-01) → Bedrock (PU-02) → Journey UI (PU-03) → Progress Tracking (PU-04). From Progress Tracking: branches to Goal Date (PU-05) which leads to Nudges (PU-07), and to Milestones/Certificate (PU-06). Accessibility (PU-08) is applied across the UI after PU-03 and PU-04. -->

---

## MoSCoW Summary

| Priority | Proto-Units |
|---|---|
| Must Have (core — non-negotiable) | PU-01, PU-02, PU-03, PU-04 |
| Must Have (engagement — cut last) | PU-05, PU-08 |
| Must Have (cut second if deadline pressure) | PU-06 |
| Must Have (cut first if deadline pressure) | PU-07 |
| Should Have | — |
| Could Have | — |
| Won't Have (this version) | Social features, auth, multi-language, mobile apps, payments, LMS integration [desc] |

---

## Minimum Demoable Slice

PU-01 + PU-02 + PU-03 + PU-04 delivered together constitutes the core loop: a learner types a topic, chooses a persona, gets a generated journey, marks stages complete, and sees a progress bar. This is the minimum worth demoing. [Q5]

---

## Assumptions & Open Questions

- [assumption] PU-08 (accessibility) is scoped as a final pass across all UI rather than a separate unit. It may be integrated into PU-03 and PU-04 during development to reduce rework.
- [assumption] The fallback template (part of PU-02) is a hardcoded JSON structure representing a generic 5-stage journey. It does not require AI and is returned immediately if Bedrock times out or returns an error.
- [assumption] Proto-units PU-06 and PU-07 are genuinely deferrable given the 4-day deadline. The Units Generation stage will confirm whether they should be built in a later pass or included in the first build.
