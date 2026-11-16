# Decision Log — Ideation

## Sources

- `intent-statement.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- `stakeholder-map.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/stakeholder-map.md`
- `competitive-analysis.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/market-research/competitive-analysis.md`
- `feasibility-assessment.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`
- `constraint-register.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- `scope-document.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- `intent-backlog.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/intent-backlog.md`
- `wireframes.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- [Q1]–[Q5] Approval and handoff questions

---

## Decisions

| ID | Stage | Decision | Source |
|---|---|---|---|
| D-01 | Intent Capture | Target customer: individual professional upskilling on their own time | `intent-statement.md` |
| D-02 | Intent Capture | Success = journey generated and first stage completed, fallback always works, goal-date progress persists, keyboard-accessible on latest two releases of Chrome, Firefox, Safari, Edge | `intent-statement.md` |
| D-03 | Intent Capture | Excluded beyond the description: social features, cross-journey memory, LMS integration | `intent-statement.md` |
| D-04 | Market Research | Use Bedrock directly for AI; build a custom state layer | `competitive-analysis.md` |
| D-05 | Market Research | Label AI-generated content and store data privacy-aware | `competitive-analysis.md` |
| D-06 | Feasibility | Existing AWS account, own CDK stack, us-east-1 | `constraint-register.md` |
| D-07 | Feasibility | AWS CDK in Python with Python Lambdas; single `cdk destroy` teardown | `constraint-register.md` |
| D-08 | Feasibility | Client-side SPA on S3 + CloudFront; server-side state in DynamoDB with anonymous session key; Nova Lite | `feasibility-assessment.md` |
| D-09 | Scope | All capabilities in scope; risk-first sequencing; hard deadline 14 November 2026 | `scope-document.md` |
| D-10 | Scope | Cut order: nudges first, then milestones/certificate | `scope-document.md`, `intent-backlog.md` |
| D-11 | Scope | AI-generated label added to PU-03; anonymous session key, no PII and DynamoDB TTL added to PU-04 | `intent-backlog.md` |
| D-12 | Team Formation | Skipped: solo builder, nothing to form | — |
| D-13 | Rough Mockups | Vertical stage ladder, sticky "My Journey" header, desktop-first responsive, neutral palette with one warm accent | `wireframes.md` |
| D-14 | Rough Mockups | One nudge rule: below 50% progress and goal date 3 days away or less | `wireframes.md` |
| D-15 | Rough Mockups | Fallback journeys show "Template-based journey — AI generation was unavailable" | `wireframes.md` |
| D-16 | Approval & Handoff | Go, as scoped, with the stated cut order [Q1] | `initiative-brief.md` |

## Assumptions & Open Questions

- [assumption] Bedrock Nova Lite access in us-east-1 is not yet verified (issue I-01 remains open). [Q2]
- [assumption] Decisions are recorded as the person confirmed them in each stage's questions or gate; none were taken on their behalf.
