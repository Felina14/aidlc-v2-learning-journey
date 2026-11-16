# Unit of Work Story Map — Learning Journey App

## Sources

- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `decisions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/decisions.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `unit-of-work.md` and `unit-of-work-dependency.md` in this folder

Every story is assigned to at least one unit, and every story except US9.2 to exactly one. A unit named on a row implements that story, or the part of it named in the cross-cutting table, and traces the acceptance criteria it implements in Functional Design.

## Story to Unit Map

| Story | Unit ID | Directory |
|---|---|---|
| US1.1 | U1 | u1-skeleton |
| US1.2 | U4 | u4-goals-and-style |
| US1.3 | U1 | u1-skeleton |
| US1.4 | U1 | u1-skeleton |
| US1.5 | U1 | u1-skeleton |
| US2.1 | U1 | u1-skeleton |
| US2.2 | U2 | u2-progress |
| US2.3 | U1 | u1-skeleton |
| US3.1 | U2 | u2-progress |
| US3.2 | U2 | u2-progress |
| US3.3 | U2 | u2-progress |
| US4.1 | U4 | u4-goals-and-style |
| US4.2 | U4 | u4-goals-and-style |
| US5.1 | U5 | u5-encouragement |
| US5.2 | U5 | u5-encouragement |
| US6.1 | U5 | u5-encouragement |
| US7.1 | U3 | u3-protection |
| US7.2 | U3 | u3-protection |
| US7.3 | U2 | u2-progress |
| US8.1 | U6 | u6-accessibility-pass |
| US8.2 | U6 | u6-accessibility-pass |
| US8.3 | U6 | u6-accessibility-pass |
| US9.1 | U1 | u1-skeleton |
| US9.2 | U1; U3 | u1-skeleton; u3-protection |
| US9.3 | U1 | u1-skeleton |

## Cross-Cutting Concerns

Some items reach more than one unit. Each is mapped to one unit above so no unit is asked to trace criteria it does not implement; the other units meet the item through the rules named here.

| Concern | Mapped to | How the other units meet it |
|---|---|---|
| Accessibility (US8.1 to US8.3) | U6 | Every unit builds its screens to `accessibility-checklist.md`; U6 verifies the whole flow and fixes problems |
| Idempotent marking and two-tab safety (part of US3.1, FR3.5) | U2 | Later units that write the Journey record (goal date in U4, milestones shown in U5) use the same partial, set-based updates |
| AI label and plain-text rendering (US2.3, parts of US1.1) | U1 | Later units that show text from the journey use the same text-only rendering |
| Teaching style (US1.2) | U4 | U1 uses the friendly guide as the default style until U4 adds the choice |
| API throttle and daily cap (US9.2) | U1; U3 | U1 builds the throttle with the stack (AC9.2.1, AC9.2.4); U3 puts the daily cap in front of the generator (AC9.2.2, AC9.2.3). Each unit traces the criteria it implements |

## Implementation Order Within Each Unit

This is the order of work inside a unit, not an order between units.

| Unit | Order of work inside the unit |
|---|---|
| U1 | Stack and removal (US9.3); the API throttle and the budget alerts (US9.1, US9.2 throttle part); topic checking and the journey checks, tests first (US1.1, US1.3); the AI call behind its fake and the template fallback (US1.3, US1.4); save and load; the home screen with its states (US1.1, US1.5); the minimal journey view with the stage content and labels (US2.1, US2.3) |
| U2 | Progress rules, tests first (US3.1); partial updates and expiry in the store (US3.1, US7.3); the stage ladder behaviour (US3.1, US3.2); hours and total (US2.2); return visits (US3.3) |
| U3 | The usage guard and its reservation (US9.2 cap part); the generator's use of it (US9.2 cap part); delete and replace with their dialogs (US7.1, US7.2) |
| U4 | Goal date rules and days remaining, tests first (US4.1, US4.2); the goal date form and the header goal line (US4.1, US4.2); weekly pace (US4.2); the style choice and its effect on the journey (US1.2) |
| U5 | Milestone and nudge rules, tests first (US5.1, US6.1); the banners (US5.1, US6.1); the certificate and print view (US5.2) |
| U6 | Automated checks on every screen and state (US8.3); the keyboard pass (US8.1); the screen-reader pass (US8.2); fixes and a re-run (US8.1 to US8.3) |

## Coverage Verification

| Check | Result |
|---|---|
| Stories in `stories.md` | 25 |
| Stories assigned to a unit | 25 (U1: 9, U2: 5, U3: 3, U4: 3, U5: 3, U6: 3; US9.2 is on two rows' units, so there are 26 assignments) |
| Stories assigned to more than one unit | 1 (US9.2: the throttle part in U1, the daily-cap part in U3) |
| Units with at least one story | 6 of 6 |

## Assumptions & Open Questions

- [assumption] Requirements that no story covers on its own, such as FR8.1 (the API throttle) and FR8.3 (the budget alerts), are carried by the unit that holds the matching story: now U1 (they moved there from U3 when the person asked for the deployed address to be protected from the first deploy).
- [assumption] The accessibility stories are mapped to U6 only, as the plan was approved; the other units meet the checklist as they are built.
- None otherwise.
