# Units Generation — Questions

## Sources

- Component catalogue: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- Decisions: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/decisions.md`
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Stories: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`
- Team practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`

A unit is a piece of work that can be built and tested on its own and handed on. This stage only says what depends on what; the order to build in is chosen in the next planning stage. Your team rule is to build a walking skeleton first, so the first unit must be the smallest slice that runs end to end, not a layer that cannot run alone.

## The proposed plan

Five building blocks exist (journey generator, journey store, learning progress rules, usage guard, web app). The proposal cuts the work into six vertical slices, each running through the blocks it needs, so the first one works end to end.

| Unit | What it delivers | Stories |
|---|---|---|
| u1-skeleton | The deployable stack, a real Bedrock call with the template fallback, saving and loading a journey, and a minimal journey page | US1.1, US1.3, US1.4, US1.5, US2.1, US2.3, US9.3 |
| u2-progress | Marking and unmarking stages, progress, hours, return visits, expiry | US2.2, US3.1, US3.2, US3.3, US7.3 |
| u3-protection | Replace and delete with confirmations, the daily cap, the API throttle and the budget alerts | US7.1, US7.2, US9.1, US9.2 |
| u4-goals-and-style | Goal date, days remaining, weekly pace, and the teaching style choice | US1.2, US4.1, US4.2 |
| u5-encouragement | Milestones, the certificate and the nudge (the first things cut if time runs short) | US5.1, US5.2, US6.1 |
| u6-accessibility-pass | The checks and fixes across every screen: keyboard, screen reader, contrast, browsers, zoom | US8.1, US8.2, US8.3 |

Each unit's screens are built to the accessibility checklist as they are made; u6 is the verification pass, not the first time accessibility is considered.

---

## Q1. [Architect] How should the work be cut into units?

Cutting by slice gives a first unit that really runs. Cutting by block gives cleaner code ownership but no working result until several units are done.

A. Vertical slices, skeleton first (Recommended): the six units above. Each runs through the blocks it needs, and the first one works end to end.
B. One unit per building block, plus a unit for the infrastructure: easy to see who owns what, but nothing runs until the infrastructure and at least three blocks are done, which cannot meet the walking-skeleton rule.
C. Three units by layer (infrastructure, backend, web app): simple, but the first unit runs nothing on its own.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Architect] How many units?

More units means smaller steps but more hand-offs. Fewer units means fewer steps but each is bigger.

A. Six, as proposed (Recommended): the cut order maps onto whole units, so u5 can be dropped first and u4 next without breaking the others.
B. Four: merge u3 into u2 and u5 into u4. Fewer hand-offs, but a cut then removes a mixed bundle of features.
C. Eight: split u1 into infrastructure and journey-generation units. Smaller steps, but the first unit would no longer run end to end on its own.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Quality] Where does accessibility work live?

Accessibility is a Must for the whole product, and its checks reach every screen.

A. Each unit builds to the checklist, and a final unit (u6) runs the full verification and fixes what it finds (Recommended).
B. Only the final unit deals with accessibility. Simplest to plan, but problems found at the end are the most expensive to fix.
C. Each unit does its own full checks and there is no final unit. Spreads the checks out, but nobody looks at the whole flow together.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Architect] How are the units deployed?

The team practices say everything lives in one CDK stack that is deployed from your own machine and removed with one `cdk destroy`.

A. One stack, one deploy (Recommended): the units are slices of the same codebase and are all delivered into the same stack. Each unit adds to it; nothing is deployed separately.
B. Each unit gets its own stack and deploys on its own. More isolation, but several things to destroy and several to keep consistent, against the single-destroy rule.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q5. [Architect] What kind is each unit?

The kind decides which design documents each unit owes in Construction: a `service` is a deployed executable, a `ui` is a frontend surface. Units that mix both are tagged by where most of their work sits.

A. u1, u2 and u3 are `service`; u4, u5 and u6 are `ui` (Recommended). The first three are mostly backend and storage with some screens; the last three are mostly screens and rules that run in the browser.
B. All six are `service`: every unit gets the full set of design documents, which is more paperwork for the screen-heavy units.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A


---

## Consolidated Summary Confirmation

- Cutting: vertical slices with the skeleton first — six units, each running through the blocks it needs (Q1: A)
- Count: six units, so the cut order maps onto whole units (Q2: A)
- Accessibility: each unit builds to the checklist, and a final unit runs the full verification and fixes what it finds (Q3: A)
- Deployment: one stack and one deploy; every unit is delivered into the same codebase and stack (Q4: A)
- Kinds: u1, u2 and u3 are `service`; u4, u5 and u6 are `ui` (Q5: A)
- The units: u1-skeleton, u2-progress, u3-protection, u4-goals-and-style, u5-encouragement, u6-accessibility-pass, with the stories assigned as in the proposed plan table above

- Looks correct
- Request changes

[Answer]: Looks correct
