# Units of Work — Learning Journey App

## Sources

- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `decisions.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/decisions.md`
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Planning answers Q1 to Q5 — `units-generation-questions.md` in this folder

This stage describes the units and what can depend on what. It does not choose the order to build in or a critical path; that is Delivery Planning's job.

## Approach

- **Boundary strategy:** vertical slices, skeleton first. Each unit runs through the building blocks it needs, so the first unit works end to end. [Q1]
- **Granularity:** six units. The cut order (nudges, then milestones and certificate, then goal date, then teaching style) does not map onto whole units: the nudge and the milestones and certificate both sit in U5, and the goal date and the teaching style both sit in U4. Cutting the nudge alone, or the goal date alone, is therefore a partial cut inside U5 or U4, and the rest of the unit is built without it. Two facts make this workable: milestones and the certificate need only U2 (progress), and only the nudge needs the goal date from U4. [Q2]
- **Accessibility:** every unit builds its screens to the accessibility checklist, and the last unit runs the full verification and fixes what it finds. [Q3]
- **Deployment model:** one CDK stack and one deploy. The units are slices of the same codebase and all land in that stack; none is deployed on its own. [Q4]
- **Kinds:** u1, u2 and u3 are `service`; u4, u5 and u6 are `ui`. [Q5]
- **Repository layout assumed:** one repository with the infrastructure code, the backend code and the web app code side by side. The exact layout is settled in later stages.

## Unit Index

| Unit ID | Directory | Kind | Complexity | Deployment model |
|---|---|---|---|---|
| U1 | u1-skeleton | service | L | Shared (one stack) |
| U2 | u2-progress | service | M | Shared (one stack) |
| U3 | u3-protection | service | M | Shared (one stack) |
| U4 | u4-goals-and-style | ui | M | Shared (one stack) |
| U5 | u5-encouragement | ui | M | Shared (one stack) |
| U6 | u6-accessibility-pass | ui | S | Shared (one stack) |

## Unit Definitions

### U1 — u1-skeleton (service, L)

The smallest slice that runs end to end: a learner types a topic, a journey is made by Amazon Nova on Bedrock (or from the template), it is saved, and it is shown on a minimal journey page. It is also where the deployable stack and its one-command removal first exist.

- **Delivers:** the CDK stack and its removal; the journey generator with topic checking, the refusal outcome (the model answers with a refusal marker for a non-professional or unsafe topic, which ends the request as "topic not allowed" with no retry, template or save, and the web app shows the "try a different topic" message), the AI call behind its fakeable interface, reply checking, the 15-second budget with one retry, and the template fallback; the journey store's basic save, load and replace for one journey per session; the web app's home screen with the topic field, the generating states, the anonymous session, and a minimal journey view showing the stages and the AI or template label. The friendly guide style is used because the style choice is added in U4. The release of a reserved daily-cap slot after a refusal arrives with U3, which adds the usage guard; until then there is no slot to release.
- **Blocks touched:** JourneyGenerator, JourneyStore (basic), WebApp (home and minimal journey view).
- **Stories:** US1.1, US1.3, US1.4, US1.5, US2.1, US2.3, US9.1, US9.2 (the throttle part only), US9.3.
- **Moved here from U3:** the API-wide throttle of 5 requests a second with a burst of 10 (FR8.1), and the budget alerts at 2 dollars a day and 8 dollars a month (FR8.3). The alert email is passed as a deploy-time value (`alertEmail`) and is never committed, because the repository is public. They sit here so the deployed address is protected from the first deploy. They are settings of the stack, written alongside the stack in this unit.
- **Boundaries:** no progress marking, no goal date, no style choice, no daily cap, no delete or replace confirmation, no milestones.
- **Notes and constraints:** the first live Bedrock call also confirms model access in us-east-1 (open issue I-01). Tests are written first for journey validation (the team practice). The AI call is always faked in automated tests.

### U2 — u2-progress (service, M)

Marking stages, seeing progress, and coming back later.

- **Delivers:** the journey store's partial, set-based updates for completed stages, the 90-day expiry with the check on read; the progress rules for percentage, count and hours total, and the rule for which stage opens after marking or unmarking; the web app's stage ladder behaviour (one open at a time, mark and unmark, saving errors) and the sticky header's progress; loading on a return visit with a skeleton and an inline error.
- **Blocks touched:** JourneyStore, LearningProgress (progress part), WebApp.
- **Stories:** US2.2, US3.1, US3.2, US3.3, US7.3.
- **Boundaries:** no goal date, pace, milestones, certificate or nudge.
- **Notes and constraints:** progress maths is written tests-first as the team practices require. Two tabs must not undo each other's changes (ADR-003).

### U3 — u3-protection (service, M)

Keeping the public address and the learner's data safe.

- **Delivers:** the usage guard with its reserve, keep and release of a slot (the daily cap of 5); the journey generator's use of it; the journey store's delete; the web app's replace and delete confirmation dialogs and the limit messages.
- **Blocks touched:** UsageGuard, JourneyStore (delete), JourneyGenerator (slot use), WebApp (dialogs and messages).
- **Stories:** US7.1, US7.2, US9.2 (the daily-cap part only).
- **Moved to U1:** the API-wide throttle and the budget alerts (US9.1 and the throttle part of US9.2), so the deployed address is protected from the first deploy.
- **Boundaries:** no new learner-facing screens beyond the dialogs and messages.
- **Notes and constraints:** the session ID is made in the browser, so the cap is a courtesy limit and the throttle and alerts built in U1 are the real protection (ADR-004). The two-tab case must not take the count past 5.

### U4 — u4-goals-and-style (ui, M)

The goal date and the teaching style.

- **Delivers:** the progress rules for goal date limits, calendar days remaining, goal states and weekly pace; the journey store's goal date update; the web app's goal date form and the sticky header's goal line and pace; the teaching style choice and the journey generator's use of the chosen style (the instructor's exercises and quizzes, the planner's hours breakdown, the guide's tone).
- **Blocks touched:** LearningProgress (goal part), JourneyStore (goal date), JourneyGenerator (style), WebApp.
- **Stories:** US1.2, US4.1, US4.2.
- **Boundaries:** no nudge, milestones or certificate.
- **Notes and constraints:** after the nudge, and then milestones and the certificate (both in U5), the goal date is cut next and the teaching style last, as the agreed cut order says. These are partial cuts inside this unit: the goal date (US4.1, US4.2) can be dropped while the style choice (US1.2) is kept. If the style choice is cut, the friendly guide stays the default and the style radios are not shown. The nudge in U5 needs the goal date, so cutting the goal date also removes the nudge.

### U5 — u5-encouragement (ui, M)

Milestones, the certificate and the nudge.

- **Delivers:** the progress rules for milestones, the nudge and the certificate details; the journey store's record of which milestones were shown; the web app's banners, the nudge, and the certificate view with the print style.
- **Blocks touched:** LearningProgress (milestone, nudge and certificate part), JourneyStore (milestones shown), WebApp.
- **Stories:** US5.1, US5.2, US6.1.
- **Boundaries:** none beyond the stories.
- **Notes and constraints:** the nudge rule is written tests-first as the team practices require. The nudge is the first thing cut, then milestones and the certificate. Those are partial cuts inside this unit: milestones and the certificate need only U2 (progress), and only the nudge needs the goal date from U4, so the nudge can be dropped alone and the rest of U5 still builds. Banner text avoids every word on the starter blocked list in FR6.2.

### U6 — u6-accessibility-pass (ui, S)

The whole-flow verification and fixes.

- **Delivers:** the full run of the accessibility checklist across every screen and state: automated checks, the keyboard-only pass, a screen-reader pass, contrast, touch targets, supported browsers, zoom and narrow widths; fixes for what the checks find.
- **Blocks touched:** WebApp.
- **Stories:** US8.1, US8.2, US8.3.
- **Boundaries:** no new features.
- **Notes and constraints:** every other unit builds to the checklist as it goes, so this pass should find few problems. Contrast figures in the design system were worked out by hand and are confirmed here.

## Responsibilities by Building Block

| Block | Units it appears in |
|---|---|
| JourneyGenerator | U1 (core), U3 (slot use), U4 (style) |
| JourneyStore | U1 (save, load, replace), U2 (progress updates, expiry), U3 (delete), U4 (goal date), U5 (milestones shown) |
| LearningProgress | U2 (progress), U4 (goal and pace), U5 (milestones, nudge, certificate) |
| UsageGuard | U3 |
| WebApp | U1 to U6 |

## Assumptions & Open Questions

- [assumption] The infrastructure code for each unit's part of the stack (for example the API throttle and the budget alerts in U1) is written inside that unit, even though the stack is deployed as a whole.
- [assumption] The suggested effort sizes S, M, L reflect the amount of design and build work, not calendar time. With the 14 November 2026 deadline the order and any cuts are decided in Delivery Planning.
- Open: the daily-cap day boundary and whether a capped learner gets a free template journey (carried from Domain Design); settled in Functional Design.
