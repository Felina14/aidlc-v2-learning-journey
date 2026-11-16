# Intent Statement — Learning Journey App

## Problem Statement

Self-directed learners face a compounded set of barriers when trying to develop professional skills independently: they don't know where to begin, they're overwhelmed by the volume of available resources with no clear path through them, they lose momentum without structure to keep them going, and the content they find is generic rather than tailored to the specific topic they're trying to learn right now. The result is that most people who want to learn something professionally end up stuck before they meaningfully start, or drop off partway through. [desc][Q1]

## Target Customer

The primary customer is an individual professional upskilling on their own time — evenings and weekends — with no employer mandate driving them. They're self-motivated but time-constrained, and they come to the app with a specific topic in mind. They need a clear, staged path that respects their time, tells them what to do next, and gives them enough structure to follow through. [desc][Q2]

## Success Metrics

This first version succeeds when all four of the following hold: [Q3]

1. A learner types any professional topic, receives a structured journey, and completes at least one stage within a session. [Q3]
2. Journey generation succeeds (or falls back gracefully to a template) for any topic entered, every time. [Q3]
3. A learner who sets a goal date, leaves, and returns later sees their progress accurately reflected. [Q3]
4. The app is fully usable via keyboard-only navigation on the latest two stable releases of Chrome, Firefox, Safari, and Edge, with no functionality gated behind a mouse. [Q3]

## Initiative Trigger

This app is being built for two reinforcing reasons: to explore and demonstrate Amazon Bedrock/Nova model capabilities in a real, end-to-end serverless AWS application, and to address a real gap in tools for self-directed, topic-agnostic professional learning. It is both a portfolio/showcase project and a response to a genuine user need. [desc][Q4]

## Initial Scope Signal

**Workflow-selected scope**: `feature` [scope]

**User-confirmed product boundary** (what this first version deliberately excludes): [Q7]

- Native mobile apps [desc]
- Video generation [desc]
- Multi-language / localization support [desc]
- Instructor and admin consoles [desc]
- Payments [desc]
- Social and community features (sharing journeys, leaderboards, following other learners) [Q7]
- Cross-journey personalization or memory (each journey starts fresh) [Q7]
- Integration with external learning platforms or LMSes [Q7]

## Assumptions & Open Questions

- [assumption] The app will be used by a small number of users (tens) in a demo context. No authentication or user account system is assumed necessary for this build — progress and goals may be stored client-side or via a lightweight serverless backend, without a full user identity layer.
- [assumption] The Amazon Nova model selected for Bedrock will be capable of producing structured, coherent 5–6 stage learning journeys with study plans and materials for any professional topic. The fallback template mechanism is the safety net if generation fails or is slow.
- [assumption] "Encouraging nudges" (progress stall detection) will be surfaced in the UI rather than via push notifications or email, since the out-of-scope items exclude a full notification infrastructure.
