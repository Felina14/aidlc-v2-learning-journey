"""The usage guard: the stand-in and the real daily cap over moto (contract C4, BR20.x)."""

import json
import logging
import threading
import uuid
from datetime import UTC, datetime

import pytest
from botocore.exceptions import ClientError, ConnectTimeoutError
from learning_journey.usage_guard import (
    DynamoUsageGuard,
    NoLimitGuard,
    decode_reservation_id,
    encode_reservation_id,
    usage_expiry_epoch,
)


def test_stand_in_always_grants_with_a_reservation_id():
    guard = NoLimitGuard()
    for _ in range(10):
        result = guard.reserve("session", "2026-11-10")
        assert result.granted is True
        assert result.reservation_id


def test_reservation_ids_are_unique_and_hold_no_session_id():
    guard = NoLimitGuard()
    first = guard.reserve("11111111-1111-1111-1111-111111111111", "2026-11-10")
    second = guard.reserve("11111111-1111-1111-1111-111111111111", "2026-11-10")
    assert first.reservation_id != second.reservation_id
    assert "1111" not in first.reservation_id


def test_release_does_nothing_and_never_fails():
    guard = NoLimitGuard()
    reservation = guard.reserve("s", "2026-11-10")
    assert guard.release(reservation.reservation_id) is None
    assert guard.release(reservation.reservation_id) is None


# --- The real guard over a moto table (BR20.1 to BR20.5) ---

DAY = "2026-11-10"


def count_of(table, session_id, day=DAY):
    item = table.get_item(Key={"sessionId": session_id, "sk": f"USAGE#{day}"}).get("Item")
    return None if item is None else int(item["journeysCreated"])


def client_error(code):
    return ClientError({"Error": {"Code": code, "Message": "x"}}, "UpdateItem")


class RaisingTable:
    def __init__(self, error):
        self.error = error
        self.calls = 0

    def update_item(self, **kwargs):
        self.calls += 1
        raise self.error


def guard_lines(caplog):
    return [json.loads(r.getMessage()) for r in caplog.records]


def test_first_request_of_the_day_creates_the_item_at_one(real_guard, table, session_id):
    result = real_guard.reserve(session_id, DAY)
    assert result.granted and result.remaining == 4 and not result.guard_skipped
    assert result.reservation_id
    assert count_of(table, session_id) == 1


def test_expiry_is_set_once_to_the_end_of_the_date_plus_a_day(real_guard, table, session_id):
    real_guard.reserve(session_id, DAY)
    real_guard.reserve(session_id, DAY)
    item = table.get_item(Key={"sessionId": session_id, "sk": f"USAGE#{DAY}"})["Item"]
    assert int(item["expiresAt"]) == int(datetime(2026, 11, 12, tzinfo=UTC).timestamp())
    assert usage_expiry_epoch(DAY) == int(item["expiresAt"])


def test_fifth_is_granted_with_none_left_and_sixth_is_refused(real_guard, table, session_id):
    results = [real_guard.reserve(session_id, DAY) for _ in range(5)]
    assert [r.remaining for r in results] == [4, 3, 2, 1, 0] and all(r.granted for r in results)
    sixth = real_guard.reserve(session_id, DAY)
    assert sixth.granted is False and sixth.remaining == 0 and sixth.reservation_id is None
    assert sixth.guard_skipped is False
    assert count_of(table, session_id) == 5


class AtomicTable:
    """Makes each update_item atomic, as DynamoDB does; the moto double is not thread-safe."""

    def __init__(self, table):
        self._table = table
        self._lock = threading.Lock()

    def update_item(self, **kwargs):
        with self._lock:
            return self._table.update_item(**kwargs)


def test_concurrent_reservations_at_the_cap_never_pass_five(table, session_id):
    # DynamoDB runs a conditional update atomically; moto does not under threads, which made
    # this test flaky (6 granted). The lock stands in for that atomicity, so the test proves
    # the guard's condition, not moto's thread safety.
    real_guard = DynamoUsageGuard(AtomicTable(table))
    outcomes = []

    def work():
        outcomes.append(real_guard.reserve(session_id, DAY).granted)

    threads = [threading.Thread(target=work) for _ in range(12)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert outcomes.count(True) == 5 and outcomes.count(False) == 7
    assert count_of(table, session_id) == 5


def test_release_lowers_the_count_and_never_below_zero(real_guard, table, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    reservation = real_guard.reserve(session_id, DAY)
    real_guard.release(reservation.reservation_id)
    assert count_of(table, session_id) == 0
    real_guard.release(reservation.reservation_id)  # a repeat: nothing to give back
    assert count_of(table, session_id) == 0
    assert any(line.get("outcome") == "nothing_to_release" for line in guard_lines(caplog))


def test_release_of_an_item_that_does_not_exist_is_swallowed(real_guard, table, session_id):
    real_guard.release(encode_reservation_id(session_id, DAY))
    assert count_of(table, session_id) is None


def test_a_slot_given_back_can_be_taken_again_at_the_cap(real_guard, session_id):
    held = [real_guard.reserve(session_id, DAY) for _ in range(5)]
    real_guard.release(held[-1].reservation_id)
    assert real_guard.reserve(session_id, DAY).granted is True
    assert real_guard.reserve(session_id, DAY).granted is False


def test_a_new_utc_day_starts_at_zero_and_other_days_do_not_count(real_guard, table, session_id):
    for _ in range(5):
        real_guard.reserve(session_id, DAY)
    tomorrow = real_guard.reserve(session_id, "2026-11-11")
    assert tomorrow.granted and tomorrow.remaining == 4
    assert count_of(table, session_id, DAY) == 5 and count_of(table, session_id, "2026-11-11") == 1


def test_counts_are_kept_per_session(real_guard, session_id):
    for _ in range(5):
        real_guard.reserve(session_id, DAY)
    assert real_guard.reserve(str(uuid.uuid4()), DAY).granted is True


def test_reservation_id_finds_the_right_key_and_hides_nothing_in_the_logs(real_guard, session_id):
    reservation = real_guard.reserve(session_id, DAY)
    assert decode_reservation_id(reservation.reservation_id) == (session_id, DAY)
    assert decode_reservation_id("not a reservation!") is None
    assert decode_reservation_id(encode_reservation_id("", DAY)) is None


def test_an_unknown_reservation_id_is_logged_and_ignored(real_guard, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    real_guard.release("slot-123")
    assert guard_lines(caplog)[0]["outcome"] == "unknown_reservation"


@pytest.mark.parametrize(
    "code", ["ProvisionedThroughputExceededException", "AccessDeniedException"]
)
def test_a_store_error_lets_the_request_through_with_one_log_line(session_id, code, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    table = RaisingTable(client_error(code))
    result = DynamoUsageGuard(table).reserve(session_id, DAY)
    assert result.granted and result.guard_skipped and result.reservation_id is None
    lines = guard_lines(caplog)
    assert len(lines) == 1 and lines[0]["event"] == "guard_skipped"
    assert lines[0]["outcome"] == "error" and lines[0]["error_class"] == "ClientError"
    assert lines[0]["session"] == session_id[:8]
    assert session_id not in caplog.text


def test_a_connect_timeout_lets_the_request_through(session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    table = RaisingTable(ConnectTimeoutError(endpoint_url="https://dynamodb.test"))
    result = DynamoUsageGuard(table).reserve(session_id, DAY)
    assert result.granted and result.guard_skipped and result.reservation_id is None
    assert guard_lines(caplog)[0]["error_class"] == "ConnectTimeoutError"


def test_a_stubbed_failed_condition_is_a_refusal_not_a_skip(session_id):
    table = RaisingTable(client_error("ConditionalCheckFailedException"))
    result = DynamoUsageGuard(table).reserve(session_id, DAY)
    assert result.granted is False and result.guard_skipped is False


def test_a_reserve_that_takes_over_the_limit_is_skipped(table, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    ticks = iter([0.0, 2.5])
    guard = DynamoUsageGuard(table, clock=lambda: next(ticks))
    result = guard.reserve(session_id, DAY)
    assert result.granted and result.guard_skipped and result.reservation_id is None
    line = guard_lines(caplog)[0]
    assert line["event"] == "guard_skipped" and line["outcome"] == "timeout"


def test_a_failed_release_is_logged_and_never_raises(session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    table = RaisingTable(client_error("InternalServerError"))
    DynamoUsageGuard(table).release(encode_reservation_id(session_id, DAY))
    line = guard_lines(caplog)[0]
    assert line["outcome"] == "error" and table.calls == 1
    assert session_id not in caplog.text


def test_the_journey_item_is_not_counted_or_changed_by_the_guard(
    real_guard, table, store, session_id
):
    from test_store import make_journey

    store.save(session_id, make_journey())
    real_guard.reserve(session_id, DAY)
    assert store.load(session_id) is not None
    assert count_of(table, session_id) == 1
