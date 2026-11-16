# Personas — Learning Journey App

## Sources

- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`
- Story plan answers Q1 and Q6 — `user-stories-questions.md` in this folder
- `team-practices.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`

All four personas are fictional, written from the target customer in the intent statement: an individual professional upskilling on their own time with no employer mandate.

## Priority Ranking

| Rank | Persona | Why |
|---|---|---|
| 1 | Dana, the deadline learner | Drives the core loop, the goal date and the nudge |
| 1 | Riley, the keyboard and screen-reader learner | Accessibility is a hard requirement, so Riley's needs are never optional |
| 2 | Sam, the exploring learner | Uses the app with no goal; shapes the first-use experience |
| 3 | Alex, the builder | Runs and pays for the app; needs cost control and clean teardown |

## Dana — the deadline learner

- **Role:** a professional who must pick up a new topic by a date, such as a project start or a review.
- **Goals:** get a clear path fast; know how many hours a week it takes; stay on track without feeling nagged.
- **Pain points:** too many resources and no order; loses momentum after a busy week; dislikes being scolded.
- **Context:** evenings and weekends, on a laptop; sets a goal date.
- **Tech comfort:** medium. **Frequency:** a few times a week until the goal date.

## Sam — the exploring learner

- **Role:** a professional curious about a topic with no deadline.
- **Goals:** see what learning a topic would involve; try different topics and teaching styles; keep the journey if it feels right.
- **Pain points:** generic content; unclear whether a topic is worth the time; fear of losing progress by accident.
- **Context:** casual use, any device; may never set a goal date.
- **Tech comfort:** medium. **Frequency:** irregular.

## Riley — the keyboard and screen-reader learner

- **Role:** a professional who uses only the keyboard, a screen reader, or high zoom.
- **Goals:** do everything the other learners can, with the same result and the same effort.
- **Pain points:** unlabeled controls, status shown only by colour, silent changes, keyboard traps.
- **Context:** desktop browser with assistive technology; needs predictable focus and announcements.
- **Tech comfort:** high with their tools. **Frequency:** as often as other learners.

## Alex — the builder

- **Role:** the one person who builds, deploys and pays for the app, in a personal AWS account.
- **Goals:** keep spend near zero when idle and under 10 dollars overall; stop misuse of the public address; remove everything with one command.
- **Pain points:** a public endpoint that calls a paid AI service; surprise bills; leftover resources after a demo.
- **Context:** works alone to a 14 November 2026 deadline; the repository is public.
- **Tech comfort:** high. **Frequency:** during the build and around the demo.

## Persona Relationships

- Dana and Sam are the same kind of person in different situations; one learner may be either on different days. Riley's needs apply to both: every Dana and Sam story must work for Riley.
- Alex protects all three: the rate limit, budget alerts and teardown keep the demo safe to run for them.

## Assumptions & Open Questions

- [assumption] The three learner personas use the same screens; no separate interface exists for any of them.
- [assumption] Names are placeholders for discussion and appear nowhere in the product.
