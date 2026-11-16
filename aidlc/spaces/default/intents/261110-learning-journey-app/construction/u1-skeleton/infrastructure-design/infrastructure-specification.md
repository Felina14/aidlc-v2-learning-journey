# Infrastructure Specification — u1-skeleton

## Sources

- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/functional-spec.md` (BR3 time budget, BR5 storage, BR7 stack protection)
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 same-site `/api/v1`, C3 Bedrock)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2 to NFR7, NFR11)
- Infrastructure answers Q1 to Q6 — `infrastructure-design-questions.md` in this folder
- `team.md` — `aidlc/spaces/default/memory/team.md` (one stack, us-east-1, `cdk destroy`, no AWS keys in GitHub)

This is a design: it names the resources and why. The CDK code itself is written in Code Generation. The NFR Design stage did not run for this unit, so the topology is derived from the requirements and the functional design, as the stage allows.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | Serverless: one Python 3.12 Lambda on arm64, 512 MB, 25-second timeout, handling every route [Q2] | Idle cost near zero (NFR4); the 25-second timeout leaves room for the 18-second request cap and the 2-second save (BR3, functional-spec step 12). |
| Ingress | One CloudFront distribution: default behaviour serves the site from S3; `/api/*` is forwarded to an API Gateway HTTP API [Q1] | Same site, so no cross-origin setup (C1); one HTTPS address. |
| HTTPS | CloudFront redirects HTTP to HTTPS and sends an HSTS header (365 days); default `*.cloudfront.net` address, no custom domain [assumption]. **Known limit:** the minimum viewer TLS version cannot be set above TLS 1.0 on CloudFront's default certificate, so a TLS 1.2 minimum needs a custom domain and certificate (out of scope for now); see the accepted risk under Assumptions & Open Questions | NFR6, BR7.4. |
| Throttle | HTTP API stage throttling: rate 5 requests a second, burst 10 [Q1] | The 11th request in the same instant gets 429 RATE_LIMITED (BR7.1, AC9.2.1, AC9.2.4). |
| Storage | One private S3 bucket for the site files, read through a CloudFront origin access control; one DynamoDB table [Q3] | No public bucket; nothing to misconfigure. |
| Networking | No VPC, no WAF, no NAT [assumption] | Each adds cost and nothing here needs it; the throttle and the daily cap (U3) are the abuse controls. |
| Environments | One: a single named stack in the builder's personal AWS account in us-east-1; no staging tier | Team practice. |
| IaC approach | One AWS CDK stack in Python, `Project` tag on every resource; `cdk deploy` from the builder's machine; the TypeScript frontend is built to a `frontend/dist` folder before the deploy, and the same deployment uploads that folder to the site bucket and then clears CloudFront's cache for the site files (the `/api/*` behaviour is never cached) [assumption] | NFR11; one tag makes orphan checks after `cdk destroy` simple (NFR5). |
| Teardown | `RemovalPolicy.DESTROY` on the table and the bucket; bucket auto-deletes its objects. Every log group the stack creates (the Lambda's, the API access log's, and those of the helper functions that empty the bucket and upload the site) is created explicitly in the stack with `RemovalPolicy.DESTROY` and a 14-day retention, so none is left behind by default. The CDK bootstrap stack and its asset bucket are outside this stack and stay; they hold no learner data and cost almost nothing | NFR5, BR7.3, AC9.3.1, AC9.3.2. The post-destroy check lists resources by the `Project` tag and also lists log groups by the stack's name prefix. |
| Resource sizing | Lambda 512 MB; table on-demand; CloudFront price class 100 | Tens of users (NFR4); no capacity to plan. |
| Spend brake | No reserved concurrency on the Lambda function. This account's Lambda concurrency limit is 10 in total (checked with get-account-settings) and AWS keeps 10 unreserved, so nothing can be reserved. The account limit of 10 is the effective ceiling, which matches the API burst of 10, so the API Gateway throttle is the only limiter a learner meets. If the account limit is raised later, reserved concurrency can be added as a stack setting | Caps simultaneous Bedrock calls whatever session IDs a caller invents, without refusing a legitimate burst. |
| Rollback | Redeploy the previous commit with `cdk deploy`; no blue-green or canary [assumption] | Single environment, demo scale. |
| Secrets | None exist in U1; settings are plain Lambda environment variables; the budget email is a CDK context value at deploy time and is never committed [assumption] | NFR6; public repository. |

### Timeout chain

| Layer | Limit | Note |
|---|---|---|
| AI clock (all attempts together) | 15 s | A retry starts only if 5 s remain (BR3.1). `BEDROCK_TIMEOUT` is set to 12 s per call so one call can never run past the clock by itself. |
| Request cap | 18 s | Applies to the save phase (functional-spec step 12). |
| Save | 2 s | One store call takes at most 2 s in total: one attempt, with the connect limit (1 s) and the read limit (1 s) adding up to 2 s. The 18 s cap is checked before the save; the AI work stops at 15 s, so the longest request is about 17 s, inside the cap. |
| Browser wait | 20 s | Leaves 2 s of margin after the 18 s cap for cold start and network. |
| Lambda timeout | 25 s | A safety net above the 18 s cap. |
| API Gateway HTTP API integration | 30 s | Maximum; above the Lambda timeout. |
| CloudFront origin response timeout | 30 s | Set explicitly on the API origin so it is never shorter than the Lambda. |

### Worst-case spend and the accepted risk

The daily cap of 5 journeys (U3) is per session, and the session ID is made in the browser, so it is a courtesy limit, not protection. The real limits are the throttle (rate 5, burst 10), the account's Lambda concurrency limit of 10 (no reserved concurrency is set; see the spend brake row), and the alerts. The account limit equals the API burst of 10, so the API Gateway throttle is the only limiter a learner can meet: a burst the front door admits always finds a free Lambda slot, and the learner never sees a Lambda refusal. A sustained attack holding 10 calls running all day would make roughly 48,000 model calls a day; at Nova Lite's small per-call cost that is in the order of thirty dollars a day (an estimate; use AWS's pricing tools for exact figures). That exceeds the NFR4 ceiling if it ran for a day or more. **Accepted risk**, for these reasons: the address is unpublished and the app is a demo for tens of users; the 2 dollars-a-day alert reaches the builder's email within hours; and the builder's manual brake is to set the function's reserved concurrency to 0 (one console action or one CLI command), which stops all Bedrock spend at once. A budget action that does this automatically is left out of U1 to keep the stack small and can be added later. Known limit: the throttle's sustained rate (5 a second) with calls of up to 18 seconds could in theory need more than 10 slots, so a sustained flood, not a learner burst, could still meet a Lambda refusal; it is shown to the learner as the generic failure and counts in the 5xx alarm, which is the wanted signal under abuse.

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Amazon CloudFront | cdn / entry point | Two origins (S3 via origin access control, API Gateway); HTTP to HTTPS redirect; response headers policy with a content security policy that blocks inline script, plus `X-Content-Type-Options` and `Referrer-Policy`; `/api/*` forwards all methods, no caching, passes the `X-Session-Id` header | The API behaviour must not cache and must forward the session header. |
| Amazon S3 | static site storage | Private; block all public access; encryption at rest; auto-delete on destroy | Holds the HTML, CSS and TypeScript build output. |
| API Gateway HTTP API | api gateway | Routes under `/api/v1/`; stage throttle rate 5, burst 10; Lambda proxy integration; access logs to CloudWatch | Throttled calls return 429, which the browser handles as RATE_LIMITED (BR7.1). |
| AWS Lambda | compute | Python 3.12, arm64, 512 MB, 25 s; environment: `TABLE_NAME`, `MODEL_ID`, `BEDROCK_TIMEOUT` settings; log retention 14 days | One function for all routes; modules for generator, store and guard. |
| Amazon DynamoDB | database | One table, on-demand billing; partition key `sessionId`, sort key `sk` (`JOURNEY` now, `USAGE#<date>` from U3); expiry attribute on `expiresAt`; point-in-time recovery off; encryption at rest (AWS-owned key) [Q3] | The 90-day expiry is also checked on read because deletion by the table can lag (components.md). |
| Amazon Bedrock | AI model | Nova Lite `amazon.nova-lite-v1:0` in us-east-1, set through `MODEL_ID` [Q6]; direct call verified from this account on 10 Nov, so issue I-01 is closed | See the permissions below. |
| IAM | permissions | One Lambda execution role: read and write on this one table only; `bedrock:InvokeModel` on the one model ARN and its inference profile only; write to its own log group [Q6] | No wildcards on actions or resources beyond those named (NFR6). |
| AWS Budgets and SNS | spend alerts | An alert at 2 dollars of actual spend in a day and one at 8 dollars in the month, emailed to the address passed at deploy time (BR7.2, AC9.1.1) | The email is a CDK context value, never in the repository. |

### Shared Infrastructure

U1 creates every shared resource; later units reuse it and add to it.

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| DynamoDB table | u1-skeleton | u2-progress, u3-protection, u4-goals-and-style, u5-encouragement | The Lambda role only; new record kinds use new sort-key prefixes, never a new table. |
| API Gateway HTTP API and its throttle | u1-skeleton | u2 to u5 (each adds routes under `/api/v1`) | Additive-only routes (C1). |
| CloudFront distribution and site bucket | u1-skeleton | u2 to u6 (more site files) | Private bucket behind the origin access control. |
| Lambda function and execution role | u1-skeleton | u2 to u5 | Permissions widen only by a named table action or model, reviewed at that unit. |

## Environment Layout

Single environment, so no dev or staging tier. The same stack can be destroyed and recreated at will; recreating takes one `cdk deploy`.

## Estimated Cost

| Item | Idle | Demo use (tens of users) |
|---|---|---|
| CloudFront, S3, API Gateway, Lambda, DynamoDB on-demand | Well under 0.10 dollars a day | A few cents |
| Bedrock Nova Lite | 0 | Cents for a journey of this size; capped later by the 5-a-day guard (U3) |
| CloudWatch (14-day logs, one dashboard, a few alarms) | About the cost of one dashboard a month | Same |

This stays inside NFR4 (under 10 dollars total). Exact figures come from AWS's own pricing tools and the budget alerts, not from this table.

## Assumptions & Open Questions

- [assumption] Cost figures are rough orders of magnitude, not a quote.
- **Accepted risk (TLS version):** with the default `*.cloudfront.net` certificate, CloudFront allows viewers down to TLS 1.0, so the earlier "minimum TLS 1.2" cannot be met without a custom domain and certificate. HTTP is redirected to HTTPS and HSTS is sent, so an ordinary browser always uses HTTPS and a current TLS version; only a deliberately outdated client could negotiate an old one. Accepted for the demo; revisit if a custom domain is added.
- [assumption] The HTTP API's 30-second integration limit is longer than the 25-second Lambda timeout, so a slow request ends in the Lambda first.
- None otherwise.
