# Learning Journey: a web app built end to end with AI-DLC v2

Learning Journey turns a topic you want to learn into a study plan you can follow. You type a topic such as
"Kubernetes" or "negotiation", pick a teaching style, and Amazon Nova Lite on Amazon Bedrock writes a plan of five
or six stages, from the basics to practical skill.

One person built it with AWS's AI-Driven Development Life Cycle (AI-DLC) v2.11.3, running in Kiro CLI. The build
started from a single paragraph, [`intent.md`](intent.md), at 13:08 IST on 10 November 2026. The site was live on
AWS at 22:15 on 11 November, and the last lifecycle stage closed at 23:36 that night. This repository holds the app's
code and the full AI-DLC record of how it came to exist.

## What the app does

- You enter a topic of 2 to 100 characters and choose a teaching style: friendly guide, structured instructor or planner.
- Nova Lite returns a plan in about 6 seconds (load-test median 6.2 s, slowest 13.7 s). Each stage has a short explanation, reading, exercises, a mini
  project, quiz questions and an hour estimate.
- You mark stages complete and the app saves your progress, with milestone banners at your first stage, the
  halfway point and the finish.
- You can set a goal date, and the app suggests a weekly pace in hours.
- When you finish, the app shows a certificate you can print, with an optional name that it does not store.
- If Bedrock is slow or unavailable, the app falls back to a built-in template so you still leave with a plan.
- The page works with a keyboard and a screen reader. Automated axe checks cover 36 screen states.

Architecture, all in one CDK stack in us-east-1:

| Layer | Service |
|---|---|
| Front end | TypeScript single-page app on S3, served by CloudFront |
| API | API Gateway HTTP API, throttled at 5 requests a second with a burst of 10 |
| Logic | One Python 3.12 Lambda function on arm64 |
| Data | One on-demand DynamoDB table; a TTL expires old plans after 90 days |
| AI | Amazon Nova Lite on Amazon Bedrock |
| Guard rails | Five new plans per learner per day, AWS Budgets alerts at $2 a day and $8 a month, CloudWatch alarms and a dashboard |

## What AI-DLC is

AI-DLC is an open-source method from AWS Labs ([awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows))
that runs an AI coding agent through the lifecycle a software team follows. Version 2 hands the order of work to
code: an orchestrator reads a state file and a stage graph, gives the agent one stage at a time, and waits for your
approval before it releases the next one.

Each stage follows the same loop:

1. A lead role writes its questions to a file, each with a recommended answer, and you answer in the file.
2. The lead role reads your answers back and asks you to confirm them before it writes anything.
3. It writes the stage's documents and tags each line with its source, such as `[desc]` for the original paragraph
   or `[Q3]` for an answer.
4. A reviewer role, a second agent that produces nothing of its own, checks the work and logs findings by severity.
5. You approve, or send the work back. The orchestrator records the result and releases the next stage.

The install adds role definitions for a product manager, architect, designer, delivery lead, developer, quality
engineer, release engineer, platform engineer and operations engineer, plus two reviewers: a product lead reviewer
and an architecture reviewer. The orchestrator picks which role leads each stage.

## How this build went

The orchestrator offered a 19-stage MVP plan and a 29-stage feature plan. The builder chose the feature plan. The
stages fall into four phases.

| Phase | What it decided or produced | Examples from this build |
|---|---|---|
| Ideation | What to build and what to leave out | The reviewer flagged "any modern browser" as untestable, so the product manager named the latest two releases of Chrome, Firefox, Safari and Edge. The product manager flagged the tension between the answer "all capabilities are must-have" and a four-day deadline, and turned the builder's "cut nice-to-haves first" into an order: nudges first, then milestones and the certificate. |
| Inception | Requirements, stories, domain design, six units of work and a build order | Reviewers raised 11 Major findings. One showed that saving a learner's whole record would let two quick clicks overwrite each other; the architect fixed the design before any code existed. The builder moved the API throttle and budget alerts into the first unit. |
| Construction | Design, code and tests for each unit, then build and test across the app and a CI pipeline | The architect proposed dropping the NFR Requirements and NFR Design stages, about 12 stage runs, and recorded the risk. The architecture reviewer found a security bug: invisible Unicode marks let a 9,002-character topic pass a 100-character check. The developer fixed it before deploy. |
| Operation | Deploy, smoke checks, monitoring, incident response, load test, feedback | CloudFormation created 61 resources in 247 seconds. Smoke check 9 failed because Nova Lite left out a field the prompt asked for only in prose; the developer moved it into the example JSON and redeployed in 50 seconds. 30 of 30 AI plans came back in under 14 seconds. |

Across the build, first reviews raised 45 Major findings: 1 in Ideation, 11 in Inception and 33 in Construction.
After the last fix, 627 Python and 651 front-end tests passed; the run before it measured 99.78% line coverage on both sides. The run used about 1,560 Kiro credits.

### Known gaps

The quality engineer recorded two requirements as not met:

- After `cdk destroy`, CDK's helper functions write late log lines and CloudWatch recreates their empty log groups.
  The rollback runbook has a one-line clean-up command (see below).
- API Gateway HTTP API throttling works on a best-effort basis: a burst of 30 reads all returned 200. The daily
  per-learner cap, the account's Lambda concurrency limit and the budget alerts still bound the cost.

## What is in this repository

| Path | Contents |
|---|---|
| `intent.md` | The one paragraph that started the build |
| `backend/` | Lambda source (`src/learning_journey/`) and pytest tests |
| `frontend/` | TypeScript app, styles, fonts, and Vitest tests including accessibility checks |
| `infra/` | CDK app in Python (`app.py`, `stacks/journey_stack.py`) and stack tests |
| `.github/workflows/ci.yml` | Lint, format, tests, dependency audits, a gitleaks secret scan and `cdk synth`, with actions pinned to commit SHAs |
| `aidlc/spaces/default/memory/` | The team rules AI-DLC wrote down, such as "fake Bedrock in tests" and "no AWS credentials in GitHub" |
| `aidlc/spaces/default/intents/261110-learning-journey-app/` | The AI-DLC record: each stage's questions and answers, documents, reviewer findings, the state file and the audit log |

The repository contains no AWS credentials, no account number and no email address. You pass the alert email at
deploy time. This repository leaves out AI-DLC's own framework files (`.kiro/`, `AGENTS.md`) because `aidlc config` regenerates them.

## Run it yourself

You need an AWS account with Amazon Bedrock access to Nova Lite in us-east-1, Python 3.12, Node 24 and the AWS CLI
signed in to your account.

Check Bedrock access first:

```bash
aws bedrock-runtime converse --region us-east-1 --model-id us.amazon.nova-lite-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Say ok"}]}]' \
  --query "output.message.content[0].text"
```

Install, test and build:

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt -r infra/requirements.txt
pytest backend/tests infra/tests -q --cov=backend/src/learning_journey
npm --prefix frontend ci
npm --prefix frontend run coverage
npm --prefix frontend run build          # writes frontend/dist, which the stack uploads
```

Deploy. CDK asks you to confirm the changes; the budget alerts and alarms go to the email you pass:

```bash
cd infra
npx --yes aws-cdk@2.1148.0 bootstrap
npx --yes aws-cdk@2.1148.0 deploy -c budget_email=you@example.com
```

The stack prints the CloudFront address when it finishes. In this build's account, the idle stack cost under $0.01 a day.

Tear it down:

```bash
cd infra
npx --yes aws-cdk@2.1148.0 destroy -c budget_email=you@example.com
for g in $(aws logs describe-log-groups --log-group-name-prefix LearningJourney --region us-east-1 \
  --query 'logGroups[].logGroupName' --output text); do
  aws logs delete-log-group --log-group-name "$g" --region us-east-1
done
```

## Rebuild it with AI-DLC

To run the same process on your own idea, you need Kiro CLI 3.x with enough credits for a full lifecycle.

```bash
curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh
aidlc --version                    # this build used 2.11.3; keep one version for a whole build
mkdir my-app && cd my-app && git init
aidlc config --harness kiro-ide    # writes .kiro/ and AGENTS.md for Kiro CLI 3.x
aidlc doctor
kiro-cli --v3
```

In Kiro, run `/aidlc --doctor`, then type `/aidlc` and paste your paragraph. Write it the way `intent.md` is written:
what your user gets, your constraints, and an explicit out-of-scope line. When AI-DLC asks how you want to answer,
choose "I'll edit the file", put a letter after each `[Answer]:` and type `done`. At each gate, fix the Major
findings and compare the stage's output with your decisions from earlier stages.

If you stop part way, resume with `kiro-cli --v3 --resume-id <session id>` and type `carry on`. AI-DLC keeps its
progress in `aidlc-state.md`, outside the chat, so a stop loses no work.
