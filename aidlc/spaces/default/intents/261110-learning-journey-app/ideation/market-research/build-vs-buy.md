# Build vs. Buy Assessment — Learning Journey App

## Sources

- [desc] Initial description (intent-capture stage)
- [Q5] Build vs. buy for core capabilities

---

## Summary Decision

| Capability | Decision | Rationale |
|---|---|---|
| AI journey generation | Use Bedrock directly (mandated) | Amazon Nova on Bedrock is a hard constraint; no third-party AI provider is permitted [desc][Q5] |
| Progress persistence (state) | Build — custom serverless state layer | Custom DynamoDB or similar; Bedrock is not a wrapper — the state layer is distinct and must be built [Q5] |
| Frontend | Build | Standard web frontend; no off-the-shelf learning UI that fits the specific journey UX [desc] |
| Infrastructure / deployment | IaC (CDK or SAM) | Fits the "easy to tear down, single-region, serverless" constraint; no managed platform (Amplify, etc.) required [desc] |
| Authentication | Minimal or none | Demo scale; no user identity system required; progress can be session-scoped or keyed to a lightweight identifier [desc][assumption] |

---

## AI Journey Generation — Bedrock / Nova (Use / Integrate)

**Decision: Use Amazon Bedrock with Nova models directly.**

This is a constraint, not a choice — the description mandates Amazon Nova models on Amazon Bedrock and excludes all other model providers. [desc]

| Factor | Assessment |
|---|---|
| Core differentiator? | Yes — the AI generation is what makes the app distinctive; but the _model_ is not the differentiator, the _journey structure_ is. Using Bedrock vs. another provider does not change the user value. |
| Time to market | Bedrock integration is fast; SDK is straightforward |
| Cost | Nova models are positioned as cost-efficient for demo scale; costs scale with usage, not with idle infrastructure |
| Customization needed | Prompt engineering is required to get structured journey output; this is build work on top of a managed model |
| Data sensitivity | All AI processing stays within AWS; no data leaves to third-party AI providers [desc] |
| Maintenance burden | AWS manages the model; prompt versioning is the main ongoing concern |

**Conclusion:** Use Bedrock directly. No wrapper or abstraction layer is needed at demo scale. [Q5]

---

## Progress Persistence — Custom State Layer (Build)

**Decision: Build a lightweight custom state layer using DynamoDB (or equivalent serverless store).**

The app needs to persist: a learner's journey (topic, stages, materials), stage completion status, goal date, and milestone/certificate state. This is not a commodity capability that an off-the-shelf service handles end-to-end for this specific data shape. [Q5][desc]

| Factor | Assessment |
|---|---|
| Core differentiator? | No — persistence is table-stakes; the differentiator is what is persisted (journey + progress), not the storage mechanism |
| Time to market | A simple DynamoDB table with a session key is fast to build; no schema migration complexity at demo scale |
| Cost | DynamoDB on-demand pricing is effectively zero at demo scale (tens of users) |
| Customization needed | Moderate — needs to store a structured journey document and update stage-completion flags |
| Data sensitivity | Learner topic and progress are low-sensitivity data; no PII beyond what the learner chooses to enter |
| Maintenance burden | Low; DynamoDB is fully managed |

**Alternatives considered:**
- **Amplify DataStore / AppSync**: Would add complexity (GraphQL schema, real-time sync) that is not needed at demo scale. Rejected. [assumption]
- **Client-side only (localStorage)**: Simpler, but progress would be lost if the learner switches browser or device. Rejected unless architecture review decides otherwise.
- **Third-party learning platform API**: Not suitable; no platform API covers the specific journey structure this app generates. Rejected. [Q5]

**Conclusion:** Build a custom serverless state layer. Keep it simple — a single DynamoDB table keyed by session or learner identifier. [Q5]

---

## Infrastructure — IaC (CDK or SAM)

**Decision: Deploy everything via Infrastructure as Code (AWS CDK or SAM).**

The constraint "deployed from infrastructure as code in one region" and "easy to tear down" makes IaC the only viable approach. All AWS resources (Lambda, API Gateway, DynamoDB, S3/CloudFront for frontend) are defined in code and deployed as a single stack. [desc]

**Conclusion:** Use CDK or SAM. Architecture stage will decide which. [desc]

---

## Fallback Template — Build

**Decision: Build a structured template fallback into the application.**

The description explicitly requires a fallback when AI is slow or unavailable. This is not a buy decision — it is application logic that generates a reasonable generic journey structure from a topic name, without calling Bedrock. [desc]

**Conclusion:** Build a template-based fallback as part of the journey generation service. [desc]

---

## Assumptions & Open Questions

- [assumption] "Build custom state layer" assumes server-side persistence is required. If the architecture review concludes that client-side localStorage is sufficient for demo scale, the DynamoDB layer can be dropped. This is a decision to revisit during Feasibility & Constraints.
- [assumption] Authentication is not required for this build. Progress is tracked per session or via a lightweight anonymous identifier. If the builder later wants cross-device progress, a minimal auth mechanism (Cognito guest identities or a simple token) would be added — but this is out of scope now.
- [assumption] CDK and SAM are both viable IaC options. The architecture stage will make the final call based on team familiarity and the complexity of the resource graph.
