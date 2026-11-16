# Unit Test Instructions — u6-accessibility-pass

## Sources

- `code-generation-plan.md` in this folder (Testing Contract: custom ordering, standard strategy, 80% line floor)
- `rules.md` and `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/`
- The earlier units' `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/unit-test-instructions.md` and the units after it (the runners and set-up they describe already exist)
- `team.md` — `aidlc/spaces/default/memory/team.md` (accessibility checked with automated tooling plus a manual keyboard and screen-reader pass)

## Test frameworks and setup

The runner is the earlier units': vitest with jsdom for `frontend/`. One new development dependency is planned: the axe package, pinned to an exact version in Code Generation and installed by the existing `npm ci`. Set-up is unchanged: `npm ci` inside `frontend`. There is no backend or stack test in this unit; the Python and stack suites are re-run unchanged.

## Commands for this unit (each scoped to this unit's files only)

From the `frontend` folder:

```
npx vitest run tests/structure.test.ts tests/a11y.test.ts
```

```
npx vitest run tests/contrast.test.ts tests/keyboard.test.ts
```

Everything, with the floor (each command on its own):

```
npm run coverage
```

```
npm run build
```

And from the repository root, the earlier suites unchanged:

```
pytest backend/tests infra/tests -q --cov=backend/src/learning_journey --cov-fail-under=80
```

## What the tests cover

| Area | Files | Approach |
|---|---|---|
| axe runs and flags a broken fragment (proof the tool works under jsdom) | `frontend/tests/a11y.test.ts` | First test of the unit |
| Page structure: headings, landmarks, unique IDs, `aria-*` references, two polite live regions, `aria-expanded`, progress name and value, labels, language (BR50.1, BR50.5) | `frontend/tests/structure.test.ts` | Written before any fix |
| axe over every screen and state in the scope table (BR50.1) | `frontend/tests/a11y-states.ts`, `a11y.test.ts` | Written before any fix |
| Contrast ratios from the stylesheet tokens, focus ring equals accent, reduced motion, animation length, 44 by 44 pixel declared sizes (BR50.3) | `frontend/tests/contrast.test.ts` | Written before any fix |
| Keyboard flow, skip link, focus targets, Escape and Cancel on dialogs, Details disclosure (BR50.4) | `frontend/tests/keyboard.test.ts` | Written before any fix |
| Each fix for a finding | The test above that found it | Seen failing, then passing (BR50.7) |

About 200 new tests (202: `structure` 65, `a11y` 74, `contrast` 34, `keyboard` 29), because each state in the scope table runs through the same checks; 5 to 8 per component is exceeded on purpose, as the checks are cheap. Frontend total 426 to 628.

## Expected coverage targets

- Line coverage of at least 80% on the full suite (Testing Contract floor), set in `frontend/vitest.config.ts` and never lowered to make a run pass. The new files are tests and add no production lines; a fix adds a few.
- When a unit-scoped command exits non-zero only on the project-wide floor with every selected test passing, record that with the results; it is not a failed test. The floor runs are their own commands: `npm run coverage` in `frontend` and the `pytest` command above, each with no step after it.

## Mocking and stubbing guidance

- The existing fake `fetch` and fake browser storage are reused; no test calls any AWS service.
- jsdom has no layout, no media queries and no `showModal()`. Rules that need layout (`color-contrast`, `target-size`) are turned off in axe and covered by the stylesheet tests and the manual Lighthouse run; `showModal()` is stubbed and only its call, labels, Escape and focus return are tested.
- Time is injected as before so the generating states (before and after the 5-second reassurance) and the midnight refresh need no waiting.

## Test data management

- Journeys of 5 and 6 stages with chosen completed stages, a goal date in each state, and a nudge and each milestone banner come from the earlier units' fixtures and helpers.
- No real names or identifiers appear; the certificate name used in tests is made up.

## Not run in this stage

- Lighthouse, the keyboard-only pass, VoiceOver in Safari, the main flow in Chrome, Firefox, Safari and Edge, 200% and 400% zoom, a 320-pixel window, the dialog focus trap and inert page, and the certificate print preview. They need the person, a real browser and, for VoiceOver, a Mac. `manual-pass-scripts.md` holds the scripts and the results table; each stays "not run" until the person records it, and AC8.2.4 and AC8.3.2 stay open until then.
