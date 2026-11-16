# Delivery Planning — Questions

## Sources

- Units: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- Dependencies: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-dependency.md`
- Story map: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-story-map.md`
- Contracts: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md`
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- Requirements and stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`, `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- Mockups: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/mockups.md`
- Team practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`

This stage plans the order of the build. The previous stage listed what can depend on what; this one chooses the path through it. A **Bolt** is one build pass over a piece of the work, ending in something that runs, with its own definition of done. A **walking skeleton** is a thin version that runs the whole way through, built first to prove the pieces connect. The hard deadline is **14 November 2026**, and the agreed cut order if time runs short is nudges, then milestones and the certificate, then the goal date, then the teaching style.

## The proposed plan

There are six units and the first unit is already fixed as the walking skeleton, so the plan is six Bolts, one per unit. All of them are carried out by the AI developer, with you reviewing and approving at each checkpoint; no team was formed because you are the only builder.

| Bolt | Unit | Is it the walking skeleton? | Definition of done | What shipping it proves | Expected demo |
|---|---|---|---|---|---|
| B1 | u1-skeleton | Yes | The stack deploys and removes cleanly; the API is throttled to 5 requests a second with a burst of 10, and budget alerts are set at 2 dollars a day and 8 dollars a month (the alert email is passed as a deploy-time value and never committed); a topic typed on the deployed page returns a journey (AI or template) with its label; reloading shows the same journey; tests for journey checking are written first and Bedrock is faked in tests | A real topic returns a usable 5 to 6 stage journey within 20 seconds, Nova Lite works in us-east-1 or the fallback holds, the deployed address is protected from the first deploy, and the whole stack removes with one command | The deployed home page: type "Kubernetes", see the journey and its label; send a burst of requests and see the throttle answer; see the budget alerts configured |
| B2 | u2-progress | No | Stages can be marked and unmarked; progress, count and hours show; two tabs cannot undo each other; a return visit restores the journey; expired journeys are not returned | Progress survives reloads and two tabs without lost updates | Mark three stages, reload, open a second tab and see the same state |
| B3 | u3-protection | No | A sixth journey in a day is refused; replace and delete ask first and work | The daily cap, replace and delete hold | Request journeys until the limit message appears; delete the journey |
| B4 | u4-goals-and-style | No | A goal date can be set, changed and cleared with the right limits; days remaining and weekly pace show; the three teaching styles give visibly different journeys | Goal-date maths and the style effects are right | Set a goal date; generate the same topic as instructor and planner |
| B5 | u5-encouragement | No | Milestones show once each; the certificate shows and prints; the nudge shows only under its rule and uses no blocked wording | Encouragement features follow their rules | Complete the stages and print the certificate |
| B6 | u6-accessibility-pass | No | The accessibility checklist is complete: automated checks clean, keyboard and screen-reader passes done, supported browsers, zoom and narrow width | The whole flow works for every learner | A keyboard-only run through the main flow |

---

## Q1. [Delivery] After the walking skeleton, in what order should the other five Bolts be built?

The dependency graph allows several orders. Building the must-have Bolts first protects them if time runs short; building the nice-to-have Bolts last means they are cut first, in the agreed order.

A. B1, B2, B3, B4, B5, B6 (Recommended): the must-haves (progress, protection) come first, then the goal date and style, then encouragement, then the accessibility pass last with time held back for it. If time runs short, the cuts fall on the end of B5 and B4, in the agreed order.
B. B1, B2, B4, B5, B3, B6: features that learners see come first and the protections later. The public address would be built without a cap or throttle until B3.
C. B1, B3, B2, B4, B5, B6: protection immediately after the skeleton. Safest for the public address, but the first learner-visible feature after the skeleton then arrives a Bolt later.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Delivery] Should the Bolts be ranked with a scoring model?

WSJF (weighted shortest job first) scores each piece of work by its value, urgency and risk reduction divided by its size, and builds the highest scores first. It earns its keep when many pieces compete; here the order is largely fixed by dependencies and the agreed cut order.

A. No scoring model (Recommended): use the dependencies, the walking-skeleton-first rule and the agreed cut order.
B. Yes, score them with WSJF, weighting value, urgency, risk reduction and size equally.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Delivery] How big should a Bolt be?

A. One Bolt per unit, six in all (Recommended): each ends in something you can run and check, and each maps to one unit's stories.
B. Bundle the small units: put B3 with B2 and B5 with B4, giving four Bolts. Fewer checkpoints, but bigger steps.
C. Split the skeleton in two: one Bolt for the stack and the AI call, another for the page. Smaller steps, but the first Bolt would no longer run end to end on its own, against the walking-skeleton rule.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Delivery] Can Bolts be built at the same time?

After the skeleton, B2 and B3 do not depend on each other. Building them together saves elapsed time but needs the changes combined by hand, because both change the same files.

A. One after another (Recommended): a single builder, the framework's default, and no merging by hand.
B. Allow B2 and B3 together as one batch. Faster if you have the time to review two at once, with a real chance of conflicts in the web app and the store.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q5. [Delivery] What outside this build could hold it up?

Select all that apply, and say in Other if there is more.

A. Amazon Nova Lite may need model access switched on in your AWS account for us-east-1 (open issue I-01). It is usually quick but not certain.
B. A brand-new CloudFront site and API address can take a few minutes to become reachable after the first deploy.
C. The budget alerts need an email address to send to, which I do not have yet.
D. Creating the public GitHub repository and setting up its test workflow depends on your GitHub account.
E. Nothing outside the build is likely to hold it up.
X. Other (please specify)

[Answer]: B, C, D — A is already resolved: a Nova Lite converse call from this account in us-east-1 succeeded on 10 Nov, so I-01 can be closed. C: the budget alert email is passed as a CDK context value (alertEmail) at deploy time and never committed, because the repository is public. D: the test workflow file is written in this build, but creating the public GitHub repository and the first workflow run wait for the builder.

---

## Q6. [Delivery] What worries you most about this build?

Select all that apply. The Bolt order and the early checks are shaped by this.

A. Whether Nova Lite returns journeys that are consistent enough to use.
B. Fitting the full scope into the time left before 14 November.
C. Leaving accessibility checks to the end.
D. Someone running up the AI bill through the public address.
E. Combining the units' changes without breaking each other.
X. Other (please specify)

[Answer]: B, D

---

## Q7. [Delivery] How much of your own time can go into reviewing and approving between now and 14 November?

The AI developer does the building, but every stage and checkpoint waits for your approval. This sets how realistic the plan is.

A. Most of each day, so approvals come back within the hour.
B. About half of each day, so approvals come back within a few hours.
C. A few short windows a day, so approvals can take most of a day.
D. Not sure
X. Other (please specify)

[Answer]: A

---

## Q8. [Delivery] Are the per-Bolt answers in the proposed plan right?

The table above gives, for each Bolt, the unit it carries, whether it is the walking skeleton, its definition of done, what shipping it proves, and its expected demo. The mob (the group that owns a Bolt) is the AI developer for every Bolt.

A. Accept the table as proposed (Recommended).
B. Accept it with changes (please specify what to change in Other).
C. Not sure — walk me through them
X. Other (please specify)

[Answer]: A


---

## Requested Changes Feedback

What should change in the summary?

[Answer]: Move the API throttle and the budget alerts into B1 so the deployed address is protected from the first deploy; the daily cap, replace and delete stay in B3. Everything else is correct as summarised.

---

## Consolidated Summary Confirmation

- Order: B1 (skeleton), then B2, B3, B4, B5, B6 — the must-haves first, encouragement after, the accessibility pass last with time held back for it (Q1: A)
- Scoring: no scoring model; the dependencies, the skeleton-first rule and the agreed cut order decide (Q2: A)
- Bolt size: one Bolt per unit, six in all (Q3: A)
- Concurrency: one after another, no parallel batch (Q4: A)
- Outside dependencies: Bedrock model access is already confirmed (a Nova Lite call from this account in us-east-1 succeeded on 10 November), so open issue I-01 is closed; a new CloudFront site and API address may take a few minutes to become reachable after the first deploy; the budget alert email is passed as a deploy-time value (`alertEmail`) and never committed because the repository is public; the test workflow file is written in this build, but creating the public GitHub repository and its first workflow run wait for you (Q5: B, C, D plus your notes)
- Worries: fitting the full scope before 14 November, and someone running up the AI bill through the public address (Q6: B, D)
- Your time: most of each day, so approvals come back within the hour (Q7: A)
- Per-Bolt answers: the table in the questions file is accepted as proposed, with one change from you: the API throttle (5 requests a second, burst 10) and the budget alerts (2 dollars a day, 8 dollars a month) move into B1, so the deployed address is protected from the first deploy; the daily cap, replace and delete stay in B3 (Q8: A, revised)
- Effect on the units: the throttle and the alerts were part of u3-protection, so moving them into B1 means the units documents are amended to match: u1-skeleton gains US9.1 and the throttle half of US9.2, and u3-protection keeps the cap, replace and delete (US7.1, US7.2 and the cap half of US9.2). No other unit changes, and the dependencies stay the same.

- Looks correct
- Request changes

[Answer]: Looks correct
