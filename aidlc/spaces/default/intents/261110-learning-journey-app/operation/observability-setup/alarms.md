# Alarms — Learning Journey App

## Sources

- `observability-setup-questions.md` in this folder (Q2 A: no new alarm)
- Each unit's `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` and the units after it
- `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/rollback-runbook.md`
- The live stack, read on 2026-11-11 (`describe-alarms`, budgets as deployed)

## Alarms (unchanged by this stage)

All four alarms send to one SNS topic, whose only subscriber is the builder's email (confirmed after the first deploy). Each treats missing data as not breaching, so a quiet period reads as healthy. State on 2026-11-11: all `OK`.

| Alarm | Metric | Condition | Severity | First response |
|---|---|---|---|---|
| Lambda errors | Function `Errors` | 1 or more in 5 minutes | High | Saved query `server-errors`, then `failed-requests-by-outcome`; a crash is a bug: fix forward or redeploy the previous tag (`rollback-runbook.md`, Entry 2) |
| API server errors | API `5xx` | 1 or more in 5 minutes | High | Same queries; a handled store failure answers 500 without a Lambda error, so this alarm can fire alone |
| Template fallback | `JourneysTemplate` | 3 or more in 1 hour | Medium | Saved query `invalid-ai-replies-by-problem` and the Bedrock outcomes widget: `error` or `throttled` points at Bedrock, `invalid` with a problem name points at the prompt or the reply check |
| Guard skipped | `GuardSkipped` | 1 or more in 1 hour | Medium | Saved query `guard-skipped`; the daily cap is failing open, so check the table's permissions and the update expression |

## Spend alerts (unchanged)

| Budget | Limit | Sent to |
|---|---|---|
| Daily | 2 dollars actual | The same email |
| Monthly | 8 dollars actual | The same email |

The first response to a spend alert or to abuse is the concurrency brake (`rollback-runbook.md`, Entry 3).

## Not added, and why (Q2 A)

- No alarm on `BedrockInvalid`. At tens of users an invalid reply is rare, and a lasting failure is caught by the template-fallback alarm. The new dashboard widget and the saved query show the problem name as soon as that alarm fires. Adding the alarm would cost about 0.10 dollars a month and could be noisy for a one-off bad reply.

## Escalation

There is one person: the builder. Alarms and spend alerts go only to their email. No paging, no second contact, no on-call rota.

## Assumptions & Open Questions

- [assumption] The thresholds are the units' starting values and are not tuned now: the stack has had about an hour of traffic, too little to tune against.
- None otherwise.
