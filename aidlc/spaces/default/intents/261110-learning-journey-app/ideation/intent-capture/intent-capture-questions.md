# Intent Capture & Framing — Questions

## Sources

- [desc] Initial description: "Intent: Learning Journey Build a web app where a learner types any professional topic (\"Kubernetes\", \"data storytelling\", \"negotiation\") and gets back a structured learning journey they can actually follow. What the learner gets: - A journey of 5-6 stages that climbs from fundamentals to practical mastery. - For each stage: a short explanation (what it is, why it matters, what you can do after it), a small set of learning materials (reading, exercises, a mini project, a quiz), and a study plan with time estimates. - A choice of teaching style (persona) before the journey is generated: a friendly guide, a structured instructor, or a planner focused on tracking. - Progress tracking: mark stages complete and see progress update. - Milestones and a completion certificate as they move through the journey. - Goals with a target date, kept visible. - Encouraging nudges when progress stalls (for example, below 50% with a goal date approaching), never guilt-driven. - If AI generation is slow or unavailable, the app falls back to a structured template so the learner still gets a journey. Constraints: - Runs on AWS, serverless, deployed from infrastructure as code in one region. - All AI generation uses Amazon Nova models on Amazon Bedrock only. No other model providers. - Demo scale (tens of users), lowest reasonable cost, easy to tear down. - Web front end, accessible (keyboard navigation, screen-reader friendly). Out of scope for this build: native mobile apps, video generation, multi-language, instructor/admin consoles, payments."
- [scope] Workflow-selected scope: `feature`.

---

## Q1. [Product] Business problem

The description says a learner types a professional topic and gets a structured learning journey. What is the core pain point this solves — why do people today struggle to learn professional topics on their own, and what specifically is broken about how they currently do it?

A. No clear starting point — learners don't know where to begin or what to learn first
B. Overwhelming volume — too many resources with no path through them
C. No feedback or accountability — people start but drift without structure to keep them going
D. Generic content — courses and articles don't adapt to the specific topic they care about right now
E. All of the above — the app addresses the whole gap from "I want to learn X" to "I actually learned X"
X. Other (please specify)

[Answer]: E

---

## Q2. [Product] Primary customer and their situation

Who is the primary learner this targets — and what does their typical situation look like when they reach for this app?

A. Individual professional upskilling on their own time (evenings, weekends) — no employer mandate
B. Employee assigned a new skill or role who needs a quick ramp-up path
C. Career-changer who needs a structured plan to enter a new field
D. Student supplementing formal education with self-directed learning
E. All of the above — the app serves any self-directed adult learner
X. Other (please specify)

[Answer]: A

---

## Q3. [Product] Success metrics for this first version

What does success look like for this build? Which of these measures would tell you the app is working as intended?

A. A learner types a topic, gets a journey, and completes at least one stage within a session
B. Journey generation succeeds (or falls back gracefully) for any topic entered, every time
C. A learner sets a goal date, returns later, and sees their progress reflected correctly
D. The app remains accessible and usable on any modern browser with keyboard-only navigation
E. All of the above — the first version succeeds when all four hold
X. Other (please specify)

[Answer]: E

---

## Q4. [Product] Initiative trigger

What is the specific reason this app is being built now — what triggered this initiative?

A. Personal or team interest in a tool that doesn't yet exist for self-directed professional learning
B. Demonstrating Amazon Bedrock / Nova model capabilities in a real application
C. A portfolio or showcase project to explore serverless AWS architecture
D. An identified gap in available tools for structured, topic-agnostic learning paths
E. More than one of the above — it serves both a learning/showcase purpose and a real user need
X. Other (please specify)

[Answer]: E

---

## Q5. [Product] Key stakeholders and their interests

The description doesn't name explicit stakeholders beyond "the learner." For the purposes of building this, who else has a stake in what gets built and how?

A. Just the learner — this is a solo tool; no other stakeholder needs to review or approve the journey
B. The builder / product owner — cares that the architecture is clean, cost stays low, and it can be torn down easily
C. A small demo audience — potential users, interviewers, or colleagues who will evaluate the working app
D. Both B and C — the builder and a small audience whose feedback matters
E. Not yet defined
X. Other (please specify)

[Answer]: D

---

## Q6. [Product] Decision-making and scope authority

Who decides if a feature stays in or comes out of this first version — and is there a reporting cadence or communication requirement for this build?

A. Solo builder — one person makes all scope and priority decisions, no reporting cadence
B. Small team — two or three people; decisions are informal and synchronous
C. Larger group or organization — formal sign-off or review required before shipping
D. No communication requirement for this build; it ships when it is ready
E. Not applicable — this is a personal or exploratory project
X. Other (please specify)

[Answer]: A

---

## Q7. [Product] What this first version leaves out

The description already names explicit out-of-scope items: native mobile apps, video generation, multi-language support, instructor/admin consoles, and payments. The workflow-selected scope is `feature` [scope]. Beyond what is listed, are there any additional product capabilities or learner-facing features that should be explicitly left out of this first version?

A. No additional exclusions — the listed items plus the description's boundaries are sufficient
B. Social/community features (sharing journeys, following other learners, leaderboards)
C. Personalization or memory across separate journeys (the app starts fresh each time)
D. Integration with external learning platforms or LMSes
E. Multiple languages or localization beyond English
X. Other (please specify)

[Answer]: B, C, D

---

## Consolidated Summary Confirmation

- Core problem: all four pain points — no starting point, overwhelming resources, lack of accountability, and generic content (Q1: E)
- Primary customer: individual professional upskilling on their own time, evenings and weekends, no employer mandate (Q2: A)
- Success metrics: all four — journey generated and first stage completed; fallback works for any topic; goal-date progress persists; accessible via keyboard on any modern browser (Q3: E)
- Initiative trigger: multi-purpose — both a showcase of Bedrock/Nova and AWS serverless, and a response to a real gap in self-directed learning tools (Q4: E)
- Key stakeholders: the builder/product owner (cares about clean architecture, low cost, easy tear-down) and a small demo audience (potential users, interviewers, colleagues) (Q5: D)
- Scope authority: solo builder, one person decides, no reporting cadence (Q6: A)
- Additional exclusions beyond those in the description: social/community features, cross-journey memory/personalization, and integration with external learning platforms or LMSes (Q7: B, C, D)

- Looks correct
- Request changes

[Answer]: Looks correct

