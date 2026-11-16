# Build and Test Summary — Learning Journey App

## Sources

- `build-instructions.md`, `integration-test-instructions.md`, `test-results.md` and `cross-unit-traceability.md` in this folder
- Each unit's `code-summary.md` and `unit-test-instructions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/code-generation/` and the five units after it
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1 to NFR11)
- The Testing Contract in each unit's `code-generation-plan.md` (custom ordering, standard strategy, 80% line floor, CI execution before merge)
- `team.md` — `aidlc/spaces/default/memory/team.md`

## Overall status

- **Build:** passes (frontend bundle, `cdk synth`, lint and format).
- **Tests:** 616 Python and 629 frontend tests pass; line coverage 99.78% on both sides (floor 80%).
- **Verdict of the stage:** the build and every executed test passed, but **seven targets are `Unverified`** because they need a deployed stack, a real browser engine, a person at a keyboard or screen reader, or the CI run that is still ahead. Under the stage's rule an `Unverified` target means the stage has not succeeded outright; it is put to the person (see Known limitations).

## Test type inventory

| Type | Generated | Notes |
|---|---|---|
| Unit | Per unit, in Code Generation | 16 distinct commands run in `test-results.md` |
| Integration (Standard) | `integration-test-instructions.md` | Boundaries across units; run in jsdom and moto |
| Performance, security | Not generated | Strategy is Standard; deployed-environment checks belong to Performance Validation |
| Accessibility | In the sixth unit | axe over 36 states, structure, contrast, keyboard; manual scripts for the person |

## Coverage expectations

- Project: at least 80% lines (measured 99.78% Python, 99.78% frontend).
- Unit-own paths (u4, u5): at least 90%, checked below.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-COV-PY | Testing Contract; NFR9 | Python line coverage at least 80% | 99.78% | `test-results.md`, floor run exit 0 | build-and-test | Met |
| T-COV-FE | Testing Contract; NFR9 | Frontend line coverage at least 80% | 99.78% | `test-results.md`, `npm run coverage` exit 0 | build-and-test | Met |
| T-COV-U4 | u4 `unit-test-instructions.md` | 90% of the unit's own paths (goal rules, style checks, goal route) | `goal.ts` 100% lines; `validation.py` 100%; `handler.py` 100% | Coverage tables in the floor runs | build-and-test | Met |
| T-COV-U5 | u5 `unit-test-instructions.md` | 90% of the unit's own paths (milestone and nudge rules, milestone route, certificate) | `nudge.ts` 100%, `milestones.ts` 100%, `certificate.ts` 100% lines; `store.py` 99%; `validation.py` 100% | Coverage tables in the floor runs | build-and-test | Met |
| T-CI | Testing Contract "Run the selected tests in CI before merge" | CI runs the tests before merge | The plan runs CI Pipeline later: it sets up CI to run these tests before merge | `aidlc-state.md`: `ci-pipeline` is `EXECUTE`, not started | ci-pipeline | N/A |
| T-ORDER | NFR9; Testing Contract ordering | Tests written first for journey validation, progress maths, nudge rule | Red outputs recorded for the first-tested files in the u1, u2, u4 and u5 code summaries | Unit `code-summary.md` files | build-and-test | Met |
| T-NFR1-AXE | NFR1; AC8.3.5 | No critical or serious axe violation on any screen or state | 0 across 36 states (moderate also 0 after four fixes) | `a11y.test.ts` 75 passed | build-and-test | Met |
| T-NFR1-TOKENS | NFR1; AC8.3.1 | Text 4.5:1, borders and ring 3:1, from the stylesheet tokens | All pairs pass; declared 44-pixel sizes pass | `contrast.test.ts` 34 passed | build-and-test | Met |
| T-NFR1-LH | NFR1; AC8.3.1, AC8.3.4 | Lighthouse in Chrome: rendered contrast and target size | Not run (needs a real browser and the deployed site) | `manual-pass-scripts.md` script 1 | none scheduled; the person | Unverified |
| T-NFR1-MAN | NFR1; AC8.1.1, AC8.2.4 | Manual keyboard and screen-reader pass completed | Not run | `manual-pass-scripts.md` scripts 2 and 3 | none scheduled; the person | Unverified |
| T-NFR2 | NFR2 | Journey within 20 s; mark within 1 s and saved within 2 s (95%); return visit within 3 s (95%) | Logic and limits tested (15 s model budget, 2 s store limit, template fallback); real timings not measured | `test_generator.py`, `test_store.py` | performance-validation | Unverified |
| T-NFR3 | NFR3 | A valid topic always yields a journey when Bedrock is slow, throttled or down | Template fallback returned in every failure test | `test_generator.py`, `test_template.py` | build-and-test | Met |
| T-NFR4 | NFR4 | Idle day under 0.10 dollars; total under 10 dollars | Not measurable before deployment | Budget alarm designed in u1 | performance-validation | Unverified |
| T-NFR5-TPL | NFR5 | Stack removes everything: removal policies and tags | Asserted in the stack tests | `infra/tests/test_stack.py` (AC9.3.1, AC9.3.2) | build-and-test | Met |
| T-NFR5-LIVE | NFR5 | After `cdk destroy`, no stack or tagged resource remains | Not run (needs a deployed stack) | u1 `cicd-pipeline.md` teardown check | performance-validation (assigned by the person at the Build and Test halt-and-ask; run last, because it removes the deployed demo) | Unverified |
| T-NFR6-CODE | NFR6 | HTTPS redirect, least-privilege role, topic as delimited data, output shown as text, `<script>` topic inert | All asserted | `test_stack.py`, `test_prompt_and_client.py`, `render.test.ts`, `structure.test.ts` | build-and-test | Met |
| T-NFR6-SECRETS | NFR6 | Secret scan of the repository finds nothing | gitleaks is not installed here; a pattern search of the source found no key (hits only in `recordings/` and session logs that quote the search itself); the CI gitleaks job has not run yet | `.github/workflows/ci.yml` job "Secret scan (gitleaks)" | ci-pipeline | Unverified |
| T-NFR7 | NFR7 | Amazon Nova on Bedrock only, Nova Lite default | Model id and provider asserted | `test_prompt_and_client.py`, stack tests | build-and-test | Met |
| T-NFR8 | NFR8 | Main flow in the latest two releases of Chrome, Firefox, Safari and Edge; no sideways scroll at 320 px | jsdom only; no real browser engine ran | `manual-pass-scripts.md` scripts 4 to 6 | none scheduled; the person | Unverified |
| T-NFR10 | NFR10 | One "ai" and one "template" log entry; no typed name in logs | Asserted in generator and handler tests; no request or log carries the certificate name | `test_generator.py`, `test_handler.py`, `app.test.ts` | build-and-test | Met |
| T-NFR11 | NFR11 | One CDK stack in Python in us-east-1; tests in GitHub Actions; no AWS keys in GitHub | `cdk synth` exit 0; one stack; workflow has no AWS credentials | `test-results.md`, `ci.yml` | build-and-test | Met |

## Readiness assessment

| Readiness | Assessment |
|---|---|
| Build-ready | Yes |
| Test-ready | Yes: all automated tests pass and the floors are met |
| Deployment-ready | Not claimed: the unverified targets above need CI, a deployment or a person first |

## Known limitations and outstanding items

- **Unverified targets (7 rows):** T-NFR1-LH, T-NFR1-MAN, T-NFR2, T-NFR4, T-NFR5-LIVE, T-NFR6-SECRETS, T-NFR8. T-NFR2, T-NFR4 and T-NFR5-LIVE have a later stage that owns them (Performance Validation; the person assigned the `cdk destroy` check to it at the halt-and-ask) and T-NFR6-SECRETS is owned by CI Pipeline; the other three need the person (real browser and screen reader) and no later stage owns them. **The person accepted this outcome** at the Build and Test halt-and-ask (Accept failure), logged in `test-results.md`.
- **Browser behaviour was checked in jsdom, not a real browser.** The accessibility and journey tests are integration evidence only.
- Traceability: three acceptance criteria (AC8.2.4, AC8.3.2, AC8.3.3) and the requirements with no criterion (NFR4, NFR9, NFR10, NFR11) are listed as uncovered by the sensor; see `cross-unit-traceability.md`.
- The earlier open items stand: update the global CDK command line, check the pinned GitHub Action versions, pass `-c budget_email=...` at deploy, and the TLS, Lambda-concurrency and rollback notes.

## Assumptions & Open Questions

- [assumption] "Owning Stage" is `none scheduled; the person` where no later stage in the plan owns the check; such a target stays `Unverified` and is never recorded as deferred.
- None otherwise.
