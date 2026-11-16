# Contract Design — Questions

## Sources

- Units: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work.md`
- Dependencies: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/units-generation/unit-of-work-dependency.md`
- Components: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- Requirements: `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md`

A contract is the agreement across a boundary: what crosses it, in what shape, and what happens when it goes wrong. Everything here ships in one codebase and one deploy, so most boundaries are agreements between pieces of code. The one that crosses the network is the interface between the browser and the backend, and the one that crosses to an outside service is the request to Amazon Nova on Bedrock.

## The boundaries found

| # | Boundary | Provider | Consumer | Kind |
|---|---|---|---|---|
| C1 | Browser to backend | The backend, built up across u1, u2, u3, u4 and u5 | The web app | HTTP interface, called over the network |
| C2 | The journey as it is stored and sent | u1 | The generator, the store and the web app | Shared data shape |
| C3 | Backend to Amazon Nova on Bedrock | Amazon Bedrock (outside) | The journey generator | Outside service we call |
| C4 | Generator to usage guard | u3 | The generator (u1) | In-code interface |
| C5 | Generator and handlers to journey store | u1, extended by u2, u3, u4 and u5 | The generator and the request handlers | In-code interface |

The questions below are about C1, with one about C3.

---

## Q1. [Architect] How does the browser name the learner's journey?

Each learner has one journey and an anonymous session ID made in the browser. The ID must reach the backend on every call.

A. A request header carries the session ID, and the journey is one fixed resource (`/journey`) (Recommended). The ID stays out of web addresses, so it does not end up in access logs or shared links.
B. The session ID is part of the web address (`/sessions/{id}/journey`). Easy to read when debugging, but the ID lands in logs and browser history.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q2. [Architect] How is the interface versioned and changed?

Everything deploys together, but a browser may still hold older cached page code while the backend is newer.

A. A `/v1` prefix on every address; inside v1 only additive changes are made, and the web app ignores fields it does not know (Recommended). The unit that owns a part of the interface must agree any breaking change before it is made.
B. No versioning: both sides always ship together. Simplest, but a cached page can break after a deploy.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q3. [Architect] How are errors reported?

The web app has to show different messages for a bad topic, a refused topic, the daily limit, a rate limit, a missing journey, and a failed save.

A. One error shape with a short stable code, a plain message and the usual web status (Recommended): codes such as `TOPIC_INVALID`, `TOPIC_NOT_ALLOWED`, `DAILY_LIMIT`, `RATE_LIMITED`, `NOT_FOUND`, `SAVE_FAILED`. The web app chooses its message from the code, not from the text.
B. Only the web status, with no body. Less to build, but the web app cannot tell a bad topic from a refused topic (both are client errors).
C. The standard problem-details format. More formal, with more fields than this app uses.
D. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q4. [Architect] How does the browser reach the backend address?

The page is served from one address and the backend runs behind another by default. How the two are tied together is an infrastructure choice, but the web app needs to know what form of address to call.

A. A relative address on the same site, such as `/api/v1/journey` (Recommended). The web app never needs to know a separate backend address, and no cross-site permission rules are needed. How it is routed is left to Infrastructure Design.
B. A separate full backend address, with the backend allowing calls from the site's address only. Works, but the web app needs the address at build time and the cross-site rules must be exactly right.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A

---

## Q5. [Architect] How is journey creation timed?

Making a journey can take up to 15 seconds including a retry. The backend's front door allows about 30 seconds per request.

A. One request that waits for the finished journey (Recommended): the 15-second limit leaves a comfortable margin, and there is one thing to build and test.
B. Start the work and let the browser check back until it is done. Copes with much longer waits, but needs a job record, a second call and more states for the screens, for no benefit at a 15-second limit.
C. Not sure — recommend one
X. Other (please specify)

[Answer]: A


---

## Consolidated Summary Confirmation

- Naming the journey: a request header carries the anonymous session ID, and the journey is one fixed resource, `/journey`, so the ID never appears in a web address (Q1: A)
- Versioning: a `/v1` prefix on every address; inside v1 only additive changes, the web app ignores fields it does not know, and a breaking change must be agreed by the unit that owns that part of the interface first (Q2: A)
- Errors: one error shape with a short stable code (`TOPIC_INVALID`, `TOPIC_NOT_ALLOWED`, `DAILY_LIMIT`, `RATE_LIMITED`, `NOT_FOUND`, `SAVE_FAILED`), a plain message and the usual web status; the web app picks its message from the code (Q3: A)
- Address: a relative address on the same site, such as `/api/v1/journey`; how it is routed is left to Infrastructure Design (Q4: A)
- Timing: one request that waits for the finished journey, inside the 15-second limit (Q5: A)

- Looks correct
- Request changes

[Answer]: Looks correct
