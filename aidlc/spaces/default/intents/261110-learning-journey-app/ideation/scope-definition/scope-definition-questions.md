# Scope Definition — Questions

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Feasibility assessment — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/feasibility-assessment.md`
- Constraint register — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/feasibility/constraint-register.md`
- [scope] Workflow-selected scope: `feature`.

---

## Q1. [Product] Must-have vs. nice-to-have capabilities

The description names several capabilities. Which are truly must-have for the first version to be worth showing — and which could be deferred to a later pass if time is tight?

A. All capabilities in the description are must-have: journey generation, persona choice, progress tracking, goal dates, milestones + certificate, nudges, and fallback template
B. Core must-haves are journey generation + fallback, progress tracking, and goal dates visible — persona choice, milestones/certificate, and nudges are nice-to-have
C. Core must-haves are journey generation + fallback and progress tracking — everything else (goal dates, persona, milestones, nudges) is nice-to-have
D. Journey generation + fallback is the only true must-have; everything else is an enhancement
E. Not decided — help me think through the priority order
X. Other (please specify)

[Answer]: A

---

## Q2. [Product] Sequencing preference

If capabilities need to be built in sequence (which they do, given one builder), what order makes sense?

A. Value-first: build the core learner journey (generation + stages + progress) first, then add engagement features (milestones, nudges, goal dates)
B. Risk-first: prove the Bedrock/Nova integration works end-to-end first, then build the full UX on top of it
C. Dependency-first: let the natural technical dependency order drive sequencing (backend before frontend, infrastructure before application)
D. Demo-readiness: sequence to get to a demoable end-to-end flow as fast as possible, even if some features are mocked
E. No preference — recommend the best sequencing for a solo build
X. Other (please specify)

[Answer]: B

---

## Q3. [Product] Hard deadlines

Is there a date by which the app must be demoable, or is this purely self-paced?

A. Self-paced — no hard deadline; ship when it is ready
B. Soft target — aiming for a specific date (e.g. a job interview, a showcase event) but it is not a hard constraint
C. Hard deadline — must be demoable by a specific date; some scope may need to be cut to hit it
D. Not yet defined
X. Other (please specify)

[Answer]: C — hard deadline: deployed and demoable by 14 Nov 2026; cut nice-to-haves before core if time runs short

---

## Q4. [Product] Capability dependency awareness

Some capabilities depend on others. Which of these dependency constraints is most important to capture explicitly in the backlog?

A. Bedrock integration must be proven before any AI-dependent UX is built
B. The DynamoDB state layer must exist before progress tracking and goal dates work
C. The base journey view (stages list + content) must exist before milestones and certificates make sense
D. All three above are real dependencies and should be captured
E. No preference — sequence however makes the most sense technically
X. Other (please specify)

[Answer]: D

---

## Q5. [Product] Minimum demoable slice

What is the smallest thing that could be built first and still be worth showing to someone — the walking-skeleton slice for this app?

A. A learner types a topic, gets a generated journey (5–6 stages), and can see stage names and descriptions — no progress, no tracking, just the generated content
B. A learner types a topic, gets a journey, and can mark stages complete — basic progress visible
C. A learner types a topic, chooses a teaching persona, gets a journey, marks stages complete, and sees a progress bar — the core loop end-to-end
D. Full feature set — not interested in a partial slice; want to build the whole thing sequentially
E. No preference — recommend what makes the most sense for a demo-first build
X. Other (please specify)

[Answer]: C

---

## Consolidated Summary Confirmation

- Must-have vs. nice-to-have: all capabilities in the description are intended as must-have — journey generation + fallback, persona choice, progress tracking, goal dates, milestones + certificate, and nudges (Q1: A)
- Sequencing: risk-first — prove the Bedrock/Nova integration end-to-end before building the full UX on top (Q2: B)
- Hard deadline: deployed and demoable by 14 November 2026; cut nice-to-haves before core if time runs short (Q3: C/Other)
- Dependencies to capture: (a) Bedrock integration proven first, (b) DynamoDB state layer before progress/goal tracking, (c) base journey view before milestones/certificate (Q4: D)
- Minimum demoable slice: learner types topic, chooses persona, gets journey, marks stages complete, sees progress bar — the core loop end-to-end (Q5: C)

- Looks correct
- Request changes

[Answer]: Looks correct

