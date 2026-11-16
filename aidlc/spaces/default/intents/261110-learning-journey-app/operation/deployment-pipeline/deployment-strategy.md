# Deployment Strategy — Learning Journey App

## Sources

- `deployment-pipeline-questions.md` and `cd-config.md` in this folder
- Each unit's `cicd-pipeline.md` (smoke checks) — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md` and the units u2 to u6 after it
- `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/` (the seven `Unverified` targets that need a deployed stack)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5, NFR6, NFR10)

## Strategy

An **all-at-once update of the one stack** through CloudFormation (`cdk deploy`). There is no blue-green, canary or rolling release: the system is one function, one table, one API and one site in one environment, with tens of users and a fixed demo window, and CloudFormation replaces the function code in a single step. A traffic-shifting strategy would add resources (an alias and a deployment group) for no benefit at this size.

| Question | Answer |
|---|---|
| Environments | One. No promotion between environments |
| Promotion gate | The CI result for the commit and the pre-deploy checklist in `cd-config.md` |
| Approval | The builder, reading `cdk diff` and answering the CDK's approval prompt |
| Strategy | All-at-once CloudFormation update |
| Failed update | CloudFormation rolls the stack back by itself |
| Succeeds but wrong | `rollback-runbook.md` (redeploy the previous good commit; the concurrency brake for cost or abuse) |
| Feature flags | None |
| Database changes | None are made by a deploy. No unit changed stored data in an incompatible way (the known limit is in the rollback runbook) |

## Smoke checks after a deploy

Run in this order on a deployed site, using a fresh browser session for each group so the daily limit of five journeys is not used up (journeys count against it). The detail and expected result of each is in the unit's `cicd-pipeline.md`; this list is the order to run them in.

| # | Check | Expected | Source |
|---|---|---|---|
| 1 | Open the CloudFront address, and the HTTP form of it | The home screen loads over HTTPS; HTTP redirects to HTTPS (NFR6) | u1 |
| 2 | Click the AWS confirmation email link | The alarm and budget subscription is confirmed | u1 |
| 3 | Create a journey for an ordinary topic, then reload | An AI journey or a labelled template; the same journey after the reload (NFR3) | u1 |
| 4 | Look in CloudWatch Logs for the `journey` entry | One entry marked `ai` or `template` and no typed text (NFR10) | u1, u3 |
| 5 | Force the template fallback: create a journey while the model call fails (for example with the model id temporarily wrong in a throwaway stack, or by the documented test hook if the units added one) | A labelled template journey; one `template` log entry. If no safe way exists on the deployed stack, record this check as not run | u1 |
| 6 | Mark and unmark a stage; open two tabs and mark in both | The progress changes, nothing is lost; repeating a mark is the same as once | u2 |
| 7 | Create five journeys, then a sixth, in one fresh session | The sixth answers the plain daily-limit message and the current journey is unchanged | u3 |
| 8 | Delete a journey, reload, and create another the same day | The home screen shows after delete; the count item reads 2 | u3 |
| 9 | Set, change and clear a goal date; create one journey per teaching style | The goal line and pace are right; each style produces its shape (hours breakdown for the planner) | u4 |
| 10 | Mark the first, halfway and last stages; type a name on the certificate and reload | The milestone banners appear once each; the name is gone after the reload; the table holds `milestonesShown` | u5 |
| 11 | With a goal date 2 days away and under half done | A nudge appears and stays dismissed on reload | u5 |
| 12 | Look at the `GuardSkipped` and 5xx metrics and the alarms | `GuardSkipped` is 0; no alarm in alarm state | u3, u5 |
| 13 | Run the Lighthouse, keyboard, VoiceOver, four-browser, zoom, 320-pixel and print-preview scripts | Recorded in `manual-pass-scripts.md` as pass, fail or not run | u6 |

Checks 1 to 12 belong to Deployment Execution (after Environment Provisioning, with your go-ahead). Check 13 is yours and is the only way AC8.2.4, AC8.3.2 and AC8.3.3 close. Real timings (NFR2), spend (NFR4) and the `cdk destroy` check (NFR5) belong to Performance Validation, last.

## When to stop a deploy

Stop and use `rollback-runbook.md` if, after a deploy, any of: the home screen does not load over HTTPS; creating a journey fails and no template is returned; an alarm is in alarm state; the spend alert fires; any check above gives a result the unit's document calls a failure.

## Assumptions & Open Questions

- [assumption] Check 5 (forcing the template fallback) has no safe, designed way on the deployed stack; if it cannot be done safely it is recorded as not run, and the template path stays proven by the tests only.
- [assumption] The numbers of journeys the checks create (about 12 over a few sessions) cost a few cents of model use in total.
- None otherwise.
