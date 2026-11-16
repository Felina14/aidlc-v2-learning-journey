# Business Rules — u6-accessibility-pass

## Sources

- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US8.1, US8.2, US8.3
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: NFR1
- `accessibility-checklist.md` and `design-system-mapping.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/`
- `functional-spec.md` in this folder (workflows, scope table and contrast table)
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

These rules are numbered from BR50 so they never clash with the earlier units' rules. They are rules about how the checks are run and recorded; the unit adds no feature.

## Machine-Readable Rules

```yaml
rules:
  - id: BR50.1
    statement: Every screen and state in the scope table is checked by an automated axe run in the test suite, and a critical, serious or moderate violation fails the build.
    category: constraint
    applies_to: WebApp
    trigger: The frontend tests run.
    logic: The test helper puts the page into each state in the scope table with the fake fetch, and axe runs on the document with the layout-dependent rules turned off. Any critical, serious or moderate violation fails the test and names the rule, the element and the state.
    violation: The build fails.
    source: AC8.3.5, AC8.2.1 (Q1)

  - id: BR50.2
    statement: The Lighthouse run in Chrome on the built page covers what jsdom cannot see, and its result is recorded rather than assumed.
    category: policy
    applies_to: WebApp
    trigger: The person runs the manual pass after the build.
    logic: Lighthouse runs on every screen of the built page served locally; contrast, target size, zoom and reflow results are written into the results record. A critical or serious result is a finding.
    violation: Not applicable; an unrecorded run leaves the check marked not run.
    source: AC8.3.5, AC8.3.1, AC8.3.4 (Q1)

  - id: BR50.3
    statement: A test works out the contrast of every colour pair in the contrast table from the tokens in styles.css and fails if a pair falls short.
    category: calculation
    applies_to: WebApp
    trigger: The frontend tests run.
    logic: Contrast is the WCAG ratio of the two relative luminances. Text pairs need 4.5 to 1; borders, the progress fill, status markers and the focus ring need 3 to 1. The values are read from the custom properties in styles.css, so a changed token is checked.
    violation: The test fails and names the pair and the ratio.
    source: AC8.3.1, checklist P2 and P3 (Q2)

  - id: BR50.4
    statement: The keyboard behaviour that jsdom can show is tested in the suite, and what it cannot show is a manual check.
    category: constraint
    applies_to: WebApp
    trigger: The frontend tests run, and the keyboard pass is run by the person.
    logic: Tests check that the skip link is the first focusable item, that every function is reachable by keyboard events, that focus lands where the interaction spec says after each action, that dialogs trap focus only while open and close on Escape, and that nothing traps the keyboard. The visible focus ring and the sticky block not hiding focused content are checked in the manual keyboard pass.
    violation: The test fails, or the manual step is recorded as failed.
    source: AC8.1.1, AC8.1.2, AC8.1.3

  - id: BR50.5
    statement: Announcements are checked as text through the page's two polite live regions, and whether a real screen reader speaks them is a manual check.
    category: constraint
    applies_to: WebApp
    trigger: The frontend tests run, and the screen-reader pass is run by the person.
    logic: The page has exactly two live regions, the banner area and the announcement region, both polite. The dialog's error line is today a role=alert (assertive) and is changed to a polite status line, the smallest fix that meets the checklist. Tests check that exactly these two exist, that none is assertive, and that each announcement in the interaction spec is sent once for progress changes, milestones, nudges and errors.
    violation: The test fails, or the manual step is recorded as failed.
    source: AC8.2.3

  - id: BR50.6
    statement: Each manual pass has a written script, the person runs it, and a pass that was not run is recorded as not run and never as a pass.
    category: policy
    applies_to: WebApp
    trigger: The scripts are written in Code Generation and the person runs them after the build.
    logic: The scripts give numbered steps and an expected result for the keyboard pass, the VoiceOver pass, the four browsers, 200 and 400 percent zoom, 320 pixels, target size and the certificate print preview. A check that cannot be run is recorded as not run with the reason and its checklist box stays unticked; a screen-reader pass is never recorded from automated results.
    violation: Not applicable.
    source: AC8.2.4, AC8.3.2, AC8.3.3, AC8.3.4 (Q3)

  - id: BR50.7
    statement: A critical, serious or moderate finding is fixed in this unit with a test, by the smallest change that meets the check; anything bigger or cosmetic is written up for the person to decide.
    category: policy
    applies_to: WebApp
    trigger: A check reports a finding.
    logic: The finding is recorded with check, screen and state, what was seen and severity. For critical, serious and moderate a failing test is written first, the smallest fix is made, and the covering checks are re-run. A minor finding, or one that needs a redesign, becomes an open item with the reason and is not changed.
    violation: Not applicable.
    source: AC8.1.1 to AC8.3.5 (Q4)

  - id: BR50.8
    statement: The pass adds no feature, stored field, route or stack change; its only new dependency is a pinned development-only axe package.
    category: constraint
    applies_to: WebApp
    trigger: Build time.
    logic: Fixes change existing files only where a check requires it. The axe package is pinned to an exact version, is a development dependency, and is never in the built page.
    violation: Not applicable.
    source: Unit boundary ("no new features")
```

## Rules Summary

| Rule | What it covers |
|---|---|
| BR50.1, BR50.2 | Automated checks: axe in the suite, Lighthouse by hand |
| BR50.3 | Contrast worked out from the tokens in a test |
| BR50.4, BR50.5 | Keyboard, focus and announcements in the suite |
| BR50.6 | Manual passes: scripts, the person runs them, "not run" is honest |
| BR50.7 | What happens to a finding |
| BR50.8 | No new features |

## Assumptions & Open Questions

- [assumption] The severities are those of axe (critical, serious, moderate, minor); the must-fix set is stricter than NFR1's "critical or serious".
- None otherwise.
