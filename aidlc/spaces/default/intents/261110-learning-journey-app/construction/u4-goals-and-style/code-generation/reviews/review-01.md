## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T22:52:33Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | backend/src/learning_journey/validation.py > `_hours` and the new `_hours_by_kind` (the `math.isfinite` calls) | A model reply holding a very large whole number (for example a 400-digit integer in `hours` or in a `hoursByKind` value) makes `math.isfinite` raise OverflowError instead of the reply being judged invalid. I ran `check_reply` on both cases and both raised OverflowError. The generator then falls into its catch-all, frees the slot and answers SAVE_FAILED (500), so the learner gets an error instead of the retry and the template. A topic that tries to steer the model could trigger it. NaN, Infinity, `1e400`, booleans and text are rejected correctly. | Treat a number that cannot become a float as invalid: catch OverflowError (or check `abs(value) > MAX_HOURS` before `isfinite`) in both functions, and add a test with a huge integer for each. | New |
| R-02 | Minor | backend/src/learning_journey/config.py > `MAX_OUTPUT_TOKENS_LONG = 5000` (used by `bedrock_client.output_cap`) | The 5000 figure is unverified; the summary says it was recalled from memory. If the model's real maximum is lower, Bedrock rejects the call, which becomes a ModelError on both attempts and then the template. That fails safely (no 500, slot kept consistent), but every instructor and planner journey would silently become a template one, and the template-fallback alarm is the only signal. Separately, 5 to 6 stages with the extra instructor or planner content may often hit even a correct cap, which gives the same fallback through the truncation path. | Before the first deploy, check the figure against the Bedrock documentation for Nova Lite, and run one journey per style on the deployed stack as the summary already plans. Keep the constant in one place. | New |
| R-03 | Minor | frontend/index.html > `#journey-header`: the goal line (`#goal-text`, `#goal-button`) sits outside `#header-details`, and the pace (`#journey-pace`) sits inside it | The functional rules say that under 768 pixels the goal line goes inside the Details disclosure, and that the pace sits beside the goal line. The page does the reverse. The goal line stays visible, which is arguably better, but the pace is hidden whenever Details is collapsed on a narrow screen. This is not in the disclosed deviations. | Either move the pace beside the goal line, or record the layout as a deliberate change from the rules. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider backend/tests infra/tests -q --cov=backend/src/learning_journey` | 532 passed; total coverage 99.76% (missing: models.py line 109, store.py line 37); 80% floor met | Matches the summary. |
| `npx --prefix frontend vitest run --root frontend` | 9 files, 289 tests passed | Matches the summary (289). |
| Direct probes of `check_goal_date` and `check_style` | Real dates, leap day and null pass. 2026-02-30, 2026-02-29, 0000-01-01, a trailing newline or space, full-width digits, datetime strings, numbers and a missing key are refused. `Guide`, `planner ` (trailing space), None, lists, dicts, empty text, numbers and True are refused as styles. | The goal-date and style checks hold up (fullmatch with ASCII digits). |
| Direct probe of `check_reply` with huge integers | OverflowError for `hours` and for a `hoursByKind` value | Confirms the first finding. |

### Summary

The unit holds up under attack on its main requirements. The style is checked before any slot or model call and cannot reach the prompt. The goal update is a single conditional update with the right NOT_FOUND and SAVE_FAILED mapping. The date maths is calendar-only. The controller guards against overlapping goal changes and late answers. The CDK change is limited to the route and two metric filters. The three findings are Minor and do not block: a huge-integer reply gives a 500 instead of a template, the unverified 5000-token cap, and a header layout that differs from the rules.
