# Intent: Learning Journey

Build a web app where a learner types any professional topic ("Kubernetes", "data storytelling", "negotiation") and gets back a structured learning journey they can actually follow.

What the learner gets:
- A journey of 5-6 stages that climbs from fundamentals to practical mastery.
- For each stage: a short explanation (what it is, why it matters, what you can do after it), a small set of learning materials (reading, exercises, a mini project, a quiz), and a study plan with time estimates.
- A choice of teaching style (persona) before the journey is generated: a friendly guide, a structured instructor, or a planner focused on tracking.
- Progress tracking: mark stages complete and see progress update.
- Milestones and a completion certificate as they move through the journey.
- Goals with a target date, kept visible.
- Encouraging nudges when progress stalls (for example, below 50% with a goal date approaching), never guilt-driven.
- If AI generation is slow or unavailable, the app falls back to a structured template so the learner still gets a journey.

Constraints:
- Runs on AWS, serverless, deployed from infrastructure as code in one region.
- All AI generation uses Amazon Nova models on Amazon Bedrock only. No other model providers.
- Demo scale (tens of users), lowest reasonable cost, easy to tear down.
- Web front end, accessible (keyboard navigation, screen-reader friendly).

Out of scope for this build: native mobile apps, video generation, multi-language, instructor/admin consoles, payments.
