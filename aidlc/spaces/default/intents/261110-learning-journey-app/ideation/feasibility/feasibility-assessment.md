# Feasibility Assessment — Learning Journey App

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Competitive analysis — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/market-research/competitive-analysis.md`
- Market trends — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/market-research/market-trends.md`
- Build vs. buy — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/market-research/build-vs-buy.md`
- [Q1]–[Q7] Feasibility questions (all answered)

---

## Overall Feasibility Verdict: **FEASIBLE** ✓

This project is technically and operationally feasible at the stated scope and scale. All significant technical risks have known mitigations. No integration constraints, regulatory blockers, or organizational blockers prevent starting. The main uncertainties are cost optimization details and Nova Lite output quality — both are addressable during construction with low reversal cost. [desc][Q6][Q7]

---

## Technical Feasibility

### AI Journey Generation (Bedrock / Nova Lite)

**Feasible.** Amazon Bedrock with Nova Lite is a well-established integration path for text generation tasks. Generating a structured 5–6 stage learning journey in JSON or Markdown format is well within Nova Lite's capability. [Q6][desc]

Key considerations:
- Prompt engineering is required to get consistent structured output (stage names, descriptions, materials, time estimates). This is construction work, not a feasibility risk.
- Nova Lite has a context window sufficient for a single journey generation request.
- Latency for a single Bedrock call is typically 2–10 seconds for a structured generation of this size. This is acceptable for a demo app; a loading state in the UI handles it. [Q6][assumption]
- The fallback template mechanism handles the case where Bedrock is unavailable or returns malformed output. [desc]

### Serverless Backend (Lambda + API Gateway + DynamoDB)

**Feasible.** This is the standard, well-understood serverless pattern on AWS. All three services are available in us-east-1. [Q2][desc]

Key considerations:
- Lambda cold starts on Python runtimes (the chosen language) are typically 200–500ms with the standard runtime. For a demo app this is acceptable; provisioned concurrency is available as a mitigation if cold starts become noticeable. [Q3][assumption]
- DynamoDB on-demand pricing at demo scale (tens of users) is effectively zero. A session-keyed progress table is a simple, well-understood data model. [Q5][Q7]
- API Gateway (HTTP API, not REST API) is the lowest-cost option and sufficient for this use case. [assumption]

### Frontend (SPA on S3 + CloudFront)

**Feasible.** Static SPA hosting on S3 + CloudFront is the cheapest and most reliable option for a demo app. No server rendering is required. [Q4][desc]

Key considerations:
- S3 + CloudFront has near-zero cost at demo scale.
- A React or Vanilla JS/TypeScript SPA is the natural fit; the frontend framework choice is a construction decision.
- Accessibility (WCAG, keyboard navigation) is a frontend implementation concern, not a hosting feasibility risk. [desc]

### Infrastructure as Code (AWS CDK in Python)

**Feasible.** AWS CDK with Python is a mature, well-documented choice for serverless AWS stacks. [Q3]

Key considerations:
- A single CDK stack can define all resources (Lambda, API Gateway, DynamoDB, S3, CloudFront, Bedrock IAM policies).
- `cdk destroy` removes all resources in the stack cleanly, meeting the teardown requirement. [Q7]
- DynamoDB tables and S3 buckets with data are retained by default on `cdk destroy` unless explicitly set to `DESTROY` with auto-delete; this must be configured intentionally. [assumption]

---

## Technical Risk Analysis

| Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|
| Nova Lite produces inconsistent journey structure | Medium | Medium | Medium | Strict JSON schema in prompt; validate and retry; fallback to template on parse failure [Q6] |
| Bedrock cold start / latency > 10s | Low | Medium | Low | Show a loading state; set a 15s timeout; fallback template if timeout exceeded [Q6][desc] |
| Lambda cold starts cause noticeable latency | Low | Low | Low | Acceptable at demo scale; provisioned concurrency available if needed [Q3] |
| CDK destroy leaves orphaned resources | Low | Low | Low | Set `RemovalPolicy.DESTROY` on DynamoDB and S3; test destroy before demo [Q7] |
| DynamoDB state storage creates unexpected cost | Very Low | Very Low | Negligible | On-demand pricing; demo scale; no sustained writes [Q5][Q7] |
| Bedrock IAM permissions misconfigured | Low | High | Medium | Least-privilege IAM policy in CDK stack; test Bedrock invocation before demo [desc][assumption] |

---

## Assumptions & Open Questions

- [assumption] Nova Lite is capable of generating well-structured learning journeys with a carefully engineered prompt. This will be validated during the Code Generation stage with a prompt prototype.
- [assumption] The app does not require a user authentication layer for this build. Progress is stored server-side keyed by an anonymous session ID generated client-side and sent with each request.
- [assumption] Python is the chosen runtime for Lambda functions. This aligns with CDK in Python and is a standard choice for Bedrock SDK integration via `boto3`.
- [assumption] CloudFront distribution with an S3 origin handles HTTPS termination. No custom domain is required for the demo.
- [assumption] Bedrock Nova Lite model is available in us-east-1 at the time of build. If unavailable, Nova Micro or Nova Pro are fallbacks within the same region.
