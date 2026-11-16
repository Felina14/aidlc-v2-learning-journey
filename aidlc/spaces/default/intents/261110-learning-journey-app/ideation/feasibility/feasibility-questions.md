# Feasibility & Constraints — Questions

## Sources

- [desc] Initial description: "Runs on AWS, serverless, deployed from infrastructure as code in one region. All AI generation uses Amazon Nova models on Amazon Bedrock only. No other model providers. Demo scale (tens of users), lowest reasonable cost, easy to tear down."
- [scope] Workflow-selected scope: `feature`.

---

## Q1. [Architect] Existing AWS account and setup

Does an AWS account already exist for this build, and if so, what is already provisioned there?

A. Yes — a personal AWS account exists; no existing services that need to be preserved or avoided
B. Yes — an AWS account exists with some existing infrastructure (e.g. other projects, services); need to avoid interference
C. No — a fresh AWS account will be created specifically for this build
D. Not decided — the account situation needs to be settled before architecture
E. Not yet defined
X. Other (please specify)

[Answer]: B — deploy to the default AWS account using the default AWS CLI profile; keep everything in its own CDK stack so other projects are untouched

---

## Q2. [Architect] AWS region preference

Which AWS region should this be deployed to? (The description says one region; this names which one.)

A. us-east-1 (N. Virginia) — default, widest service coverage, Bedrock Nova models available
B. us-west-2 (Oregon) — common alternative for personal projects; Bedrock Nova available
C. eu-west-1 (Ireland) — if the builder is Europe-based or wants EU data residency
D. ap-southeast-2 (Sydney) — if the builder is in Australia/Asia-Pacific
E. No preference — choose the region with best Bedrock Nova model availability and lowest latency for the builder's location
X. Other (please specify)

[Answer]: A

---

## Q3. [Architect] IaC tooling preference

The description mandates infrastructure as code. Which IaC tool is preferred for this build?

A. AWS CDK (TypeScript) — type-safe, good for complex resource graphs, familiar to TypeScript developers
B. AWS SAM — simpler for serverless-focused stacks; less expressive but lower learning curve
C. Terraform — cloud-agnostic, broad community; more setup than CDK/SAM for pure AWS
D. AWS CloudFormation directly — verbose but no additional tooling required
E. No preference — choose whatever best fits a single-developer serverless project that is easy to tear down
X. Other (please specify)

[Answer]: X — AWS CDK in Python (Python Lambdas too); single `cdk destroy` teardown

---

## Q4. [Architect] Frontend hosting approach

Where should the web frontend be hosted? (Serverless constraint applies — no always-on EC2/ECS.)

A. S3 + CloudFront — standard, cheap, CDN delivery; aligns with serverless constraint
B. AWS Amplify Hosting — managed frontend deployment with CI/CD; slightly higher abstraction
C. Lambda@Edge / CloudFront Functions for any server-rendered portions
D. Pure client-side SPA (S3 + CloudFront, no server rendering) — simplest, lowest cost
E. No preference — choose whatever is cheapest and easiest to deploy/tear down for a demo SPA
X. Other (please specify)

[Answer]: D

---

## Q5. [Architect] Progress state storage: client vs. server

The intent statement leaves open whether progress is stored client-side (localStorage) or server-side (DynamoDB). The build-vs-buy assessment assumed server-side. Which is the correct stance?

A. Client-side only (localStorage / sessionStorage) — simplest, free, no backend state; progress lost if browser data cleared or on another device
B. Server-side (DynamoDB with an anonymous session key) — progress persists across devices and sessions; small cost increment
C. Hybrid — store progress client-side by default; optionally sync to server when a user sets a goal date
D. Not decided — this depends on the architecture and cost discussion
E. No preference — choose whatever is cheapest and most reliable for demo scale
X. Other (please specify)

[Answer]: B

---

## Q6. [Architect] Bedrock Nova model tier

Amazon Nova has multiple tiers (Micro, Lite, Pro). For generating a 5–6 stage structured learning journey, which tier is appropriate?

A. Nova Micro — fastest, cheapest; suitable if the journey can be generated in a compact structured prompt response
B. Nova Lite — balanced cost/quality; likely sufficient for structured journey generation
C. Nova Pro — highest quality; use if Micro/Lite produce inconsistent or low-quality journeys
D. Not decided — test Nova Micro/Lite first; fall back to Pro if quality is insufficient
E. No preference — choose the cheapest tier that reliably produces well-structured journeys
X. Other (please specify)

[Answer]: B

---

## Q7. [Architect] Budget and teardown expectations

The description says "lowest reasonable cost" and "easy to tear down." What does that mean practically for this build?

A. Near-zero monthly cost when idle; total AWS spend for the demo lifecycle < $10
B. Willing to spend up to $20–50/month during active demo use, then tear down completely
C. No hard budget ceiling — optimize for simplicity and reliability; cost is secondary
D. Must be teardown-safe: a single CDK/SAM destroy command removes all AWS resources with no orphaned resources
E. Both A and D — near-zero idle cost and clean single-command teardown
X. Other (please specify)

[Answer]: E

---

## Consolidated Summary Confirmation

- AWS account: existing personal account, deploy via default AWS CLI profile; isolated in its own CDK stack so other projects are untouched (Q1: B/Other)
- AWS region: us-east-1 (N. Virginia) — widest service coverage, Bedrock Nova available (Q2: A)
- IaC tooling: AWS CDK in Python; Python Lambdas; single `cdk destroy` for full teardown (Q3: Other)
- Frontend hosting: pure client-side SPA hosted on S3 + CloudFront, no server rendering (Q4: D)
- Progress state: server-side — DynamoDB with an anonymous session key; persists across sessions (Q5: B)
- Bedrock Nova model tier: Nova Lite — balanced cost/quality; default choice for journey generation (Q6: B)
- Budget and teardown: near-zero idle cost + single CDK destroy removes all resources cleanly (Q7: E)

- Looks correct
- Request changes

[Answer]: Looks correct

