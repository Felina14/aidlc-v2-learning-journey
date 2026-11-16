# Practices Discovery — Questions

## Sources

- Draft practices: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/practices-discovery/team-practices.md`
- Framework defaults: `aidlc/spaces/default/memory/org.md`
- Project facts: `aidlc/spaces/default/intents/261110-learning-journey-app/ideation/approval-handoff/initiative-brief.md`

---

## Q1. [Delivery] How do you want to branch and merge?

You are the only builder, so this is about keeping history tidy and making it easy to undo a bad change before the 14 November deadline.

A. Short-lived branches merged into `main` one commit at a time (squash), the framework default
B. Commit straight to `main` with no branches
C. A branch per feature, merged into `main` through a pull request
D. Not sure — suggest what fits a solo build
X. Other (please specify)

[Answer]: A

---

## Q2. [Delivery] Build a thin end-to-end slice first? A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in.

The draft suggests infrastructure, the Bedrock call and a minimal journey page (the first three backlog items) as that slice, since the Bedrock integration is the biggest risk.

A. Yes — infrastructure, Bedrock call and a minimal journey page first, as the draft suggests
B. Yes, but smaller — only a bare page that calls Bedrock and shows the result
C. No — build the backlog items one by one in order
D. Not sure — suggest what fits the deadline
X. Other (please specify)

[Answer]: A

---

## Q3. [Quality] When do you write tests relative to the code?

This sets the testing routine the build follows. The framework default also expects an 80 percent line-coverage floor for a feature of this size.

A. After each layer is written — write the code, then its tests, then move on (test-after, the default)
B. Tests first for the core logic (journey validation, progress maths, the nudge rule), after for everything else
C. Tests first for everything
D. Not sure — suggest what fits a solo build with a tight deadline
X. Other (please specify)

[Answer]: B — tests first for journey validation, progress maths and the nudge rule; test-after for the rest

---

## Q4. [Quality] How should the app be checked for accessibility, and how should Bedrock be handled in tests?

Accessibility (keyboard use, screen readers, colour contrast) cannot be fully covered by ordinary unit tests, and real Bedrock calls cost money and vary between runs.

A. Automated checks (axe or Lighthouse) plus a manual keyboard and screen-reader pass; Bedrock is faked in automated tests
B. Automated checks only; Bedrock is faked in automated tests
C. Manual keyboard and screen-reader pass only; Bedrock is faked in automated tests
D. Not sure — suggest a minimal set that fits the deadline
X. Other (please specify)

[Answer]: A

---

## Q5. [Release] How do you want to deploy?

The whole app is one CDK stack that you deploy to your own AWS account and tear down with one command.

A. Deploy from my own machine with `cdk deploy`, and run the tests locally before merging
B. Set up a CI pipeline (for example GitHub Actions) that runs tests on every merge, and deploy from my machine
C. Set up a CI pipeline that tests and deploys automatically on merge to `main`
D. Not sure — suggest what fits a one-person demo
X. Other (please specify)

[Answer]: B — GitHub Actions runs tests on every merge; deploy from my machine with cdk deploy (no AWS keys in GitHub)

---

## Q6. [Development] Which formatter and linter, and any code conventions to follow?

Python covers the infrastructure and backend. The frontend language is not chosen yet.

A. Black and Ruff for Python, Prettier and ESLint for any JavaScript or TypeScript, with language-standard naming
B. Only the formatter for each language, no linter
C. No fixed tools — keep the code tidy by hand
D. Not sure — suggest the standard set
X. Other (please specify)

[Answer]: A

---

## Consolidated Summary Confirmation

- Branching: short-lived branches merged into `main` one commit at a time (Q1: A)
- Thin end-to-end slice first: yes — infrastructure, the Bedrock call and a minimal journey page (Q2: A)
- Testing routine: tests first for journey validation, progress maths and the nudge rule; tests after the code for everything else, so the methodology is recorded as custom (Q3: B)
- Accessibility and Bedrock in tests: automated checks (axe or Lighthouse) plus a manual keyboard and screen-reader pass; Bedrock is faked in automated tests (Q4: A)
- Deployment: GitHub Actions runs the tests on every merge; you deploy from your own machine with `cdk deploy`, and no AWS keys are stored in GitHub (Q5: B)
- Code style: Black and Ruff for Python, Prettier and ESLint for any JavaScript or TypeScript, language-standard naming (Q6: A)

- Looks correct
- Request changes

[Answer]: Looks correct
