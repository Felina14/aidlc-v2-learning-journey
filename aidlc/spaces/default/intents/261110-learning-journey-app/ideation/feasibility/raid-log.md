# RAID Log — Learning Journey App

## Sources

- [desc] Initial description
- [Q1]–[Q7] Feasibility questions
- Feasibility assessment — `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`

---

## Risks

| ID | Risk | Likelihood | Impact | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R-01 | Nova Lite produces inconsistent journey structure (malformed JSON, missing stages, truncated content) | Medium | Medium | Medium | Enforce strict JSON schema in prompt; validate output; retry once; fall back to template on failure | Builder [Q6] |
| R-02 | Bedrock invocation latency > 10s causes poor UX | Low | Medium | Low | Show loading state; set 15s Lambda timeout; return fallback template on timeout [desc][Q6] | Builder |
| R-03 | CDK destroy leaves orphaned resources (DynamoDB table with data, S3 bucket with objects) | Low | Low | Low | Set RemovalPolicy.DESTROY on DynamoDB and S3 in CDK stack; auto-delete bucket objects; test destroy before demo [Q7] | Builder |
| R-04 | Bedrock IAM permissions misconfigured (Lambda cannot invoke Bedrock) | Low | High | Medium | Define least-privilege IAM policy in CDK; test Bedrock call in isolation before integrating [desc] | Builder |
| R-05 | Lambda cold start latency noticeable on first request after idle period | Low | Low | Low | Acceptable at demo scale; provisioned concurrency available if needed [Q3] | Builder |
| R-06 | Nova Lite not available in us-east-1 or model access not activated | Low | High | Medium | Verify Bedrock model access in AWS console before starting infrastructure build; Nova Pro is a fallback [Q2][Q6] | Builder |

---

## Assumptions

| ID | Assumption | Validated? | Risk if Wrong |
|---|---|---|---|
| A-01 | Nova Lite can generate a well-structured 5–6 stage learning journey from a carefully engineered prompt | No — to be validated in Code Generation | If wrong: use Nova Pro (higher cost but same architecture) or use Nova Lite with a template-guided prompt [Q6] |
| A-02 | No user authentication is required; anonymous session ID is sufficient for progress tracking | No — design decision | If wrong: add Cognito guest identities or a lightweight token; small architecture change [Q5][assumption] |
| A-03 | Python Lambda cold starts are acceptable for demo UX | No — to be measured | If wrong: add provisioned concurrency for the journey generation Lambda [Q3] |
| A-04 | Bedrock access and Nova Lite model access are already activated in the existing AWS account for us-east-1 | No — to be verified before infrastructure build | If wrong: request Bedrock access from AWS console; typically activated within minutes [Q1][Q2] |
| A-05 | A single CDK stack containing all resources is teardown-safe with RemovalPolicy.DESTROY | No — to be tested | If wrong: adjust removal policies; run `cdk destroy --all` with a force flag [Q7] |
| A-06 | CloudFront + S3 static hosting is sufficient for the SPA; no server rendering is needed | Yes — confirmed by Q4 | Low risk; SPA approach is well established [Q4] |

---

## Issues

| ID | Issue | Status | Resolution |
|---|---|---|---|
| I-01 | Bedrock access and Nova Lite model availability in us-east-1 must be confirmed before infrastructure work starts | Open | Builder to verify in AWS console before the infrastructure stage |

---

## Dependencies

| ID | Dependency | Type | Blocking? | Notes |
|---|---|---|---|---|
| D-01 | Amazon Bedrock with Nova Lite available in us-east-1 | External (AWS) | Yes — no AI generation without it | Verify before infrastructure stage [Q2][Q6] |
| D-02 | AWS CDK and Python toolchain installed on the build machine | Local toolchain | Yes — no IaC without it | Standard install: `npm install -g aws-cdk`, Python 3.11+, `boto3` [Q3] |
| D-03 | AWS CLI configured with the default profile pointing to the target account | Local toolchain | Yes — CDK needs credentials | `aws configure` or environment credentials [Q1] |
| D-04 | Node.js (for CDK CLI) and Python 3.11+ (for Lambda runtime and CDK app) | Local toolchain | Yes | Standard runtime dependencies [Q3] |

---

## Assumptions & Open Questions

- [assumption] No external system integrations are required for this build. The app is self-contained: frontend, API, Bedrock, and DynamoDB.
- [assumption] The RAID log will be revisited at the Requirements Analysis and Domain Design stages to add any risks identified during those stages.
