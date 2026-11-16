# Risk and Sequencing Rationale — Learning Journey App

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

A **Bolt** is one build pass over a piece of the work, ending in something that runs. A **walking skeleton** is a thin version that runs the whole way through, built first to prove the pieces connect. The order of the six Bolts is in `bolt-plan.md`; this document says why.

## The Heuristic Used

The order combines two named approaches, with no scoring model. [Q2: A]

1. **Walking skeleton first** (Cockburn, *Crystal Clear*): B1 is the thin end-to-end slice. It is also the team's affirmed practice.
2. **Risk-first within what must ship** (Boehm, spiral model): the highest-uncertainty work is done early. The biggest uncertainties are whether Nova Lite returns usable journeys and whether the stack deploys and removes cleanly; both are in B1. The public-address risk is also in B1 because the person asked for the throttle and budget alerts to come first.
3. **Must-haves before nice-to-haves**, so a time squeeze lands on the end of the plan, not the middle: B2 and B3 (Must) before B4 (Should) and B5 (Could), with B6 (Must) last but with time held back.

A formal scoring model (WSJF, weighted shortest job first: value, urgency and risk reduction divided by size) was considered and not used. Six Bolts with a fixed dependency graph and an agreed cut order leave little for a score to decide. [Q2: A]

## Why This Order

| Position | Bolt | Reason |
|---|---|---|
| 1 | B1 u1-skeleton | The only Bolt with no dependencies. It proves the stack, the AI call and the fallback end to end, and it protects the public address before anything else is built on it |
| 2 | B2 u2-progress | The first learner-visible feature and a must-have; every later feature reads progress |
| 3 | B3 u3-protection | A must-have that touches the generator and store already built; the throttle and alerts were moved to B1, so this Bolt now adds the daily cap, replace and delete |
| 4 | B4 u4-goals-and-style | Needs B2 for the pace; a Should Have, so it comes after the must-haves |
| 5 | B5 u5-encouragement | Needs B2 and B4; the lowest priority, so it comes last of the features and is cut first |
| 6 | B6 u6-accessibility-pass | Needs every screen to exist; a must-have, so time is held back for it |

## Deviation From the Dependency Order

None. B1 to B6 is a valid ordering of the dependency graph: B2 and B3 both follow B1, B4 follows B2, B5 follows B2 and B4, and B6 follows B2, B3, B4 and B5. B3 could have come before B2 or after B4 without breaking a dependency; it sits third because protection is a must-have and because the person's biggest worry about the public address is already covered by B1.

## Alternatives Considered

| Alternative | Why it was not chosen |
|---|---|
| B1, B2, B4, B5, B3, B6 (features before protection) | It would leave the daily cap, replace and delete until the end, where a time squeeze would hit a must-have. The person chose the must-haves-first order [Q1: A] |
| B1, B3, B2, B4, B5, B6 (protection immediately after the skeleton) | Safe, but the cap, replace and delete are of less immediate value than progress; moving the throttle and alerts into B1 already covers most of the protection concern |
| Bundling units into four Bolts | Fewer checkpoints but each step is bigger and a cut would remove a mixed bundle [Q3: A] |
| Building B2 and B3 together | Saves elapsed time but needs the changes to the same files combined by hand [Q4: A] |

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Bolt that retires it |
|---|---|---|---|---|---|
| R1 | Nova Lite returns journeys that are inconsistent or off-structure | Medium | Medium | Reply checks, one retry, and the template fallback; the first live call has already succeeded from this account | B1 |
| R2 | The process, not the coding, makes the 14 November date hard: 13 stages remain after this one, five of which repeat for each of the six units, and each waits for the builder's approval | High | High | See "The biggest risk" below | All |
| R3 | The public address is used to run up the AI bill | Low once B1 ships | High | Throttle (5 a second, burst 10) and budget alerts (2 dollars a day, 8 dollars a month) in B1; the daily cap in B3; keep the address private until the demo | B1, B3 |
| R4 | Changes from different Bolts conflict in the web app and the store | Low | Medium | Bolts run one after another [Q4: A]; partial, set-based store updates | B2 onward |
| R5 | Accessibility problems are found only at the end | Medium | Medium | Every Bolt builds to the checklist; B6 is held back; contrast figures are confirmed with a checker | B6 |
| R6 | A new CloudFront site or API address is slow to become reachable after the first deploy | Medium | Low | Allow a few minutes at the B1 demo | B1 |
| R7 | The public GitHub repository or test workflow is not ready when needed | Medium | Low | The workflow file is written in B1; the builder creates the repository and runs it | B1 |
| R8 | The daily-cap day boundary and the capped-learner behaviour are still open | Low | Low | Settled in Functional Design for B3 | B3 |

Issue I-01 (Bedrock model access) is closed: a Nova Lite call from this account in us-east-1 succeeded on 10 November.

## The Biggest Risk

R2 is the one to watch. The coding for each Bolt is small, but each unit passes through design stages and a checkpoint, and each stop waits for the builder. With about four days left, what decides the date is the number of approvals, not the speed of building. The levers, if the first Bolt takes longer than planned, are:

- Choose "Continue automatically" for the ordinary completion approvals after the skeleton checkpoint (the plan, summary confirmation and failures still stop for the builder).
- Lower the depth of the remaining stages to Minimal, which asks fewer questions and writes shorter documents.
- Drop optional stages for the remaining units through a recompose, keeping the stages that matter for correctness.
- Apply the agreed cut order at the start of B5 or B4.

These are the builder's choices; none is taken here.

## Assumptions & Open Questions

- [assumption] The number of stages left (13 after this one, five repeating per unit) is as the workflow reports it today; the actual count of approvals depends on the choices above.
- [assumption] The risk ratings are the planner's judgement for a solo demo build, not measured figures.
- None otherwise.
