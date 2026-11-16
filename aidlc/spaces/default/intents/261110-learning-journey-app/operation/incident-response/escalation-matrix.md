# Escalation Matrix — Learning Journey App

## Sources

- `incident-response-questions.md` in this folder (summary confirmed "Looks correct": escalation is to the builder only, AWS Support for an AWS service failure)
- `incident-plan.md` and `runbooks.md` in this folder
- `alarms.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/observability-setup/alarms.md`
- `team.md` — `aidlc/spaces/default/memory/team.md` (a solo builder makes every decision)

## Contacts

| Role | Who | How they are reached | Notes |
|---|---|---|---|
| Owner and responder | The builder | The alarm and budget email (the address given at deploy time; it is not recorded in the repository) | The only person; no on-call rota, no deputy, no paging |
| AWS service failures | AWS Support, basic plan | The AWS console: Support Center, and the AWS Health Dashboard | The basic plan has no technical support cases; it covers account and billing questions and service health information |

## Who acts, by severity

| Severity | First responder | Escalate to | When |
|---|---|---|---|
| P1 | The builder | AWS Health Dashboard (and Support Center for account or billing problems) | When the runbook points at an AWS service and the dashboard confirms an event |
| P2 | The builder | Same | Same |
| P3 | The builder | None | Note it; act when convenient |

## By trigger

| Trigger | Severity | Runbook | Escalation |
|---|---|---|---|
| Template fallback alarm | P3, or P2 if lasting | RB-01, RB-02 | AWS Health Dashboard if Bedrock shows an event |
| Lambda errors or API server errors alarm | P2, or P1 if everything fails | RB-04, RB-03, RB-05 | AWS Health Dashboard if DynamoDB or Lambda shows an event |
| Guard skipped alarm | P3, or P2 with spend rising | RB-06 | None |
| Daily or monthly budget email | P2 | RB-07 | Support Center for a billing question |
| Site not loading | P1 | RB-08, RB-03 | AWS Health Dashboard if CloudFront shows an event |
| Alerts not arriving | P3 | RB-09 | None |

## Assumptions & Open Questions

- [assumption] The builder accepts being the only contact for the demo period; if anyone else is to be told about an outage, they would be added here by name and channel.
- None otherwise.
