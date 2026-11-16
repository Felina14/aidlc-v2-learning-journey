# CI/CD Pipeline — u6-accessibility-pass

## Sources

- The earlier units' `cicd-pipeline.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/cicd-pipeline.md` and the four after it (the pipeline, the manual deploy and the rollback stay in force)
- `infrastructure-specification.md` and `monitoring-design.md` in this folder
- `functional-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/functional-spec.md` (workflows 1 to 4)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1, NFR6, NFR9, NFR11)
- `team.md` — `aidlc/spaces/default/memory/team.md` (GitHub Actions runs tests on every merge; deploy from the builder's machine; no AWS keys in GitHub; accessibility checked with automated tooling plus a manual keyboard and screen-reader pass)
- `.github/workflows/ci.yml` (read only, to check the job names)

## Shape

Checks run in GitHub Actions on every merge and hold no AWS credentials; deploys are run by hand with `cdk deploy`. This unit changes one job in the workflow and adds the manual passes to the deploy routine.

## Build and check stages

The workflow has jobs for the secret scan, Python lint and tests (with the stack tests), frontend lint, tests and build, the stack check (`cdk synth`) and an accessibility job that today only prints a message ("placeholder until U6"). The accessibility tests are ordinary vitest files (`tests/a11y.test.ts`, `contrast.test.ts`, `keyboard.test.ts`, `structure.test.ts`), so the frontend job's existing `vitest run --coverage` already picks them up through its `tests/**/*.test.ts` glob, with its checkout, Node set-up and `npm ci`. U6's changes:

| Job | Change | Gate |
|---|---|---|
| Frontend lint, tests and build | The axe, contrast, keyboard and structure tests run here with the rest, with the 80% line-coverage floor kept. The pinned axe development dependency is added to `frontend/package.json` and `package-lock.json` in Code Generation and installed by the existing `npm ci` | All pass |
| Accessibility placeholder | **Removed.** A second job running the same files would only repeat them, and it could never show a failure of its own, because it would need the frontend job to pass first. A failing accessibility test shows by its file name in the frontend job's output | The workflow has no "placeholder" job left |
| Python lint and tests, secret scan, stack check | No change | As before |

Removing the job also removes its name from the workflow. The project has no required-check setting on a protected branch (it is a solo project that merges after the workflow passes), so nothing waits for the old name; if one is ever added it must use the frontend job's name.

The Lighthouse run is **not** added to the pipeline: it needs a browser and a served page, and it runs in the person's own Chrome (BR50.2). This keeps the pipeline free of a headless-browser dependency and its flakiness, at the price that Lighthouse is a manual step recorded in the results file.

Every fix must stay inside the site's content security policy, which the stack already sets (styles and scripts from the site's own origin only, no inline style or script, nosniff, no-referrer, HSTS): a fix may not add an inline style, an inline script or an inline event handler. A fix that seems to need a header change reopens Infrastructure Design for that finding.

## Deployment (manual, from the builder's machine)

Unchanged: pull `main`, confirm the pipeline is green, build the frontend, run `cdk deploy -c budget_email=<address>`, then the smoke checks. U6 adds the manual passes to the routine. The two files are created in Code Generation, in the unit's `code-generation` folder: `manual-pass-scripts.md` (steps, expected results and a results table) and `accessibility-results.md` (the record of every check). Lighthouse is run on the **deployed** site, because only that run sees the CloudFront security headers; a run on the locally served build beforehand is optional. Nothing in the pipeline enforces the manual passes: the unit's results file states which checks stay open until the person records them (AC8.2.4 and AC8.3.2).

## Smoke checks after a deploy

The earlier units' smoke checks all still apply. U6 adds, on the deployed site:

| Check | Expected |
|---|---|
| Lighthouse (Chrome) on the home screen, the journey and the completion view | Accessibility score reported with no critical or serious findings; any finding is recorded in `accessibility-results.md` |
| Tab from the address bar on the deployed page | The first stop is the skip link; Enter moves focus to the main content |
| The main flow with the keyboard only, then with VoiceOver in Safari | Every step in `manual-pass-scripts.md` gives its expected result; results are recorded as pass, fail or not run |
| The main flow in the latest two releases of Chrome, Firefox, Safari and Edge | Completes in each; a browser that is not available is recorded as "not run" with the reason, not as a pass |
| 200% and 400% zoom, and a 320-pixel window | No loss of content or function; no sideways scrolling |
| Print preview of the certificate | Only the certificate shows, readable in black and white |

## Environment promotion

One environment; nothing to promote. A passing pipeline and the recorded manual results are the gate before the person deploys.

## Rollback

Redeploy the previous commit. A page fix has no data effect, so a rollback needs no data change.

## Secrets management in CI/CD

No change. No AWS keys are in GitHub, and the new job needs no secret. gitleaks still scans every push.

## Assumptions & Open Questions

- [assumption] The accessibility tests run once, in the frontend job; no separate job is kept.
- [assumption] The pinned GitHub Action versions are the open item from the earlier units and are not changed here.
- None otherwise.
