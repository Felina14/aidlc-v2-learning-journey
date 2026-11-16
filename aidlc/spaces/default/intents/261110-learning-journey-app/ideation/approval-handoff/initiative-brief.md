# Initiative Brief — Learning Journey App

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

## Intent and Problem

Self-directed learners don't know where to start, get lost in the volume of resources, drift without accountability, and find generic content. The app lets a learner type any professional topic and get a structured 5–6 stage journey they can follow, with progress tracking, goals, milestones, a certificate and encouraging nudges. It is built on AWS serverless with Amazon Nova on Bedrock, as both a showcase and a real tool. See `intent-statement.md`.

## Market Validation

No existing product combines on-demand AI journey generation with progress tracking, goal dates, milestones and a choosable teaching persona. General learning platforms have fixed catalogues, AI chat tools have no persistence, and roadmap sites are fixed and mostly tech-only. The gap is real but narrow: AI chat tools could add persistence. See `competitive-analysis.md`.

## Feasibility and Risk Highlights

Verdict: **FEASIBLE**. See `feasibility-assessment.md` and `constraint-register.md`.

| Risk | Severity | Mitigation |
|---|---|---|
| Nova Lite returns inconsistent journey structure | Medium | Strict JSON schema, validation, one retry, template fallback |
| Bedrock / Nova Lite access not enabled in us-east-1 | Medium | Verify in the AWS console before the infrastructure build (issue I-01, **still open**) |
| 4-day deadline against full scope | High | Cut order: nudges first, then milestones/certificate |

## Scope Boundary

All capabilities in the description are in scope; the hard deadline is **14 November 2026**. Cut order if time runs short: nudges (PU-07), then milestones and certificate (PU-06), then goal date, then persona choice. Out of scope: native mobile, video, multi-language, instructor/admin consoles, payments, social features, cross-journey memory, LMS integration, accounts, custom domain, push/email nudges. See `scope-document.md` and `intent-backlog.md`.

Minimum demoable slice: PU-01 to PU-04 (infrastructure, Bedrock integration, journey UI, progress tracking). [Q1]

## Concept Visuals

Three screens: topic and persona entry, the journey ladder with a sticky "My Journey" header, and the completion certificate. Desktop-first, responsive, WCAG 2.1 AA, with an AI-generated label (a different label on fallback-template journeys) and a single nudge rule: below 50% progress and goal date 3 days away or less. See `wireframes.md`. [Q4]

## Team Plan

Solo builder; Team Formation was skipped as not applicable. No `team-assessment.md` exists. [Q3]

## Go / No-Go Recommendation

**GO**, as scoped, with the cut order above. [Q1]

Conditions carried into Inception:

- Confirm Bedrock Nova Lite access in us-east-1 before the infrastructure work (issue I-01). [Q2]
- Spend: near-zero idle cost, clean `cdk destroy` teardown. [Q3]

## Decisions Inception Must Settle

- Stack layout and the DynamoDB data model for journeys, progress and goals. [Q5]
- The Nova Lite prompt, JSON schema, validation and retry rules. [Q5]
- Anonymous session ID creation and storage, and DynamoDB TTL expiry. [Q5]

## Assumptions & Open Questions

- [assumption] Nova Lite can produce a usable 5–6 stage journey from a well-engineered prompt; to be validated in the first Bedrock build step.
- [assumption] Bedrock access is available in the target account; not yet verified.
- [assumption] The 14 November 2026 deadline is hard and no other external dependency affects it.
