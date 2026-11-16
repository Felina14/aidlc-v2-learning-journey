# Code Generation Plan — u5-encouragement

## Summary

- Builds: milestone banners (first stage, halfway, complete) with a new `PUT /api/v1/journey/milestones` that records which were shown; the completion view with an optional certificate name (page memory only), a "Back to my journey" button and a print style; and the deadline nudge with its fixed messages and per-day dismissal in browser storage.
- Touches: `backend/src/learning_journey/` (validation, store, handler, models), `backend/tests/`, `frontend/src/` and `frontend/tests/` (new `milestones.ts`, `nudge.ts`, `certificate.ts` and their tests, plus api, state, render, app, types, goal), `frontend/index.html` and `styles.css`, `infra/stacks/journey_stack.py` and `infra/tests/`; no new folder and no existing project file of yours is changed.
- Tests: about 80 new automated tests; the nudge rule and the milestone and goal maths are written first; Bedrock faked, DynamoDB doubled, the 80% line-coverage floor kept.

## Sources

- `functional-spec.md`, `rules.md`, `entities.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/functional-design/` (rules BR40 to BR45)
- `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u5-encouragement/infrastructure-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 milestones call, C2 `milestonesShown`, C5 `markMilestoneShown`)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (Banner, CertificateView, focus and announcements)
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U5)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- The earlier units' built code (`backend/`, `frontend/`, `infra/`), which U5 extends
- Team memory: `aidlc/spaces/default/memory/team.md` and `project.md`

## Testing Contract

```json
{
  "version": 1,
  "methodology": "custom",
  "source": "team",
  "ordering": "We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: custom\n- **Ordering**: We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.\n- **Methodology evidence**: Affirmed in the interview (Q3): tests-first where the logic is pure and rule-heavy, tests-after elsewhere, which suits a solo build with an exploratory Bedrock prompt.\n- Coverage: 80% line-coverage floor for the feature scope, enforced in Build and Test; the existing suite stays green before merge.\n- Accessibility (WCAG 2.1 AA) is checked with automated tooling (axe or Lighthouse) plus a manual keyboard and screen-reader pass.\n- Bedrock is faked in automated tests so the suite is free and repeatable."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "custom",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Custom ordering - We write tests first for journey validation, progress maths and the nudge rule, and write tests after the code for everything else.",
      "Implementation and tests - preserve that exact ordering; do not convert it to layer-local TDD.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:83508bf7797609930ed065fdf8a24dca0473593b35c2e4130607f2a1200ed869",
  "contract_sha256": "sha256:e4d1d27cd9cc03b072521ce1cf273d75ff5e6869657632a873678b786f1f434c"
}
```

How the ordering applies here: the team writes tests first for progress maths and the nudge rule. In U5 that covers (1) the nudge rule (BR42.1: below 50%, goal date set, 0 to 3 days, the 3-of-6 boundary), the nudge message choice (BR42.2) and the blocked-word list over every message (BR43.1); and (2) the milestone maths (BR40.1, BR40.2: reached, newly reached, which one to show, the "lower than a shown one counts as shown" rule). Those tests are written first and seen failing before the code (steps 2 and 3). Everything else (the milestone route, the store update, the page, the certificate, the print style, the stack) is written first and tested after. The test runners already exist, so no runner bootstrap is needed; the exact commands are in `unit-test-instructions.md`.

## Layout

All work is inside folders the earlier units created. New files: `frontend/src/milestones.ts`, `frontend/src/nudge.ts`, `frontend/src/certificate.ts`, `frontend/tests/milestones.test.ts`, `frontend/tests/nudge.test.ts`, `frontend/tests/certificate.test.ts`. Everything else is an edit of an existing file. The three new modules do not import each other (BR45.1); only the banner area in the page is shared.

```
backend/src/learning_journey/   validation.py, store.py, handler.py, models.py (edited)
backend/tests/                  test_store.py, test_handler.py, test_validation (milestone name) (edited)
frontend/src/                   milestones.ts, nudge.ts, certificate.ts (new); api.ts, state.ts, render.ts, app.ts, types.ts, goal.ts (edited)
frontend/                       index.html, styles.css (edited; the print style lives in styles.css)
frontend/tests/                 milestones.test.ts, nudge.test.ts, certificate.test.ts (new); api, state, render, app tests (extended)
infra/stacks/journey_stack.py   route (edited)
infra/tests/test_stack.py       extended
```

## Steps

- [ ] **Step 1 — Baseline check.** Confirm the earlier units' commands run from a clean tree (`pytest backend/tests infra/tests -q`, and `npx vitest run` in `frontend`) before any change, and record the starting numbers in `code-summary.md`. Stories: NFR9.
- [ ] **Step 2 — Tests first: the nudge rule and its messages (red).** New `frontend/tests/nudge.test.ts` with an injected "today": the nudge applies for 1 of 5 done with 0, 1, 2 and 3 days left, and for 2 of 5 (40%); it does not apply for 3 of 5 (60%), for 3 of 6 (exactly 50%), with no goal date, with a passed goal date, with 4 or more days left, or for a complete journey; days are counted in whole local calendar days (also across a daylight-saving change); one fixed message exists for each of 0, 1, 2 and 3 days, naming the next stage by its number (the lowest-numbered stage not done) and the number of stages to go, and holding no title or other AI text; the blocked-word test goes over every possible nudge message for every days-remaining value and the largest stage numbers, normalises typographic apostrophes, matches "only N day" and "only N days" for any number, and does not match "template" or "later" for "late". Run it and keep the failing output. Rules: BR42.1, BR42.2, BR43.1.
- [ ] **Step 3 — Tests first: the milestone maths (red).** New `frontend/tests/milestones.test.ts`: reached for 1 of 5, 2 of 5, 3 of 5, 3 of 6 and all done (3 of 5 and 3 of 6 reach halfway, 2 of 5 does not); newly reached against a shown set where a milestone counts as shown when it is in the set or lower than one in the set; the highest newly reached one is chosen (complete over halfway over first-stage) and the lower new ones are returned as "record without showing"; the scenarios from the functional spec (first-stage never shown then 3 of 5 in one mark; complete recorded but halfway never recorded; unmark then mark again brings nothing back); the blocked-word test over every possible milestone message. Run it and keep the failing output. Rules: BR40.1, BR40.2, BR43.1.
- [ ] **Step 4 — Implementation: the first-tested rules (green).** New `frontend/src/nudge.ts` and `frontend/src/milestones.ts`: pure functions and fixed message sets, with no DOM, network or storage use, and no import of one from the other. The extended blocked-word list lives in one shared test helper (`frontend/tests/blocked-words.ts`), not in production code. Make steps 2 and 3 pass with the smallest code, then refactor while green. Rules: BR40.1, BR40.2, BR42.1, BR42.2, BR43.1, BR45.1.
- [ ] **Step 5 — Backend: validation, store and route.** Edit `validation.py` with a `check_milestone` (exactly one of first-stage, halfway, complete; other body keys ignored). Edit `store.py`: `save` omits `milestonesShown` when empty (it is never stored as an empty list); `load` reads a missing attribute, a set or an empty list as empty and returns the list sorted into first-stage, halfway, complete order; add `mark_milestone_shown(session_id, milestone)` as one conditional `update_item` (ADD the name to the string set, `lastActivityAt` and `expiresAt` moved in the same update, condition: the record exists and `expiresAt` is greater than now in whole epoch seconds, `ReturnValues` giving the set after the update; NOT_FOUND on a failed condition; SAVE_FAILED on any other store error or when the single 2-second total store limit passes); expose the C5 name `markMilestoneShown`. Edit `handler.py`: add `PUT /api/v1/journey/milestones` (session-ID check, body check, 200 `{"milestonesShown": [...]}` in the fixed order, or the C1 error shape), and make the load route and the create route answer `milestonesShown` as the sorted list. Rules: BR44.1.
- [ ] **Step 6 — Backend tests (after the code).** Extend `test_store.py` (add one name, repeat is a success and the set is unchanged but time and expiry move, an unknown name never reaches the store, NOT_FOUND for an absent or expired journey with nothing created, the set returned in the fixed order, the save omits the attribute, a load of a missing attribute, a set and an empty list, a replacement journey starts with none, a stubbed failure is SAVE_FAILED), the validation tests (each valid name, an unknown name, a non-string, a missing key, extra keys ignored) and `test_handler.py` (the route's status codes and body checks, 400 for a bad session ID, handler to store integration with the double, the load answer sorted, the request line carrying route, status and outcome and no name text). Standard strategy: 5 to 8 tests per component. Update any earlier test that expected a stored empty list.
- [ ] **Step 7 — Frontend: client and controller.** Edit `types.ts` and `api.ts`: `recordMilestone` (header, 10-second wait, one automatic retry on a network failure, result kinds: saved, not-found, invalid, failed, rate-limited). Edit `state.ts`: the `PageShownSet` (filled from the loaded journey, added to when a banner is shown, merged with every 200 answer, emptied and refilled when the journey on the page changes without a reload); the milestone flow after a confirmed mark only (never after an unmark and never on a plain load): work out the one to show, add everything newly reached to the shown set before any call, record the milestones one call each from lowest to highest, say nothing on any failure, drop a late answer for a journey no longer on the page; the `PageView` (completion or journey) with "Back to my journey" and the reset on any confirmed stage change, a reload and a new journey; the banner area state machine (milestone before nudge, the nudge waits and returns after the milestone is dismissed); nudge re-evaluation on a stage change, a goal change, load, the next local midnight and the tab becoming visible. Rules: BR40.2, BR40.3, BR41.1, BR43.2, BR44.2.
- [ ] **Step 8 — Frontend: nudge dismissal storage.** Add a storage helper to `frontend/src/nudge.ts` (kept separate from the rule functions): a dismissal marker under one fixed prefix with a key made from the goal date and the local date only; writing a marker removes markers for earlier days; all markers are removed when the journey is deleted or replaced; blocked storage falls back to page memory; no request is made. Rules: BR42.3, BR42.4.
- [ ] **Step 9 — Frontend: page.** Edit `render.ts`, `app.ts`, `certificate.ts`, `index.html` and `styles.css`: one banner area in a polite status region that never takes focus, with a hidden icon, real text and a keyboard-reachable Dismiss button, no red and no countdown; the completion view with an h1 "Journey complete" that receives focus on arrival, a labelled certificate panel (topic, today's date in the learner's local calendar in a plain long form, "5 stages" or "6 stages"), the field labelled "Name on certificate (optional, not saved)" held in page memory only, "Print or save certificate" (opens the browser print dialog), and "Back to my journey" (the journey view with the topic as its h1, no panel open, focus on that heading); the date updates at local midnight; the print style in `styles.css` shows only the certificate panel in black and white and hides the header, the goal line and the two journey controls. All text with `textContent`; targets at least 44 by 44 pixels; no colour-only status; works from 320 pixels wide. Rules: BR41.1 to BR41.3, BR43.2.
- [ ] **Step 10 — Frontend tests (after the code).** Extend the client, controller, render and app tests and add `certificate.test.ts` with vitest and jsdom: the milestone client (200, 400, 404, 500, 429 with and without a code, timeout, one retry); BR44.2 (the page says nothing and keeps the banner on 404, 400, 500 and 429); the controller (a banner after a mark, none after an unmark or a plain load, only the highest shown, lower ones recorded without being shown, two quick marks never show a banner twice, a failed recording never brings the banner back in the same visit, the shown set reset for a replacement journey, a late answer dropped); the view (completion on load and on the last mark, Back to my journey, an unmark returns the journey view at 80%, mark again returns the completion view and no second "complete" banner); the certificate (the name appears as plain text, `<script>` as text, no request and no storage write carries the name or the certificate); the nudge flow (banner, dismiss, no return on reload the same day, return the next day or with a changed goal date, blocked storage falls back to memory, cleanup on delete and replace, no request made); the banner state machine; the blocked-word test over every message string as shown on the page; the print style's presence in `styles.css`. 5 to 8 tests per module.
- [ ] **Step 11 — CDK stack.** Edit `infra/stacks/journey_stack.py` per the infrastructure specification: add the route `PUT /api/v1/journey/milestones` to the existing integration. No new metric filter, alarm, dashboard line, permission or resource; no reserved concurrency. Rules: NFR2, NFR10.
- [ ] **Step 12 — CDK tests (after the code).** Extend `infra/tests/test_stack.py`: the new route and method; the role's table actions still exactly GetItem, PutItem, UpdateItem and DeleteItem on the table ARN with no wildcard; the front door's `/api/*` allowed methods now asserted to include `PUT` (the existing assertion only checked GET and POST) and the session header still forwarded; the number of metric filters and alarms unchanged; no reserved concurrency. 5 to 8 tests.
- [ ] **Step 13 — Pipeline, documentation and traceability.** No workflow change is planned: confirm `.github/workflows/ci.yml` still runs the new tests in its Python and frontend jobs and that `cdk synth` still builds. Run the lint, format, coverage and build commands and keep the 80% floors. Inline docstrings on new public functions; `unit-test-instructions.md` kept current; `source-manifest.json`; `traceability.json` from the sensor with each AC and BR row set to its test or implementation file. Record in `code-summary.md` any test not run here and why (the live milestone calls, the print preview and the nudge on a real goal date need the person's AWS account and browser), the starting and ending test numbers, and what moto did or did not support.

## Story and rule traceability

| Plan step | Stories | Rules and requirements |
|---|---|---|
| 2, 4 | US6.1 | BR42.1, BR42.2, BR43.1 |
| 3, 4 | US5.1 | BR40.1, BR40.2, BR43.1 |
| 5, 6 | US5.1 | BR44.1 |
| 7, 10 | US5.1, US5.2 | BR40.2, BR40.3, BR41.1, BR43.2, BR44.2 |
| 8, 10 | US6.1 | BR42.3, BR42.4 |
| 9, 10 | US5.2 | BR41.1 to BR41.3, BR43.2 |
| 4, 9 | US5.1, US6.1 | BR45.1 |
| 11, 12 | US5.1 | NFR2, NFR10 |
| 13 | all | NFR9 |

## Assumptions & Open Questions

- [assumption] The nudge rule and the milestone maths live in two browser modules with no network, storage or page code, so they are written and tested first as the team practices require, and either can be cut without touching the other (BR45.1).
- [assumption] The exact milestone and nudge wording is written here within the functional design's constraints and is checked by the blocked-word test.
- [assumption] The pinned DynamoDB test double (moto) supports an ADD of one name to a string set with a condition and updated-value return; if it does not, that branch is tested with a stubbed client and confirmed by the deploy smoke checks.
- None otherwise.
