# Cost Analysis — Learning Journey App

## Sources

- `feedback-optimization-questions.md` in this folder (Q2 A: no change now; Q3 A: no Trusted Advisor, Compute Optimizer or Cost Optimization Hub)
- `test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/performance-validation/test-results.md` (§2, cost reading and idle estimate)
- `alarms.md` and `dashboards.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/`
- Each unit's `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the units after it
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR4)

## What was spent

| Reading | Value |
|---|---|
| Cost Explorer, daily, 2026-11-01 to 2026-11-11 (one call, 1 cent) | 0.00 dollars every day, all marked estimated |
| Budgets | Daily 2 dollars and monthly 8 dollars, neither alerted |

Cost data arrives with a delay of up to a day, so today's activity (about 85 Nova Lite calls, three deploys, two destroys) is not shown yet. Nova Lite calls are a fraction of a cent each.

## What bills while idle

| Item | Why it bills | Rough size |
|---|---|---|
| 14 custom metrics from log metric filters | CloudWatch charges per custom metric beyond the free 10 | The largest idle item, a few cents a day at most |
| 4 alarms | Free within CloudWatch's alarm allowance; billed beyond it | Under a cent a day |
| 1 dashboard | Free within the dashboard allowance | 0 |
| S3, DynamoDB, CloudWatch Logs storage | A few kilobytes | 0 in practice |
| Lambda, API Gateway, CloudFront, Bedrock | Pay per request only | 0 while idle |
| `CDKToolkit` bootstrap | An empty image repository and a small staging bucket | 0 in practice |

Overall the idle cost is expected to be well under NFR4's 0.10 dollars a day. These are rough figures; the AWS pricing pages and Cost Explorer are the authority, and the 24-hour idle reading is a follow-up for the person.

## Optimisation proposals (next cycle, not done now)

| # | Proposal | Saving or benefit | Effort | Risk |
|---|---|---|---|---|
| C-1 | Remove the five `Bedrock*` metric filters and the Bedrock outcomes widget; the saved queries already answer the same question | About a third of the custom-metric cost | Small: one stack change, a test, a deploy | Low: less at a glance on the dashboard |
| C-2 | After the demo, `cdk destroy` plus the post-destroy cleanup, then delete `CDKToolkit` (empty its staging bucket first) to leave the account as found | All remaining cost goes to zero | Small | None, once the demo is over |
| C-3 | Shorter log retention (7 days instead of 14) | Negligible at this volume | Small | Less history for incidents |

## AWS recommendation tools (Q3 A)

Not used: Trusted Advisor's API needs a Business support plan, and Compute Optimizer and Cost Optimization Hub need opting in plus usage history, so they would report nothing before the deadline. The core Trusted Advisor checks worth a minute in the console: MFA on the root account, IAM use, S3 bucket permissions, security groups with open ports (none in this stack), and service limits.

## Assumptions & Open Questions

- [assumption] The "free allowance" figures depend on what else runs in the account (the account has other budgets, so other projects may use part of the allowance).
- None otherwise.
