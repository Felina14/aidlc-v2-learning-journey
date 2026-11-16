#!/usr/bin/env python3
"""CDK app for the Learning Journey App: one stack in us-east-1.

Deploy with the alert email passed as context, never committed:
    cdk deploy -c budget_email=you@example.com
"""

import os

import aws_cdk as cdk
from stacks.journey_stack import JourneyStack

app = cdk.App()

budget_email = app.node.try_get_context("budget_email")
if not budget_email:
    raise ValueError("Pass the alert email as context: cdk synth -c budget_email=<address>")

JourneyStack(
    app,
    "LearningJourney",
    budget_email=str(budget_email),
    env=cdk.Environment(account=os.environ.get("CDK_DEFAULT_ACCOUNT"), region="us-east-1"),
)

app.synth()
