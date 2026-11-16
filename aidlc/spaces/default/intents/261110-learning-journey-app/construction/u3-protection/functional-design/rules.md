# Business Rules — u3-protection

## Sources

- `stories.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/user-stories/stories.md`: US7.1, US7.2 and the daily-cap part of US9.2
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`: FR7.1, FR7.3, FR7.4, FR8.2, NFR4
- `components.md` and `decisions.md` (ADR-004) — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (C1 delete and DAILY_LIMIT, C4, C5, and its open question on the guard's store)
- `interaction-spec.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/refined-mockups/interaction-spec.md` (ConfirmDialog)
- `entities.md` in this folder, and the rules of the first and second units, which stay in force
- Functional design answers Q1 to Q4 — `functional-design-questions.md` in this folder

These rules are numbered from BR20 so they never clash with the earlier units' rules.

## Machine-Readable Rules

```yaml
rules:
  - id: BR20.1
    statement: Each session may start 5 new journeys per UTC day, and a slot is reserved with one conditional increment that refuses once the count is 5.
    category: constraint
    applies_to: UsageGuard
    trigger: The generator asks for a slot before doing any work on a create request.
    logic: The day's UsageCount for the session is raised by one only if it is below 5, in a single conditional update, so two requests at the same moment cannot take it past 5; the second is refused. A first request of the day finds no record and creates it at 1. A granted slot returns a reservation id and the number of slots left. A refused request returns granted false and 0 left, makes no model call, and changes no stored value.
    violation: The request ends as DAILY_LIMIT (BR21.1).
    source: FR8.2

  - id: BR20.2
    statement: A slot is kept when a journey is saved and released once when the request ends without a journey.
    category: policy
    applies_to: UsageGuard, JourneyGenerator
    trigger: A create request that holds a slot ends.
    logic: IF a journey (AI or template) is saved THEN the slot stays used. IF the request ends because the topic was refused, the save failed or took too long, or an unexpected error occurred THEN the generator releases the slot exactly once, which lowers the day's count by one, never below 0. The generator never releases a reservation twice; the guard does not protect against a repeated release (contract C4), so that rule is the protection. A replacement journey uses a slot like any new journey.
    violation: Not applicable.
    source: FR8.2

  - id: BR20.3
    statement: If the guard's own store cannot be reached, the request goes ahead and a log line says the guard was skipped.
    category: policy
    applies_to: UsageGuard, JourneyGenerator
    trigger: Reserving a slot fails with a store error or takes longer than 2 seconds.
    logic: The reservation comes back as granted with no reservation id and guardSkipped true, and the generator carries on as if a slot had been granted. One log line records that the guard was skipped, with the outcome and a short session prefix only. A release with no reservation id does nothing. A release that fails is logged and does not change the answer the learner gets. A request is never refused because the guard's store failed. A refused slot (the condition failed because the count is already 5) is told apart from a store failure (an error or a timeout): only the second is let through. A reserve that timed out may still have raised the count; with no reservation id it cannot be released, so that day's count can end one too high, which is accepted for a courtesy limit.
    violation: Not applicable.
    source: FR8.2 (functional design Q3)

  - id: BR20.4
    statement: The day is the server's calendar day in UTC, and a count from an earlier day never counts.
    category: constraint
    applies_to: UsageGuard
    trigger: A slot is reserved or released.
    logic: The date comes from the server's clock at the moment of the request and is part of the count's key, so a new UTC day starts a new count at 0. The browser sends no date. A count record whose expiry has passed but has not yet been removed is treated as absent. The count record expires one to two days after its date.
    violation: Not applicable.
    source: FR8.2 (functional design Q1)

  - id: BR20.5
    statement: The count belongs to the session and the day, not to the journey, so deleting or replacing a journey never gives slots back.
    category: constraint
    applies_to: UsageGuard, JourneyStore
    trigger: A journey is deleted or replaced.
    logic: Delete and replace change only the Journey record. The UsageCount is not read, written or deleted by them. No code path lowers a count except the release in BR20.2.
    violation: Not applicable.
    source: FR8.2, FR7.3

  - id: BR21.1
    statement: At the daily cap the request ends with DAILY_LIMIT, nothing is made or saved, and the learner's existing journey is unchanged.
    category: policy
    applies_to: JourneyGenerator, request handler, WebApp
    trigger: The slot reservation is refused.
    logic: The create request answers DAILY_LIMIT (429, with the error shape from contract C1). No model call is made, no template is built, nothing is saved or deleted, and any saved journey stays exactly as it was and stays usable. The page keeps the typed topic and enables the button.
    violation: The learner sees the limit message (BR21.2).
    source: FR8.2 (functional design Q2)

  - id: BR21.2
    statement: The limit message is plain and not blaming, and it is kept apart from the "please wait" message.
    category: policy
    applies_to: WebApp
    trigger: The create call answers DAILY_LIMIT.
    logic: The page shows a plain message that today's limit of 5 new journeys has been reached and that they can come back tomorrow, with no blame and no red styling, and a note that their current journey is still available when they have one. It is announced politely. A 429 with the code RATE_LIMITED, or with no code, still shows the "please wait" message; the page tells the two apart by the code.
    violation: Not applicable.
    source: FR8.2 (AC9.2.3)

  - id: BR22.1
    statement: With a saved journey the page offers "Start a new journey", which asks for confirmation first; the old journey is replaced only when the new one has been made and saved.
    category: policy
    applies_to: WebApp
    trigger: The learner chooses "Start a new journey".
    logic: The control is shown only when a journey is shown. It opens the replace confirmation, which names the topic of the journey that would be replaced. On Confirm the topic screen appears; the saved journey is untouched and is still the stored journey. The old journey is replaced only when a new one has been made and saved, by the create request's own save (the store replaces the earlier journey on a successful save). On Cancel at the dialog, nothing changes and the saved journey stays shown.
    violation: Not applicable.
    source: FR7.1 (functional design Q4)

  - id: BR22.2
    statement: A new-journey attempt that is cancelled, refused, capped or fails leaves the saved journey as it was, and the learner can go back to it.
    category: policy
    applies_to: WebApp
    trigger: On the topic screen reached through "Start a new journey", the learner leaves it, or the attempt ends without a new journey.
    logic: The topic screen offers a way back to the saved journey, which loads the stored journey again from the server rather than trusting the copy on the page. IF that journey was deleted in another tab or has expired meanwhile THEN the load answers NOT_FOUND and the home screen shows with a plain note that the journey is no longer saved, as in the second unit's rules; IF the load fails THEN the inline error with "Try again" shows. A delete in one tab and a create in another are separate actions on the same record: whichever reaches the store last wins, a new journey saved after a delete stands, and a delete after a new journey removes it; neither can leave a half-removed record, because both act on the whole record. A topic that is not allowed, the daily limit, a throttle, a failed or timed-out create, and a save failure all leave the stored journey unchanged; the page keeps the typed topic where it did before and still offers the way back. After the new journey is saved the page shows the new journey.
    violation: Not applicable.
    source: FR7.1

  - id: BR23.1
    statement: Deleting removes the whole journey record in one step, is safe to repeat, and keeps the journey if it fails.
    category: constraint
    applies_to: JourneyStore (delete), request handler (DELETE /api/v1/journey)
    trigger: A delete call arrives.
    logic: The session ID is checked as in the first unit. The record with the journey, its progress, goal date and milestone memory is removed in one step: only the journey item (the one with the JOURNEY sort key) is deleted, and the day's usage counts beside it are left as they are. The call answers 204 whether or not a journey was there, so repeating it is harmless. The usage count is not touched (BR20.5). One attempt only, with a total limit of 2 seconds, as for every store call. IF the store fails or is too slow THEN the call answers DELETE_FAILED (500) and the journey is kept as far as the learner can tell; a delete that timed out may still have gone through, which a repeat or a reload settles.
    violation: DELETE_FAILED (500), or INVALID_REQUEST (400) for a bad session ID.
    source: FR7.3, FR7.4

  - id: BR23.2
    statement: "Delete my journey" asks for confirmation naming what will be deleted, then shows the home screen; if it fails the journey is kept and a message shows in the dialog.
    category: policy
    applies_to: WebApp
    trigger: The learner chooses "Delete my journey".
    logic: The control is shown only when a journey is shown. The confirmation names the topic that will be deleted and that its progress goes with it. On Confirm the confirm button shows "Working…" and the call is made; a network failure is repeated once by itself because the call is safe to repeat. On success the dialog closes and the home screen shows, and loading that session returns no journey. On failure a plain message shows inside the dialog with the journey kept and the dialog still open, so the learner can try again or cancel. On Cancel nothing changes.
    violation: The message in the dialog.
    source: FR7.3

  - id: BR24.1
    statement: Both confirmations are native modal dialogs with the same accessible behaviour.
    category: constraint
    applies_to: WebApp, ConfirmDialog
    trigger: A confirmation opens.
    logic: The dialog opens as a modal so focus is trapped and the page behind is inert. It is labelled by its title and described by its explanation. Cancel comes first and has the initial focus. Escape closes it as Cancel. The confirm button shows "Working…" and ignores a second press while it runs. An error shows inside the dialog. On close, focus returns to the control that opened it, or to the home screen's topic box after a delete. Wording is plain text set as text, never as markup, and the topic named in the dialog is shown as plain text.
    violation: Not applicable.
    source: FR7.1, FR7.3 (interaction spec, ConfirmDialog)

  - id: BR24.2
    statement: The new controls lift the earlier rule that no way to start another journey is offered, and nothing else about the page changes.
    category: constraint
    applies_to: WebApp
    trigger: A journey is shown.
    logic: "Start a new journey" and "Delete my journey" appear with a saved journey and nowhere else. The earlier units' page rules otherwise stay in force. U3 adds no goal date, pace, style choice, milestone, certificate or nudge.
    violation: Not applicable.
    source: FR7.1, FR7.3 (unit definition)
```

## Rules Summary

| Group | Rules | What it covers |
|---|---|---|
| BR20 | BR20.1 to BR20.5 | The usage guard: the cap of 5, keep and release, the guard's store failing, the UTC day, the count kept apart from the journey |
| BR21 | BR21.1, BR21.2 | What happens and what is said at the cap |
| BR22 | BR22.1, BR22.2 | Starting a new journey with confirmation, and leaving the old one safe |
| BR23 | BR23.1, BR23.2 | Deleting the journey: the call and the confirmation |
| BR24 | BR24.1, BR24.2 | The dialogs and the new controls |

## Assumptions & Open Questions

- [assumption] The exact wording of the limit message and the dialogs follows the refined mockups; only the meaning is fixed here.
- [assumption] The guard's reservation id is opaque to the generator; the guard may encode the session and date in it so a release can find the right count.
- [assumption] A release is attempted even if the request ran into the daily rollover (the date in the reservation id is used, not today's).
- None otherwise.
