# Business Rules — u5-encouragement

## Sources

- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US5.1, US5.2, US6.1
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: FR5.1 to FR5.4, FR6.1 to FR6.3, NFR1
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1, C2, C5)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (Banner, CertificateView)
- `entities.md` in this folder, and the earlier units' rules, which stay in force
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

These rules are numbered from BR40 so they never clash with the earlier units' rules. The milestone, certificate-view and nudge rules (BR40, BR41, BR42) are pure rules with no storage; the nudge rule is one of the three areas the team practices ask to be written and tested first.

## Machine-Readable Rules

```yaml
rules:
  - id: BR40.1
    statement: A milestone is reached when its condition becomes true after a confirmed mark, and it is new when the page's shown set does not count it as shown.
    category: calculation
    applies_to: LearningProgress
    trigger: A stage MARK is confirmed by the server.
    logic: Three milestones exist. first-stage is reached when at least one stage is done. halfway is reached when the number of done stages times 2 is at least the number of stages (3 of 5 and 3 of 6 reach it; 2 of 5 does not). complete is reached when every stage is done. The page keeps a shown set in memory (PageShownSet): filled from the loaded journey, added to the moment a banner is shown, and merged with every 200 answer of the milestone call. A milestone counts as shown when it is in that set OR is lower than any milestone in that set (order: first-stage, halfway, complete). A reached milestone that is not counted as shown is newly reached. With 5 stages the banners therefore come after the first, the third and the fifth stage. The check runs only after a confirmed mark: never after an unmark and never on a plain page load, so a return visit or an unmark does not celebrate, and a journey finished in another tab shows no banner here.
    violation: Not applicable; the status is always worked out, never entered.
    source: FR5.1

  - id: BR40.2
    statement: When several milestones are newly reached at once only the highest is shown, the lower ones are recorded as shown too, and a milestone that counts as shown never returns during the visit.
    category: policy
    applies_to: LearningProgress, WebApp
    trigger: One or more milestones are newly reached after a confirmed mark.
    logic: The one to show is the highest of the newly reached ones (complete over halfway over first-stage). The lower newly reached ones are added to the shown set and recorded as shown without being shown, so nothing stale is queued. Because a milestone lower than any shown milestone counts as shown (BR40.1), a lower banner can never appear after a higher one has been shown, also when an earlier recording of the lower one failed. Unmarking a stage never removes a milestone from the shown set, so marking the stage again does not bring it back. Two quick marks, or the same journey in two tabs, cannot show the same banner twice in one page, because a banner is added to the shown set before it is recorded; a second tab learns of it only from its next load or from the answer of its own milestone call. When the journey on the page changes without a reload (a new journey replaces the old one, or the journey is deleted), the shown set is emptied and refilled from the new journey (empty for a new one), so the replacement journey gets its own banners.
    violation: Not applicable.
    source: FR5.2 (functional design Q1)

  - id: BR40.3
    statement: A milestone is recorded as shown when its banner appears, one at a time, and a failed recording never removes the banner and never brings it back within the visit.
    category: policy
    applies_to: WebApp, request handler (PUT /api/v1/journey/milestones)
    trigger: A banner for a milestone appears, or lower milestones are skipped by BR40.2.
    logic: The page shows the banner, adds it to the shown set, and then records the milestones, one call each in order from lowest to highest, with the session ID in the header and the milestone in the body. A network failure is repeated once quietly. IF recording still fails THEN the banner stays, nothing is said to the learner, and the shown set still holds the milestone for the rest of the visit, so it is not shown again in that visit. A failed recording matters only on a later page load, where the unrecorded milestone is no longer in the loaded set; it may then show again after a later confirmed mark while its condition still holds and no higher milestone is in the set. That is accepted and is the only way a dismissed milestone can return, and only across visits. A late answer for a journey no longer on the page is dropped.
    violation: Not applicable.
    source: FR5.2

  - id: BR41.1
    statement: The page shows the completion view when every stage is done on a load or when a confirmed mark completes the journey, and unmarking any stage returns the journey view at the lower percentage.
    category: policy
    applies_to: WebApp, CertificateView, PageView
    trigger: The journey is loaded, or a stage is marked or unmarked, or "Back to my journey" is chosen.
    logic: The page has one view state (PageView): completion or journey. IF the journey is loaded with every stage done, or a confirmed mark completes it, THEN the view is completion: an h1 "Journey complete" that receives focus on arrival, and a labelled certificate panel with the topic, today's date in the learner's local calendar written in a plain long form, and "5 stages" or "6 stages". The completion view keeps the header, the goal line and the "Start a new journey" and "Delete my journey" controls of the earlier units; the print style hides them (BR41.3). The completion view has a "Back to my journey" button, which sets the view to journey with every stage still done: this journey view shows the topic as its h1 (the "Journey complete" heading belongs only to the completion view, so it never appears twice), no panel open, and focus goes to that heading; from there a done stage is opened and unmarked as in the second unit. Any confirmed stage change resets the view: an unmark leaves the journey view at the lower value (80% for a journey of 5) with focus handled as the second unit's rules say, and a mark that completes the journey shows the completion view again. A reload shows the completion view if every stage is done; a new journey resets the view. The complete milestone does not show again after the first time (BR40.2). The topic is shown as plain text.
    violation: Not applicable.
    source: FR5.3, FR5.4

  - id: BR41.2
    statement: The optional name on the certificate is held in page memory only and goes nowhere else.
    category: constraint
    applies_to: WebApp, CertificateView
    trigger: The learner types a name on the completion view.
    logic: The field has the visible label "Name on certificate (optional, not saved)". What is typed appears on the certificate while the page is open. It is never sent in any request, never written to browser storage, never logged, and never put in an announcement or an error message. A reload clears it. Name text is shown as plain text and never as markup.
    violation: Not applicable.
    source: FR5.3

  - id: BR41.3
    statement: The certificate can be printed or saved with the browser, as a black-and-white page of the certificate only.
    category: policy
    applies_to: WebApp, CertificateView
    trigger: The learner chooses "Print or save certificate".
    logic: The button opens the browser's print dialog. A print style shows only the certificate panel, in black and white, and hides everything else, including the header, the goal line and the two journey controls. Nothing is generated on the server and nothing is sent.
    violation: Not applicable.
    source: FR5.3

  - id: BR42.1
    statement: A nudge applies only when progress is below 50%, a goal date is set, and the goal date is 0 to 3 calendar days away.
    category: calculation
    applies_to: LearningProgress
    trigger: The journey is shown, a stage changes, the goal date changes, or the local date changes.
    logic: progress is the done stages over all stages. The nudge applies only when progress is below 50% (2 of 5 is 40% and shows; 3 of 5 is 60% and does not; 3 of 6 is exactly 50% and does not), a goal date is set, and the days remaining, counted in whole calendar days of the learner's local date as in the fourth unit, are 0, 1, 2 or 3. It does not apply with no goal date, when the goal date has passed, when the goal date is 4 or more days away, or when the journey is complete. It is re-evaluated whenever a stage changes, the goal changes, the page loads, at the next local midnight and when the tab becomes visible again.
    violation: Not applicable.
    source: FR6.1

  - id: BR42.2
    statement: A nudge is one of a small fixed set of encouraging messages, chosen by days remaining, naming the next stage by its number and what is left, and holding no text written by the AI.
    category: policy
    applies_to: LearningProgress, WebApp
    trigger: A nudge applies.
    logic: One message exists for each of 0, 1, 2 and 3 days remaining. The next stage is the lowest-numbered stage not done, and "stages to go" is the number of stages not done. The four messages differ in tone and not in pressure: 0 days ("today") invites one small step now; 1 day invites a short session today or tomorrow; 2 days and 3 days name a gentle plan for the days ahead. Each is warm and forward-looking, offers a small next step, names the next stage by its number and says how many stages are to go (for example "Stage 2 is your next step, with 4 stages to go. Even a short session moves you forward."), and has no countdown wording and no loss framing. The stage's title or any other AI text is never put in the nudge, so the message text is entirely this unit's own. The messages obey the blocked-word list (BR43.1).
    violation: Not applicable.
    source: FR6.2 (functional design Q3)

  - id: BR42.3
    statement: A dismissed nudge stays dismissed for the rest of that calendar day and that goal date, remembered in the browser only.
    category: policy
    applies_to: WebApp
    trigger: The learner dismisses a nudge, or a nudge is about to show.
    logic: Dismissing stores a small marker in the browser's local storage under one fixed prefix and a key made from the goal date and today's local date only. While the marker exists for today and the current goal date the nudge is not shown, on reloads too. The next local day, or a changed goal date, has a different key, so the nudge may show again if its conditions hold. Whenever a marker is written, markers for earlier days are removed, and all markers are removed when the journey is deleted or replaced, so no goal date is left in the browser after "Delete my journey". Nothing is sent to the server and nothing about the topic or the learner is in the key. IF the browser blocks storage THEN the dismissal is kept in page memory for the page's life.
    violation: Not applicable.
    source: FR6.2 (functional design Q2)

  - id: BR42.4
    statement: A nudge appears in the page only; no request, email or notification is made for it.
    category: constraint
    applies_to: WebApp
    trigger: A nudge applies.
    logic: Showing, dismissing and re-evaluating a nudge make no network request and send nothing. No email address is ever collected.
    violation: Not applicable.
    source: FR6.3

  - id: BR43.1
    statement: No message this unit can show contains a word or phrase from the blocked list.
    category: constraint
    applies_to: LearningProgress, WebApp
    trigger: Any milestone message or nudge message is defined or shown.
    logic: The blocked list is the starter list of the requirements ("behind", "failed", "failure", "late", "overdue", "lazy", "slacking", "falling short", "wasted", "guilty", "you must", "hurry", "running out of time") extended with "urgent", "deadline is close", "last chance", "don't miss", "miss out", "panic", "countdown", "only N day" and "only N days" (any number in place of N, so "only 1 day" matches too), "time is running" and "ticking". Matching is case-insensitive, on whole words or phrases, and the test first normalises typographic apostrophes and quotes to plain ones, so "don’t miss" and "don't miss" are both caught. Whole-word matching means "template" does not match "late" and "later" does not either. A test goes over every possible milestone message and every possible nudge message (every days-remaining choice and the largest stage numbers) and fails if any contains a blocked word or phrase.
    violation: Not applicable; the test fails the build.
    source: FR6.2 (functional design Q4)

  - id: BR43.2
    statement: Banners are one at a time, polite, text-based, and keyboard-reachable.
    category: policy
    applies_to: WebApp, Banner
    trigger: A milestone or a nudge is to be shown.
    logic: One banner is shown at a time; a milestone comes before a nudge when both apply, and the nudge appears after the milestone is dismissed. The banner sits in a status region announced politely and never takes focus. The message is real text, the icon is hidden from assistive technology, and meaning never depends on colour; there is no red styling and no countdown. Dismiss is a button reachable by keyboard. Dismissing a milestone banner or a nudge removes it at once.
    violation: Not applicable.
    source: FR5.1, FR6.2 (AC5.1.3)

  - id: BR44.1
    statement: The milestone call adds one milestone to the stored set, in one conditional update that needs a live journey.
    category: constraint
    applies_to: JourneyStore (markMilestoneShown), request handler (PUT /api/v1/journey/milestones)
    trigger: A milestone call arrives.
    logic: The session ID must be a standard UUID (the first unit's session-ID rule). The body must be one JSON object whose milestone is exactly one of first-stage, halfway and complete; other keys are ignored. The update adds the name to the string set milestonesShown, in one conditional update of that one field only, and in the same update moves lastActivityAt and expiresAt (90 days later) like every write. The condition is that the record exists and its expiresAt is greater than now in whole epoch seconds (the same test as for a stage change). Recording the same milestone again is a success: the set is unchanged, but the last-activity time and the expiry still move, as for every write. The update returns the set as it is after the update, so the 200 can carry the whole set sorted into the fixed order. One attempt only, with the 2-second total store limit. On success the call answers 200 with {"milestonesShown": [...]} in the fixed order first-stage, halfway, complete. The save of a new journey omits milestonesShown (a set cannot be empty), and a load reads a missing attribute, a set or an empty list as empty.
    violation: INVALID_REQUEST (400) for a bad session ID or a milestone that is not one of the three; NOT_FOUND (404) when there is no live journey (nothing is created or revived); SAVE_FAILED (500) when the store fails or is too slow.
    source: FR5.2 (contract C1, C5)

  - id: BR44.2
    statement: A failed milestone record is quiet, because the banner has already been shown.
    category: policy
    applies_to: WebApp
    trigger: The milestone call answers NOT_FOUND, INVALID_REQUEST, SAVE_FAILED or a 429.
    logic: The learner is told nothing and the banner is left as it is. NOT_FOUND (the journey is gone) is noticed by the next action the learner takes, which shows the "no longer saved" message of the second unit. Nothing is retried beyond the one quiet repeat of BR40.3.
    violation: Not applicable.
    source: FR5.2

  - id: BR45.1
    statement: The nudge, the milestones and the certificate are built and wired as separate pieces, so the nudge can be left out first, then the milestones and certificate, without changing the others.
    category: policy
    applies_to: LearningProgress, WebApp
    trigger: Build time, and a decision to cut for time.
    logic: The nudge rules, the milestone rules and the certificate view live in separate functions and separate page pieces, with no code of one required by another, except that both banners share the one banner area. Leaving the nudge out removes its rules, its message set, its dismissal storage and its banner use, and leaves the milestones and certificate working. Leaving out the milestones and certificate removes the milestone rules, the milestone call, the completion view and the print style, and leaves the journey view and the nudge working (the journey view then simply stays at 100% when every stage is done). The goal date is not touched by either cut.
    violation: Not applicable.
    source: FR5.1, FR6.1 (the agreed cut order in the unit definition)
```

## Rules Summary

| Group | Rules | What it covers |
|---|---|---|
| BR40 | BR40.1 to BR40.3 | Milestones: when reached, which one shows, recording that it was shown |
| BR41 | BR41.1 to BR41.3 | The completion view, the certificate name, printing |
| BR42 | BR42.1 to BR42.4 | The nudge: when it applies, its message, dismissal, page only |
| BR43 | BR43.1, BR43.2 | The blocked-word list and how banners behave |
| BR44 | BR44.1, BR44.2 | The milestone call and what happens when recording fails |
| BR45 | BR45.1 | Keeping the three pieces separable for the cut order |

## Assumptions & Open Questions

- [assumption] The exact wording of the milestone and nudge messages is written in code generation within the constraints above; this stage fixes their number, shape and what they may not contain.
- [assumption] The blocked-word match is on whole words or phrases after lower-casing, so words that merely contain a blocked word as part of a longer word do not count.
- [assumption] The 1e-9 style float margins of the earlier units are not needed here: progress is counted in whole stages.
- None otherwise.
