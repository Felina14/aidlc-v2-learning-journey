# Bolt Plan — Learning Journey App

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- `mockups.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/mockups.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `unit-of-work-dependency.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-dependency.md`
- `unit-of-work-story-map.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Planning answers Q1 to Q8 — `delivery-planning-questions.md` in this folder

## What this document is

A **Bolt** is one build pass over a piece of the work, ending in something that runs, with its own definition of done. This plan puts six Bolts in order. Each carries one unit of work (a piece of the product that can be built and tested on its own), so the plan has six Bolts for six units. The first is the **walking skeleton**: a thin version that runs the whole way through, built first to prove the pieces connect before the real features go in. The hard deadline is **14 November 2026**.

## Sequence

The order is B1, B2, B3, B4, B5, B6, one after another. [Q1, Q3, Q4]

| Bolt | Unit | Stories | Walking skeleton | Depends on |
|---|---|---|---|---|
| B1 | u1-skeleton | US1.1, US1.3, US1.4, US1.5, US2.1, US2.3, US9.1, US9.2 (throttle part), US9.3 | Yes | none |
| B2 | u2-progress | US2.2, US3.1, US3.2, US3.3, US7.3 | No | B1 |
| B3 | u3-protection | US7.1, US7.2, US9.2 (daily-cap part) | No | B1 |
| B4 | u4-goals-and-style | US1.2, US4.1, US4.2 | No | B2 |
| B5 | u5-encouragement | US5.1, US5.2, US6.1 | No | B2, B4 |
| B6 | u6-accessibility-pass | US8.1, US8.2, US8.3 | No | B2, B3, B4, B5 |

Each Bolt's dependencies are built before it, so the order is also a valid ordering of the dependency graph in `unit-of-work-dependency.md`; no Bolt is built before something it needs.

## The Bolts

### B1 — u1-skeleton (the walking skeleton)

- **Carries:** the deployable stack and its removal; the API throttle (5 requests a second, burst 10) and the budget alerts (2 dollars a day, 8 dollars a month), moved here from the protection unit at the person's request so the deployed address is protected from the first deploy; the journey generator with its refusal outcome, the AI call behind a fakeable interface, reply checking, the 15-second budget with one retry, and the template fallback; the journey store's basic save, load and replace; the home screen, the anonymous session, and a minimal journey view.
- **Definition of done:**
  - `cdk deploy` succeeds from the builder's machine and `cdk destroy` removes every resource, including the data table and site bucket.
  - The API answers the 11th simultaneous request with a "please wait" error, and the budget alerts exist for 2 dollars a day and 8 dollars a month, with the alert email passed at deploy time and not committed.
  - A topic typed on the deployed page returns a 5 or 6 stage journey (AI or template) with its label, within 20 seconds; an unsafe topic returns the "try a different topic" message; reloading shows the same journey.
  - The journey checks are written test-first; Bedrock is faked in every automated test; line coverage is at least 80%.
- **Confidence hypothesis (what shipping it proves):** a real topic returns a usable journey within 20 seconds; Nova Lite works in us-east-1 or the fallback holds; the deployed address is protected from the first deploy; the whole stack removes with one command.
- **Expected demo:** open the deployed home page, type "Kubernetes", see the journey and its label; send a burst of requests and see the throttle answer; show the budget alerts in the account.
- **Real integrated check:** the intent's verification command (see below) plus the manual demo above, run on the deployed stack.
- **Owner:** the AI developer; approved by the builder at the first checkpoint.

### B2 — u2-progress

- **Carries:** marking and unmarking stages (partial, set-based store updates), progress, count and hours, the 90-day expiry checked on read, return visits with a skeleton and an inline error.
- **Definition of done:** marking three stages, reloading and opening a second tab shows the same state; two tabs cannot undo each other; an expired journey is not returned; the progress rules are written test-first.
- **Confidence hypothesis:** progress survives reloads and two tabs without lost updates.
- **Expected demo:** mark three stages, reload, open a second tab, and see the same progress.
- **Owner:** the AI developer.

### B3 — u3-protection

- **Carries:** the usage guard and its reserve-and-release of a slot (the daily cap of 5), the generator's use of it, delete, replace with its confirmation, and the limit messages.
- **Definition of done:** a sixth journey in a day is refused with the limit message and the existing journey is unchanged; two simultaneous requests cannot take the count past 5; replace and delete ask first, name what they affect, and work; a refused topic releases its slot exactly once.
- **Confidence hypothesis:** the daily cap, replace and delete hold.
- **Expected demo:** request journeys until the limit message appears; delete the journey and see the home screen.
- **Owner:** the AI developer.

### B4 — u4-goals-and-style

- **Carries:** goal date rules, days remaining and weekly pace, the goal form and header line, and the teaching style choice with its effect on the journey.
- **Definition of done:** the goal date accepts today to 365 days ahead and nothing else; days remaining and pace are right for the worked examples in the stories; the instructor style lists at least 2 exercises and 1 quiz per stage and the planner style shows hours by kind.
- **Confidence hypothesis:** the goal-date maths and the style effects are right.
- **Expected demo:** set a goal date; generate the same topic as instructor and as planner and compare.
- **Owner:** the AI developer.

### B5 — u5-encouragement

- **Carries:** milestones, the certificate with its print style, and the nudge.
- **Definition of done:** each milestone shows once and does not return after a dismissal or reload; the certificate prints readably in black and white; the nudge shows only for progress below 50% with the goal date 0 to 3 days away and contains no word from the blocked list; the nudge rule is written test-first.
- **Confidence hypothesis:** the encouragement features follow their rules.
- **Expected demo:** complete the stages and print the certificate; set a goal date two days out with one stage done and see the nudge.
- **Owner:** the AI developer.

### B6 — u6-accessibility-pass

- **Carries:** the full run of the accessibility checklist across every screen and state, and fixes for what it finds.
- **Definition of done:** the checklist is complete: automated checks (axe or Lighthouse) report no critical or serious violations, the keyboard-only pass and a screen-reader pass are done, supported browsers, zoom and narrow width are checked, and contrast figures are confirmed with a checker.
- **Confidence hypothesis:** the whole flow works for every learner.
- **Expected demo:** a keyboard-only run through the main flow.
- **Owner:** the AI developer.

## Cut rules if time runs short

The agreed order is: nudges, then milestones and the certificate, then the goal date, then the teaching style. These are cuts inside B5 and B4, not whole Bolts (B5 also holds milestones and the certificate, which need only B2; only the nudge needs the goal date from B4). B6 is never cut: time is held back for it.

| If time is short at | Cut |
|---|---|
| The start of B5 | The nudge first, then milestones and the certificate |
| The start of B4 | The goal date first (which also removes the nudge), then the style choice (the friendly guide stays the default) |

## Timeline (target, to be re-planned at each checkpoint)

With most of each day available for review (Q7), the targets are:

| Date | Target |
|---|---|
| Tue 10 Nov | Finish planning; start the design stages for B1 |
| Wed 11 Nov | B1 built, deployed and demonstrated |
| Thu 12 Nov | B2 and B3 |
| Fri 13 Nov | B4, B5 and B6 |
| Sat 14 Nov | Final deploy check, buffer and demo |

These are targets, not promises. The largest uncertainty is the number of approvals the process asks for, not the coding itself (see `risk-and-sequencing-rationale.md`).

## Construction settings

- The recorded settings are kept as they are: units are built one at a time, each through its design stages and code, followed by a completion checkpoint, and Bolts run serially. Q4 confirmed serial execution.
- **Verification command:** none exists yet because nothing is built. The selection is deferred to the first checkpoint, which will ask before verification. It will need to run the Python and TypeScript tests with the coverage check, and, for B1, show the deployed stack working end to end.

## Assumptions & Open Questions

- [assumption] Dates are targets from today (Tuesday 10 November 2026) and assume the builder can review within the hour, as stated.
- [assumption] The mob that owns every Bolt is the AI developer; the builder approves at each stage and checkpoint.
- Open: the daily-cap day boundary and whether a capped learner gets a free template journey; both belong to B3 and are settled in Functional Design.
