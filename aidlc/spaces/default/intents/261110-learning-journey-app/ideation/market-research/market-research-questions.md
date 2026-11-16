# Market Research — Questions

## Sources

- [desc] Initial description: "Intent: Learning Journey Build a web app where a learner types any professional topic (\"Kubernetes\", \"data storytelling\", \"negotiation\") and gets back a structured learning journey they can actually follow."
- [scope] Workflow-selected scope: `feature`.

---

## Q1. [Product] Competing products and tools

What products or tools do learners use today when they want a structured path to learn a professional topic? Which of these most directly compete with what this app does?

A. General-purpose learning platforms (Coursera, Udemy, LinkedIn Learning) — structured courses but fixed curricula, not topic-generated on demand
B. AI chat tools (ChatGPT, Claude) — can be prompted for a learning plan but offer no persistence, progress tracking, or milestones
C. Curated roadmap sites (roadmap.sh, LearnXinYMinutes) — fixed roadmaps for specific tech topics, not AI-generated or personalized
D. Personal knowledge tools (Notion, Obsidian with templates) — learners build their own plans, requires significant self-setup
E. All of the above are relevant competitors; no single one does exactly what this app does
X. Other (please specify)

[Answer]: E

---

## Q2. [Product] Key differentiator vs. existing tools

Given the competitors above, what does this app do that none of them do well today?

A. Generates a structured journey for any professional topic on demand, without the user finding or curating resources themselves
B. Combines AI-generated content with progress tracking, goal dates, and milestone rewards in one place
C. Offers a fallback template so the learner always gets something useful even when AI is unavailable
D. Applies a chosen teaching style (persona) that shapes how the journey is presented
E. All of the above together — the differentiator is the combination
X. Other (please specify)

[Answer]: E

---

## Q3. [Product] Industry trends relevant to this build

Which of these trends most directly support the value proposition or the technical choices in this app?

A. Growth in self-directed learning and "learn on your own terms" tools, driven by remote work and career transitions
B. Rapid adoption of AI content generation in education and productivity tools
C. Serverless-first architectures on AWS becoming the default for cost-sensitive demo-scale projects
D. Amazon Bedrock and Nova models as a credible, AWS-native alternative to third-party AI providers
E. All of the above are relevant; each strengthens a different dimension of the app's positioning
X. Other (please specify)

[Answer]: E

---

## Q4. [Product] Table-stakes vs. differentiators for target users

For the individual professional upskilling on their own time, what do they expect as the minimum bar (table-stakes) from any learning tool, vs. what would make this app stand out?

A. Table-stakes: works reliably, loads quickly, doesn't lose progress; differentiator: AI-generated journeys tailored to any topic in seconds
B. Table-stakes: covers the topic they care about; differentiator: stages them from fundamentals to mastery with time estimates
C. Table-stakes: free or very low cost; differentiator: a personalized teaching style they can choose
D. Table-stakes: mobile-friendly and accessible; differentiator: milestones and a certificate that feel rewarding, not just cosmetic
E. All of the above — the full combination is what makes the app worth returning to
X. Other (please specify)

[Answer]: A

---

## Q5. [Product] Build vs. buy for core capabilities

For the two most expensive-to-build capabilities — AI journey generation and progress persistence — what is the right build/buy/integrate stance?

A. Build both: custom Bedrock integration for AI, custom DynamoDB or similar for state — full control, fits the AWS-native constraint
B. Buy the AI side (use Bedrock directly, not a wrapper), build the state layer — Bedrock is the mandated provider anyway
C. Use a third-party learning platform API for the journey structure and add AI on top — reduces build scope
D. Build AI, use a managed state service (e.g., Amplify DataStore, AppSync) for persistence — minimizes ops burden
E. Not decided — needs further analysis during architecture
X. Other (please specify)

[Answer]: B

---

## Q6. [Product] Target audience size and reach

This build targets demo scale (tens of users). Is there a longer-term addressable audience worth noting in the market research, even if it won't be acted on in this version?

A. Yes — individual self-directed learners is a large and growing segment; a future production version could serve thousands
B. Yes — the AWS/Bedrock showcase angle could attract enterprise teams running internal learning programs
C. Yes — both of the above represent distinct future market segments
D. No — this is purely a demo/portfolio project with no planned scale-up; market sizing is not relevant
E. Not yet defined
X. Other (please specify)

[Answer]: C

---

## Q7. [Product] Regulatory or compliance considerations

Are there any regulatory, compliance, or data-handling concerns that should inform the market positioning or architecture — for example, handling learner data, AI-generated content accuracy, or accessibility mandates?

A. No — demo scale, no PII collected beyond what a learner enters themselves; WCAG accessibility is the main public standard that applies
B. Yes — GDPR/privacy considerations apply even at demo scale if the app stores any user data
C. Yes — AI-generated educational content carries a responsibility to flag that content is AI-generated and may need verification
D. Both B and C
E. Not applicable — this is a personal portfolio project with no regulatory exposure
X. Other (please specify)

[Answer]: D

---

## Consolidated Summary Confirmation

- Competitors: all four categories apply — general learning platforms, AI chat tools, curated roadmap sites, and personal knowledge tools; none does exactly what this app does (Q1: E)
- Key differentiator: the combination of all four — on-demand AI journey generation for any topic, combined with progress tracking + goal dates + milestones, a fallback template, and a choosable teaching style (Q2: E)
- Supporting trends: all four — growth of self-directed learning, AI content adoption in education, serverless-first AWS architectures, and Bedrock/Nova as a credible AWS-native AI provider (Q3: E)
- Table-stakes vs. differentiator: the core bar is reliability, speed, and not losing progress; the standout differentiator is AI-generated journeys tailored to any topic in seconds (Q4: A)
- Build vs. buy: use Bedrock directly for AI (mandated anyway); build a custom state layer (DynamoDB or similar) for progress persistence (Q5: B)
- Longer-term market: two distinct future segments — individual self-directed learners (thousands) and enterprise teams running internal learning programs (Q6: C)
- Compliance: GDPR/privacy applies even at demo scale if any user data is stored; AI-generated educational content should be flagged as AI-generated (Q7: D)

- Looks correct
- Request changes

[Answer]: Looks correct

