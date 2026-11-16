## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T21:34:19Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | backend/src/learning_journey/store.py > set_stage_completion and _classify_failed_condition | A journey saved by the first unit before this change has no stageCount. The three-part condition then fails and the record is classed INVALID_REQUEST, so the page says "Your journey has changed. Reload" and Reload shows the same journey. Such a learner could never mark a stage. The rules do ask for exactly this (a record with no stageCount is INVALID_REQUEST), so it is a consequence of the design rather than a coding slip, and it only matters if records from the first unit exist in the deployed table. | Record in the code summary that the table must hold no first-unit journeys at deploy time (the build has a single personal environment and no data to keep), or accept that such a learner starts a new journey. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u2-progress/code-generation/code-summary.md > Test-first file (progress.test.ts) | The claim that progress.test.ts was red before progress.ts existed rests only on the summary's own statement. File times show frontend/src/progress.ts last written at 02:54:33 and frontend/tests/progress.test.ts last written at 03:00:43, so the later test write hides the order and the claim cannot be confirmed from the files. The final tests are sound: percent 20/40/60/80/100, hours 2+3+3+4+4 = 16, edge cases and panel rules all pass against the real code. | Keep the red-run output (command and result) beside the summary, or soften the wording to say the file was written first and edited afterwards. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider backend/tests infra/tests -q --cov=backend/src/learning_journey | 312 passed; total coverage 99.70% (floor 80% reached); store.py 99% (line 30, the default clock), models.py 98% (line 102, from_public_dict) | Passes. The store tests run against moto, and one test records that moto returns the old record on a failed condition (the typed form {"N": "5"} that _plain_number reads), so the classification is exercised on a real double as well as on stubs. No __pycache__ remains under backend or infra. |
| npx --prefix frontend vitest run --root frontend | 7 files, 121 tests passed (progress 16, state 31, render 25, app 12, api 21, validation 9, session 7) | Passes. |

### Checks made against the brief

- Atomic completion update: one update_item with ADD or DELETE on the number set {n}, lastActivityAt and expiresAt set in the same expression, condition attribute_exists(sessionId) AND expiresAt > :now (whole epoch seconds) AND stageCount >= :number, ReturnValues ALL_NEW and ReturnValuesOnConditionCheckFailure ALL_OLD. No read comes first. A failed condition is classed NOT_FOUND (no old record, or expiresAt <= now), INVALID_REQUEST (live record, stage above stageCount or no stageCount), otherwise SAVE_FAILED. Other client errors and timeouts are SAVE_FAILED. This matches BR11.1, BR11.2 and BR11.5.
- Save and load: save omits completedStages, stores stageCount and expiresAt, and sets empty progress. Load treats a missing attribute, a set and an empty list as empty, sorts the numbers, and returns nothing when expiresAt <= now (the opposite test to the update's, as BR12.1 asks). Tests cover the 89, 90 and 91 day boundary.
- Route form: the stage number must fully match [1-6]. That rules out signs, a leading zero, a decimal point, another script's digits, whitespace and a trailing newline, and the failure is raised before the body is read or the store is called. A path with extra segments is a 404 route error. Tests assert the store is not reached.
- Leaks: the PUT answer is only {"completedStages": [...]}. ALL_NEW attributes, including expiry, stay inside the store.
- Idempotency: ADD and DELETE on a set are idempotent, a repeat still moves both times, and a test covers two stores marking different stages. The disclosed ALL_NEW deviation is justified, since ALL_OLD-style returns would give nothing on a repeat.
- Maths: percent gives 0 only for none and 100 only for all, clamped to 1 to 99 otherwise. completeCount ignores numbers outside 1 to stageCount and duplicates. Hours are rounded once before writing, so no float tail shows. I found no failing edge case.
- Controller: only one change is in flight (saving guard in toggleStage and applyChange). Failure restores the list captured before the press, reopens the pressed panel, returns focus to its button and sets the matching message. Success takes the server list and moves open panel and focus only if the server's answer changes the choice. Messages for NOT_FOUND, INVALID_REQUEST, rate limit and save failure match BR13.1 to BR13.7. Disclosed deviations are acceptable: the load error reuses the first unit's message screen, and a code-less 429 shows the please-wait text with a Try again button, which suits an idempotent change.
- Untrusted text: render.ts sets every typed or AI-written string with textContent, and a render test uses hostile text.
- Ladder: each stage heading holds a button with aria-expanded and aria-controls, the panel is a labelled region, status is written in words, and the busy button keeps its label with aria-busy. Focus targets match the interaction spec (heading of the next stage, the Journey complete h1, the pressed button).
- CDK: a PUT route on the existing integration, UpdateItem added to the table-only statement, three filters in the existing namespace, no default value on CompletionTimeMs, no reserved concurrency, and a test that U2 adds no new resource type. These match monitoring-design.md. Nothing beyond the plan was found in the stack, and I found no secrets in backend, frontend or infra sources.
- Traceability: every OK target exists and carries tests for its ID. AC2.2.2 as N/A (delivered by the first unit) is accepted as intended.

### Summary

The completion path is correct as designed: one conditional set update, correct classification, strict route validation, no leaked internals, and a controller that keeps one change in flight and rolls back with the right focus. Both tool runs pass. The two Minor items are a deployment caveat for first-unit records and an unprovable test-first claim; neither blocks a developer or the learner path.
