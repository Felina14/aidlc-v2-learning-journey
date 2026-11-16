## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T18:04:50Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md > C1 `getJourney` responses, C5 `failure`, Errors table | Loading has no failure path. GET /journey lists only 200 and 404, the error enum has only SAVE_FAILED and DELETE_FAILED, and C5 says an unreachable store becomes one of those two. FR3.4 and NFR2 need an inline error with "Try again" when loading fails, and a 2-second store timeout on a load has no code to report. A load error would be reported as SAVE_FAILED, or as nothing. | Add a load-failure code (for example LOAD_FAILED) and a 500 response on GET /journey. Name it in C5 failure and the Errors table. Also add the 400 INVALID_REQUEST response that the notes promise for a bad X-Session-Id on GET and DELETE. | New |
| R-02 | Major | aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md > C5 `setStageCompletion`, `setGoalDate`, `markMilestoneShown`, `every_write` | Partial set-based writes are specified without saying what happens when no live journey exists. A partial update on a missing or expired-but-not-yet-removed record would either create a stub record or revive an expired journey, because every write extends expiry. Expiry is only stated for `load` (FR7.2 and FR3.5). The C1 404s on these endpoints have no matching C5 outcome. | State that each partial write only applies to an existing, unexpired journey and otherwise returns a not-found outcome (mapped to NOT_FOUND). Also state that writes never extend an already-expired journey. | New |
| R-03 | Major | aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md > C4 `release`; aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md > UsageCount | `release` is called "safe to repeat" and takes a `reservationId`. The UsageCount entity holds only `journeysCreated` per session and day, with no per-reservation record. A repeated or late release would decrement the counter twice and let a session exceed 5, which breaks the two-tab guarantee in FR8.2. | Say how a reservation is identified and consumed once (for example a reservation record, or a conditional decrement that cannot go below the reserved amount). Otherwise drop the "safe to repeat" claim and make the generator release at most once. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md > C1 Behaviour notes, C5 `time_allowed` | The browser gives up on POST /journey at 20 seconds, but the backend can still finish after that (15-second AI budget plus up to 2 seconds each for the reserve and save calls) and will have replaced the journey and used a slot. The "Try again" press then costs a second slot. The note says the first slot "has already been dealt with", which is not true in this case. | State the backend's worst-case total and keep it under the browser limit, or say that an abandoned create may still complete and that the web app should check GET /journey before offering another attempt. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md > C1 `createJourney` request `style` | FR1.3 says the learner must choose a style, but `style` is optional and defaults to guide. This is reasonable while U1 has no style choice, but the contract does not say the default is a U1-only stand-in. | Note that `style` is optional only until U4 and that omission means guide for old clients. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md > Open Questions | The questions table is honest about the guard store being unreachable, the cap day, the capped-learner template and the goal date range. It omits the unresolved load-failure behaviour (see the first finding) and says nothing about what happens to a stored journey when the cap is hit. FR8.2 says the existing journey stays usable, and the DAILY_LIMIT description does not state that. | Add a row for load failure with the unit it blocks (u1/u2). Add a sentence to the DAILY_LIMIT description that the existing journey is unchanged. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual structural check of the OpenAPI block | Every `$ref` resolves (SessionId, TeachingStyle, Milestone, Error, Journey, JourneyShape, Stage). `X-Session-Id` is defined once and used on all 6 operations. Required fields are declared. | Valid OpenAPI 3.0.3 in structure. Endpoints cover create, load, delete, set stage, set goal date and milestone shown, with the owning unit of each correct (u1, u1, u3, u2, u4, u5). |
| Consistency with the five answers | `/v1` prefix, one error shape, `/api/v1` relative address and a single synchronous create all match. The contract adds two error codes (DELETE_FAILED, INVALID_REQUEST) and flags them as assumptions. | Matches. |
| Journey shape and C3 and C4 against components.md | Stored-only fields (`sessionId`, `expiresAt`) are not sent. No personal fields. The refusal marker, 5 to 6 stages, 15-second budget, 5-second retry rule and no-retry refusal all match. | Matches, except the release idempotency gap above. |

### Summary

The document is complete and structurally sound, and it matches the five confirmed answers, but three behaviours need pinning down before the units build against it: the load-failure path, the effect of partial writes on a missing or expired journey, and the release idempotency of the usage guard.
