"""The journey store over a moto DynamoDB table (BR5.1, BR5.2, BR5.4; contract C5)."""

import json
import uuid
from dataclasses import replace
from datetime import timedelta
from decimal import Decimal

import pytest
from botocore.exceptions import ClientError, ReadTimeoutError
from learning_journey.errors import INVALID_REQUEST, LOAD_FAILED, NOT_FOUND, SAVE_FAILED, ApiError
from learning_journey.models import Journey
from learning_journey.store import JourneyStore
from learning_journey.template import build_template


def make_journey(topic="Rust", source="template") -> Journey:
    return Journey(
        topic=topic,
        teaching_style="guide",
        source=source,
        stages=build_template(topic),
        created_at="x",
        last_activity_at="x",
        completed_stages=[1, 2],  # the store must ignore this and save it empty
        goal_date="2026-12-01",
        milestones_shown=["halfway"],
    )


class BrokenTable:
    def __init__(self, error):
        self.error = error

    def put_item(self, **kwargs):
        raise self.error

    def get_item(self, **kwargs):
        raise self.error


def test_save_then_load_returns_the_same_journey(store, session_id):
    saved = store.save(session_id, make_journey())
    loaded = store.load(session_id)
    assert loaded == saved
    assert loaded.topic == "Rust" and len(loaded.stages) == 5


def test_save_sets_times_and_empty_progress(store, session_id, clock):
    saved = store.save(session_id, make_journey())
    assert saved.created_at == saved.last_activity_at == "2026-11-10T12:00:00.000Z"
    assert saved.completed_stages == [] and saved.goal_date is None
    assert saved.milestones_shown == []


def test_save_replaces_the_earlier_journey(store, session_id):
    store.save(session_id, make_journey("Rust"))
    store.save(session_id, make_journey("Python"))
    assert store.load(session_id).topic == "Python"


def test_expiry_is_ninety_days_after_the_save(store, table, session_id, clock):
    store.save(session_id, make_journey())
    item = table.get_item(Key={"sessionId": session_id, "sk": "JOURNEY"})["Item"]
    assert int(item["expiresAt"]) == int((clock.now() + timedelta(days=90)).timestamp())


def test_load_returns_nothing_for_an_unknown_session(store):
    assert store.load(str(uuid.uuid4())) is None


def test_load_treats_an_expired_record_as_gone_even_if_it_is_still_stored(
    store, table, session_id, clock
):
    store.save(session_id, make_journey())
    clock.advance_days(89)
    assert store.load(session_id) is not None
    clock.advance_days(1.01)
    assert store.load(session_id) is None
    assert "Item" in table.get_item(Key={"sessionId": session_id, "sk": "JOURNEY"})


def test_sessions_do_not_see_each_others_journeys(store):
    one, two = str(uuid.uuid4()), str(uuid.uuid4())
    store.save(one, make_journey("Rust"))
    assert store.load(two) is None


def test_only_journey_fields_are_stored_and_no_personal_data(store, table, session_id):
    store.save(session_id, make_journey())
    item = table.get_item(Key={"sessionId": session_id, "sk": "JOURNEY"})["Item"]
    assert set(item) == {
        "sessionId", "sk", "topic", "teachingStyle", "source", "stages", "stageCount",
        "createdAt", "lastActivityAt", "expiresAt",
    }  # fmt: skip
    assert len(json.loads(item["stages"])) == 5


def test_a_save_that_fails_or_times_out_is_save_failed(session_id, clock):
    timeout = ReadTimeoutError(endpoint_url="http://dynamodb")
    broken = JourneyStore(BrokenTable(timeout), clock=clock.now)
    with pytest.raises(ApiError) as caught:
        broken.save(session_id, make_journey())
    assert caught.value.code == SAVE_FAILED


def test_a_load_that_fails_or_times_out_is_load_failed(session_id, clock):
    broken = JourneyStore(BrokenTable(OSError("down")), clock=clock.now)
    with pytest.raises(ApiError) as caught:
        broken.load(session_id)
    assert caught.value.code == LOAD_FAILED


def test_an_unreadable_stored_item_is_load_failed(store, table, session_id):
    table.put_item(
        Item={"sessionId": session_id, "sk": "JOURNEY", "expiresAt": 9999999999, "stages": "{bad"}
    )
    with pytest.raises(ApiError) as caught:
        store.load(session_id)
    assert caught.value.code == LOAD_FAILED


def test_the_table_opens_with_one_attempt_and_a_two_second_total_limit():
    store = JourneyStore.for_table("journeys")
    config = store._table.meta.client.meta.config
    assert config.connect_timeout + config.read_timeout == 2
    assert config.retries["total_max_attempts"] == 1


# -- stored shape (BR12.1, BR12.2) -------------------------------------------------------------


def raw_item(table, session_id):
    return table.get_item(Key={"sessionId": session_id, "sk": "JOURNEY"}).get("Item")


def test_save_omits_completed_stages_and_stores_the_stage_count(store, table, session_id):
    store.save(session_id, make_journey())
    item = raw_item(table, session_id)
    assert "completedStages" not in item and item["stageCount"] == 5


@pytest.mark.parametrize(
    "stored",
    [None, {1, 3}, [], [Decimal(2), Decimal(1)]],
    ids=["missing attribute", "number set", "empty list", "list in any order"],
)
def test_load_reads_the_stored_progress_in_every_shape(store, table, session_id, stored):
    store.save(session_id, make_journey())
    if stored is not None:
        table.update_item(
            Key={"sessionId": session_id, "sk": "JOURNEY"},
            UpdateExpression="SET completedStages = :c",
            ExpressionAttributeValues={":c": stored},
        )
    expected = sorted(int(n) for n in stored) if stored else []
    assert store.load(session_id).completed_stages == expected


def test_expiry_boundary_is_89_returned_90_and_91_gone(store, session_id, clock):
    store.save(session_id, make_journey())
    clock.advance_days(89)
    assert store.load(session_id) is not None
    clock.advance_days(1)  # exactly 90 days counts as expired
    assert store.load(session_id) is None
    clock.advance_days(1)
    assert store.load(session_id) is None


# -- the completion update (BR11.1, BR11.2, BR11.4, BR11.5) ------------------------------------


def test_mark_adds_the_stage_and_repeats_change_nothing(store, table, session_id):
    store.save(session_id, make_journey())
    assert store.set_stage_completion(session_id, 2, True) == [2]
    assert store.set_stage_completion(session_id, 2, True) == [2]
    assert raw_item(table, session_id)["completedStages"] == {Decimal(2)}


def test_the_answer_list_is_ascending_whatever_the_order_marked(store, session_id):
    store.save(session_id, make_journey())
    for number in (4, 1, 3):
        store.set_stage_completion(session_id, number, True)
    assert store.set_stage_completion(session_id, 2, True) == [1, 2, 3, 4]
    assert store.load(session_id).completed_stages == [1, 2, 3, 4]


def test_unmark_removes_the_stage_and_the_last_one_removes_the_attribute(store, table, session_id):
    store.save(session_id, make_journey())
    store.set_stage_completion(session_id, 1, True)
    store.set_stage_completion(session_id, 2, True)
    assert store.set_stage_completion(session_id, 1, False) == [2]
    assert store.set_stage_completion(session_id, 1, False) == [2]  # repeat unmark
    assert store.set_stage_completion(session_id, 2, False) == []
    assert "completedStages" not in raw_item(table, session_id)
    assert store.load(session_id).completed_stages == []


def test_two_stores_marking_different_stages_keep_both(table, session_id, clock):
    first = JourneyStore(table, clock=clock.now)
    second = JourneyStore(table, clock=clock.now)  # an older copy of the page
    first.save(session_id, make_journey())
    first.set_stage_completion(session_id, 2, True)
    assert second.set_stage_completion(session_id, 3, True) == [2, 3]


def test_a_change_moves_activity_and_expiry_but_a_read_does_not(store, table, session_id, clock):
    store.save(session_id, make_journey())
    clock.advance_days(10)
    store.load(session_id)
    assert raw_item(table, session_id)["lastActivityAt"] == "2026-11-10T12:00:00.000Z"
    store.set_stage_completion(session_id, 1, True)
    item = raw_item(table, session_id)
    assert item["lastActivityAt"] == "2026-11-20T12:00:00.000Z"
    assert int(item["expiresAt"]) == int((clock.now() + timedelta(days=90)).timestamp())


def test_a_repeat_that_changes_nothing_still_moves_the_times(store, table, session_id, clock):
    store.save(session_id, make_journey())
    store.set_stage_completion(session_id, 1, True)
    clock.advance_days(5)
    store.set_stage_completion(session_id, 1, True)
    assert raw_item(table, session_id)["lastActivityAt"] == "2026-11-15T12:00:00.000Z"


def test_an_absent_journey_is_not_found_and_nothing_is_created(store, table, session_id):
    with pytest.raises(ApiError) as caught:
        store.set_stage_completion(session_id, 1, True)
    assert caught.value.code == NOT_FOUND
    assert raw_item(table, session_id) is None


@pytest.mark.parametrize("days,found", [(89, True), (90, False), (91, False)])
def test_an_expired_journey_is_not_found_and_not_revived(
    store, table, session_id, clock, days, found
):
    store.save(session_id, make_journey())
    before = raw_item(table, session_id)
    clock.advance_days(days)
    if found:
        assert store.set_stage_completion(session_id, 1, True) == [1]
        return
    with pytest.raises(ApiError) as caught:
        store.set_stage_completion(session_id, 1, True)
    assert caught.value.code == NOT_FOUND
    assert raw_item(table, session_id) == before  # no write, no revival


def test_a_stage_the_journey_lacks_is_invalid_request_and_changes_nothing(store, table, session_id):
    store.save(session_id, make_journey())
    before = raw_item(table, session_id)
    with pytest.raises(ApiError) as caught:
        store.set_stage_completion(session_id, 6, True)  # a 5-stage journey
    assert caught.value.code == INVALID_REQUEST
    assert raw_item(table, session_id) == before


def test_a_record_with_no_stage_count_is_invalid_request(store, table, session_id, clock):
    table.put_item(
        Item={
            "sessionId": session_id,
            "sk": "JOURNEY",
            "expiresAt": 9999999999,
            "completedStages": [],
        }
    )
    with pytest.raises(ApiError) as caught:
        store.set_stage_completion(session_id, 1, True)
    assert caught.value.code == INVALID_REQUEST


def test_the_contract_name_set_stage_completion_is_available(store, session_id):
    store.save(session_id, make_journey())
    assert store.setStageCompletion(session_id, 5, True) == [5]


class FailingUpdateTable:
    """Answers update_item with a chosen ClientError, as the real service would."""

    def __init__(self, code, item=None):
        self.error = ClientError(
            {"Error": {"Code": code, "Message": "x"}, **({"Item": item} if item else {})},
            "UpdateItem",
        )

    def update_item(self, **kwargs):
        raise self.error


@pytest.mark.parametrize(
    "item,code",
    [
        (None, NOT_FOUND),
        ({"expiresAt": {"N": "1"}, "stageCount": {"N": "5"}}, NOT_FOUND),
        ({"expiresAt": {"N": "9999999999"}, "stageCount": {"N": "1"}}, INVALID_REQUEST),
        ({"expiresAt": 9999999999}, INVALID_REQUEST),
        ({"expiresAt": {"N": "9999999999"}, "stageCount": {"N": "5"}}, SAVE_FAILED),
        ({"stageCount": {"N": "5"}}, NOT_FOUND),
    ],
    ids=["no item", "expired", "stage above count", "no count", "unexplained", "no expiry"],
)
def test_a_failed_condition_is_classified_from_the_returned_old_record(
    session_id, clock, item, code
):
    broken = JourneyStore(FailingUpdateTable("ConditionalCheckFailedException", item), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.set_stage_completion(session_id, 3, True)
    assert caught.value.code == code


@pytest.mark.parametrize(
    "failure", ["ProvisionedThroughputExceededException", "InternalServerError"]
)
def test_other_service_failures_are_save_failed(session_id, clock, failure):
    broken = JourneyStore(FailingUpdateTable(failure), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.set_stage_completion(session_id, 1, True)
    assert caught.value.code == SAVE_FAILED


def test_a_timeout_on_the_update_is_save_failed(session_id, clock):
    class Slow:
        def update_item(self, **kwargs):
            raise ReadTimeoutError(endpoint_url="http://dynamodb")

    with pytest.raises(ApiError) as caught:
        JourneyStore(Slow(), clock.now).set_stage_completion(session_id, 1, True)
    assert caught.value.code == SAVE_FAILED


def test_moto_returns_the_old_record_on_a_failed_condition(table, session_id):
    """Records what the pinned test double does, so the stubbed tests above stay honest."""
    table.put_item(Item={"sessionId": session_id, "sk": "JOURNEY", "expiresAt": 1, "stageCount": 5})
    with pytest.raises(ClientError) as caught:
        table.update_item(
            Key={"sessionId": session_id, "sk": "JOURNEY"},
            UpdateExpression="ADD completedStages :s",
            ConditionExpression="expiresAt > :now",
            ExpressionAttributeValues={":s": {1}, ":now": 5},
            ReturnValuesOnConditionCheckFailure="ALL_OLD",
        )
    assert caught.value.response["Item"]["stageCount"] == {"N": "5"}


# --- Journey delete (BR23.1, BR20.5) ---


def usage_item(table, session_id):
    return table.get_item(Key={"sessionId": session_id, "sk": "USAGE#2026-11-10"}).get("Item")


def test_delete_removes_the_journey_item(store, session_id):
    store.save(session_id, make_journey())
    store.delete(session_id)
    assert store.load(session_id) is None


def test_delete_leaves_the_usage_count_untouched(store, table, session_id):
    table.put_item(
        Item={
            "sessionId": session_id,
            "sk": "USAGE#2026-11-10",
            "journeysCreated": 3,
            "expiresAt": 1,
        }
    )
    store.save(session_id, make_journey())
    store.delete(session_id)
    assert int(usage_item(table, session_id)["journeysCreated"]) == 3


def test_delete_when_nothing_is_there_succeeds_and_repeats(store, session_id):
    store.delete(session_id)
    store.delete(session_id)
    assert store.load(session_id) is None


def test_delete_touches_only_the_given_session(store, session_id):
    other = str(uuid.uuid4())
    store.save(session_id, make_journey("Rust"))
    store.save(other, make_journey("Go"))
    store.delete(session_id)
    assert store.load(other).topic == "Go"


def test_a_replacing_save_does_not_change_the_count(store, table, session_id):
    table.put_item(Item={"sessionId": session_id, "sk": "USAGE#2026-11-10", "journeysCreated": 2})
    store.save(session_id, make_journey("Rust"))
    store.save(session_id, make_journey("Go"))
    assert int(usage_item(table, session_id)["journeysCreated"]) == 2


def test_a_store_failure_on_delete_is_delete_failed(session_id):
    class Broken:
        def delete_item(self, **kwargs):
            raise ReadTimeoutError(endpoint_url="https://dynamodb.test")

    with pytest.raises(ApiError) as caught:
        JourneyStore(Broken()).delete(session_id)
    assert caught.value.code == "DELETE_FAILED" and caught.value.status == 500


def test_the_store_shares_its_table_with_the_guard(store, table):
    assert store.table is table


# --- The goal date (BR32.1, BR34.1) ---


def test_save_leaves_the_goal_date_out_and_records_the_style(store, table, session_id):
    journey = make_journey()
    store.save(session_id, journey)
    item = raw_item(table, session_id)
    assert "goalDate" not in item  # no stored null
    assert item["teachingStyle"] == "guide"
    store.save(session_id, replace(journey, teaching_style="planner"))
    assert raw_item(table, session_id)["teachingStyle"] == "planner"
    assert store.load(session_id).teaching_style == "planner"


@pytest.mark.parametrize(
    "stored,expected",
    [("missing", None), (None, None), ("2026-12-01", "2026-12-01")],
    ids=["missing attribute", "stored null", "text date"],
)
def test_load_reads_a_missing_null_or_text_goal_date(store, table, session_id, stored, expected):
    store.save(session_id, make_journey())
    if stored != "missing":
        table.update_item(
            Key={"sessionId": session_id, "sk": "JOURNEY"},
            UpdateExpression="SET goalDate = :g",
            ExpressionAttributeValues={":g": stored},
        )
    assert store.load(session_id).goal_date == expected


def test_load_reads_the_optional_hours_by_kind_and_a_stage_without_it(store, session_id):
    stages = build_template("Rust")
    split = {"reading": 1, "exercises": 0.5, "miniProject": 0.25, "quiz": 0.25}
    stages[0] = replace(stages[0], hours=2, hours_by_kind=split)
    store.save(session_id, replace(make_journey(), stages=stages))
    loaded = store.load(session_id).stages
    assert loaded[0].hours_by_kind == split
    assert loaded[1].hours_by_kind is None


def test_set_goal_date_sets_changes_and_clears_it(store, table, session_id):
    store.save(session_id, make_journey())
    assert store.set_goal_date(session_id, "2026-12-15") == "2026-12-15"
    assert store.load(session_id).goal_date == "2026-12-15"
    assert store.set_goal_date(session_id, "2027-01-02") == "2027-01-02"
    assert store.load(session_id).goal_date == "2027-01-02"
    assert store.set_goal_date(session_id, None) is None
    assert store.load(session_id).goal_date is None
    assert "goalDate" not in raw_item(table, session_id)  # removed, not set to null


def test_the_same_value_again_and_clearing_an_absent_date_are_successes(store, session_id):
    store.save(session_id, make_journey())
    assert store.set_goal_date(session_id, None) is None  # nothing to clear
    store.set_goal_date(session_id, "2026-12-15")
    assert store.set_goal_date(session_id, "2026-12-15") == "2026-12-15"
    assert store.load(session_id).goal_date == "2026-12-15"


def test_the_goal_update_changes_only_the_goal_and_the_times(store, table, session_id, clock):
    store.save(session_id, make_journey())
    store.set_stage_completion(session_id, 2, True)
    before = raw_item(table, session_id)
    clock.advance_days(3)
    store.set_goal_date(session_id, "2026-12-15")
    item = raw_item(table, session_id)
    assert item["lastActivityAt"] == "2026-11-13T12:00:00.000Z"
    assert int(item["expiresAt"]) == int((clock.now() + timedelta(days=90)).timestamp())
    for key in ("topic", "stages", "stageCount", "teachingStyle", "source", "createdAt"):
        assert item[key] == before[key]
    assert item["completedStages"] == before["completedStages"]


def test_clearing_also_moves_the_times(store, table, session_id, clock):
    store.save(session_id, make_journey())
    clock.advance_days(5)
    store.set_goal_date(session_id, None)
    assert raw_item(table, session_id)["lastActivityAt"] == "2026-11-15T12:00:00.000Z"


def test_a_goal_change_on_an_absent_journey_is_not_found_and_creates_nothing(
    store, table, session_id
):
    for value in ("2026-12-15", None):
        with pytest.raises(ApiError) as caught:
            store.set_goal_date(session_id, value)
        assert caught.value.code == NOT_FOUND and caught.value.status == 404
    assert raw_item(table, session_id) is None


@pytest.mark.parametrize("days,found", [(89, True), (90, False), (91, False)])
def test_an_expired_journey_is_not_found_and_not_revived_by_a_goal_change(
    store, table, session_id, clock, days, found
):
    store.save(session_id, make_journey())
    before = raw_item(table, session_id)
    clock.advance_days(days)
    if found:
        assert store.set_goal_date(session_id, "2027-01-01") == "2027-01-01"
        return
    with pytest.raises(ApiError) as caught:
        store.set_goal_date(session_id, "2027-01-01")
    assert caught.value.code == NOT_FOUND
    assert raw_item(table, session_id) == before


def test_a_replacement_journey_has_no_goal_date(store, session_id):
    store.save(session_id, make_journey("Rust"))
    store.set_goal_date(session_id, "2026-12-15")
    store.save(session_id, make_journey("Go"))
    assert store.load(session_id).goal_date is None


def test_the_goal_update_is_one_conditional_call_with_set_or_remove(session_id, clock):
    class Recorder:
        def __init__(self):
            self.calls = []

        def update_item(self, **kwargs):
            self.calls.append(kwargs)

    table = Recorder()
    recording = JourneyStore(table, clock.now)
    recording.set_goal_date(session_id, "2026-12-15")
    recording.set_goal_date(session_id, None)
    assert len(table.calls) == 2
    set_call, remove_call = table.calls
    assert set_call["UpdateExpression"].startswith("SET goalDate = :goal")
    assert "REMOVE" not in set_call["UpdateExpression"]
    assert remove_call["UpdateExpression"].endswith("REMOVE goalDate")
    assert ":goal" not in remove_call["ExpressionAttributeValues"]
    for call in table.calls:
        assert call["ConditionExpression"] == "attribute_exists(sessionId) AND expiresAt > :now"
        assert call["ExpressionAttributeValues"][":now"] == int(clock.now().timestamp())


@pytest.mark.parametrize(
    "failure", ["ProvisionedThroughputExceededException", "InternalServerError"]
)
def test_other_store_failures_on_a_goal_change_are_save_failed(session_id, clock, failure):
    broken = JourneyStore(FailingUpdateTable(failure), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.set_goal_date(session_id, "2026-12-15")
    assert caught.value.code == SAVE_FAILED and caught.value.status == 500


def test_a_failed_condition_answered_by_the_service_is_not_found(session_id, clock):
    broken = JourneyStore(FailingUpdateTable("ConditionalCheckFailedException"), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.set_goal_date(session_id, None)
    assert caught.value.code == NOT_FOUND


def test_a_timeout_on_a_goal_change_is_save_failed(session_id, clock):
    class Slow:
        def update_item(self, **kwargs):
            raise ReadTimeoutError(endpoint_url="http://dynamodb")

    with pytest.raises(ApiError) as caught:
        JourneyStore(Slow(), clock.now).set_goal_date(session_id, "2026-12-15")
    assert caught.value.code == SAVE_FAILED


def test_the_contract_name_set_goal_date_is_available(store, session_id):
    store.save(session_id, make_journey())
    assert store.setGoalDate(session_id, "2026-12-15") == "2026-12-15"


# --- The milestones shown (BR44.1) ---


def test_save_omits_the_milestones_attribute_and_never_stores_an_empty_list(
    store, table, session_id
):
    store.save(session_id, make_journey())  # the fixture journey carries "halfway"; it is ignored
    assert "milestonesShown" not in raw_item(table, session_id)
    assert store.load(session_id).milestones_shown == []


@pytest.mark.parametrize(
    "stored,expected",
    [
        ("missing", []),
        ([], []),
        ({"complete", "first-stage"}, ["first-stage", "complete"]),
        (["complete", "halfway", "first-stage"], ["first-stage", "halfway", "complete"]),
        ({"halfway", "unknown-name"}, ["halfway"]),
    ],
    ids=["missing attribute", "empty list", "set sorted", "list sorted", "unknown name dropped"],
)
def test_load_reads_a_missing_set_list_or_empty_milestones_sorted(
    store, table, session_id, stored, expected
):
    store.save(session_id, make_journey())
    if stored != "missing":
        table.update_item(
            Key={"sessionId": session_id, "sk": "JOURNEY"},
            UpdateExpression="SET milestonesShown = :m",
            ExpressionAttributeValues={":m": stored},
        )
    assert store.load(session_id).milestones_shown == expected


def test_marking_adds_one_name_and_returns_the_set_in_the_fixed_order(store, table, session_id):
    store.save(session_id, make_journey())
    assert store.mark_milestone_shown(session_id, "complete") == ["complete"]
    assert store.mark_milestone_shown(session_id, "first-stage") == ["first-stage", "complete"]
    assert store.mark_milestone_shown(session_id, "halfway") == [
        "first-stage",
        "halfway",
        "complete",
    ]
    assert store.load(session_id).milestones_shown == ["first-stage", "halfway", "complete"]
    assert isinstance(raw_item(table, session_id)["milestonesShown"], set)  # a string set


def test_marking_the_same_name_again_is_a_success_that_still_moves_the_times(
    store, table, session_id, clock
):
    store.save(session_id, make_journey())
    store.mark_milestone_shown(session_id, "halfway")
    clock.advance_days(4)
    assert store.mark_milestone_shown(session_id, "halfway") == ["halfway"]
    item = raw_item(table, session_id)
    assert item["milestonesShown"] == {"halfway"}
    assert item["lastActivityAt"] == "2026-11-14T12:00:00.000Z"
    assert int(item["expiresAt"]) == int((clock.now() + timedelta(days=90)).timestamp())


def test_the_milestone_update_changes_only_the_set_and_the_times(store, table, session_id, clock):
    store.save(session_id, make_journey())
    store.set_stage_completion(session_id, 2, True)
    store.set_goal_date(session_id, "2026-12-15")
    before = raw_item(table, session_id)
    clock.advance_days(2)
    store.mark_milestone_shown(session_id, "first-stage")
    item = raw_item(table, session_id)
    for key in ("topic", "stages", "stageCount", "teachingStyle", "source", "createdAt"):
        assert item[key] == before[key]
    assert item["completedStages"] == before["completedStages"]
    assert item["goalDate"] == "2026-12-15"
    assert item["lastActivityAt"] == "2026-11-12T12:00:00.000Z"


def test_marking_on_an_absent_journey_is_not_found_and_creates_nothing(store, table, session_id):
    with pytest.raises(ApiError) as caught:
        store.mark_milestone_shown(session_id, "halfway")
    assert caught.value.code == NOT_FOUND and caught.value.status == 404
    assert raw_item(table, session_id) is None


@pytest.mark.parametrize("days,found", [(89, True), (90, False), (91, False)])
def test_an_expired_journey_is_not_found_and_not_revived_by_a_milestone(
    store, table, session_id, clock, days, found
):
    store.save(session_id, make_journey())
    before = raw_item(table, session_id)
    clock.advance_days(days)
    if found:
        assert store.mark_milestone_shown(session_id, "complete") == ["complete"]
        return
    with pytest.raises(ApiError) as caught:
        store.mark_milestone_shown(session_id, "complete")
    assert caught.value.code == NOT_FOUND
    assert raw_item(table, session_id) == before


def test_a_replacement_journey_starts_with_no_milestones(store, session_id):
    store.save(session_id, make_journey("Rust"))
    store.mark_milestone_shown(session_id, "complete")
    store.save(session_id, make_journey("Go"))
    assert store.load(session_id).milestones_shown == []


def test_the_milestone_update_is_one_conditional_add_returning_the_new_set(session_id, clock):
    class Recorder:
        def __init__(self):
            self.calls = []

        def update_item(self, **kwargs):
            self.calls.append(kwargs)
            return {"Attributes": {"milestonesShown": {"halfway"}}}

    table = Recorder()
    recording = JourneyStore(table, clock.now)
    assert recording.mark_milestone_shown(session_id, "halfway") == ["halfway"]
    (call,) = table.calls
    assert call["UpdateExpression"].startswith("ADD milestonesShown :milestone SET ")
    assert "lastActivityAt" in call["UpdateExpression"] and "expiresAt" in call["UpdateExpression"]
    assert call["ConditionExpression"] == "attribute_exists(sessionId) AND expiresAt > :now"
    values = call["ExpressionAttributeValues"]
    assert values[":milestone"] == {"halfway"}
    assert values[":now"] == int(clock.now().timestamp())
    assert call["ReturnValues"] == "ALL_NEW"


@pytest.mark.parametrize(
    "failure", ["ProvisionedThroughputExceededException", "InternalServerError"]
)
def test_other_store_failures_on_a_milestone_are_save_failed(session_id, clock, failure):
    broken = JourneyStore(FailingUpdateTable(failure), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.mark_milestone_shown(session_id, "halfway")
    assert caught.value.code == SAVE_FAILED and caught.value.status == 500


def test_a_failed_condition_answered_by_the_service_is_not_found_for_a_milestone(session_id, clock):
    broken = JourneyStore(FailingUpdateTable("ConditionalCheckFailedException"), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.mark_milestone_shown(session_id, "halfway")
    assert caught.value.code == NOT_FOUND


def test_a_timeout_on_a_milestone_is_save_failed(session_id, clock):
    class Slow:
        def update_item(self, **kwargs):
            raise ReadTimeoutError(endpoint_url="http://dynamodb")

    with pytest.raises(ApiError) as caught:
        JourneyStore(Slow(), clock.now).mark_milestone_shown(session_id, "halfway")
    assert caught.value.code == SAVE_FAILED


def test_a_record_that_holds_an_empty_list_is_refused_by_the_service_as_save_failed(
    session_id, clock
):
    # The real service refuses ADD on a list attribute; the answer is SAVE_FAILED (an accepted
    # limit, because the save never writes an empty list any more).
    broken = JourneyStore(FailingUpdateTable("ValidationException"), clock.now)
    with pytest.raises(ApiError) as caught:
        broken.mark_milestone_shown(session_id, "halfway")
    assert caught.value.code == SAVE_FAILED


def test_the_contract_name_mark_milestone_shown_is_available(store, session_id):
    store.save(session_id, make_journey())
    assert store.markMilestoneShown(session_id, "first-stage") == ["first-stage"]
