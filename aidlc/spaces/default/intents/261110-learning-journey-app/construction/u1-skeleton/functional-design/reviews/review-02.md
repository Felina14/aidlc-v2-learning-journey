## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-10T19:23:59Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR4.3 and BR3.4; traceability.json > coverage AC1.3.3 | AC1.3.3 says the request log must show that only an Amazon Nova model on Amazon Bedrock was called. It is mapped only to BR3.4, which restricts the configuration but writes nothing to a log. BR4.3 says the log line holds "the source and nothing else", which leaves no room for the model identifier. As written, a developer cannot produce the evidence the criterion asks for. | Change BR4.3 (or add a rule) so each model call logs the model identifier, with no topic text and no learner detail. Map AC1.3.3 to that rule as well as BR3.4. | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/functional-spec.md > Workflow 1 steps 13 to 17, Result states, State machine; rules.md > BR7.1 | AC9.2.1 requires the 11th request to be rejected with a "please wait" message. Contract C1 says the front door's 429 may carry no error body and that the web app treats any 429 with no code as RATE_LIMITED. The create workflow lists no RATE_LIMITED result state. It says "any other server error is shown as the failure in step 16", so a throttled learner would see "could not be made or saved". Workflow 3 (load) has no throttle handling either. No rule says how the browser shows the message, and the traceability row for AC9.2.1 points only at the stack setting BR7.1. | Add a browser rule and a result state: a 429 with or without an error body is shown as the "please wait" message, on both create and load. Map AC9.2.1 and AC9.2.4 to it as well as BR7.1. | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR1.4; functional-spec.md > Workflow 1 steps 12 to 14 and the State machine | Contract C4 says the generator releases the reserved slot whenever the request ends without a journey, at most once. The cap arrives in U3, but the generator belongs to U1. The U1 design names the release only for a refusal in BR1.4. The SAVE_FAILED paths (save failure, 2-second store limit, 18-second cap) and unexpected errors have no release rule and no step in the workflow or state machine. The reserve and release points are also missing from the workflow, so U3 would have to reopen U1's flow. The rule also ties the reserve to the 15-second clock, which the workflow starts only at step 5. | Add a rule and workflow note for every no-journey ending, SAVE_FAILED and unexpected error included. State that release is called at most once and that the "always grants" stand-in is used until U3. Say where reserve sits relative to the 15-second clock. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR3.3 and functional-spec.md > State machine | BR3.3 says that at 18 seconds with no journey made, the template is used. The 15-second budget in BR3.1 and BR3.2 already switches to the template before that, and a template built at 18 seconds would have no time left to save. The state machine has no 18-second transition for the Generating state. The 18-second cap is therefore only meaningful while Saving. | Restate BR3.3 as applying to the save phase only. Note that the 15-second budget always ends generation first. | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/traceability.json > coverage AC1.1.7 | AC1.1.7 (role permissions and secret scan) is mapped to BR7.5 and BR5.4. BR5.4 is about storing no personal data and has no bearing on secrets or permissions. | Map AC1.1.7 to BR7.5 only. | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR4.1 | BR4.1 fixes the template titles and hours but leaves the explanation text and the materials ("the explanation fields and materials, with the topic name inserted") undefined. The template must pass BR2.1 to BR2.3 (at least one item per list), so a developer must invent the content. | Give the template text and the material counts per stage, or state that the code generation plan owns them and must keep each list at 1 to 5 items. | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR1.4 and BR3.2 | AC1.1.3 (unsafe topic gives no journey) depends only on the model's refusal. When Bedrock is unreachable or the replies are invalid, BR3.2 gives a template with the unscreened topic name. This follows the contract, but the design does not say so. | Record this as a known limitation in the Assumptions section, so the person accepts it at the gate. | Resolved (reviewer) |
| R-08 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR3.3 logic; functional-spec.md > Workflow 1 step 12 and State machine | BR3.3 says that when the 18-second cap is reached with no journey, the generator builds the template, tries to save it, and ends as SAVE_FAILED if that does not finish. Workflow 1 and the state machine only cover the cap when a journey was made but not saved (Saving to Failed). There is no Generating to Failed row for it. A save attempted after 18 seconds also contradicts "ends within 18 seconds". | Add the no-journey cap case to Workflow 1 step 12 and to the state machine, and say the template save is bounded by the cap rather than by a further 2 seconds. | New |
| R-09 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/functional-spec.md > Workflow 1 steps 7, 8, 11, 14 | The model-identifier log line is written at step 11, which is reached only after a journey is made. A refusal goes from step 8 straight to step 14 and skips it. A refused call is still a Nova call, and BR4.3 and BR3.4 say each AI attempt is logged. | Move the attempt logging to step 7 (per call), or say step 14 also logs the refused attempt. | New |
| R-10 | Minor | aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/functional-design/rules.md > BR7.1 logic | "Any 429, with or without a body, is RATE_LIMITED" will misclassify DAILY_LIMIT once U3 adds it. Contract C1 gives DAILY_LIMIT a body and its own meaning, and keeps the existing journey usable. | Say that a 429 with no recognisable body is RATE_LIMITED, and that a body naming another code uses that code's handling (U3). | New |

> R-01 Reviewer note: BR3.4 and BR4.3 now log the Nova model identifier per AI attempt with no learner detail; traceability.json maps AC1.3.3 to BR3.4 and BR4.3.

> R-02 Reviewer note: BR7.1 treats any 429, with or without a body, as RATE_LIMITED on create and load; Workflow 1 step 18, Workflow 3 step 5 and the state machine row "Any request state" carry the "please wait" result. AC9.2.1 is covered.

> R-03 Reviewer note: New BR3.5 and BR1.4 give the reserve step, release exactly once on refusal, save failure and unexpected error, and keep the slot on a save. Workflow 1 steps 5, 12 and 14 place the reserve and release points. This matches contract C4 (reserve and release, stand-in until U3).

> R-04 Reviewer note: BR3.3 now describes the 18-second cap as a safety net for a stall outside the AI budget.

> R-05 Reviewer note: AC1.1.7 now maps to BR7.5 only.

> R-06 Reviewer note: BR4.1 gives the five stage titles, hours and structure, and leaves the exact wording to code generation.

> R-07 Reviewer note: The known limitation is recorded in rules.md Assumptions and in BR3.2, and in the Business scenarios table.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check | Rule ids BR1.1 to BR7.5 match the ranges in functional-spec.md and the rules summary. Every upstream AC in traceability.json resolves to an existing rule. | No dangling references found. |

### Summary

All seven prior findings are fixed, and the edits introduced no cross-reference errors. BR3.5 matches contract C4. Three Minor consistency gaps remain: the 18-second cap with no journey, logging of refused attempts, and 429 handling once DAILY_LIMIT exists. None of them stops a developer from building this unit.
