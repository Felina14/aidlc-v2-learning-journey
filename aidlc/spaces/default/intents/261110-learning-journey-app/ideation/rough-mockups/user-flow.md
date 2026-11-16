# User Flow — Learning Journey App

## Sources

- [desc] Initial description — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/intent-capture/intent-statement.md`
- Scope document — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/scope-document.md`
- Intent backlog — see `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/scope-definition/intent-backlog.md`
- [Q1]–[Q5] Rough mockups questions

---

## Primary Flow: Generate and Work Through a Journey

**Persona**: Individual professional upskilling on their own time. [desc]
**Trigger**: Learner arrives at the app with a specific topic in mind.
**Success outcome**: Learner has a generated journey and has marked at least one stage complete.

```
[Home screen]
     |
     | Types topic ("Kubernetes") + selects persona ("Structured Instructor")
     v
[CTA button enabled]
     |
     | Clicks "Generate my journey"
     v
[Loading state: "Generating your journey..."]
     |
     +-- [Bedrock success] -----------------> [Journey View]
     |                                              |
     +-- [Bedrock timeout / error] ---------> [Journey View]
          (fallback template returned silently)     |
                                                    |
     +----------------------------------------------+
     |
     | Reads Stage 1 (auto-expanded as first stage)
     | Reviews: what it is, why it matters, materials, time estimate
     v
[Clicks "Mark complete" on Stage 1]
     |
     v
[Stage 1: checked; progress bar updates to 1/N]
     |
     | (Optional) Sets goal date via "My Journey" header
     v
[Continues through stages ...]
     |
     | Nudge rule: progress below 50% AND goal date 3 days away or less:
     +-- [Nudge banner appears: "Your goal is close — just one more stage..."]
     |    |
     |    | Dismissed or ignored -> continues
     |
     | At milestone point (e.g. 50%):
     +-- [Milestone banner: "🎉 Halfway there!"]
     |    |
     |    | Dismissed or ignored -> continues
     |
     | All stages complete:
     v
[Completion / Certificate view]
     |
     +-- [Print / save certificate] -> browser print dialog
     |
     +-- [Start a new journey] -> confirmation prompt if existing journey
          |
          v
     [Home screen: cleared and ready]
```

<!-- Text fallback: Linear primary flow. Home screen (topic + persona input) → Loading state → Journey view. In Journey view: read stage, mark complete, repeat. Optional: set goal date. Branches: nudge banner at stall point, milestone banner at progress points. All stages complete → Completion/certificate view. From completion: print certificate or start new journey (with confirmation). -->

---

## Secondary Flow: Return Visit (Resuming a Journey)

**Trigger**: Learner returns to the app in a later session. Their journey is stored in DynamoDB keyed by anonymous session ID held in localStorage.

```
[Home screen loads]
     |
     | App detects existing session key in localStorage
     v
[Loading skeleton shown while the journey is fetched from DynamoDB]
     |
     +-- [Fetch succeeds] --> [Journey View restored: topic, persona, progress, goal date all visible]
     |                              |
     |                              v
     |                        [Learner continues where they left off]
     |
     +-- [Fetch fails or times out] --> [Inline error: "We couldn't load your journey."  [Try again]]
                                              |
                                              | Clicks "Try again" -> back to loading skeleton
```

<!-- Text fallback: On return visit, app reads session ID from localStorage, fetches journey state from DynamoDB, and restores the Journey View directly. No regeneration is needed. -->

---

## Error Flow: Catastrophic Failure

**Trigger**: API call fails and fallback template also fails (extremely unlikely).

```
[Home screen]
     |
     | Clicks "Generate my journey"
     v
[Loading state]
     |
     | Both Bedrock and fallback fail
     v
[Inline error below input field]
"Something went wrong. Please try again."
[Try again button]
     |
     v
[Returns to ready state: topic + persona still populated]
```

<!-- Text fallback: If both Bedrock generation and the fallback template fail, an inline error appears below the input field with a try-again button. Topic and persona inputs are retained. -->

---

## Information Architecture

The app has two primary screens and one completion state:

```
Home screen
  |
  v
Journey View (main app state)
  |
  v
Completion View (state of Journey View when all stages done)
```

Navigation is minimal: a single "New Journey" link in the header. No multi-level navigation, no tabs, no sidebar nav. The journey is the navigation. [Q2]

---

## Keyboard Navigation Path (Primary Flow)

1. Page loads → focus on topic input field (autofocus).
2. Tab → persona radio group (arrow keys navigate options).
3. Tab → "Generate my journey" button (Enter/Space to activate).
4. Loading → `aria-live` region announces "Generating your journey…"
5. Journey view loads → focus moves to h1 ("Your [topic] Journey").
6. Tab → "My Journey" header (goal date input if present).
7. Tab → Stage 1 accordion header (Enter/Space to expand).
8. Tab (within expanded stage) → "Mark complete" button (Enter/Space to check).
9. Progress bar updates; `aria-live` announces new percentage.
10. Tab → Stage 2 accordion header (and so on).

---

## Assumptions & Open Questions

- [assumption] On first visit, the Home screen is shown. On subsequent visits, if a valid session key is found in localStorage and a journey exists in DynamoDB, the Journey View is shown immediately.
- [assumption] The session ID is a UUID generated client-side on first visit and stored in localStorage. If localStorage is cleared, the journey is lost (acceptable at demo scale; no account recovery is in scope).
- [assumption] "New Journey" triggers a confirmation dialog if a journey is in progress. After confirmation, the session key is preserved but the journey in DynamoDB is replaced on the next generation.
- [assumption] The goal date is optional; learners can use the app without setting one. Nudges and days-remaining are only shown when a goal date is present.
