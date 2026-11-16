# Team Allocation — Learning Journey App

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- `unit-of-work.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- `unit-of-work-dependency.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-dependency.md`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- `bolt-plan.md` in this folder, and the planning answers in `delivery-planning-questions.md`

A **Bolt** is one build pass over a piece of the work, ending in something that runs. A **mob** is the group that owns a Bolt and works on it together. This build has one builder, so there is no team to allocate and no Program Board (the shared board that lines up several teams' work).

## Allocation

Team Formation was skipped because the build is run by one person, so every Bolt is carried out by the AI developer agent, as the planning rules say for a build with no team.

| Bolt | Unit | Mob (owner) | Reviewer at the checkpoint |
|---|---|---|---|
| B1 | u1-skeleton | AI developer | The builder |
| B2 | u2-progress | AI developer | The builder |
| B3 | u3-protection | AI developer | The builder |
| B4 | u4-goals-and-style | AI developer | The builder |
| B5 | u5-encouragement | AI developer | The builder |
| B6 | u6-accessibility-pass | AI developer | The builder |

## Roles

| Who | What they do |
|---|---|
| The builder (the person) | Decides scope and priorities; approves every stage, every Bolt checkpoint and the verification command; creates the public GitHub repository and runs the first workflow; supplies the budget alert email at deploy time; runs `cdk deploy` and the first live checks |
| The AI developer | Designs and builds each unit, writes the tests (test-first where the team practices say so), and keeps Bedrock faked in automated tests |
| Independent reviewers (product lead, architecture reviewer) | Give an advisory second look at each design stage before the builder decides |

## Capacity

The builder said most of each day is available for review, so approvals are expected within the hour. [Q7] The plan assumes that holds; if approvals slow to half a day each, the timeline in `bolt-plan.md` would slip by about a day and the cut order would apply.

## Escalation

Decisions that are not clear from the documents go to the builder in the next approval. There is no one else to escalate to.

## Skills and gaps

No skills matrix was made because no team was formed. The one gap to watch is accessibility testing with a real screen reader, which only the builder's own machine can do (see `accessibility-checklist.md`).

## Assumptions & Open Questions

- [assumption] "Most of each day" means roughly six or more hours of review time between now and 14 November.
- None otherwise.
