"""The journey store over DynamoDB (contract C5, rules BR5.1, BR5.2, BR5.4).

One item per session: partition key ``sessionId``, sort key ``sk`` = ``JOURNEY``. Only the session
ID is stored with the journey; no personal data field exists.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any

from botocore.exceptions import ClientError

from .config import (
    EXPIRY_DAYS,
    JOURNEY_SORT_KEY,
    STORE_CONNECT_TIMEOUT_SECONDS,
    STORE_READ_TIMEOUT_SECONDS,
)
from .errors import (
    DELETE_FAILED,
    INVALID_REQUEST,
    LOAD_FAILED,
    NOT_FOUND,
    SAVE_FAILED,
    ApiError,
)
from .models import Journey, Stage, sort_milestones

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


def to_iso(moment: datetime) -> str:
    """ISO 8601 UTC text with a trailing Z."""
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class JourneyStore:
    """Saves and loads the one journey a session holds."""

    def __init__(self, table: Any, clock: Clock = utc_now) -> None:
        self._table = table
        self._clock = clock

    @classmethod
    def for_table(cls, table_name: str, clock: Clock = utc_now) -> JourneyStore:
        """Open the table so one store call can take 2 seconds in total (BR5.1, BR5.2).

        One attempt only, with the connect and read limits adding up to the 2-second limit
        (review R-07): a slow save can therefore never take longer than 2 seconds.
        """
        import boto3
        from botocore.config import Config

        config = Config(
            connect_timeout=STORE_CONNECT_TIMEOUT_SECONDS,
            read_timeout=STORE_READ_TIMEOUT_SECONDS,
            retries={"total_max_attempts": 1, "mode": "standard"},
        )
        table = boto3.resource("dynamodb", config=config).Table(table_name)
        return cls(table, clock)

    def save(self, session_id: str, journey: Journey) -> Journey:
        """Replace the session's journey, setting its times and empty progress (BR5.1)."""
        now = self._clock()
        saved = replace(
            journey,
            created_at=to_iso(now),
            last_activity_at=to_iso(now),
            completed_stages=[],
            goal_date=None,
            milestones_shown=[],
        )
        expires_at = int((now + timedelta(days=EXPIRY_DAYS)).timestamp())
        item = {
            "sessionId": session_id,
            "sk": JOURNEY_SORT_KEY,
            "topic": saved.topic,
            "teachingStyle": saved.teaching_style,
            "source": saved.source,
            "stages": json.dumps([s.to_dict() for s in saved.stages]),
            # completedStages is a number set, absent when empty: the completion change adds to it.
            "stageCount": len(saved.stages),
            # goalDate is left out, not stored as null: a new journey has no goal date (BR34.1).
            # milestonesShown is left out too: a DynamoDB set cannot be empty (BR44.1).
            "createdAt": saved.created_at,
            "lastActivityAt": saved.last_activity_at,
            "expiresAt": expires_at,
        }
        try:
            self._table.put_item(Item=item)
        except Exception as exc:  # noqa: BLE001 - any store failure means the save failed
            raise ApiError(SAVE_FAILED, "the journey could not be saved") from exc
        return saved

    # The contract (C5) names this operation ``saveNew``.
    save_new = save

    @property
    def table(self) -> Any:
        """The table, shared with the usage guard so both use the same timeouts."""
        return self._table

    def delete(self, session_id: str) -> None:
        """Remove the session's journey item and nothing else (BR23.1, BR20.5).

        One ``delete_item`` with no condition, so it is safe to repeat and succeeds when nothing
        is there. The ``USAGE#`` count items beside it are never touched.
        """
        try:
            self._table.delete_item(Key={"sessionId": session_id, "sk": JOURNEY_SORT_KEY})
        except Exception as exc:  # noqa: BLE001 - any store failure means the delete failed
            raise ApiError(DELETE_FAILED, "the journey could not be deleted") from exc

    def load(self, session_id: str) -> Journey | None:
        """Return the session's journey, or nothing if absent or past its expiry (BR5.2)."""
        try:
            response = self._table.get_item(
                Key={"sessionId": session_id, "sk": JOURNEY_SORT_KEY}, ConsistentRead=True
            )
        except Exception as exc:  # noqa: BLE001 - an unreachable store is LOAD_FAILED
            raise ApiError(LOAD_FAILED, "the journey could not be read") from exc
        item = response.get("Item")
        if not item:
            return None
        try:
            if int(item["expiresAt"]) <= int(self._clock().timestamp()):
                return None
            return Journey(
                topic=item["topic"],
                teaching_style=item["teachingStyle"],
                source=item["source"],
                stages=[Stage.from_dict(s) for s in json.loads(item["stages"])],
                created_at=item["createdAt"],
                last_activity_at=item["lastActivityAt"],
                completed_stages=sorted(int(n) for n in (item.get("completedStages") or ())),
                # A missing attribute, a stored null and anything but text all read as no goal.
                goal_date=item["goalDate"] if isinstance(item.get("goalDate"), str) else None,
                milestones_shown=sort_milestones(item.get("milestonesShown")),
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise ApiError(LOAD_FAILED, "the stored journey could not be read") from exc

    def set_stage_completion(
        self, session_id: str, stage_number: int, completed: bool
    ) -> list[int]:
        """Mark or unmark one stage and return the ascending completed list (BR11.1 to BR11.5).

        One conditional ``update_item``: ADD (mark) or DELETE (unmark) on the number set, plus
        ``lastActivityAt`` and ``expiresAt`` moved in the same update. The condition needs a live
        record that has the stage. A failed condition returns the old record, which tells an
        absent or expired journey (NOT_FOUND) from a stage the journey lacks (INVALID_REQUEST).
        """
        now = self._clock()
        now_epoch = int(now.timestamp())
        action = "ADD" if completed else "DELETE"
        try:
            response = self._table.update_item(
                Key={"sessionId": session_id, "sk": JOURNEY_SORT_KEY},
                UpdateExpression=(
                    f"{action} completedStages :stage SET lastActivityAt = :active, "
                    "expiresAt = :expires"
                ),
                ConditionExpression=(
                    "attribute_exists(sessionId) AND expiresAt > :now AND stageCount >= :number"
                ),
                ExpressionAttributeValues={
                    ":stage": {stage_number},
                    ":active": to_iso(now),
                    ":expires": int((now + timedelta(days=EXPIRY_DAYS)).timestamp()),
                    ":now": now_epoch,
                    ":number": stage_number,
                },
                ReturnValues="ALL_NEW",  # a repeat that changes nothing must still return the set
                ReturnValuesOnConditionCheckFailure="ALL_OLD",
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                raise _classify_failed_condition(exc, stage_number, now_epoch) from exc
            raise ApiError(SAVE_FAILED, "the change could not be saved") from exc
        except Exception as exc:  # noqa: BLE001 - timeouts and outages mean the save failed
            raise ApiError(SAVE_FAILED, "the change could not be saved") from exc
        stored = (response.get("Attributes") or {}).get("completedStages") or ()
        return sorted(int(n) for n in stored)

    # The contract (C5) names this operation ``setStageCompletion``.
    setStageCompletion = set_stage_completion  # noqa: N815 - the name contract C5 uses

    def set_goal_date(self, session_id: str, goal_date: str | None) -> str | None:
        """Set, change or clear the goal date and return the stored value (BR32.1).

        One conditional ``update_item`` of that one field: SET the date, or REMOVE the attribute
        for ``None``; ``lastActivityAt`` and ``expiresAt`` move in the same update. The condition
        needs a live record. A failed condition is NOT_FOUND and creates nothing; any other store
        failure or a call over the 2-second limit is SAVE_FAILED. Repeating a value is a success.
        """
        now = self._clock()
        values: dict[str, Any] = {
            ":active": to_iso(now),
            ":expires": int((now + timedelta(days=EXPIRY_DAYS)).timestamp()),
            ":now": int(now.timestamp()),
        }
        if goal_date is None:
            expression = "SET lastActivityAt = :active, expiresAt = :expires REMOVE goalDate"
        else:
            expression = "SET goalDate = :goal, lastActivityAt = :active, expiresAt = :expires"
            values[":goal"] = goal_date
        try:
            self._table.update_item(
                Key={"sessionId": session_id, "sk": JOURNEY_SORT_KEY},
                UpdateExpression=expression,
                ConditionExpression="attribute_exists(sessionId) AND expiresAt > :now",
                ExpressionAttributeValues=values,
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                raise ApiError(NOT_FOUND, "no journey for this session") from exc
            raise ApiError(SAVE_FAILED, "the goal date could not be saved") from exc
        except Exception as exc:  # noqa: BLE001 - timeouts and outages mean the save failed
            raise ApiError(SAVE_FAILED, "the goal date could not be saved") from exc
        return goal_date

    # The contract (C5) names this operation ``setGoalDate``.
    setGoalDate = set_goal_date  # noqa: N815 - the name contract C5 uses

    def mark_milestone_shown(self, session_id: str, milestone: str) -> list[str]:
        """Add one milestone to the stored set and return the whole set, sorted (BR44.1).

        One conditional ``update_item``: ADD the name to the string set, with ``lastActivityAt``
        and ``expiresAt`` moved in the same update. The condition needs a live record. A failed
        condition is NOT_FOUND and creates nothing; any other store failure, or a call over the
        2-second limit, is SAVE_FAILED. Recording a name already there is a success: the set is
        unchanged, but the times still move. The caller has already checked the name.
        """
        now = self._clock()
        try:
            response = self._table.update_item(
                Key={"sessionId": session_id, "sk": JOURNEY_SORT_KEY},
                UpdateExpression=(
                    "ADD milestonesShown :milestone SET lastActivityAt = :active, "
                    "expiresAt = :expires"
                ),
                ConditionExpression="attribute_exists(sessionId) AND expiresAt > :now",
                ExpressionAttributeValues={
                    ":milestone": {milestone},
                    ":active": to_iso(now),
                    ":expires": int((now + timedelta(days=EXPIRY_DAYS)).timestamp()),
                    ":now": int(now.timestamp()),
                },
                # ALL_NEW, not UPDATED_NEW: a repeat that changes nothing must still return the set.
                ReturnValues="ALL_NEW",
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                raise ApiError(NOT_FOUND, "no journey for this session") from exc
            raise ApiError(SAVE_FAILED, "the milestone could not be saved") from exc
        except Exception as exc:  # noqa: BLE001 - timeouts and outages mean the save failed
            raise ApiError(SAVE_FAILED, "the milestone could not be saved") from exc
        return sort_milestones((response.get("Attributes") or {}).get("milestonesShown"))

    # The contract (C5) names this operation ``markMilestoneShown``.
    markMilestoneShown = mark_milestone_shown  # noqa: N815 - the name contract C5 uses


def _plain_number(value: Any) -> int | None:
    """Read a number from a plain value or from the typed form ``{"N": "5"}``."""
    if isinstance(value, dict):
        value = value.get("N")
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _classify_failed_condition(exc: ClientError, stage_number: int, now_epoch: int) -> ApiError:
    """Tell a missing or expired journey from a stage it lacks, using the returned old record."""
    old = exc.response.get("Item") or {}
    if not old:
        return ApiError(NOT_FOUND, "no journey for this session")
    expires_at = _plain_number(old.get("expiresAt"))
    if expires_at is None or expires_at <= now_epoch:
        return ApiError(NOT_FOUND, "no journey for this session")
    stage_count = _plain_number(old.get("stageCount"))
    if stage_count is None or stage_number > stage_count:
        return ApiError(INVALID_REQUEST, "the journey does not have that stage")
    return ApiError(SAVE_FAILED, "the change could not be saved")
