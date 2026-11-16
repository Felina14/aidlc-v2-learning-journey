# Feedback Loop — Learning Journey App

## Sources

- `feedback-optimization-questions.md` in this folder (Q4 A, with the person's additions: a favicon and the manual accessibility passes in "before the demo")
- `slo-report.md`, `cost-analysis.md` and `drift-report.md` in this folder
- `nfr-validation-matrix.md` and `test-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/performance-validation/`
- `incident-plan.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/operation/incident-response/incident-plan.md` (the planner incident review)
- `phase-check-construction.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/verification/phase-check-construction.md`
- `manual-pass-scripts.md` and `accessibility-results.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/code-generation/`
- `build-and-test-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/build-and-test/build-and-test-summary.md`

The live system: commit `2b393e2`, tag `deploy-20261111-2323`, site `https://d287qizl0f6l3h.cloudfront.net`. Deadline 14 November 2026. No new piece of work is started here (Q4 A).

## Before the demo (owner: the builder)

| # | Follow-up | Why | Closed when |
|---|---|---|---|
| D-1 | Confirm the new alarm email subscription | It is `PendingConfirmation` after the redeploy; until then no alarm or spend alert reaches you | `list-subscriptions-by-topic` shows an identifier instead of `PendingConfirmation` |
| D-2 | Run the manual accessibility passes in `manual-pass-scripts.md`: Lighthouse (now including its performance score, for NFR2's browser part), keyboard, VoiceOver in Safari, the four browsers, 200% and 400% zoom, 320 pixels, dialog focus trap, certificate print preview | AC8.2.4, AC8.3.2 and AC8.3.3 are open until a person records them; the layout polish has not been seen in a real browser | Each row in the script's results table is pass, fail (with a fix) or not run with the reason |
| D-3 | Add a favicon | The live site answers `403` for `/favicon.ico` (checked 2026-11-11), so every browser visit logs a failed request | A small `favicon.ico` in `frontend/`, copied into the build and linked from `index.html`; a build test checks it is present; deployed; `/favicon.ico` answers `200` |
| D-4 | Push to GitHub and let CI run | The CI workflow, including the gitleaks secret scan, has never run; T-NFR6-SECRETS is still `Unverified` | All five checks green on GitHub for the deployed commit |
| D-5 | Switch on branch protection for `main` | The five checks report but do not block a merge | The rule in `ci-config.md` is set |
| D-6 | Read the 24-hour idle cost | NFR4's idle day is `Unverified` | Cost Explorer (daily) shows a full idle day under 0.10 dollars |
| D-7 | Note the new site address wherever the demo is shared | The old address stopped working with the teardown check | — |

The repository is on a branch called `master` and has no remote yet; D-4 needs one to be created first.

## Next cycle (owner: a next AI-DLC cycle, if there is one)

| # | Proposal | Evidence | Effort and risk |
|---|---|---|---|
| N-1 | Teardown with no orphans: give the two CDK helper functions roles that can write to their own log group but cannot create one | Two destroys left empty log groups recreated by late log delivery (`test-results.md` §3); NFR5 is `Not Met as worded` | Medium effort (overriding CDK's helper roles); medium risk (proved only by another destroy) |
| N-2 | A real throttle for bursts, if abuse matters: a per-route limit or AWS WAF rate-based rule in front of CloudFront | A burst of 30 reads was not throttled (best-effort HTTP API throttling) | Medium effort; WAF adds a monthly charge |
| N-3 | Clear the drift false positive on the API stage's access-log ARN | `drift-report.md` | Small, low |
| N-4 | Cost: drop the five `Bedrock*` metric filters (C-1) | `cost-analysis.md` | Small, low |
| N-5 | A real-model check of every teaching style in CI or before each deploy | The planner defect passed every automated test because the model is faked (team rule); found only by smoke check 9 | Small: a manual script already exists as smoke check 9; automating it needs AWS access in CI, which the team rules forbid, so it stays a deploy-time step |
| N-6 | Node version: run the CDK on a supported Node release (22 or 24) | Every CDK command warned that Node 25 is untested | Small, low |
| N-7 | The daily limit is per session, not per person: a new session ID gets a new allowance | Noted in `nfr-validation-matrix.md` | A design question for a next cycle (accounts or IP-based limits); not a defect |
| N-8 | User feedback: once real learners use it, read `journeys-by-source-and-style`, daily-limit hits and return visits weekly, and ask a few learners what they used | There are no real users yet | — |

## Learnings carried forward

- A field the model must return has to be in the JSON shape the prompt says to follow "exactly", not only in a sentence (the planner incident).
- An invalid reply's reason belongs in the log line; without it, finding the planner defect needed a local probe.
- A first deploy of a stack whose helpers log during deletion should expect late-recreated log groups at `cdk destroy`; check for them.

## Assumptions & Open Questions

- [assumption] The builder owns everything in "before the demo"; nothing there is done by this workflow after its approval.
- None otherwise.
