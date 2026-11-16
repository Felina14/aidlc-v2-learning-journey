# Scope Document — Learning Journey App

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Feasibility assessment — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`
- Constraint register — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- [Q1]–[Q5] Scope definition questions

---

## Scope Summary

The Learning Journey App is a serverless web application that generates a personalized, structured learning journey for any professional topic the learner types. All capabilities named in the original description are in scope for this build. The **hard deadline is 14 November 2026**; if time runs short, capabilities are cut in reverse priority order — engagement features (nudges, milestones, certificate) before core features. [Q1][Q3]

---

## In Scope — All Capabilities

### Core Loop (highest priority — must ship for any demo to be meaningful)

| Capability | Description | Priority |
|---|---|---|
| Journey generation | Learner types any professional topic; Bedrock/Nova Lite generates a 5–6 stage journey | Must Have [desc][Q1] |
| Teaching style / persona | Learner chooses a teaching style (friendly guide, structured instructor, planner) before generation | Must Have [desc][Q1] |
| Stage display | Each stage shows: name, explanation (what/why/after), learning materials (reading, exercises, mini project, quiz), and time estimates | Must Have [desc][Q1] |
| AI-generated content label | Visible label on each generated journey that the content is AI-generated and may require verification for authoritative topics | Must Have [desc][Q7-market-research] |
| Progress tracking | Learner can mark stages complete; progress percentage updates visibly; session keyed by anonymous ID with no PII; DynamoDB TTL for data expiry | Must Have [desc][Q1][Q7-market-research] |
| Fallback template | If Bedrock is slow or unavailable, the app generates a structured template journey so the learner always gets something | Must Have [desc][Q1] |

### Engagement Features (second priority — ship after core loop is stable)

| Capability | Description | Priority |
|---|---|---|
| Goal with target date | Learner sets a goal date; it stays visible throughout the journey | Must Have [desc][Q1] |
| Milestones | Milestones are shown as the learner progresses through the journey | Must Have [desc][Q1] |
| Completion certificate | Shown when the learner completes the journey | Must Have [desc][Q1] |
| Progress nudges | Encouraging nudge shown when progress stalls (e.g. below 50% with goal date approaching); never guilt-driven | Must Have [desc][Q1] |

### Infrastructure (prerequisite — must exist before application features)

| Capability | Description | Priority |
|---|---|---|
| AWS CDK stack (Python) | All resources defined in a single CDK stack; `cdk deploy` / `cdk destroy` | Must Have [desc][Q3] |
| Bedrock integration | Lambda function invoking Bedrock Nova Lite; IAM policies; structured prompt | Must Have [desc][Q1] |
| DynamoDB state layer | Session-keyed progress store; anonymous session ID | Must Have [Q5-feasibility] |
| S3 + CloudFront SPA hosting | Static frontend hosting with CDN | Must Have [desc] |

---

## Out of Scope

The following are explicitly excluded from this build: [desc][Q1-intent-capture]

- Native mobile apps
- Video generation
- Multi-language / localization support
- Instructor and admin consoles
- Payments
- Social and community features (sharing journeys, leaderboards, following other learners)
- Cross-journey personalization or memory (each journey starts fresh)
- Integration with external learning platforms or LMSes
- User authentication / accounts (anonymous session ID is sufficient)
- Custom domain (CloudFront default domain is acceptable for demo)
- Push notifications or email nudges (nudges are UI-only)

---

## Deadline and Cut Priority

**Hard deadline: 14 November 2026 (4 days from scope definition date).** [Q3]

If time runs short, capabilities are deferred in this order (last deferred first):

1. Progress nudges (cut first — lowest impact on core demo value) [Q3]
2. Completion certificate
3. Milestones
4. Goal with target date
5. Teaching style / persona choice (simplify to a default persona if needed)

The core loop — topic input, Bedrock journey generation, stage display, progress tracking, and fallback template — is non-negotiable and must ship. [Q1][Q3]

---

## Minimum Demoable Slice

A learner types a topic, chooses a teaching persona, receives a generated journey, marks stages complete, and sees a progress bar update. This is the core loop and the minimum that makes the app worth showing. [Q5]

---

## Assumptions & Open Questions

- [assumption] 14 November 2026 is a hard deadline, not a soft target. If all capabilities cannot be built to production quality by then, engagement features are cut before core features.
- [assumption] The fallback template mechanism is simple enough to implement quickly (a structured JSON template, not AI-generated). It does not require a separate design effort.
- [assumption] The DynamoDB session key is generated client-side (UUID stored in localStorage) and sent with each API request. No authentication is required.
