## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T22:07:38Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | frontend/src/state.ts > backToJourney, enter, confirmReplace; frontend/src/render.ts > renderState (back button visibility) | On the topic screen reached through Start a new journey, the Back to my journey button stays visible and enabled while a create request is still running (it is shown whenever replacing is true and is only marked busy by its own load). backToJourney has no check for the generating phase, and the enter call it makes resets the phase to idle. Two things follow from the code: (1) when the pending create finishes, show replaces the page with the new journey without the learner asking; (2) after Back, Start a new journey, Replace, the Generate button is enabled again, so a second POST can run beside the first and take a second daily slot. No test covers Back, or a second submit, while a create is pending (searched frontend/tests for backToJourney and back-button: only the idle, gone and failed cases). | Ignore Back while the phase is generating, or hide or disable it for that time, so the learner cannot leave an in-flight create. Add a state test for Back during generating, and one showing a second create cannot start while the first is pending. | New |
| R-02 | Minor | frontend/src/state.ts > applyChange (late result), confirmDelete | A stage-change request that was already running when the delete dialog opened still writes its result into the state after the delete has finished: the update sets journey back to a non-null value on the home screen. The home screen then treats a deleted journey as still there, for example the daily-limit text would say that the current journey is still available, and the retry old-journey check compares against it. The dialog is modal, so the window is narrow. | When a delete succeeds, or a completion result arrives for a journey that is no longer the current one, drop that result. Add a test that resolves a pending completion after a confirmed delete. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u3-protection/code-generation/traceability.json > BR21.2 target | BR21.2 (telling DAILY_LIMIT from RATE_LIMITED by code) is delivered in frontend/src/api.ts and tested in frontend/tests/api.test.ts (line 57), but the OK target names only frontend/tests/render.test.ts, which checks the message text. The target file exists and covers the wording half only. | Name api.test.ts as well, or move the entry to it. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider backend/tests infra/tests -q --cov=backend/src/learning_journey | 358 passed; total coverage 99.73% (usage_guard 100%, handler 100%, generator 100%, store 99% with line 37 missing); the 80% floor is met | PASS. No __pycache__ folder was left under backend or infra. |
| npx --prefix frontend vitest run --root frontend | 8 files, 175 tests passed | PASS |

### Summary

I tried to refute the backend and the CDK changes and could not. Reserve is a single conditional update using if_not_exists, with the condition "absent or below the cap" and expiresAt set only when absent. The reservation id is built server-side from a UUID-checked session ID and the server's UTC date, and no request field reaches it. Release is a conditional decrement whose failed condition is swallowed and which runs at most once per request. A store error or a slow reserve gives granted with no id and one guard_skipped line carrying only a short session prefix and an error class. Delete touches only the JOURNEY key, answers 204 when nothing is there, and maps failures to DELETE_FAILED. The DAILY_LIMIT path makes no model call and leaves the existing journey in place. The stack adds the DELETE route, exactly four table actions, the two default-0 metric filters and the alarm, with no reserved concurrency. All text goes through textContent and no innerHTML use was found. The three disclosed deviations are acceptable: the slow-reserve rule is stated in BR20.3, the extra guard_release lines feed no metric, and the jsdom stand-in is paired with tests that check showModal was called. The one real gap is the in-flight create on the Back path, which a small guard fixes. The verdict follows the rule of zero Critical and at most two Major findings.
