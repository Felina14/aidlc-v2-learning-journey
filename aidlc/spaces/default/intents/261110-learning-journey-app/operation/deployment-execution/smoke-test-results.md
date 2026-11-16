# Smoke Test Results — Learning Journey App

## Sources

- `deployment-strategy.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/deployment-strategy.md` (the 13 smoke checks and their order)
- Each unit's `cicd-pipeline.md` (the expected results) — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md` and the units after it
- `deployment-execution-questions.md` in this folder (Q3 A: every check that can be done without a browser; Q4 A: stop at the first failure and ask)
- `deployment-log.md` in this folder

Run on 2026-11-11 against the deployed stack `LearningJourney` (site `https://d3v7tl7b4jtner.cloudfront.net`), from the builder's machine with `curl` and the AWS command line, using made-up session IDs. No browser was used. About 12 journeys were created on the live stack (each one Nova Lite call, a few cents in total), plus 15 Nova Lite calls from the builder's machine for the planner investigation (below).

## Results

| # | Check | Result | Verdict |
|---|---|---|---|
| 1 | HTTPS home and HTTP redirect | `200 text/html` in 0.85 s; HTTP answers `301` to the HTTPS address; headers present: content security policy (`default-src 'self'`, no inline script), `strict-transport-security: max-age=31536000`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer`; page title "Learning Journey" | Pass (NFR6) |
| 2 | Alert email subscription confirmed | `PendingConfirmation` right after the deploy; confirmed by the end of the checks (the subscription now has its own identifier) | Pass |
| 3 | Create a journey and reload | `POST` answered `201` in 10.9 s with an AI journey of 6 stages (guide style); `GET` answered `200` in 0.8 s with the same journey | Pass (NFR2 within 20 s, NFR3) |
| 4 | Log line for the journey | `ai_attempt` (ok, Nova Lite), `journey_made` (source ai, style guide) and a `request` line (route, 201, total 8.5 s, an 8-character session prefix). The typed topic appears 0 times in the logs | Pass (NFR10) |
| 5 | Force the template fallback | Not run on purpose: no safe, designed way on the deployed stack. The template path did run for real during check 9 (planner), and the `JourneysTemplate` metric counted it | Not run (covered by check 9 and by the tests) |
| 6 | Mark, repeat, unmark | Mark 1 gives `[1]`; marking 1 again gives `[1]`; mark 3 gives `[1, 3]`; unmark 3 gives `[1]`; stage 9 answers `400 INVALID_REQUEST`. Two-tab behaviour needs a browser | Pass (API); two tabs not run |
| 7 | Daily cap of 5 | In one fresh session: five creates answered `201` (all AI); the sixth answered `429 DAILY_LIMIT`; the journey on file stayed the fifth | Pass |
| 8 | Delete, reload, create again | `DELETE` answered `204` twice; `GET` then answered `404 NOT_FOUND`; a second create the same day answered `201`; the `USAGE#2026-11-11` item reads 2 and expires 2026-11-13 00:00 UTC (one to two days after the date) | Pass |
| 9 | Goal date and one journey per style | Goal: set to two days ahead `200`; `2027-02-29` answers `400`; clear `200`. Instructor: AI journey of 6 stages, accepted by the server check that requires at least 2 exercises and 1 quiz item per stage. Unknown style answers `400`. **First deploy (`c9bf90e`): planner fell back to the template after two invalid AI replies.** After the fix forward (`fac52c1`): 3 of 3 planner journeys are AI, 6 stages, `hoursByKind` on every stage with sums equal to the hours; guide and instructor still AI, with at least 2 exercises and 2 quiz items per stage | **Pass after the fix forward** (failed on the first deploy) |
| 10 | Milestones and the stored set | `first-stage` then `halfway` answered the list in the fixed order; an unknown name answers `400`; a valid but unknown session answers `404`. In the table, `milestonesShown` is a string set and `completedStages` a number set; the table's expiry is on (`expiresAt`). Banners and the certificate need a browser | Pass (API); page not run |
| 11 | Nudge | Page only; needs a browser | Not run |
| 12 | Metrics and alarms | All four alarms `OK` (API 5xx, Lambda errors, template fallback, guard skipped). Last hour: `GuardSkipped` 0, `BedrockError` 0, `DailyLimitHit` 1 (check 7), `JourneysAi` 9, `JourneysTemplate` 1 (the planner journey) | Pass |
| 13 | Lighthouse, keyboard, VoiceOver, four browsers, zoom, 320 pixels, print | The person's own passes (`manual-pass-scripts.md` in the sixth unit's Code Generation folder) | Not run (the person) |

Also checked: an `X-Session-Id` that is not a UUID answers `400`.

## The planner failure (check 9)

| Step | Finding |
|---|---|
| Live log | Two `ai_attempt` lines with outcome `invalid`, then `journey_made` with source `template`. The log does not say which rule failed: the reply check produces a short problem name, but the generator does not log it |
| Probe on the builder's machine | The real planner prompt (`build_prompt(topic, "planner")`), the real client and the real reply check (`check_reply(text, "planner")`), 3 topics, 9 calls: **9 of 9 invalid with problem `hours_by_kind`**. In every reply, no stage carried `hoursByKind` at all; the word did not appear in the reply text. The 0.1 sum rule was never reached |
| Root cause | The planner instruction asks for `hoursByKind` in a sentence, but the prompt then says to reply "in exactly this shape and nothing else" and shows a JSON shape with no `hoursByKind`. Nova Lite follows the shape. The u4 tests fake the model, so they checked that the prompt mentions `hoursByKind`, not that a real model returns it |
| Candidate fix, tested | For the planner style only, add `hoursByKind` to the JSON shape with an example that adds up (`"hours": 3` with reading 1, exercises 1, miniProject 0.5, quiz 0.5). Same 3 topics, 9 calls: **9 of 9 valid** under the unchanged reply check, so the 0.1 sum rule held on every stage |
| Not changed | The 0.1 rule, the instructor and guide prompts, and the deployed stack. The probe scripts were scratch files inside the project and are deleted |

The proposed change is in `health-check-report.md`, "Proposed fix forward".

## Assumptions & Open Questions

- [assumption] Nine of nine is a small sample; it shows the missing field is systematic and that the fix works, not an exact success rate.
- Resolved: the fix forward was deployed at `fac52c1` (tag `deploy-20261111-2212`) and check 9 passes.
- None otherwise.
