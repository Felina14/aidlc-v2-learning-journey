"""Shared test helpers: a controllable clock, a moto DynamoDB table and call-recording fakes."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import boto3
import pytest
from learning_journey.store import JourneyStore
from learning_journey.usage_guard import Reservation
from moto import mock_aws


class FakeClock:
    """A clock tests move by hand: ``monotonic`` for the time rules, ``now`` for wall time."""

    def __init__(self) -> None:
        self.seconds = 0.0
        self.start = datetime(2026, 11, 10, 12, 0, 0, tzinfo=UTC)

    def monotonic(self) -> float:
        return self.seconds

    def now(self) -> datetime:
        return self.start + timedelta(seconds=self.seconds)

    def advance(self, seconds: float) -> None:
        self.seconds += seconds

    def advance_days(self, days: float) -> None:
        self.advance(days * 86400)


class SpyGuard:
    """A usage guard that always grants and records reserve and release calls."""

    def __init__(self, grant: bool = True) -> None:
        self.grant = grant
        self.reserved: list[tuple[str, str]] = []
        self.released: list[str] = []

    def reserve(self, session_id: str, day: str) -> Reservation:
        self.reserved.append((session_id, day))
        if not self.grant:
            return Reservation(False, 0, None)
        return Reservation(True, 4, f"slot-{len(self.reserved)}")

    def release(self, reservation_id: str) -> None:
        self.released.append(reservation_id)


@pytest.fixture(autouse=True)
def _fake_aws_environment(monkeypatch):
    """Dummy values so nothing can reach a real account; moto answers every call."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.delenv("AWS_PROFILE", raising=False)


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def table():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        created = dynamodb.create_table(
            TableName="journeys",
            KeySchema=[
                {"AttributeName": "sessionId", "KeyType": "HASH"},
                {"AttributeName": "sk", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "sessionId", "AttributeType": "S"},
                {"AttributeName": "sk", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        yield created


@pytest.fixture
def store(table, clock) -> JourneyStore:
    return JourneyStore(table, clock=clock.now)


@pytest.fixture
def session_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
def guard() -> SpyGuard:
    return SpyGuard()


@pytest.fixture
def real_guard(table):
    """The real guard over the moto table."""
    from learning_journey.usage_guard import DynamoUsageGuard

    return DynamoUsageGuard(table)
