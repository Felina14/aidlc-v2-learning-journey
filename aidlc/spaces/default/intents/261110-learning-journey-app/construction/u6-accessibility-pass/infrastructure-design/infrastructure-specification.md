# Infrastructure Specification — u6-accessibility-pass

## Sources

- The earlier units' `infrastructure-specification.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/infrastructure-specification.md` and the four after it (the stack all of this unit's work lands in; all of it stays in force)
- `functional-spec.md`, `rules.md`, `frontend-components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u6-accessibility-pass/functional-design/`
- `components.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/domain-design/components.md`
- `contract-summary.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/contract-design/contract-summary.md` (no change)
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR1, NFR4, NFR5, NFR6, NFR9, NFR11)
- The built stack and workflow — `infra/stacks/journey_stack.py` and `.github/workflows/ci.yml` (read only, to check what exists)
- `team.md` and `project.md` — `aidlc/spaces/default/memory/`

This is a design. U6 is a verification unit with no new feature, so it adds nothing to the deployed system: no service, no route, no table change, no permission, no setting and no stack edit. The only delivery change is in the pipeline (see `cicd-pipeline.md`): the placeholder accessibility job is removed and its tests run in the frontend job. Fixes the checks justify are changes to the static page (`index.html`, `styles.css`, `src/`) and are deployed with the existing frontend build. Anything not listed here is unchanged.

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | No change | No backend change. |
| Ingress | No change; the site bucket, the front door and the API routes stay as built | A page fix ships in the same static build. |
| Storage | No change | No stored field is added or read differently. |
| Permissions | No change; the role keeps exactly GetItem, PutItem, UpdateItem and DeleteItem on the one table | Least privilege is unchanged. |
| Browser-only data | No change | Nothing new is stored in the browser. |
| Static assets | `index.html`, `styles.css` and the built script may change where a check requires a fix. No new asset, font or origin, and no inline style or script, because the stack's content security policy allows the site's own origin only | The page remains plain HTML, CSS and TypeScript with no framework. |
| Concurrency | No reserved concurrency; the account limit of 10 is the ceiling, as before | Unchanged decision. |
| Environments | One environment, one stack | Team practice. |
| IaC approach | No edit to `infra/stacks/journey_stack.py` is planned. The stack tests are re-run unchanged | If a fix ever needs a response header (for example a content-type or caching header on the site), it would be an edit here, and this document would be reopened; none is expected. |
| Teardown | No change: no resource is created, so `cdk destroy` still removes everything | NFR5. |
| Rollback | Redeploy the previous commit; a page fix has no data effect | A rollback needs no data change. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| Amazon S3 (site bucket) and CloudFront | static hosting | No change | The built page, with any accessibility fixes, is uploaded by the existing deploy. |
| API Gateway, Lambda, DynamoDB, Bedrock | the service | No change | Untouched. |
| GitHub Actions | checks | The placeholder accessibility job is removed and the accessibility tests run in the frontend job; no credentials added | See `cicd-pipeline.md`. |

### Shared Infrastructure

| Resource | Created by | Used by | Notes |
|---|---|---|---|
| Every resource of the stack | u1-skeleton and later units | u6 | U6 creates nothing and changes nothing. |

## Estimated Cost

| Item | Change | Notes |
|---|---|---|
| All AWS services | None | No new resource, request or metric. |
| GitHub Actions | The accessibility tests add some seconds to the frontend job, and no job is added | Inside the free allowance of a public repository (the project lives in one). |

NFR4 (under 10 dollars in total, near zero when idle) is unaffected.

## Assumptions & Open Questions

- [assumption] No stack change is needed. If the deploy-time Lighthouse run raises a finding that only a response header can fix, this stage is reopened for that finding; it is not expected, since the page is static and the earlier units already set the security headers they needed.
- [assumption] The axe package is a development dependency only; it is never in the built page or in the deployed bucket.
- None otherwise.
