# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- We are a solo builder; one person makes every scope, priority and merge decision.
- We work in short-lived branches that are squash-merged into `main`.
- A single environment is used: one named CDK stack in a personal AWS account in us-east-1, with no staging tier.
- Hard deadline is 14 November 2026. If time runs short we cut in this order: nudges, then milestones and certificate, then goal date, then persona choice.

## Walking Skeleton

- We build a walking skeleton first: the infrastructure, a working Bedrock call and a minimal journey page, proving the pieces connect before the remaining features are added.

## Testing Posture

- **Methodology**: custom
- **Ordering**: We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.
- **Methodology evidence**: Affirmed in the interview (Q3): tests-first where the logic is pure and rule-heavy, tests-after elsewhere, which suits a solo build with an exploratory Bedrock prompt.
- Coverage: 80% line-coverage floor for the feature scope, enforced in Build and Test; the existing suite stays green before merge.
- Accessibility (WCAG 2.1 AA) is checked with automated tooling (axe or Lighthouse) plus a manual keyboard and screen-reader pass.
- Bedrock is faked in automated tests so the suite is free and repeatable.

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- All infrastructure is AWS CDK in Python; Lambdas are Python; the SPA is hosted on S3 behind CloudFront; data is in DynamoDB; AI is Amazon Nova Lite on Bedrock.
- Everything lives in one CDK stack and teardown is a single `cdk destroy` with no orphans (RemovalPolicy.DESTROY on DynamoDB and S3).
- GitHub Actions runs the tests on every merge. We deploy from the builder's own machine with `cdk deploy`; no AWS keys are stored in GitHub.
- The project lives in a public GitHub repository, so no secrets or credentials may be committed.
- Bedrock Nova Lite access in us-east-1 must be verified before the infrastructure build (issue I-01, open).

## Code Style

- Python for CDK and Lambda code; the frontend is plain HTML, CSS and TypeScript with no framework (decided in the Refined Mockups questions, Q1).
- Black and Ruff for Python; Prettier and ESLint for any JS/TS.
- Language-standard naming: snake_case for Python, camelCase for JS/TS.
- Frontend meets WCAG 2.1 AA; status is never conveyed by colour alone.
- AI content is labelled as AI-generated in the UI.
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
