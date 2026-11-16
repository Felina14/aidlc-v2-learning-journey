# Evidence — Practices Discovery

## Sources

- `aidlc/spaces/default/memory/org.md` — the five practice sections, used as framework defaults only.
- `aidlc/spaces/default/memory/team.md` and `project.md` — empty templates; no affirmed baseline.
- `aidlc/spaces/default/memory/phases/inception.md` — phase guardrails.
- `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/approval-handoff/initiative-brief.md`
- `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/intent-backlog.md`
- Git: `git rev-parse` found commit `be92ea0` (framework setup; no application code).
- Practices interview: `practices-discovery-questions.md` (six answers, all confirmed).

## Inspected facts

- Solo builder, personal AWS account, single named CDK stack, us-east-1 (OC-01, OC-02, TC-04).
- AWS CDK in Python, Python Lambdas, SPA on S3 + CloudFront, DynamoDB on-demand, Nova Lite on Bedrock (TC-01 to TC-08).
- Teardown by one `cdk destroy` (OC-04); demo scale with no SLA or on-call (OC-03).
- WCAG 2.1 AA required (TC-09, RC-03); latest two releases of Chrome, Firefox, Safari, Edge (TC-10).
- Hard deadline 14 November 2026 with a stated cut order.
- Feature scope carries an 80% line-coverage floor from `org.md`.

## Inferred

- Staging and manual production approval from `org.md` do not apply: there is no staging tier and no production SLA. Dropped from team practices.

## Interview decisions

- Q1 Branching: short-lived branches squash-merged to `main`.
- Q2 Walking skeleton: yes; infrastructure, Bedrock call and a minimal journey page first.
- Q3 Testing: tests first for journey validation, progress maths and the nudge rule; tests after the code for everything else. Methodology `custom`.
- Q4 Accessibility: automated checks (axe or Lighthouse) plus a manual keyboard and screen-reader pass; Bedrock faked in automated tests.
- Q5 Deployment: GitHub Actions runs tests on every merge; deploy from the builder's own machine with `cdk deploy`; no AWS keys stored in GitHub.
- Q6 Code style: Black and Ruff for Python, Prettier and ESLint for any JS/TS, language-standard naming.

## Stated fact

- The project will live in a PUBLIC GitHub repository (stated by the person when confirming). Consequence: no secrets or credentials may be committed.

## Remaining uncertainty

- Bedrock Nova Lite access in us-east-1 is not yet verified (issue I-01 still open).
- The frontend is plain HTML, CSS and TypeScript with no framework (decided in the Refined Mockups questions, Q1), so Prettier and ESLint apply to the TypeScript. The choice between axe and Lighthouse for the automated accessibility check is still open.

## Participants

Lead only (aidlc-pipeline-deploy-agent). No support agents were dispatched.
