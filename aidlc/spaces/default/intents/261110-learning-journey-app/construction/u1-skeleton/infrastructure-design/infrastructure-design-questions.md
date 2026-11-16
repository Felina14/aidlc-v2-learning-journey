# Infrastructure Design — u1-skeleton — Questions

## Sources

- Unit: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U1, u1-skeleton)
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 same-site `/api/v1`, routing left to this stage; C3 Bedrock)
- Functional design: `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/functional-spec.md` and `rules.md` (BR3 time budget, BR5 storage, BR7 stack protection)
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2 to NFR7)
- Team practices: `aidlc/spaces/default/memory/team.md` and `project.md`

The big choices are already fixed by earlier stages: one CDK stack in Python in us-east-1, a single-page site on S3 behind CloudFront, Lambda in Python, DynamoDB, Amazon Nova Lite on Bedrock, GitHub Actions for tests, deploy from your machine with `cdk deploy`, and one `cdk destroy` to remove everything. These six questions are the places where a real choice is left. Everything else I could settle with a sensible default is listed under "Assumptions & Open Questions" at the end, for you to correct.

---

## Q1. [Deployment] How should the browser reach the backend at the relative address `/api/v1/...`?

The contract (C1) says the browser calls a relative address on the same site, and leaves the routing to this stage. The functional design needs a throttle that rejects the 11th request in the same instant and holds about 5 requests a second after that (BR7.1).

A. One CloudFront address for everything: `/api/*` is forwarded to an API Gateway HTTP API, which has stage-level throttling (rate 5, burst 10) and calls the Lambda (Recommended): same site, so no cross-origin setup; the throttle is built in and costs nothing extra; HTTP API is the cheaper kind.
B. Same CloudFront layout, but forward `/api/*` straight to a Lambda function URL: one less service, but a function URL has no built-in throttle, so the rate limit would have to be written in code and the 11th-request rule is harder to prove.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Deployment] How should the backend code be packaged into Lambda functions?

The unit has three routes (create, get, and later delete and progress routes arrive in U2 and U3) and all of them share the same journey store and data shape.

A. One Lambda function (Python, arm64) that handles every route, with the code split into modules for the generator, store and guard (Recommended): one place to deploy and log, fewer cold starts, and the later units add routes without adding new infrastructure; memory 512 MB and a 25-second timeout leave room for the 18-second request cap.
B. One Lambda function per route: each can be sized and permissioned on its own, but there are more resources, more cold starts, and a bigger CDK stack for a demo-sized app.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Services] How should the data be laid out in DynamoDB?

Two kinds of record exist across the units: the Journey (one per session, 90-day expiry) and the daily usage count (one per session and day, arrives in U3).

A. One table, on-demand billing, with the session ID as the partition key and a sort key that tells the record kind apart (for example `JOURNEY` and `USAGE#2026-11-10`), with the expiry attribute on, point-in-time recovery off, and the table removed on destroy (Recommended): one resource to create, grant and destroy; on-demand costs nothing when idle (NFR4); the journey and the count never need to be read together, so one table loses nothing.
B. Two tables, one for journeys and one for usage counts: simpler to read, but two tables to create, grant and destroy, and no benefit at this size.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Monitoring] How much monitoring and alerting should U1 set up?

NFR4 asks for spend alerts (2 dollars in a day, 8 dollars in the month, email passed at deploy time). Beyond that, you are the only operator and the audience is tens of users.

A. Spend alerts plus a small set of alarms to the same email: Lambda errors, API server errors (5xx), and a Bedrock "fell back to template" count, with Lambda and API logs kept for 14 days and one CloudWatch dashboard (Recommended): you hear about real breakage and about the AI quietly failing (which the template hides from the learner), and the cost stays well under a dollar.
B. Spend alerts only, with logs kept for 14 days: cheapest and simplest, but a broken Lambda or a Bedrock outage would go unnoticed because the template hides it from the learner.
C. A fuller set: A plus latency alarms, a canary that calls the API every 5 minutes, and X-Ray tracing: more visibility, but the canary and tracing add cost and moving parts that a tens-of-users demo does not need.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q5. [CI/CD] What should GitHub Actions run on every merge to `main`?

Deploys stay manual from your machine (`cdk deploy`) and no AWS keys are stored in GitHub, so the pipeline can only check, never deploy.

A. Lint and format checks (Ruff, Black, Prettier, ESLint), the Python and TypeScript tests with the 80% coverage floor, and `cdk synth` to prove the stack still builds (Recommended): catches broken code and a broken stack without needing any AWS access.
B. A plus `cdk-nag` security rules and a secret scan on each merge: stronger checks for a public repository, with a little more noise to fix at first.
C. Tests only: fastest, but a broken stack would only show at deploy time.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: X — A plus a secret scan (gitleaks) on every merge, because the repository is public; no cdk-nag for now to avoid rule churn before the deadline.

---

## Q6. [Services] How should the Lambda call Nova Lite, given that access in us-east-1 is still to be verified (issue I-01)?

The model name and region are fixed; what is open is how the call is addressed and permitted. Nova models are often called through a cross-region inference profile, which changes the permissions the Lambda needs.

A. Pass the model or inference-profile ID to the Lambda as a setting (default `amazon.nova-lite-v1:0`), and give the Lambda permission to invoke only that model and its inference profile, nothing else in Bedrock (Recommended): least privilege (NFR6), and if verification of I-01 shows the profile form is needed, only one setting changes and the stack is redeployed.
B. Hard-code the model ID in the code and allow `bedrock:InvokeModel` on all models: fewer settings, but wide permissions and a code change if the ID has to change.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A — note: a direct converse call with model ID amazon.nova-lite-v1:0 from this account in us-east-1 already succeeded on 10 Nov, so the default setting is verified and I-01 is closed.

---

## Assumptions & Open Questions

These are settled by default; tell me at the confirmation step if any is wrong.

- [assumption] The site bucket is private. CloudFront reads it through an origin access control, redirects HTTP to HTTPS, uses the default `*.cloudfront.net` address (no custom domain), and uses the cheapest price class. Security headers (including a content security policy that blocks inline script) are added by a CloudFront response headers policy.
- [assumption] No WAF and no VPC: both add cost and nothing here needs them. The Lambda runs outside a VPC, and the API throttle plus the daily cap are the abuse controls (the cap is a courtesy limit, as the domain design says).
- [assumption] The stack is a single CDK stack named for the project, with a `Project` tag on every resource. The bucket and the table use `RemovalPolicy.DESTROY`, and the bucket empties itself on destroy.
- [assumption] The Lambda uses Python 3.12 on arm64 with one execution role that can read and write this one table, invoke the one model, and write its own logs.
- [assumption] The budget alert email is passed as a CDK context value at deploy time and is never written to the repository.
- [assumption] No secrets exist in U1. There is nothing to put in Secrets Manager or Parameter Store; settings (table name, model ID) are plain Lambda environment variables.
- [assumption] The site files are uploaded by the CDK deployment itself, so there is no separate frontend deploy step in U1.
- [assumption] Rollback is "redeploy the previous commit with `cdk deploy`"; there is no blue-green or canary release for a single-environment demo.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
