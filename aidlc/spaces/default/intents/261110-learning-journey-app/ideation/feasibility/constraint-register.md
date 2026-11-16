# Constraint Register — Learning Journey App

## Sources

- [desc] Initial description
- [Q1]–[Q7] Feasibility questions

---

## Technical Constraints

| ID | Constraint | Type | Source | Impact |
|---|---|---|---|---|
| TC-01 | All AI generation must use Amazon Nova models on Amazon Bedrock only. No other model providers. | Hard | [desc] | Architecture must route all LLM calls through the Bedrock SDK; no OpenAI, Anthropic, or other provider SDKs may be used. |
| TC-02 | Deployment must be serverless — no always-on EC2 or ECS instances. | Hard | [desc] | All compute must use Lambda (or equivalent ephemeral functions). API Gateway or Lambda function URLs for HTTP. |
| TC-03 | All infrastructure must be defined in Infrastructure as Code. | Hard | [desc] | AWS CDK in Python is the chosen tool. No manual console provisioning of persistent resources. |
| TC-04 | Deployment is to a single AWS region: us-east-1. | Hard | [desc][Q2] | No multi-region, no cross-region replication. All resources in us-east-1. |
| TC-05 | IaC tooling: AWS CDK in Python. Lambda runtime: Python. | Chosen | [Q3] | All CDK constructs and Lambda function code are in Python. Frontend framework is not constrained. |
| TC-06 | Frontend is a pure client-side SPA hosted on S3 + CloudFront. No server rendering. | Chosen | [Q4] | No SSR, no Lambda@Edge for page rendering. HTML/JS/CSS served from S3 via CloudFront. |
| TC-07 | Progress state is stored server-side in DynamoDB, keyed by anonymous session ID. | Chosen | [Q5] | A DynamoDB table with on-demand billing holds learner progress. No authentication or user accounts. |
| TC-08 | Amazon Nova Lite is the default Bedrock model tier for journey generation. | Chosen | [Q6] | Nova Lite is the first choice; Nova Pro is the fallback if quality is insufficient. |
| TC-09 | Web frontend must be accessible: keyboard navigation and screen-reader friendly, targeting WCAG 2.1 AA. | Hard | [desc] | All interactive elements must be keyboard-reachable. Status must not be conveyed by colour alone. |
| TC-10 | Target browsers: latest two stable releases of Chrome, Firefox, Safari, and Edge. | Hard | [desc] | No IE11 support. No very old Chromium versions. |

---

## Organizational Constraints

| ID | Constraint | Type | Source | Impact |
|---|---|---|---|---|
| OC-01 | Solo builder — one person makes all scope and priority decisions. | Organizational | [Q1] | No formal review or sign-off process. Decisions are fast but all risk sits with one person. |
| OC-02 | Build is deployed to an existing personal AWS account. All resources are in a named CDK stack. | Organizational | [Q1] | Stack isolation protects other projects. Stack name must be unique and descriptive. |
| OC-03 | Demo scale: tens of users. No production SLA or on-call required. | Organizational | [desc] | No high-availability configuration, no on-call runbook, no SLA commitment. |
| OC-04 | Teardown must be a single `cdk destroy` command with no orphaned resources. | Organizational | [Q7] | All resources must be in the CDK stack. DynamoDB and S3 must have RemovalPolicy.DESTROY configured. |

---

## Regulatory Constraints

| ID | Constraint | Type | Source | Impact |
|---|---|---|---|---|
| RC-01 | GDPR-aware design: store only what is necessary; make it deletable. | Soft | [Q7-context] | Learner topic and progress are low-sensitivity data. Anonymous session ID avoids PII collection. If the app ever collects email or name, a deletion mechanism must be added. |
| RC-02 | AI-generated content must be labelled as AI-generated. | Soft | [Q7-context] | The UI must include a visible disclosure that journeys are AI-generated and may require verification for authoritative topics. |
| RC-03 | WCAG 2.1 AA accessibility. | Hard | [desc][TC-09] | Keyboard navigation, screen-reader support, sufficient contrast, no motion-only indicators. |

---

## Assumptions & Open Questions

- [assumption] No HIPAA, PCI-DSS, SOC 2, or financial data compliance requirements apply. This is a personal learning tool with no sensitive personal or financial data.
- [assumption] The existing AWS account has Bedrock access enabled in us-east-1 and Nova Lite model access is activated. If not, Bedrock access must be requested before deployment.
- [assumption] There is no change freeze or competing priority that would block development start.
