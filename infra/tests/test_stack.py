"""CDK assertion tests for the single stack (BR7.1 to BR7.5, NFR4 to NFR6). No AWS calls."""

import os
import subprocess
import sys
from pathlib import Path

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template
from stacks.journey_stack import JourneyStack

INFRA_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def template(tmp_path_factory) -> Template:
    dist = tmp_path_factory.mktemp("dist")
    (dist / "index.html").write_text("<p>test</p>")
    app = cdk.App()
    stack = JourneyStack(
        app,
        "LearningJourneyTest",
        budget_email="alerts@example.com",
        frontend_dist=dist,
        env=cdk.Environment(account="123456789012", region="us-east-1"),
    )
    return Template.from_stack(stack)


def resources(template: Template, type_name: str) -> dict:
    return template.find_resources(type_name)


def test_api_throttle_is_rate_5_burst_10(template):
    template.has_resource_properties(
        "AWS::ApiGatewayV2::Stage",
        {"DefaultRouteSettings": {"ThrottlingRateLimit": 5, "ThrottlingBurstLimit": 10}},
    )


def test_function_has_no_reserved_concurrency_because_the_account_limit_is_10(template):
    functions = resources(template, "AWS::Lambda::Function")
    journey = [
        f for f in functions.values() if f["Properties"].get("Handler", "").startswith("learning")
    ]
    assert len(journey) == 1
    props = journey[0]["Properties"]
    assert "ReservedConcurrentExecutions" not in props
    assert all("ReservedConcurrentExecutions" not in f["Properties"] for f in functions.values())
    assert props["Runtime"] == "python3.12" and props["Architectures"] == ["arm64"]
    assert props["MemorySize"] == 512 and props["Timeout"] == 25
    environment = props["Environment"]["Variables"]
    assert environment["MODEL_ID"] == "amazon.nova-lite-v1:0"
    assert environment["BEDROCK_TIMEOUT"] == "12" and "TABLE_NAME" in environment


def test_table_is_on_demand_expires_on_expires_at_and_is_destroyed_with_the_stack(template):
    template.has_resource(
        "AWS::DynamoDB::Table",
        {
            "Properties": {
                "BillingMode": "PAY_PER_REQUEST",
                "TimeToLiveSpecification": {"AttributeName": "expiresAt", "Enabled": True},
                "KeySchema": [
                    {"AttributeName": "sessionId", "KeyType": "HASH"},
                    {"AttributeName": "sk", "KeyType": "RANGE"},
                ],
            },
            "DeletionPolicy": "Delete",
            "UpdateReplacePolicy": "Delete",
        },
    )


def test_site_bucket_is_private_and_empties_itself_on_destroy(template):
    template.has_resource(
        "AWS::S3::Bucket",
        {
            "Properties": {
                "PublicAccessBlockConfiguration": {
                    "BlockPublicAcls": True,
                    "BlockPublicPolicy": True,
                    "IgnorePublicAcls": True,
                    "RestrictPublicBuckets": True,
                }
            },
            "DeletionPolicy": "Delete",
        },
    )
    template.resource_count_is("Custom::S3AutoDeleteObjects", 1)
    template.has_resource_properties(
        "AWS::S3::BucketPolicy",
        {
            "PolicyDocument": {
                "Statement": Match.array_with(
                    [Match.object_like({"Principal": {"Service": "cloudfront.amazonaws.com"}})]
                )
            }
        },
    )


def test_every_log_group_is_destroyed_with_the_stack_and_kept_14_days(template):
    groups = resources(template, "AWS::Logs::LogGroup")
    assert len(groups) >= 4  # function, API access, site upload helper, bucket helper
    for group in groups.values():
        assert group["DeletionPolicy"] == "Delete" and group["UpdateReplacePolicy"] == "Delete"
        assert group["Properties"]["RetentionInDays"] == 14


def test_every_function_writes_to_one_of_those_log_groups(template):
    group_ids = set(resources(template, "AWS::Logs::LogGroup"))
    functions = resources(template, "AWS::Lambda::Function")
    assert len(functions) == 3  # the journey function and two helpers
    for function in functions.values():
        assert function["Properties"]["LoggingConfig"]["LogGroup"]["Ref"] in group_ids


def test_site_redirects_http_to_https_and_the_api_path_is_not_cached(template):
    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "DefaultCacheBehavior": {"ViewerProtocolPolicy": "redirect-to-https"},
                "CacheBehaviors": [
                    Match.object_like(
                        {
                            "PathPattern": "/api/*",
                            "ViewerProtocolPolicy": "redirect-to-https",
                            "AllowedMethods": Match.array_with(["GET", "PUT", "POST"]),
                        }
                    )
                ],
                "Origins": Match.array_with(
                    [
                        Match.object_like(
                            {"CustomOriginConfig": Match.object_like({"OriginReadTimeout": 30})}
                        )
                    ]
                ),
            }
        },
    )
    template.has_resource_properties(
        "AWS::CloudFront::OriginRequestPolicy",
        {
            "OriginRequestPolicyConfig": Match.object_like(
                {"HeadersConfig": {"HeaderBehavior": "whitelist", "Headers": ["X-Session-Id"]}}
            )
        },
    )
    template.has_resource_properties(
        "AWS::CloudFront::ResponseHeadersPolicy",
        {
            "ResponseHeadersPolicyConfig": Match.object_like(
                {
                    "SecurityHeadersConfig": Match.object_like(
                        {
                            "ContentTypeOptions": {"Override": True},
                            "ReferrerPolicy": Match.object_like({"Override": True}),
                            "ContentSecurityPolicy": Match.object_like(
                                {
                                    "ContentSecurityPolicy": Match.string_like_regexp(
                                        "script-src 'self'"
                                    )
                                }
                            ),
                        }
                    )
                }
            )
        },
    )


def test_role_names_one_model_and_exact_table_actions_with_no_wildcards(template):
    statements = []
    for policy in resources(template, "AWS::IAM::Policy").values():
        statements += policy["Properties"]["PolicyDocument"]["Statement"]
    bedrock = [s for s in statements if "bedrock:InvokeModel" in str(s["Action"])]
    assert len(bedrock) == 1
    assert bedrock[0]["Action"] == "bedrock:InvokeModel"
    assert len(bedrock[0]["Resource"]) == 2 and "*" not in str(bedrock[0]["Resource"])
    assert "foundation-model/amazon.nova-lite-v1:0" in str(bedrock[0]["Resource"])
    dynamo = [s for s in statements if "dynamodb" in str(s["Action"])]
    assert dynamo[0]["Action"] == [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
    ]
    assert not any(a == "*" or str(a).endswith(":*") for s in statements for a in _actions(s))


def _actions(statement):
    actions = statement["Action"]
    return [actions] if isinstance(actions, str) else actions


def test_budgets_alert_at_2_dollars_a_day_and_8_dollars_a_month(template):
    budgets = {
        b["Properties"]["Budget"]["TimeUnit"]: b["Properties"]
        for b in resources(template, "AWS::Budgets::Budget").values()
    }
    assert budgets["DAILY"]["Budget"]["BudgetLimit"] == {"Amount": 2, "Unit": "USD"}
    assert budgets["MONTHLY"]["Budget"]["BudgetLimit"] == {"Amount": 8, "Unit": "USD"}
    for props in budgets.values():
        notification = props["NotificationsWithSubscribers"][0]["Notification"]
        assert notification["NotificationType"] == "ACTUAL"
        assert (
            props["NotificationsWithSubscribers"][0]["Subscribers"][0]["SubscriptionType"]
            == "EMAIL"
        )


def test_alarms_for_errors_5xx_template_fallbacks_and_guard_ignore_missing_data(template):
    alarms = resources(template, "AWS::CloudWatch::Alarm")
    assert len(alarms) == 4
    for alarm in alarms.values():
        assert alarm["Properties"]["TreatMissingData"] == "notBreaching"
        assert alarm["Properties"]["AlarmActions"]
    thresholds = sorted(a["Properties"]["Threshold"] for a in alarms.values())
    assert thresholds == [1, 1, 1, 3]
    template.has_resource_properties(
        "AWS::CloudWatch::Alarm", {"MetricName": "JourneysTemplate", "Period": 3600}
    )
    template.resource_count_is("AWS::Logs::MetricFilter", 14)  # U4 adds two goal filters
    template.has_resource_properties(
        "AWS::CloudWatch::Dashboard", {"DashboardName": "learning-journey"}
    )


def test_every_taggable_resource_carries_the_project_tag(template):
    tagged = {"Key": "Project", "Value": "learning-journey"}
    for type_name in (
        "AWS::DynamoDB::Table",
        "AWS::S3::Bucket",
        "AWS::Lambda::Function",
        "AWS::SNS::Topic",
        "AWS::CloudFront::Distribution",
        "AWS::IAM::Role",
    ):
        for name, resource in resources(template, type_name).items():
            assert tagged in resource["Properties"].get("Tags", []), name
    template.has_resource_properties(
        "AWS::ApiGatewayV2::Stage", {"Tags": {"Project": "learning-journey"}}
    )


def test_the_app_refuses_to_synthesise_without_the_budget_email():
    result = subprocess.run(
        [sys.executable, "app.py"],
        cwd=INFRA_DIR,
        capture_output=True,
        text=True,
        env={**os.environ, "JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION": "1"},
        check=False,
    )
    assert result.returncode != 0
    assert "budget_email" in result.stderr


# -- U2: the completion route, permission, metrics and widget (NFR2, NFR6, NFR10) ---------------


def metric_filters(template: Template) -> dict:
    return {
        f["Properties"]["MetricTransformations"][0]["MetricName"]: f["Properties"]
        for f in resources(template, "AWS::Logs::MetricFilter").values()
    }


def test_the_completion_route_is_a_put_on_the_same_integration_as_the_other_routes(template):
    routes = {
        r["Properties"]["RouteKey"]: r["Properties"]
        for r in resources(template, "AWS::ApiGatewayV2::Route").values()
    }
    key = "PUT /api/v1/journey/stages/{stageNumber}/completion"
    assert key in routes
    assert {"GET /api/v1/journey", "POST /api/v1/journey"} <= set(routes)
    assert routes[key]["Target"] == routes["GET /api/v1/journey"]["Target"]
    template.resource_count_is("AWS::ApiGatewayV2::Integration", 1)


def test_update_item_is_allowed_on_the_one_table_with_no_wildcard(template):
    table_arn_ref = next(iter(resources(template, "AWS::DynamoDB::Table")))
    statements = []
    for policy in resources(template, "AWS::IAM::Policy").values():
        statements += policy["Properties"]["PolicyDocument"]["Statement"]
    update = [s for s in statements if "dynamodb:UpdateItem" in _actions(s)]
    assert len(update) == 1
    assert update[0]["Resource"] == {"Fn::GetAtt": [table_arn_ref, "Arn"]}
    assert all(not a.endswith("*") for a in _actions(update[0]))
    assert "*" not in str(update[0]["Resource"])


def test_the_front_door_still_allows_put_and_forwards_the_session_header(template):
    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "CacheBehaviors": [
                    Match.object_like(
                        {
                            "PathPattern": "/api/*",
                            "AllowedMethods": [
                                "GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"
                            ],
                        }
                    )
                ]
            }
        },
    )  # fmt: skip
    template.has_resource_properties(
        "AWS::CloudFront::OriginRequestPolicy",
        {
            "OriginRequestPolicyConfig": Match.object_like(
                {"HeadersConfig": {"HeaderBehavior": "whitelist", "Headers": ["X-Session-Id"]}}
            )
        },
    )


def test_completion_filters_use_json_patterns_with_the_route_wildcard(template):
    filters = metric_filters(template)
    ok = filters["CompletionOk"]["FilterPattern"]
    failed = filters["CompletionSaveFailed"]["FilterPattern"]
    timing = filters["CompletionTimeMs"]["FilterPattern"]
    for pattern in (ok, failed, timing):
        assert '$.event = "request"' in pattern
        assert '$.route = "PUT /api/v1/journey/stages/*"' in pattern
    assert '$.outcome = "ok"' in ok and '$.outcome = "SAVE_FAILED"' in failed
    assert "$.outcome" not in timing
    for name in ("CompletionOk", "CompletionSaveFailed", "CompletionTimeMs"):
        transformation = filters[name]["MetricTransformations"][0]
        assert transformation["MetricNamespace"] == "LearningJourney"


def test_the_time_metric_takes_total_ms_and_has_no_default_value(template):
    filters = metric_filters(template)
    timing = filters["CompletionTimeMs"]["MetricTransformations"][0]
    assert timing["MetricValue"] == "$.total_ms"
    assert "DefaultValue" not in timing
    for name in ("CompletionOk", "CompletionSaveFailed"):
        counting = filters[name]["MetricTransformations"][0]
        assert counting["MetricValue"] == "1" and counting["DefaultValue"] == 0


def test_the_dashboard_has_a_completion_widget(template):
    dashboard = next(iter(resources(template, "AWS::CloudWatch::Dashboard").values()))
    body = str(dashboard["Properties"]["DashboardBody"])
    for name in ("CompletionOk", "CompletionSaveFailed", "CompletionTimeMs", "p95"):
        assert name in body


def test_u2_and_u3_add_no_resource_type_and_no_reserved_concurrency(template):
    assert "ReservedConcurrentExecutions" not in str(resources(template, "AWS::Lambda::Function"))
    template.resource_count_is("AWS::DynamoDB::Table", 1)
    template.resource_count_is("AWS::Lambda::Function", 3)  # the journey function and two helpers
    template.resource_count_is("AWS::CloudWatch::Alarm", 4)  # U3 adds the guard alarm


# -- U3: the delete method, its permission, the new filters, alarm and dashboard line -----------


def test_the_journey_route_gains_delete_on_the_same_integration(template):
    routes = {
        r["Properties"]["RouteKey"]: r["Properties"]
        for r in resources(template, "AWS::ApiGatewayV2::Route").values()
    }
    assert "DELETE /api/v1/journey" in routes
    assert routes["DELETE /api/v1/journey"]["Target"] == routes["GET /api/v1/journey"]["Target"]
    template.resource_count_is("AWS::ApiGatewayV2::Integration", 1)


def test_delete_item_is_allowed_on_the_one_table_and_the_list_is_exact(template):
    table_ref = next(iter(resources(template, "AWS::DynamoDB::Table")))
    statements = []
    for policy in resources(template, "AWS::IAM::Policy").values():
        statements += policy["Properties"]["PolicyDocument"]["Statement"]
    table_statements = [
        s for s in statements if any(a.startswith("dynamodb:") for a in _actions(s))
    ]
    assert len(table_statements) == 1
    assert sorted(_actions(table_statements[0])) == [
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
    ]
    assert table_statements[0]["Resource"] == {"Fn::GetAtt": [table_ref, "Arn"]}


def test_the_front_door_allows_delete_and_caches_nothing_under_api(template):
    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "CacheBehaviors": [
                    Match.object_like(
                        {"PathPattern": "/api/*", "AllowedMethods": Match.array_with(["DELETE"])}
                    )
                ]
            }
        },
    )


def test_the_daily_limit_and_guard_filters_use_json_patterns_and_default_to_zero(template):
    filters = metric_filters(template)
    limit = filters["DailyLimitHit"]
    guard = filters["GuardSkipped"]
    assert limit["FilterPattern"] == '{ $.event = "request" && $.outcome = "DAILY_LIMIT" }'
    assert guard["FilterPattern"] == '{ $.event = "guard_skipped" }'
    for props in (limit, guard):
        transformation = props["MetricTransformations"][0]
        assert transformation["MetricNamespace"] == "LearningJourney"
        assert transformation["MetricValue"] == "1" and transformation["DefaultValue"] == 0


def test_the_guard_alarm_fires_on_one_skip_in_an_hour_and_mails_the_same_topic(template):
    alarms = resources(template, "AWS::CloudWatch::Alarm")
    guard = [
        a["Properties"] for a in alarms.values() if a["Properties"]["MetricName"] == "GuardSkipped"
    ]
    assert len(guard) == 1
    props = guard[0]
    assert props["Threshold"] == 1 and props["Period"] == 3600 and props["EvaluationPeriods"] == 1
    assert props["ComparisonOperator"] == "GreaterThanOrEqualToThreshold"
    assert props["TreatMissingData"] == "notBreaching"
    assert props["Namespace"] == "LearningJourney" and props["Statistic"] == "Sum"
    other_actions = {
        str(a["Properties"]["AlarmActions"])
        for a in alarms.values()
        if a["Properties"] is not props
    }
    assert str(props["AlarmActions"]) in other_actions  # the same SNS topic as the others


def test_the_dashboard_shows_the_daily_limit_and_guard_skipped_line(template):
    dashboard = next(iter(resources(template, "AWS::CloudWatch::Dashboard").values()))
    body = str(dashboard["Properties"]["DashboardBody"])
    assert "DailyLimitHit" in body and "GuardSkipped" in body


# -- U4: the goal route, its two metric filters and dashboard line (NFR2, NFR10) -----------------


def test_the_goal_route_is_a_put_on_the_same_integration(template):
    routes = {
        r["Properties"]["RouteKey"]: r["Properties"]
        for r in resources(template, "AWS::ApiGatewayV2::Route").values()
    }
    key = "PUT /api/v1/journey/goal"
    assert key in routes
    assert routes[key]["Target"] == routes["GET /api/v1/journey"]["Target"]
    assert (
        routes[key]["Target"]
        == routes["PUT /api/v1/journey/stages/{stageNumber}/completion"]["Target"]
    )
    template.resource_count_is("AWS::ApiGatewayV2::Integration", 1)


def test_the_goal_and_milestone_routes_are_the_only_routes_beyond_the_earlier_units(template):
    routes = {
        r["Properties"]["RouteKey"]
        for r in resources(template, "AWS::ApiGatewayV2::Route").values()
    }
    assert routes == {
        "GET /api/v1/journey",
        "POST /api/v1/journey",
        "DELETE /api/v1/journey",
        "PUT /api/v1/journey/stages/{stageNumber}/completion",
        "PUT /api/v1/journey/goal",
        "PUT /api/v1/journey/milestones",
    }


def test_the_table_permission_is_unchanged_by_the_goal_route(template):
    table_ref = next(iter(resources(template, "AWS::DynamoDB::Table")))
    statements = []
    for policy in resources(template, "AWS::IAM::Policy").values():
        statements += policy["Properties"]["PolicyDocument"]["Statement"]
    table_statements = [
        s for s in statements if any(a.startswith("dynamodb:") for a in _actions(s))
    ]
    assert len(table_statements) == 1
    assert sorted(_actions(table_statements[0])) == [
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
    ]
    assert table_statements[0]["Resource"] == {"Fn::GetAtt": [table_ref, "Arn"]}
    assert "*" not in str(table_statements[0]["Resource"])


def test_the_front_door_still_allows_put_and_forwards_the_session_header_for_the_goal_call(
    template,
):
    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "CacheBehaviors": [
                    Match.object_like(
                        {"PathPattern": "/api/*", "AllowedMethods": Match.array_with(["PUT"])}
                    )
                ]
            }
        },
    )
    template.has_resource_properties(
        "AWS::CloudFront::OriginRequestPolicy",
        {
            "OriginRequestPolicyConfig": Match.object_like(
                {"HeadersConfig": {"HeaderBehavior": "whitelist", "Headers": ["X-Session-Id"]}}
            )
        },
    )


def test_the_goal_filters_match_the_exact_goal_route_and_no_wildcard(template):
    filters = metric_filters(template)
    failed = filters["GoalChangeFailed"]["FilterPattern"]
    timing = filters["GoalChangeTimeMs"]["FilterPattern"]
    for pattern in (failed, timing):
        assert '$.event = "request"' in pattern
        assert '$.route = "PUT /api/v1/journey/goal"' in pattern
        assert "*" not in pattern
    assert '$.outcome = "SAVE_FAILED"' in failed
    assert "$.outcome" not in timing
    for name in ("GoalChangeFailed", "GoalChangeTimeMs"):
        assert filters[name]["MetricTransformations"][0]["MetricNamespace"] == "LearningJourney"


def test_the_goal_failed_count_defaults_to_zero_and_the_time_metric_has_no_default(template):
    filters = metric_filters(template)
    failed = filters["GoalChangeFailed"]["MetricTransformations"][0]
    timing = filters["GoalChangeTimeMs"]["MetricTransformations"][0]
    assert failed["MetricValue"] == "1" and failed["DefaultValue"] == 0
    assert timing["MetricValue"] == "$.total_ms"
    assert "DefaultValue" not in timing


def test_the_dashboard_has_a_goal_change_line_with_the_p95_time(template):
    dashboard = next(iter(resources(template, "AWS::CloudWatch::Dashboard").values()))
    body = str(dashboard["Properties"]["DashboardBody"])
    for name in ("GoalChangeFailed", "GoalChangeTimeMs", "p95"):
        assert name in body


def test_the_goal_unit_adds_no_resource_no_alarm_and_no_reserved_concurrency(template):
    assert "ReservedConcurrentExecutions" not in str(resources(template, "AWS::Lambda::Function"))
    template.resource_count_is("AWS::DynamoDB::Table", 1)
    template.resource_count_is("AWS::Lambda::Function", 3)
    template.resource_count_is("AWS::CloudWatch::Alarm", 4)
    template.resource_count_is("AWS::ApiGatewayV2::Integration", 1)


# -- U5: the milestones route on the existing integration (NFR2, NFR10) ---------------------------


def test_the_milestones_route_is_a_put_on_the_same_integration(template):
    routes = {
        r["Properties"]["RouteKey"]: r["Properties"]
        for r in resources(template, "AWS::ApiGatewayV2::Route").values()
    }
    key = "PUT /api/v1/journey/milestones"
    assert key in routes
    assert routes[key]["Target"] == routes["GET /api/v1/journey"]["Target"]
    assert routes[key]["Target"] == routes["PUT /api/v1/journey/goal"]["Target"]
    template.resource_count_is("AWS::ApiGatewayV2::Integration", 1)


def test_the_front_door_allows_put_for_the_milestone_call_and_forwards_the_session_header(
    template,
):
    distribution = next(iter(resources(template, "AWS::CloudFront::Distribution").values()))
    behaviors = distribution["Properties"]["DistributionConfig"]["CacheBehaviors"]
    (api_behavior,) = [b for b in behaviors if b["PathPattern"] == "/api/*"]
    assert {"GET", "POST", "PUT", "DELETE"} <= set(api_behavior["AllowedMethods"])
    template.has_resource_properties(
        "AWS::CloudFront::OriginRequestPolicy",
        {
            "OriginRequestPolicyConfig": Match.object_like(
                {"HeadersConfig": {"HeaderBehavior": "whitelist", "Headers": ["X-Session-Id"]}}
            )
        },
    )


def test_the_table_actions_are_still_exactly_the_four_with_no_wildcard_for_milestones(template):
    table_ref = next(iter(resources(template, "AWS::DynamoDB::Table")))
    statements = []
    for policy in resources(template, "AWS::IAM::Policy").values():
        statements += policy["Properties"]["PolicyDocument"]["Statement"]
    table_statements = [
        s for s in statements if any(a.startswith("dynamodb:") for a in _actions(s))
    ]
    assert len(table_statements) == 1
    assert sorted(_actions(table_statements[0])) == [
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
    ]
    assert table_statements[0]["Resource"] == {"Fn::GetAtt": [table_ref, "Arn"]}
    assert not any(a == "*" or a.endswith(":*") for s in statements for a in _actions(s))


def test_the_milestone_unit_adds_no_filter_alarm_resource_or_reserved_concurrency(template):
    template.resource_count_is("AWS::Logs::MetricFilter", 14)
    template.resource_count_is("AWS::CloudWatch::Alarm", 4)
    template.resource_count_is("AWS::DynamoDB::Table", 1)
    template.resource_count_is("AWS::Lambda::Function", 3)
    assert "ReservedConcurrentExecutions" not in str(resources(template, "AWS::Lambda::Function"))


def test_no_metric_filter_names_the_milestones_route(template):
    for properties in metric_filters(template).values():
        assert "milestones" not in properties["FilterPattern"]


# --- Observability Setup: saved queries and the invalid-replies widget ---


def test_every_saved_query_is_in_the_stack_on_the_function_logs(template):
    from stacks.queries import SAVED_QUERIES

    found = resources(template, "AWS::Logs::QueryDefinition")
    assert len(found) == len(SAVED_QUERIES) == 9
    by_name = {r["Properties"]["Name"]: r["Properties"] for r in found.values()}
    assert set(by_name) == {q.name for q in SAVED_QUERIES}
    function_logs = next(
        key for key in resources(template, "AWS::Logs::LogGroup") if key.startswith("FunctionLogs")
    )
    for query in SAVED_QUERIES:
        props = by_name[query.name]
        assert props["QueryString"] == query.query_string
        assert props["LogGroupNames"] == [{"Ref": function_logs}]


def test_the_saved_queries_read_only_the_fixed_log_fields():
    from stacks.queries import SAVED_QUERIES

    for query in SAVED_QUERIES:
        assert query.name.startswith("learning-journey/")
        # No query asks for a field that could hold typed text.
        for field in ("topic", "title", "name", "text", "reply"):
            assert f" {field}" not in query.query_string.replace("@message", "")


def test_the_dashboard_has_one_log_widget_for_invalid_replies_by_problem(template):
    body = resources(template, "AWS::CloudWatch::Dashboard")
    rendered = str(next(iter(body.values()))["Properties"]["DashboardBody"])
    assert rendered.count('"type":"log"') == 1
    assert "by problem" in rendered and "Invalid AI replies by problem" in rendered


def test_observability_setup_adds_no_metric_filter_or_alarm(template):
    template.resource_count_is("AWS::Logs::MetricFilter", 14)
    template.resource_count_is("AWS::CloudWatch::Alarm", 4)


# --- Performance Validation: teardown leaves no orphan (NFR5) ---


def test_the_site_upload_does_not_run_again_when_the_stack_is_deleted(template):
    # On delete, the upload helper used to run to remove the site files, after its log group was
    # gone, and AWS created the group again as an orphan. The bucket's own auto-delete empties
    # the bucket, so the helper is told to leave the files on delete instead.
    deployments = resources(template, "Custom::CDKBucketDeployment")
    assert len(deployments) == 1
    props = next(iter(deployments.values()))["Properties"]
    assert props.get("RetainOnDelete") is True
    template.resource_count_is("Custom::S3AutoDeleteObjects", 1)
