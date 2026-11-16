"""The single stack: site, API, function, table, alerts and dashboard.

Design: infrastructure-specification.md.
Everything is removed by one ``cdk destroy``: the table, the bucket (emptied automatically) and
every log group are created here with ``RemovalPolicy.DESTROY``. No reserved concurrency is set on
the function: this account's Lambda concurrency limit is 10 in total, so nothing can be reserved.
"""

from __future__ import annotations

from pathlib import Path

from aws_cdk import (
    CfnResource,
    Duration,
    RemovalPolicy,
    Stack,
    Tags,
)
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_apigatewayv2_integrations as integrations
from aws_cdk import aws_budgets as budgets
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from aws_cdk import aws_cloudwatch as cloudwatch
from aws_cdk import aws_cloudwatch_actions as cw_actions
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_iam as iam
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_logs as logs
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3deploy
from aws_cdk import aws_sns as sns
from aws_cdk import aws_sns_subscriptions as subscriptions
from constructs import Construct

from stacks.queries import INVALID_BY_PROBLEM_WIDGET_LINES, SAVED_QUERIES

PROJECT_TAG = "learning-journey"
DEFAULT_MODEL_ID = "amazon.nova-lite-v1:0"
METRIC_NAMESPACE = "LearningJourney"
LOG_RETENTION = logs.RetentionDays.TWO_WEEKS

_REPO_ROOT = Path(__file__).resolve().parents[2]
_BACKEND_SRC = _REPO_ROOT / "backend" / "src"
_FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"

CONTENT_SECURITY_POLICY = (
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; "
    "frame-ancestors 'none'"
)

BEDROCK_OUTCOMES = ("ok", "refused", "invalid", "error", "throttled")

COMPLETION_ROUTE_PATH = "/api/v1/journey/stages/{stageNumber}/completion"
# The request log line holds the raw path, so one wildcard counts every stage number.
COMPLETION_ROUTE_PATTERN = "PUT /api/v1/journey/stages/*"

# U4: the goal date has one exact route, so its metric filters match it without a wildcard.
GOAL_ROUTE_PATH = "/api/v1/journey/goal"
GOAL_ROUTE_KEY = f"PUT {GOAL_ROUTE_PATH}"

# U5: recording that a milestone banner was shown has one exact route on the same integration.
# It adds no metric filter, alarm, dashboard line, permission or resource.
MILESTONES_ROUTE_PATH = "/api/v1/journey/milestones"


class JourneyStack(Stack):
    """Creates every resource for the app. ``budget_email`` receives alarms and spend alerts."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        budget_email: str,
        frontend_dist: Path | None = None,
        backend_src: Path | None = None,
        model_id: str = DEFAULT_MODEL_ID,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        frontend_dist = frontend_dist or _FRONTEND_DIST
        backend_src = backend_src or _BACKEND_SRC

        self.table = self._table()
        self.site_bucket = self._site_bucket()
        self.function_log_group = self._log_group("FunctionLogs")
        self.function = self._function(backend_src, model_id)
        self.api = self._api()
        self.distribution = self._distribution()
        self._site_deployment(frontend_dist)
        self.alarm_topic = self._alarm_topic(budget_email)
        self._budgets(budget_email)
        self._metric_filters()
        self._alarms()
        self._dashboard()
        self._saved_queries()

        self._give_helper_functions_log_groups()
        self._tag_cdk_internal_resources()
        Tags.of(self).add("Project", PROJECT_TAG)

    # -- storage ---------------------------------------------------------------------------------

    def _table(self) -> dynamodb.Table:
        return dynamodb.Table(
            self,
            "JourneyTable",
            partition_key=dynamodb.Attribute(name="sessionId", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="expiresAt",
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=False
            ),
            removal_policy=RemovalPolicy.DESTROY,
        )

    def _site_bucket(self) -> s3.Bucket:
        return s3.Bucket(
            self,
            "SiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

    def _log_group(self, construct_id: str) -> logs.LogGroup:
        return logs.LogGroup(
            self,
            construct_id,
            retention=LOG_RETENTION,
            removal_policy=RemovalPolicy.DESTROY,
        )

    # -- compute ---------------------------------------------------------------------------------

    def _function(self, backend_src: Path, model_id: str) -> lambda_.Function:
        role = iam.Role(
            self,
            "FunctionRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Learning Journey function: this table, one model, its own logs",
        )
        # Only the table actions the function uses: read, write, update one item (U2) and delete
        # the journey item (U3). No wildcard action and no other resource.
        role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                ],
                resources=[self.table.table_arn],
            )
        )
        # Exactly one model and its inference profile; no wildcard action or model.
        role.add_to_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=[
                    f"arn:{self.partition}:bedrock:{self.region}::foundation-model/{model_id}",
                    f"arn:{self.partition}:bedrock:{self.region}:{self.account}"
                    f":inference-profile/us.{model_id}",
                ],
            )
        )
        self.function_log_group.grant_write(role)

        function = lambda_.Function(
            self,
            "JourneyFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            architecture=lambda_.Architecture.ARM_64,
            handler="learning_journey.handler.lambda_handler",
            code=lambda_.Code.from_asset(
                str(backend_src), exclude=["**/__pycache__", "**/*.pyc", "tests"]
            ),
            memory_size=512,
            timeout=Duration.seconds(25),
            role=role,
            log_group=self.function_log_group,
            environment={
                "TABLE_NAME": self.table.table_name,
                "MODEL_ID": model_id,
                "BEDROCK_TIMEOUT": "12",
            },
            # No reserved_concurrent_executions: the account limit is 10 in total (BR7.1 note).
        )
        return function

    # -- API and site ----------------------------------------------------------------------------

    def _api(self) -> apigwv2.HttpApi:
        api = apigwv2.HttpApi(
            self,
            "JourneyApi",
            create_default_stage=False,
            description="Learning Journey API (/api/v1)",
        )
        integration = integrations.HttpLambdaIntegration("JourneyIntegration", self.function)
        api.add_routes(
            path="/api/v1/journey",
            methods=[
                apigwv2.HttpMethod.GET,
                apigwv2.HttpMethod.POST,
                apigwv2.HttpMethod.DELETE,
            ],
            integration=integration,
        )
        api.add_routes(
            path=COMPLETION_ROUTE_PATH,
            methods=[apigwv2.HttpMethod.PUT],
            integration=integration,
        )
        api.add_routes(
            path=GOAL_ROUTE_PATH,
            methods=[apigwv2.HttpMethod.PUT],
            integration=integration,
        )
        api.add_routes(
            path=MILESTONES_ROUTE_PATH,
            methods=[apigwv2.HttpMethod.PUT],
            integration=integration,
        )
        stage = apigwv2.HttpStage(
            self,
            "JourneyStage",
            http_api=api,
            stage_name="$default",
            auto_deploy=True,
            throttle=apigwv2.ThrottleSettings(rate_limit=5, burst_limit=10),
        )
        access_logs = self._log_group("ApiAccessLogs")
        cfn_stage = stage.node.default_child
        assert isinstance(cfn_stage, CfnResource)
        cfn_stage.add_property_override(
            "AccessLogSettings",
            {
                "DestinationArn": access_logs.log_group_arn,
                "Format": (
                    '{"requestId":"$context.requestId","routeKey":"$context.routeKey",'
                    '"status":"$context.status","responseLatency":"$context.responseLatency"}'
                ),
            },
        )
        self.api_stage = stage
        return api

    def _distribution(self) -> cloudfront.Distribution:
        headers = cloudfront.ResponseHeadersPolicy(
            self,
            "SecurityHeaders",
            security_headers_behavior=cloudfront.ResponseSecurityHeadersBehavior(
                content_security_policy=cloudfront.ResponseHeadersContentSecurityPolicy(
                    content_security_policy=CONTENT_SECURITY_POLICY, override=True
                ),
                content_type_options=cloudfront.ResponseHeadersContentTypeOptions(override=True),
                referrer_policy=cloudfront.ResponseHeadersReferrerPolicy(
                    referrer_policy=cloudfront.HeadersReferrerPolicy.NO_REFERRER, override=True
                ),
                strict_transport_security=cloudfront.ResponseHeadersStrictTransportSecurity(
                    access_control_max_age=Duration.days(365), override=True
                ),
            ),
        )
        forward_session = cloudfront.OriginRequestPolicy(
            self,
            "ForwardSessionId",
            header_behavior=cloudfront.OriginRequestHeaderBehavior.allow_list("X-Session-Id"),
            query_string_behavior=cloudfront.OriginRequestQueryStringBehavior.none(),
            cookie_behavior=cloudfront.OriginRequestCookieBehavior.none(),
        )
        api_origin = origins.HttpOrigin(
            f"{self.api.api_id}.execute-api.{self.region}.amazonaws.com",
            protocol_policy=cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            read_timeout=Duration.seconds(30),
        )
        return cloudfront.Distribution(
            self,
            "SiteDistribution",
            default_root_object="index.html",
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            # No minimum_protocol_version: CloudFront's default certificate fixes it at TLSv1.
            # TLS 1.2 or later needs a custom domain and certificate (not part of this build).
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(self.site_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                response_headers_policy=headers,
            ),
            additional_behaviors={
                "/api/*": cloudfront.BehaviorOptions(
                    origin=api_origin,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    origin_request_policy=forward_session,
                    response_headers_policy=headers,
                )
            },
        )

    def _site_deployment(self, frontend_dist: Path) -> None:
        s3deploy.BucketDeployment(
            self,
            "SiteDeployment",
            sources=[s3deploy.Source.asset(str(frontend_dist))],
            destination_bucket=self.site_bucket,
            distribution=self.distribution,
            distribution_paths=["/*"],
            log_group=self._log_group("SiteDeploymentLogs"),
            # Leave the files on delete: the bucket's auto-delete empties it. Otherwise the helper
            # runs during cdk destroy after its log group is gone, and AWS recreates the group as
            # an orphan (found by the Performance Validation teardown check, NFR5).
            retain_on_delete=True,
        )

    # -- alerts and monitoring -------------------------------------------------------------------

    def _alarm_topic(self, email: str) -> sns.Topic:
        topic = sns.Topic(self, "AlarmTopic", display_name="Learning Journey alarms")
        topic.add_subscription(subscriptions.EmailSubscription(email))
        return topic

    def _budgets(self, email: str) -> None:
        for construct_id, name, unit, limit in (
            ("DailyBudget", "learning-journey-daily", "DAILY", 2),
            ("MonthlyBudget", "learning-journey-monthly", "MONTHLY", 8),
        ):
            budgets.CfnBudget(
                self,
                construct_id,
                budget=budgets.CfnBudget.BudgetDataProperty(
                    budget_name=name,
                    budget_type="COST",
                    time_unit=unit,
                    budget_limit=budgets.CfnBudget.SpendProperty(amount=limit, unit="USD"),
                ),
                notifications_with_subscribers=[
                    budgets.CfnBudget.NotificationWithSubscribersProperty(
                        notification=budgets.CfnBudget.NotificationProperty(
                            notification_type="ACTUAL",
                            comparison_operator="GREATER_THAN",
                            threshold=100,
                            threshold_type="PERCENTAGE",
                        ),
                        subscribers=[
                            budgets.CfnBudget.SubscriberProperty(
                                subscription_type="EMAIL", address=email
                            )
                        ],
                    )
                ],
            )

    def _metric_filters(self) -> None:
        def add(construct_id: str, metric_name: str, pattern: str) -> None:
            logs.MetricFilter(
                self,
                construct_id,
                log_group=self.function_log_group,
                metric_namespace=METRIC_NAMESPACE,
                metric_name=metric_name,
                filter_pattern=logs.FilterPattern.literal(pattern),
                metric_value="1",
                default_value=0,
            )

        add("AiJourneys", "JourneysAi", '{ $.event = "journey_made" && $.source = "ai" }')
        add(
            "TemplateJourneys",
            "JourneysTemplate",
            '{ $.event = "journey_made" && $.source = "template" }',
        )
        for outcome in BEDROCK_OUTCOMES:
            add(
                f"Bedrock{outcome.title()}",
                f"Bedrock{outcome.title()}",
                f'{{ $.event = "ai_attempt" && $.bedrock_outcome = "{outcome}" }}',
            )

        def completion(outcome: str | None = None) -> str:
            outcome_test = f' && $.outcome = "{outcome}"' if outcome else ""
            return (
                f'{{ $.event = "request" && $.route = "{COMPLETION_ROUTE_PATTERN}"'
                f"{outcome_test} }}"
            )

        # U3: how often the daily cap is hit, and the guard failing open (BR20.3, BR21.1).
        add(
            "DailyLimitHit", "DailyLimitHit", '{ $.event = "request" && $.outcome = "DAILY_LIMIT" }'
        )
        add("GuardSkipped", "GuardSkipped", '{ $.event = "guard_skipped" }')
        add("CompletionOk", "CompletionOk", completion("ok"))
        add("CompletionSaveFailed", "CompletionSaveFailed", completion("SAVE_FAILED"))
        # The time metric takes the line's total_ms and has NO default value: a default of 0
        # would add 0 ms samples in quiet periods and pull the p95 down (monitoring-design.md).
        logs.MetricFilter(
            self,
            "CompletionTimeMs",
            log_group=self.function_log_group,
            metric_namespace=METRIC_NAMESPACE,
            metric_name="CompletionTimeMs",
            filter_pattern=logs.FilterPattern.literal(completion()),
            metric_value="$.total_ms",
        )

        # U4: how often a goal change fails to save, and how long a goal change takes. The time
        # metric has no default value for the same reason as the completion time metric.
        goal_route = f'$.event = "request" && $.route = "{GOAL_ROUTE_KEY}"'
        add(
            "GoalChangeFailed",
            "GoalChangeFailed",
            f'{{ {goal_route} && $.outcome = "SAVE_FAILED" }}',
        )
        logs.MetricFilter(
            self,
            "GoalChangeTimeMs",
            log_group=self.function_log_group,
            metric_namespace=METRIC_NAMESPACE,
            metric_name="GoalChangeTimeMs",
            filter_pattern=logs.FilterPattern.literal(f"{{ {goal_route} }}"),
            metric_value="$.total_ms",
        )

    def _template_metric(self) -> cloudwatch.Metric:
        return cloudwatch.Metric(
            namespace=METRIC_NAMESPACE,
            metric_name="JourneysTemplate",
            statistic="Sum",
            period=Duration.hours(1),
        )

    def _guard_skipped_metric(self) -> cloudwatch.Metric:
        return cloudwatch.Metric(
            namespace=METRIC_NAMESPACE,
            metric_name="GuardSkipped",
            statistic="Sum",
            period=Duration.hours(1),
        )

    def _api_metric(self, name: str, period: Duration) -> cloudwatch.Metric:
        return cloudwatch.Metric(
            namespace="AWS/ApiGateway",
            metric_name=name,
            dimensions_map={"ApiId": self.api.api_id},
            statistic="Sum",
            period=period,
        )

    def _alarms(self) -> None:
        action = cw_actions.SnsAction(self.alarm_topic)
        five_minutes = Duration.minutes(5)
        definitions = (
            (
                "LambdaErrorsAlarm",
                "Lambda errors: 1 or more in 5 minutes",
                self.function.metric_errors(period=five_minutes, statistic="Sum"),
                1,
            ),
            (
                "ApiServerErrorsAlarm",
                "API 5xx responses: 1 or more in 5 minutes",
                self._api_metric("5xx", five_minutes),
                1,
            ),
            (
                "TemplateFallbackAlarm",
                "AI quietly failing: 3 or more template journeys in 1 hour",
                self._template_metric(),
                3,
            ),
            (
                "GuardSkippedAlarm",
                "Daily cap off: the usage guard was skipped 1 or more times in 1 hour",
                self._guard_skipped_metric(),
                1,
            ),
        )
        for construct_id, description, metric, threshold in definitions:
            alarm = cloudwatch.Alarm(
                self,
                construct_id,
                alarm_description=description,
                metric=metric,
                threshold=threshold,
                evaluation_periods=1,
                comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
            )
            alarm.add_alarm_action(action)

    def _dashboard(self) -> None:
        five_minutes = Duration.minutes(5)

        def metric(name: str) -> cloudwatch.Metric:
            return cloudwatch.Metric(
                namespace=METRIC_NAMESPACE,
                metric_name=name,
                statistic="Sum",
                period=five_minutes,
            )

        dashboard = cloudwatch.Dashboard(self, "Dashboard", dashboard_name="learning-journey")
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Requests, 4xx (includes 429) and 5xx",
                left=[
                    self._api_metric("Count", five_minutes),
                    self._api_metric("4xx", five_minutes),
                    self._api_metric("5xx", five_minutes),
                ],
            ),
            cloudwatch.GraphWidget(
                title="Lambda errors and p95 duration",
                left=[self.function.metric_errors(period=five_minutes)],
                right=[self.function.metric_duration(period=five_minutes, statistic="p95")],
            ),
        )
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Journeys by source",
                left=[metric("JourneysAi"), metric("JourneysTemplate")],
            ),
            cloudwatch.GraphWidget(
                title="Bedrock outcomes",
                left=[metric(f"Bedrock{outcome.title()}") for outcome in BEDROCK_OUTCOMES],
            ),
            cloudwatch.GraphWidget(
                title="Completion changes (count) and time (p95, ms)",
                left=[metric("CompletionOk"), metric("CompletionSaveFailed")],
                right=[
                    cloudwatch.Metric(
                        namespace=METRIC_NAMESPACE,
                        metric_name="CompletionTimeMs",
                        statistic="p95",
                        period=five_minutes,
                    )
                ],
            ),
            cloudwatch.GraphWidget(
                title="Goal changes failed (count) and time (p95, ms)",
                left=[metric("GoalChangeFailed")],
                right=[
                    cloudwatch.Metric(
                        namespace=METRIC_NAMESPACE,
                        metric_name="GoalChangeTimeMs",
                        statistic="p95",
                        period=five_minutes,
                    )
                ],
            ),
            cloudwatch.GraphWidget(
                title="Daily limit hits and guard skipped",
                left=[metric("DailyLimitHit"), metric("GuardSkipped")],
            ),
            cloudwatch.TextWidget(
                markdown=(
                    "Month-to-date spend: open **Billing and Cost Management > Budgets** "
                    "in the console."
                ),
                width=6,
                height=6,
            ),
        )
        # Observability Setup: invalid AI replies by the reply check's problem name, read from
        # the logs directly so no metric filter is added.
        dashboard.add_widgets(
            cloudwatch.LogQueryWidget(
                title="Invalid AI replies by problem",
                log_group_names=[self.function_log_group.log_group_name],
                query_lines=list(INVALID_BY_PROBLEM_WIDGET_LINES),
                view=cloudwatch.LogQueryVisualizationType.TABLE,
                width=12,
                height=6,
            ),
        )

    def _saved_queries(self) -> None:
        """Saved Logs Insights queries on the function's logs (Observability Setup)."""
        for index, query in enumerate(SAVED_QUERIES):
            logs.CfnQueryDefinition(
                self,
                f"SavedQuery{index}",
                name=query.name,
                query_string=query.query_string,
                log_group_names=[self.function_log_group.log_group_name],
            )

    # -- teardown helpers ------------------------------------------------------------------------

    def _give_helper_functions_log_groups(self) -> None:
        """Give every helper function CDK adds its own log group, removed with the stack.

        Without this, the helper functions that empty the bucket and upload the site would create
        log groups at run time that ``cdk destroy`` leaves behind (BR7.3).
        """
        functions = [
            node
            for node in self.node.find_all()
            if isinstance(node, CfnResource) and node.cfn_resource_type == "AWS::Lambda::Function"
        ]
        index = 0
        for node in functions:
            if getattr(node, "logging_config", None) is not None:
                continue
            index += 1
            group = self._log_group(f"HelperLogs{index}")
            node.add_property_override("LoggingConfig", {"LogGroup": group.log_group_name})

    def _tag_cdk_internal_resources(self) -> None:
        """Tag the function and role that CDK adds for emptying the bucket.

        The tag aspect skips them because they are plain low-level resources.
        """
        for node in self.node.find_all():
            plain = isinstance(node, CfnResource) and not isinstance(
                node, lambda_.CfnFunction | iam.CfnRole
            )
            if plain and node.cfn_resource_type in ("AWS::Lambda::Function", "AWS::IAM::Role"):
                node.add_property_override("Tags", [{"Key": "Project", "Value": PROJECT_TAG}])
