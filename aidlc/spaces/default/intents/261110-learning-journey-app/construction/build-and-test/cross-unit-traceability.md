# Cross-Unit Traceability — Learning Journey App

## Sources

- `aidlc engine sensor-traceability --stage build-and-test` (run 2026-11-11): 121 requirement and criterion IDs traced, 112 covered
- Each unit's `traceability.json` and `source-manifest.json` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/` and the five units after it
- `requirements.md` and `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/`
- `build-and-test-summary.md` in this folder (the Target Verification Matrix)

## Verdict

**FAIL** (the sensor reports `pass: false`). Nine IDs are uncovered: three acceptance criteria that need a person, and six requirements. None is a gap in code; each is explained below and is surfaced at the approval gate.

## Uncovered IDs

| ID | Why uncovered | Owning stage / Unit | Target |
|---|---|---|---|
| AC8.2.4 | A manual screen-reader pass cannot be run by the build; it is `Deferred` in the sixth unit | u6-accessibility-pass; the person | `manual-pass-scripts.md` (script 3) |
| AC8.3.2 | The four-browser run needs real browsers; `Deferred` in the sixth unit | u6-accessibility-pass; the person | `manual-pass-scripts.md` (script 4) |
| AC8.3.3 | Zoom and the 320-pixel window need a real browser; `Deferred` in the sixth unit | u6-accessibility-pass; the person | `manual-pass-scripts.md` (scripts 5 and 6) |
| NFR1 | Open through AC8.2.4, AC8.3.2 and AC8.3.3 (its other nine criteria are covered) | u6-accessibility-pass | as above |
| NFR8 | Open through AC8.3.2 and AC8.3.3 | u6-accessibility-pass | as above |
| NFR4 | Cost cannot be measured before a deployment; no acceptance criterion traces to it | Performance Validation (later) | `build-and-test-summary.md` T-NFR4 |
| NFR9 | A project quality gate with no acceptance criterion; verified directly in the matrix | build-and-test | T-COV-PY, T-COV-FE, T-ORDER (all Met) |
| NFR10 | An observability requirement with no acceptance criterion; verified directly in the matrix | build-and-test | T-NFR10 (Met) |
| NFR11 | A deployment-model requirement with no acceptance criterion; verified directly in the matrix | build-and-test | T-NFR11 (Met) |

## Covered by area

| Requirement group | IDs | Built in | Covered by |
|---|---|---|---|
| Generate a journey (FR1.x, AC1.x) | FR1.1 to FR1.7; AC1.1.1 to AC1.5.3 | u1-skeleton, u4-goals-and-style | `validation.test.ts`, `app.test.ts`, `render.test.ts`, `test_generator.py`, `test_template.py`, `test_reply_validation.py`, `test_prompt_and_client.py`, `test_stack.py` |
| Reading and structure (FR2.x, AC2.x) | FR2.1 to FR2.5; AC2.1.1 to AC2.3.2 | u1-skeleton, u2-progress | `render.test.ts`, `progress.test.ts`, `styles.css` |
| Marking and progress (FR3.x, AC3.x) | FR3.1 to FR3.5; AC3.1.1 to AC3.3.3 | u2-progress | `progress.test.ts`, `state.test.ts`, `app.test.ts`, `test_store.py` |
| Goal date and pace (FR4.x, AC4.x) | FR4.1 to FR4.3; AC4.1.1 to AC4.2.3 | u4-goals-and-style | `goal.test.ts`, `state.test.ts`, `render.test.ts` |
| Milestones and certificate (FR5.x, AC5.x) | FR5.1 to FR5.4; AC5.1.1 to AC5.2.3 | u5-encouragement | `milestones.test.ts`, `state.test.ts`, `render.test.ts`, `certificate.test.ts`, `app.test.ts` |
| Nudge (FR6.x, AC6.x) | FR6.1 to FR6.3; AC6.1.1 to AC6.1.3 | u5-encouragement | `nudge.test.ts`, `state.test.ts` |
| Storage, expiry and deletion (FR7.x, AC7.x) | FR7.1 to FR7.4; AC7.1.1 to AC7.3.2 | u2-progress, u3-protection | `state.test.ts`, `test_store.py` |
| Stack and protection (FR8.x, AC9.x) | FR8.1 to FR8.3; AC9.1.1 to AC9.3.2 | u1-skeleton, u3-protection | `test_stack.py`, `test_generator.py`, `render.test.ts` |
| Accessibility (AC8.1.x to AC8.3.x) | AC8.1.1 to AC8.1.3, AC8.2.1 to AC8.2.3, AC8.3.1, AC8.3.4, AC8.3.5 | u6-accessibility-pass | `keyboard.test.ts`, `structure.test.ts`, `contrast.test.ts`, `a11y.test.ts` |
| Performance, resilience, teardown, security, provider (NFR2, NFR3, NFR5, NFR6, NFR7) | through their acceptance criteria | u1 to u3 | as listed in the sensor output |

The full per-ID listing (each ID with the unit and file that builds it) is the output of `aidlc engine sensor-traceability --stage build-and-test`; it is not repeated here ID by ID.

## Assumptions & Open Questions

- [assumption] The per-ID listing above is grouped; the sensor output remains the authority for each individual ID.
- None otherwise.
