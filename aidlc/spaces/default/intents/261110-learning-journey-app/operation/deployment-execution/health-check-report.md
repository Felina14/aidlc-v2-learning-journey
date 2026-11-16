# Health Check Report — Learning Journey App

## Sources

- `deployment-log.md` and `smoke-test-results.md` in this folder
- `rollback-runbook.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/deployment-pipeline/rollback-runbook.md`
- The fourth unit's design and code: `rules.md` (BR33.3, BR33.4) — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u4-goals-and-style/functional-design/rules.md`; `backend/src/learning_journey/prompt.py`, `validation.py`, `generator.py`
- `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/build-and-test-summary.md` (the `Unverified` targets)

Checked on 2026-11-11 against the stack `LearningJourney` in the account ending 5285, us-east-1.

## Stack health

| Component | State |
|---|---|
| CloudFormation stack | `CREATE_COMPLETE`, 61 resources (deploy time 247 s) |
| CloudFront distribution | `Deployed`; domain `d3v7tl7b4jtner.cloudfront.net` |
| HTTP API | Answers all six routes with the designed status codes |
| Function `JourneyFunction` | Runs; no Lambda error alarm |
| DynamoDB table | Items stored with the designed attribute types; expiry on `expiresAt` enabled |
| Bedrock (Nova Lite) | Called successfully; no `BedrockError` |
| Alarms | 4 of 4 `OK` |
| Alert email | Subscription confirmed |
| Budgets | Created (daily 2 dollars, monthly 8 dollars) |

**Overall after the fix forward: healthy.** The first deploy (commit `c9bf90e`) had one functional defect: the planner style fell back to the template every time. It is fixed by commit `fac52c1`, deployed and tagged `deploy-20261111-2212`; smoke check 9 passes.

## Build and Test targets updated by this deploy

| Target | Before | After this stage |
|---|---|---|
| T-NFR6-SECRETS (secret scan) | Unverified | Still `Unverified`: nothing is pushed, so gitleaks has not run |
| T-NFR2 (timings) | Unverified | Single samples only: journey 10.9 s and 6.5 s (AI), 11.2 s (template after two invalid replies), page load 0.85 s, reload 0.8 s; the 95th-percentile measurement stays with Performance Validation |
| T-NFR4, T-NFR5-LIVE | Unverified | Unchanged; Performance Validation |
| T-NFR1-LH, T-NFR1-MAN, T-NFR8 | Unverified | Unchanged; the person |

## Fix forward (planner style), as applied

The person chose to apply this inside Deployment Execution as a fix forward under the rollback runbook, not as a reopened Code Generation (from here the workflow could only reopen it for every unit). They added a CSS-only layout polish to the same change so there is one redeploy.

| Item | What was done | Evidence |
|---|---|---|
| Planner prompt | A planner variant of the JSON shape in `prompt.py` carries `"hoursByKind": {"reading": 1, "exercises": 1, "miniProject": 0.5, "quiz": 0.5}` beside `"hours": 3`; guide and instructor shapes unchanged; `validation.py` and the 0.1 tolerance untouched | Tests first: the shape test failed (`KeyError: 'hoursByKind'`), then passed. Live: 3 of 3 planner journeys are AI with the split on every stage and sums equal to the hours |
| Problem name in the log | An invalid `ai_attempt` line now carries `problem`: the reply check's fixed name (for example `hours_by_kind`, `not_one_json_object`) or `truncated`; never reply or typed text; no `problem` on other outcomes | Tests first (failed with `[None, None]` and `KeyError: 'problem'`), then passed |
| Layout polish | `styles.css` only: 960px centred container with 24px gutters (header bar, main, footer), header bar on the surface colour with a divider, padded stage cards and summary block on the spacing tokens, a type scale from 0.875rem to 2rem, the primary button with the accent colours and 44px minimum; colour tokens unchanged; `main` no longer sticky (the progress summary still is) | New `layout.test.ts` (22 tests, 15 failed first); all accessibility tests (axe over 36 states, contrast, keyboard, structure) still pass. Not looked at in a real browser: the person's manual passes remain the visual check |
| Verification | The full verification command | 622 Python (99.78%) and 651 frontend (99.78%) tests pass; build, Ruff, Black, ESLint, Prettier clean |
| Commit and deploy | Commit **`fac52c1`**; `cdk diff` showed only the function code and the site files; `cdk deploy` `UPDATE_COMPLETE` in 50 s | `deployment-log.md` |
| Re-check | Smoke check 9 re-run; guide and instructor re-checked for regressions; alarms 4 of 4 `OK` | `smoke-test-results.md` |
| Tag | **`deploy-20261111-2212`** on `fac52c1`, local (no remote) | `git tag --list 'deploy-*'` |

The primary button's hover colour is now mixed from the accent and the text tokens (darker than the accent), so it is a derived shade rather than a new colour; its contrast with the white text is higher than before.

## Proposed fix forward (planner style), as first proposed

Reopen Code Generation for **u4-goals-and-style** with one change, test-first, keeping the 0.1 rule exactly as it is:

1. **Test first (red):** a prompt test that the planner prompt's JSON shape contains `hoursByKind` with all four kinds, and that the example's four numbers add up to the example's `hours`; and that the guide and instructor shapes do not contain `hoursByKind`. Today it fails.
2. **Fix (green):** in `backend/src/learning_journey/prompt.py`, use a planner variant of the JSON shape that adds `"hoursByKind": {"reading": 1, "exercises": 1, "miniProject": 0.5, "quiz": 0.5}` beside `"hours": 3`. Guide and instructor keep today's shape. Validation (`validation.py`) is not touched; `PLANNER_TOLERANCE_HOURS` stays 0.1.
3. **Small observability fix (recommended, same change):** make the invalid-reply log line carry the reply check's short problem name (one of a fixed set of words such as `hours_by_kind`, never reply text), so the next defect of this kind shows in the logs at once. A test checks the name is logged and no reply text is.
4. Re-run the full verification command, re-review the unit, then redeploy with the `cd-config.md` routine, re-run smoke check 9, and tag the deploy.

Evidence for the fix: the real prompt and check gave 9 of 9 invalid (`hoursByKind` missing in every stage); with the shape change they gave 9 of 9 valid (`smoke-test-results.md`).

Estimated impact: effort about an hour (one prompt change, two or three tests, a review, a redeploy); cost a few cents of model use for the re-check; risk low (the change affects only the planner prompt text and one log field; the stack and the data are untouched).

## Assumptions & Open Questions

- [assumption] The fix was applied inside Deployment Execution as a fix forward, with the person's go-ahead, then a second deploy (see "Fix forward, as applied").
- Open: the stack is left running for Observability Setup, Incident Response and Performance Validation, as agreed.
- Open: the repository has no remote, so the CI workflow (including the gitleaks secret scan) has still never run on GitHub; T-NFR6-SECRETS stays `Unverified`.
- Open: the layout change has not been seen in a real browser; the person's manual passes (Lighthouse, keyboard, VoiceOver, four browsers, zoom, 320 pixels, print) remain open.
- None otherwise.
