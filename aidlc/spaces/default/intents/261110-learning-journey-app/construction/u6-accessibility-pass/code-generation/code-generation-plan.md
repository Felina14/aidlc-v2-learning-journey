# Code Generation Plan — u6-accessibility-pass

## Summary

- Builds: the whole-flow accessibility verification and its fixes. New automated checks in the frontend test suite (axe over every screen and state, a contrast and target-size test read from `styles.css`, a keyboard and focus test, and a page-structure test), the removal of the placeholder accessibility job from the workflow, the two manual-pass files for the person to run, and the smallest fixes the checks justify. No feature, no backend change, no stack change.
- Touches: `frontend/tests/` (new `a11y-states.ts`, `a11y.test.ts`, `contrast.test.ts`, `keyboard.test.ts`, `structure.test.ts`), `frontend/package.json` and `package-lock.json` (one pinned development dependency, axe), `.github/workflows/ci.yml` (the placeholder job removed), and only where a check requires it `frontend/index.html`, `frontend/styles.css` and `frontend/src/`. Two new documents in this unit's code-generation folder: `manual-pass-scripts.md` and `accessibility-results.md`.
- Tests: about 60 new automated tests. Findings are fixed test-first. Bedrock is not involved; the existing fake `fetch` is reused; the 80% line-coverage floor is kept.

## Sources

- `functional-spec.md`, `rules.md`, `frontend-components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/` (rules BR50.1 to BR50.8)
- `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/infrastructure-design/`
- `accessibility-checklist.md`, `interaction-spec.md`, `mockups.md`, `design-system-mapping.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md` (US8.1 to US8.3)
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md` (U6: "no new features")
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1, NFR9)
- The built page and tests of the earlier units (`frontend/`), which U6 checks
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

How the ordering applies here: the team's tests-first areas (journey validation, progress maths, the nudge rule) do not occur in U6, which adds no rule of that kind. U6's own deliverable is tests, and each finding is fixed test-first under BR50.7: a failing test is written and seen failing, then the smallest fix makes it pass. The new check files are written before any fix, so a problem they find is seen failing first. The test runner (vitest with jsdom) already exists, so no runner bootstrap is needed; the exact commands are in `unit-test-instructions.md`.

## Layout

All work is inside folders the earlier units created. New files: five test files under `frontend/tests/` and two documents in this unit's code-generation folder. Everything else is an edit of an existing file, and only where a check requires it.

```
frontend/tests/                a11y-states.ts, a11y.test.ts, contrast.test.ts, keyboard.test.ts, structure.test.ts (new)
frontend/                      package.json, package-lock.json (one pinned dev dependency); index.html, styles.css, src/ (fixes only)
.github/workflows/ci.yml       the placeholder accessibility job removed
code-generation/ (this unit)   manual-pass-scripts.md, accessibility-results.md (new)
```

## Steps

- [x] **Step 1 — Baseline check.** Confirm the earlier units' commands run from a clean tree (`pytest backend/tests infra/tests -q`, and `npm test` in `frontend`) and record the starting numbers in `code-summary.md`. Stories: NFR9.
- [x] **Step 2 — Add axe and prove it runs.** Add the axe package as one pinned (exact version) development dependency of `frontend`, and prove with a first test that it runs under jsdom 31 and vitest 5 and that it reports a deliberately broken fragment (an unlabelled input in a test-local document) as a violation. Record the version, the rule tags and the disabled rules (`color-contrast`, `target-size`, and any other rule that needs layout) in `code-summary.md`. If axe cannot run under jsdom, stop here, record that, and fall back to the structure tests and the Lighthouse run only (functional spec, Workflow 1). Rules: BR50.1, BR50.8.
- [x] **Step 3 — Page-structure tests (red or green, recorded).** New `frontend/tests/structure.test.ts` over the built `index.html` and the rendered states: one `h1` per screen and no skipped heading levels; one each of header, main, footer; unique IDs; every `aria-*` reference points at an element that exists; exactly two live regions, both polite, and none assertive; every stage button carries `aria-expanded` that changes on open and close; the progress element has an accessible name and a value; every input has a label; the page language is declared. Run it and keep the output, including any failure (the dialog error line is expected to fail: it is `role="alert"`). Rules: BR50.1, BR50.5.
- [x] **Step 4 — Screen and state tests with axe (red or green, recorded).** New `frontend/tests/a11y-states.ts` (a helper that drives the controller with the fake `fetch` into each state in the scope table of the functional spec) and `frontend/tests/a11y.test.ts` (axe on each state; a critical, serious or moderate violation fails and names the rule, element and state). Run it and keep the output. Rules: BR50.1.
- [x] **Step 5 — Contrast, target-size and stylesheet tests (red or green, recorded).** New `frontend/tests/contrast.test.ts`: read the colour custom properties from `styles.css`, work out the WCAG contrast ratio for every pair in the functional spec's contrast table (4.5 to 1 for text, 3 to 1 for borders, the focus ring and the progress fill), check that the colour in `--focus-ring` equals `--color-accent`, check that a `prefers-reduced-motion` rule exists and that animations are 200 ms or less, and check that the declared size of every button, input, radio and link class is at least 44 by 44 pixels. Run it and keep the output. Rules: BR50.3.
- [x] **Step 6 — Keyboard and focus tests (red or green, recorded).** New `frontend/tests/keyboard.test.ts`: the skip link is the first focusable item and moves focus to the main region; a keyboard-event run through the main flow (topic, style, generate, open a stage, mark, unmark, goal form open, save, clear and Escape, banner dismiss, the completion view, "Back to my journey", cancel and confirm both dialogs); focus targets after each action as the interaction spec says; Escape and Cancel close a dialog and focus returns to the opener; the Details disclosure is a native control that reports expanded or collapsed. `showModal()` is stubbed as jsdom has none, so the focus trap and the inert page are left to the manual script. Run it and keep the output. Rules: BR50.4.
- [x] **Step 7 — Fix the findings, test-first.** For each critical, serious or moderate finding from steps 3 to 6, the failing test is already in the suite (keep its failing output in `accessibility-results.md`): make the smallest fix in `index.html`, `styles.css` or `src/`, and see the test pass. One fix is already known: the dialog error line changes from `role="alert"` to a polite status line (checklist R5). No fix may add an inline style, an inline script or an inline event handler (the stack's content security policy). A minor finding, or one that needs more than the smallest fix, is written into `accessibility-results.md` as an open item with the reason and is not changed. Rules: BR50.7, BR50.8.
- [x] **Step 8 — Workflow.** Edit `.github/workflows/ci.yml`: remove the placeholder accessibility job; confirm the frontend job's `vitest run --coverage` picks up the new files through its test glob and that no `needs` reference to the removed job remains; confirm `cdk synth` still builds. Rules: BR50.1, NFR9.
- [x] **Step 9 — Manual-pass files.** Write `manual-pass-scripts.md` in this unit's code-generation folder: numbered steps and an expected result per step for Lighthouse in Chrome (on the deployed site), the keyboard-only pass, the VoiceOver pass in Safari, the main flow in the latest two releases of Chrome, Firefox, Safari and Edge, 200% and 400% zoom, a 320-pixel window including the collapsed header and the "Set a goal date" path through Details, touch targets, the dialog focus trap and inert page, and the certificate print preview; each with a results table (Check, Method, Browser or reader, Date, Result as pass, fail or not run, Notes). Write `accessibility-results.md`: every checklist item, its method, its automated result from steps 3 to 7, and its manual result left as "not run" for the person; the findings with their fixes and open items; and a plain statement that AC8.2.4 and AC8.3.2 stay open until the person records a pass. Rules: BR50.6.
- [x] **Step 10 — Run everything, documentation and traceability.** Run the lint, format, coverage and build commands and keep the 80% floors; keep `unit-test-instructions.md` current; write `source-manifest.json`; fill `traceability.json` from the sensor with each AC8 row set to its test or document. Record in `code-summary.md` the starting and ending test numbers, the axe version and rules, every finding and its fix, every open item, and what was not run (Lighthouse, VoiceOver, browsers, zoom, print preview: all for the person).

## Story and rule traceability

| Plan step | Stories | Rules and requirements |
|---|---|---|
| 2, 4 | US8.3 (AC8.3.5), US8.2 (AC8.2.1) | BR50.1 |
| 3 | US8.2 (AC8.2.1, AC8.2.2, AC8.2.3) | BR50.1, BR50.5 |
| 5 | US8.3 (AC8.3.1, AC8.3.4) | BR50.3 |
| 6 | US8.1 (AC8.1.1 to AC8.1.3) | BR50.4 |
| 7 | US8.1 to US8.3 | BR50.7, BR50.8 |
| 8 | all | BR50.1, NFR9 |
| 9 | US8.2 (AC8.2.4), US8.3 (AC8.3.2, AC8.3.3) | BR50.2, BR50.6 |
| 10 | all | NFR9 |

## Assumptions & Open Questions

- [assumption] axe runs under jsdom 31 and vitest 5; step 2 proves it before anything depends on it, and the fallback is stated there.
- [assumption] The latest axe version that installs cleanly is pinned at step 2; no range is used.
- [assumption] The new tests may be red or green when first run: the dialog error line is expected to fail, and any other failure is a finding. Their first output is kept in `accessibility-results.md`.
- [assumption] Lighthouse, VoiceOver, the browser matrix, zoom and the print preview are run by the person; the build marks them "not run" and never as a pass.
- None otherwise.
