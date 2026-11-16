# External Dependency Map — Learning Journey App

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `unit-of-work-dependency.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-dependency.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- `bolt-plan.md` in this folder, and the planning answers Q5 and Q6 in `delivery-planning-questions.md`

A **Bolt** is one build pass over a piece of the work, ending in something that runs. This map lists what the build needs from outside itself, who owns each item, how long it takes, which Bolt it blocks and what to do if it slips. The build is otherwise fully contained: no other team, no outside approval and no data feed is involved.

## Items

| # | Item | Owner | Lead time | Blocks | Status | If it slips |
|---|---|---|---|---|---|---|
| E1 | Amazon Bedrock access to Amazon Nova Lite in us-east-1 | The builder (the AWS account) | Minutes to hours the first time | B1 (the AI call) | Resolved: a Nova Lite call from this account in us-east-1 succeeded on 10 November (open issue I-01 closed) | The template fallback still delivers a journey, so B1 can finish; the AI part waits |
| E2 | A new CloudFront site and API address becoming reachable after the first deploy | AWS | A few minutes | B1 (the demo) | Expected | Wait and retry; the deploy itself is complete |
| E3 | The email address for the budget alerts | The builder | Immediate | B1 (the alerts) | Open; passed as the deploy-time value `alertEmail` and never committed, because the repository is public | Deploy with the alert configured against a placeholder address and update it before the demo; the throttle still protects the address |
| E4 | The public GitHub repository and its first test workflow run | The builder (their GitHub account) | A few minutes | B1 onward (test runs on merge) | Open; the workflow file is written in this build, but creating the repository and the first run wait for the builder | Run the tests locally before merging; no AWS keys are stored in GitHub either way |
| E5 | Permission in the AWS account to create the stack's resources (API, functions, table, bucket, CloudFront distribution, budget) | The builder | Immediate | B1 | Assumed; the first deploy confirms it | Fix the missing permission in the account and redeploy |

## Items Mapped to Bolts

| Bolt | External items it needs |
|---|---|
| B1 | E1, E2, E3, E4, E5 |
| B2 | E4 (test runs on merge) |
| B3 | E4 |
| B4 | E1 (the style choice changes the AI request) , E4 |
| B5 | E4 |
| B6 | Real browsers and a screen reader on the builder's machine (not an outside party, but the builder's own tools) |

## What Is Not Needed

No other team, partner API, data availability window or approval lead time is involved. No custom domain, certificate or DNS change is required (the default CloudFront address is used).

## Assumptions & Open Questions

- [assumption] The AWS account already has the permissions needed to create the stack's resources; this is confirmed by the first deploy.
- [assumption] The builder will create the public GitHub repository before the first merge in B1.
- None otherwise.
