# Monitoring Design — u6-accessibility-pass

## Sources

- The earlier units' `monitoring-design.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/monitoring-design.md` and the four after it (their metrics, alarms, dashboard and log rules all stay in force)
- `infrastructure-specification.md` in this folder
- `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/functional-spec.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1, NFR4, NFR10)

U6 adds **no metric, no alarm and no dashboard line**. Accessibility is a property of the page that tests and manual passes check before release; the deployed system has nothing to watch for it, and the custom-metric count is already past the free allowance (NFR4). The page makes no new request, so the request line is unchanged.

## Metrics & KPIs

| Metric | How it is made | Threshold | Why it matters |
|---|---|---|---|
| Accessibility results | Not a runtime metric. The test suite (axe, contrast, keyboard, structure) runs on every merge; the manual passes are recorded in `accessibility-results.md` | The suite must pass; the manual results are read by the person | A regression is caught before deploy, not after. |

## Alerts

No change. The earlier alarms (Lambda errors, API 5xx, guard skipped, spend brake and the others) are unchanged and U6 adds none.

## SLIs / SLOs

No change.

## Logs & Tracing

No change. Retention stays 14 days. Nothing the learner types, no AI text and no certificate name is logged, and U6 sends no new data to the server.

## Dashboard

No change.

## Assumptions & Open Questions

- [assumption] No analytics or real-user monitoring is added to measure accessibility in use: it would collect behaviour data the project does not collect (NFR6), and there are only tens of users.
- None otherwise.
