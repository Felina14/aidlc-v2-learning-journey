# Approval & Handoff — Questions

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Stakeholder map — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/stakeholder-map.md`
- Scope document — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- Intent backlog — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/intent-backlog.md`
- Competitive analysis — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/market-research/competitive-analysis.md`
- Feasibility assessment — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`
- Constraint register — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- Wireframes — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/rough-mockups/wireframes.md`
- [scope] Workflow-selected scope: `feature`.

---

## Q1. [Product] Go / no-go on the initiative

Ideation produced a FEASIBLE verdict, a scope with all capabilities in, and a hard deadline of 14 November 2026. Do you want to proceed into Inception on this basis?

A. Go — proceed as scoped, with the stated cut order if the deadline is at risk (nudges first, then milestones/certificate)
B. Go, but reduce scope now — start without the lowest-priority capabilities rather than cutting later
C. Hold — resolve an open issue first (please specify in Other)
D. No-go — stop here
X. Other (please specify)

[Answer]: A

---

## Q2. [Product] Acknowledging the critical risks

The RAID log lists these top risks: Nova Lite may return inconsistent journey structure (mitigated by schema validation, one retry and the template fallback), Bedrock model access may not be enabled in your account (open issue I-01), and the 4-day deadline against a full scope. Have these been acknowledged with acceptable mitigations?

A. Yes — all three are acknowledged and the mitigations are acceptable
B. Yes, and I have already confirmed Bedrock Nova Lite access in us-east-1 (closes issue I-01)
C. Not yet — I need to check Bedrock access before committing
D. Not yet — the deadline risk needs a different mitigation (please specify in Other)
X. Other (please specify)

[Answer]: A

---

## Q3. [Product] Budget and resource commitment

The constraint is near-zero idle cost and a single `cdk destroy` teardown, built by one person. Is that resource commitment confirmed?

A. Confirmed — solo build, near-zero idle AWS cost, clean teardown
B. Confirmed, with a spend ceiling for Bedrock usage during the demo (please specify the ceiling in Other)
C. Not confirmed — needs discussion
X. Other (please specify)

[Answer]: A

---

## Q4. [Design] Do the rough mockups reflect the shared vision?

The wireframes cover the topic and persona entry screen, the journey ladder with the sticky "My Journey" header, and the completion certificate. Do they reflect what you want built?

A. Yes — carry them into Inception as the basis for refined mockups
B. Mostly — carry them forward, and I will note adjustments for refined mockups (please specify in Other)
C. No — they need rework before moving on (please specify in Other)
X. Other (please specify)

[Answer]: A

---

## Q5. [Product] Open decisions to carry into Inception

Several choices were deliberately left open in earlier stages. Which should the handoff flag as decisions Inception must settle?

A. Whether CDK or another tool shapes the stack layout, and how progress and journey data are modelled in DynamoDB
B. The exact Nova Lite prompt and JSON schema for a journey, plus validation and retry rules
C. How the anonymous session ID is created and kept, and how DynamoDB TTL expiry is set
D. All of the above — flag them all for Inception
E. None — no open decisions to flag
X. Other (please specify)

[Answer]: D

---

## Consolidated Summary Confirmation

- Go / no-go: go, proceed as scoped, with the cut order nudges first, then milestones/certificate, if the deadline is at risk (Q1: A)
- Risks: the Nova Lite output risk, the Bedrock access issue (I-01) and the 4-day deadline are acknowledged with acceptable mitigations; Bedrock access is not yet confirmed, so I-01 stays open (Q2: A)
- Budget and resources: confirmed, solo build, near-zero idle AWS cost, clean teardown (Q3: A)
- Mockups: reflect the shared vision and go into Inception as the basis for refined mockups (Q4: A)
- Open decisions flagged for Inception: stack layout and DynamoDB data model; Nova Lite prompt, JSON schema and retry rules; session ID handling and TTL expiry (Q5: D)

- Looks correct
- Request changes

[Answer]: Looks correct

