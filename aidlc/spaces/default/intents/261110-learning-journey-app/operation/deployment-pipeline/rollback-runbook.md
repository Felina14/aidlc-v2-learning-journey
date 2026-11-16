# Rollback Runbook — Learning Journey App

## Sources

- `deployment-pipeline-questions.md`, `cd-config.md` and `deployment-strategy.md` in this folder (Q2 A, Q3 A)
- Each unit's `infrastructure-specification.md` and `cicd-pipeline.md` (the rollback and data notes) — `aidlc/spaces/default/intents/261110-learning-journey-app/construction/u1-skeleton/infrastructure-design/` and the units after it
- `requirements.md` — `aidlc/spaces/default/intents/261110-learning-journey-app/inception/requirements-analysis/requirements.md` (NFR4, NFR5)
- The stack — `infra/stacks/journey_stack.py` (the function is `JourneyFunction`; no reserved concurrency; the account limit of 10 is the ceiling)

Who runs this: the builder, from the builder's machine, with the AWS command line configured for the personal account. Nothing here runs from GitHub.

## Triggers

| Trigger | Go to |
|---|---|
| A deploy fails midway | Entry 1 (CloudFormation already rolls back; confirm it) |
| A deploy succeeds but the page, the API or journey creation is broken | Entry 2 |
| Spend or traffic is climbing, or a spend alert or the API 5xx or Lambda alarm fires and the cause is cost or abuse | Entry 3 first, then Entry 2 if a bug is the cause |
| The stack is left unusable and cannot be recovered by Entry 2 | Entry 4 |

## Entry 1 — A failed update

1. Open CloudFormation, stack `LearningJourney`, us-east-1. A failed update shows `UPDATE_ROLLBACK_COMPLETE`; the previous version is back with no action.
2. If it shows `UPDATE_ROLLBACK_FAILED`, read the failing resource's event, fix the cause (usually a permission or a resource that was changed outside the stack), and choose "Continue update rollback" in the console. Do not delete the stack.
3. Check: the CloudFront address loads and a journey can be created.

## Entry 2 — Redeploy the previous good commit (Q2 A)

1. Find the previous good commit: `git tag --list 'deploy-*' --sort=-creatordate | head -3`. The newest tag is the build now live; the one before it is the target. If there is only one tag, use the commit before the change that broke it.
2. Check it out in a separate work tree so your working tree is untouched: `git worktree add ../lj-rollback <tag>`.
3. In that folder run, each on its own: `npm --prefix frontend ci`, `npm --prefix frontend run build`, then in `infra`: `npx --yes aws-cdk@2.1148.0 deploy -c budget_email=<address> --require-approval any-change`.
4. Read the diff the CDK shows. It should be the reverse of the last deploy and nothing else.
5. Check, in order: the home screen loads over HTTPS; create a journey for an ordinary topic; reload and see the same journey; the alarms are not in alarm state.
6. Remove the work tree: `git worktree remove ../lj-rollback`.
7. Record what happened and the commit in the deploy record (Deployment Execution), and leave `main` as it is; fix forward with a new change and a new pull request.

**Data.** A deploy never changes stored data. No unit changed it in an incompatible way, with one known limit (recorded in the second and fifth units): after a rollback followed by a roll-forward, a journey made by the older code in between may hold an empty list for one attribute, and a milestone call on it ends as a quiet save failure until that journey is deleted or a new session is used. Accepted for a one-operator demo.

## Entry 3 — The concurrency brake (Q2 A)

Use this first when the problem is cost or abuse, not a bug. It stops all journey creation and every other call within seconds, without a deploy. The page then shows its normal error messages.

1. Find the function: `aws cloudformation describe-stack-resources --stack-name LearningJourney --region us-east-1 --query "StackResources[?ResourceType=='AWS::Lambda::Function' && starts_with(LogicalResourceId,'JourneyFunction')].PhysicalResourceId" --output text`.
2. Set the concurrency to zero: `aws lambda put-function-concurrency --function-name <name from step 1> --reserved-concurrent-executions 0 --region us-east-1`. Zero reserved concurrency does not reduce the account's unreserved pool, so the account limit of 10 does not block it.
3. Check: a call to the API answers an error and the Lambda `Invocations` metric stops rising.
4. To lift it: `aws lambda delete-function-concurrency --function-name <name> --region us-east-1`. Then check a journey can be created.
5. Note: the brake is a setting made outside the stack. The next `cdk deploy` leaves it as it is (the stack sets no reserved concurrency), so lift it by hand when the problem is fixed.

## Entry 4 — Rebuild from nothing

Journeys are demo data, so a rebuild is acceptable if the stack cannot be recovered.

1. `cdk destroy` from `infra` (`npx --yes aws-cdk@2.1148.0 destroy -c budget_email=<address>`). Everything in the stack is removed, including the table and the site bucket (removal policy `DESTROY`).
2. **Post-destroy cleanup (one command), about two minutes after the destroy finishes.** The two CDK helper functions run once during the destroy, and Lambda delivers their log lines a few seconds later, after their log groups are gone, so AWS creates the groups again (empty, no retention). Performance Validation found this twice (2026-11-11). Delete every log group with the stack's prefix:

   ```
   for g in $(aws logs describe-log-groups --log-group-name-prefix LearningJourney --region us-east-1 --query 'logGroups[].logGroupName' --output text); do aws logs delete-log-group --log-group-name "$g" --region us-east-1; done
   ```

3. Check the project's tagged resources and log groups are gone (NFR5): `aws resourcegroupstaggingapi get-resources --region us-east-1 --tag-filters Key=Project,Values=learning-journey` lists nothing, and `aws logs describe-log-groups --log-group-name-prefix LearningJourney --region us-east-1` lists nothing. The CDK bootstrap stack stays.
4. Deploy again with the deploy command in `cd-config.md` and run the smoke checks. The site gets a new CloudFront address, and the alarm email must be confirmed again.

## After any rollback

- Tag nothing: only a deploy that passed its smoke checks is tagged.
- Write down the cause and the fix in the next change's description.
- If a spend or abuse event caused it, check the AWS Budgets page (the daily and monthly budgets alert at 2 and 8 dollars) before lifting the brake.

## Assumptions & Open Questions

- [assumption] The commands in Entry 3 and Entry 4 were not run: this stage ran nothing against AWS. They are written from the stack's definition and AWS's documented command forms, and are first used (or first rehearsed) in Deployment Execution with the person's go-ahead.
- [assumption] The `JourneyFunction` logical ID prefix is what the stack sets; CDK adds a suffix to it, hence `starts_with` in the query.
- Open: nothing automated alerts you to a bad deploy except the stack's alarms; the smoke checks are manual.
- None otherwise.
