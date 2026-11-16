"""The generator flow with a scripted fake model and a controllable clock (BR1.4, BR3.x, BR4.x)."""

import json
import logging

import pytest
from fixtures import PLANNER_SPLIT, VALID_5, VALID_6, make_reply, make_style_reply, reply_text
from learning_journey.bedrock_client import FakeModelClient, ModelError, ModelTruncatedError
from learning_journey.errors import (
    DAILY_LIMIT,
    SAVE_FAILED,
    TOPIC_NOT_ALLOWED,
    ApiError,
)
from learning_journey.generator import JourneyGenerator
from learning_journey.prompt import build_prompt

VALID = reply_text(VALID_5)
INVALID = "this is not json"
REFUSAL = json.dumps({"refused": True, "reason": "unsafe"})


def build(clock, store, guard, script):
    model = FakeModelClient(script, on_delay=clock.advance)
    generator = JourneyGenerator(
        model, store, guard, clock=clock.monotonic, now=clock.now, bedrock_timeout=12
    )
    return generator, model


def test_ai_success_saves_an_ai_journey_and_keeps_the_slot(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [(6, VALID)])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "ai" and result.bedrock_outcome == "ok"
    assert store.load(session_id).source == "ai"
    assert len(model.calls) == 1 and guard.released == []
    assert guard.reserved == [(session_id, "2026-11-10")]


def test_six_stage_reply_is_kept_as_six_stages(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [reply_text(VALID_6)])
    assert len(generator.generate(session_id, "Rust").journey.stages) == 6


def test_one_retry_after_an_invalid_reply_when_time_remains(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [(6, INVALID), (3, VALID)])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "ai"
    assert len(model.calls) == 2
    assert model.calls[0][1] == 12 and model.calls[1][1] == 9  # second call gets the time left


def test_no_retry_when_fewer_than_five_seconds_remain(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [(12, INVALID), VALID])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "template"
    assert len(model.calls) == 1


def test_retry_starts_at_exactly_five_seconds_remaining(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [(10, INVALID), VALID])
    assert generator.generate(session_id, "Rust").journey.source == "ai"
    assert len(model.calls) == 2


def test_two_invalid_replies_give_the_template(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [INVALID, reply_text(make_reply(7))])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "template" and result.bedrock_outcome == "invalid"
    assert len(model.calls) == 2 and store.load(session_id).source == "template"


def test_fifteen_seconds_without_a_valid_journey_gives_the_template(
    clock, store, guard, session_id
):
    generator, model = build(clock, store, guard, [(14, ModelError("timeout")), VALID])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "template" and len(model.calls) == 1


def test_bedrock_down_gives_the_template_with_the_topic(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [ModelError("down"), ModelError("down")])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "template" and result.bedrock_outcome == "error"
    assert "Rust" in result.journey.stages[0].what_it_is


def test_throttle_is_recorded_as_throttled_and_retried(clock, store, guard, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, model = build(clock, store, guard, [ModelError("slow down", True), VALID])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "ai" and len(model.calls) == 2
    assert '"bedrock_outcome": "throttled"' in caplog.text


def test_unexpected_model_exception_is_treated_like_a_failed_call(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [RuntimeError("weird"), RuntimeError("weird")])
    assert generator.generate(session_id, "Rust").journey.source == "template"


def test_refusal_ends_with_no_retry_template_or_save_and_releases_once(
    clock, store, guard, session_id
):
    generator, model = build(clock, store, guard, [REFUSAL, VALID])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "bad topic")
    assert caught.value.code == TOPIC_NOT_ALLOWED
    assert len(model.calls) == 1
    assert store.load(session_id) is None
    assert guard.released == ["slot-1"]


def test_refusal_wins_when_stages_are_also_present(clock, store, guard, session_id):
    both = json.dumps({**make_reply(5), "refused": True, "reason": "x"})
    generator, _ = build(clock, store, guard, [both])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "t")
    assert caught.value.code == TOPIC_NOT_ALLOWED and store.load(session_id) is None


def test_refusal_on_the_retry_still_ends_the_request(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [INVALID, REFUSAL])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "t")
    assert caught.value.code == TOPIC_NOT_ALLOWED and len(guard.released) == 1


def test_save_failure_releases_the_slot_once(clock, guard, session_id):
    class FailingStore:
        def save(self, session_id, journey):
            raise ApiError(SAVE_FAILED, "no")

    model = FakeModelClient([VALID])
    generator = JourneyGenerator(model, FailingStore(), guard, clock=clock.monotonic, now=clock.now)
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "Rust")
    assert caught.value.code == SAVE_FAILED and guard.released == ["slot-1"]


def test_unexpected_error_releases_the_slot_once_and_answers_a_failure(
    clock, store, guard, session_id, monkeypatch
):
    def boom(topic):
        raise RuntimeError("template broke")

    monkeypatch.setattr("learning_journey.generator.build_template", boom)
    generator, _ = build(clock, store, guard, [INVALID, INVALID])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "Rust")
    assert caught.value.code == SAVE_FAILED and guard.released == ["slot-1"]


def test_request_cap_of_eighteen_seconds_ends_as_save_failed(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [(19, VALID)])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "Rust")
    assert caught.value.code == SAVE_FAILED
    assert store.load(session_id) is None and guard.released == ["slot-1"]


def test_a_refused_slot_ends_as_daily_limit_without_a_model_call(clock, store, session_id):
    from conftest import SpyGuard

    guard = SpyGuard(grant=False)
    generator, model = build(clock, store, guard, [VALID])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "Rust")
    assert caught.value.code == DAILY_LIMIT
    assert model.calls == [] and guard.released == []


def test_journey_source_and_attempts_are_logged_without_typed_text(
    clock, store, guard, session_id, caplog
):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, _ = build(clock, store, guard, [VALID])
    generator.generate(session_id, "My Secret Topic")
    assert '"source": "ai"' in caplog.text
    assert '"model_id": "fake.nova-lite"' in caplog.text
    assert "My Secret Topic" not in caplog.text and session_id not in caplog.text


def test_journey_made_is_logged_only_after_a_successful_save(clock, guard, session_id, caplog):
    class FailingStore:
        def save(self, session_id, journey):
            raise ApiError(SAVE_FAILED, "no")

    caplog.set_level(logging.INFO, logger="learning_journey")
    model = FakeModelClient([VALID])
    generator = JourneyGenerator(model, FailingStore(), guard, clock=clock.monotonic, now=clock.now)
    with pytest.raises(ApiError):
        generator.generate(session_id, "Rust")
    assert "journey_made" not in caplog.text  # an unsaved journey is not counted (review R-03)


def test_journey_made_is_logged_once_the_journey_is_saved(clock, store, guard, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, _ = build(clock, store, guard, [INVALID, INVALID])
    generator.generate(session_id, "Rust")
    assert caplog.text.count('"event": "journey_made"') == 1
    assert '"source": "template"' in caplog.text


def test_errors_carry_the_attempt_facts_for_the_request_log(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [REFUSAL])
    with pytest.raises(ApiError) as refused:
        generator.generate(session_id, "bad topic")
    assert refused.value.facts == {
        "model_id": "fake.nova-lite",
        "bedrock_outcome": "refused",
        "journey_source": None,
    }
    generator, _ = build(clock, store, guard, [(19, VALID)])
    with pytest.raises(ApiError) as too_slow:
        generator.generate(session_id, "Rust")
    assert too_slow.value.facts["bedrock_outcome"] == "ok"
    assert too_slow.value.facts["journey_source"] == "ai"


def test_only_the_topic_and_style_reach_the_model(clock, store, guard, session_id):
    generator, model = build(clock, store, guard, [VALID])
    generator.generate(session_id, "Rust")
    assert session_id not in model.calls[0][0]


# --- With the real daily cap over moto (BR20.2, BR20.3, BR21.1) ---


def build_real(clock, store, real_guard, script):
    return build(clock, store, real_guard, script)


def test_the_sixth_journey_of_a_day_is_refused_without_a_model_call(
    clock, store, real_guard, session_id
):
    generator, model = build_real(clock, store, real_guard, [VALID] * 6)
    for _ in range(5):
        generator.generate(session_id, "Rust")
    calls_before = len(model.calls)
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "Python")
    assert caught.value.code == DAILY_LIMIT
    assert len(model.calls) == calls_before
    assert store.load(session_id).topic == "Rust"  # the existing journey is untouched
    assert caught.value.facts["bedrock_outcome"] == "none"


def test_the_day_passed_to_the_guard_is_the_servers_utc_day(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [VALID])
    generator.generate(session_id, "Rust")
    assert guard.reserved == [(session_id, "2026-11-10")]


def test_a_template_journey_keeps_its_slot(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [INVALID, INVALID])
    assert generator.generate(session_id, "Rust").journey.source == "template"
    assert guard.released == []


def test_a_refused_topic_gives_the_slot_back_once(clock, store, real_guard, table, session_id):
    generator, _ = build_real(clock, store, real_guard, [REFUSAL])
    with pytest.raises(ApiError):
        generator.generate(session_id, "bad")
    item = table.get_item(Key={"sessionId": session_id, "sk": "USAGE#2026-11-10"})["Item"]
    assert int(item["journeysCreated"]) == 0


def test_an_unexpected_error_gives_the_slot_back_once(clock, session_id):
    class ExplodingStore:
        def save(self, *args):
            raise RuntimeError("boom")

    from conftest import SpyGuard

    spy = SpyGuard()
    generator, _ = build(clock, ExplodingStore(), spy, [VALID])
    with pytest.raises(ApiError) as caught:
        generator.generate(session_id, "Rust")
    assert caught.value.code == SAVE_FAILED and spy.released == ["slot-1"]


def test_a_skipped_guard_carries_on_and_releases_nothing(clock, store, session_id):
    from learning_journey.usage_guard import Reservation

    class SkippedGuard:
        released = []

        def reserve(self, session_id, day):
            return Reservation(True, 0, None, guard_skipped=True)

        def release(self, reservation_id):
            self.released.append(reservation_id)

    skipped = SkippedGuard()
    generator, model = build(clock, store, skipped, [INVALID, INVALID])
    assert generator.generate(session_id, "Rust").journey.source == "template"
    assert skipped.released == []
    refused = build(clock, store, skipped, [REFUSAL])[0]
    with pytest.raises(ApiError):
        refused.generate(session_id, "bad")
    assert skipped.released == []


# --- Teaching styles (BR33.2 to BR33.5) ---

STYLES = ("guide", "instructor", "planner")


def style_text(style, count=5):
    return reply_text(make_style_reply(style, count))


@pytest.mark.parametrize("style", STYLES)
def test_the_style_reaches_the_prompt_the_check_and_the_stored_journey(
    clock, store, guard, session_id, style
):
    generator, model = build(clock, store, guard, [style_text(style)])
    result = generator.generate(session_id, "Rust", style)
    assert result.journey.source == "ai" and result.journey.teaching_style == style
    assert store.load(session_id).teaching_style == style
    assert build_prompt("Rust", style) == model.calls[0][0]


@pytest.mark.parametrize("style", ["instructor", "planner"])
def test_a_plain_guide_reply_fails_the_instructor_and_planner_checks(
    clock, store, guard, session_id, style
):
    generator, model = build(clock, store, guard, [VALID, VALID])
    result = generator.generate(session_id, "Rust", style)
    assert result.journey.source == "template" and result.bedrock_outcome == "invalid"
    assert len(model.calls) == 2  # one retry, then the template


def test_a_style_reply_that_fails_is_retried_once_and_a_good_one_is_used(
    clock, store, guard, session_id
):
    generator, model = build(clock, store, guard, [VALID, style_text("instructor")])
    result = generator.generate(session_id, "Rust", "instructor")
    assert result.journey.source == "ai" and len(model.calls) == 2


def test_the_planner_hours_are_kept_on_a_planner_ai_journey_only(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [style_text("planner")])
    generator.generate(session_id, "Rust", "planner")
    assert store.load(session_id).stages[0].hours_by_kind == PLANNER_SPLIT

    generator, _ = build(clock, store, guard, [style_text("planner")])
    generator.generate(session_id, "Rust", "guide")  # a guide reply is not held to the split...
    assert all(s.hours_by_kind is None for s in store.load(session_id).stages)  # ...and drops it


def test_a_planner_journey_made_from_the_template_has_no_breakdown(clock, store, guard, session_id):
    generator, _ = build(clock, store, guard, [INVALID, INVALID])
    result = generator.generate(session_id, "Rust", "planner")
    assert result.journey.source == "template" and result.journey.teaching_style == "planner"
    assert all(s.hours_by_kind is None for s in result.journey.stages)
    assert [s.hours for s in result.journey.stages] == [2, 3, 3, 4, 4]


def test_the_output_cap_is_4096_for_the_guide_and_the_long_cap_for_the_others(
    clock, store, guard, session_id
):
    for style, cap in (("guide", 4096), ("instructor", 5000), ("planner", 5000)):
        generator, model = build(clock, store, guard, [style_text(style)])
        generator.generate(session_id, "Rust", style)
        assert model.max_tokens == [cap]


def test_a_reply_cut_off_by_the_cap_is_invalid_and_retried(clock, store, guard, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, model = build(clock, store, guard, [ModelTruncatedError(), VALID])
    result = generator.generate(session_id, "Rust")
    assert result.journey.source == "ai" and len(model.calls) == 2
    assert '"bedrock_outcome": "invalid"' in caplog.text


def test_two_cut_off_replies_give_the_template_with_an_invalid_outcome(
    clock, store, guard, session_id
):
    generator, _ = build(clock, store, guard, [ModelTruncatedError(), ModelTruncatedError()])
    result = generator.generate(session_id, "Rust", "planner")
    assert result.journey.source == "template" and result.bedrock_outcome == "invalid"


def test_the_style_is_in_the_journey_log_line_and_no_typed_text_is(
    clock, store, guard, session_id, caplog
):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, _ = build(clock, store, guard, [style_text("planner")])
    generator.generate(session_id, "My Secret Topic", "planner")
    made = next(
        json.loads(r.getMessage()) for r in caplog.records if '"journey_made"' in r.getMessage()
    )
    assert made["style"] == "planner" and made["source"] == "ai"
    assert "My Secret Topic" not in caplog.text


# --- the invalid reply's problem name in the log (fix forward after the first deploy) ---


def attempt_lines(caplog):
    lines = [json.loads(r.getMessage()) for r in caplog.records]
    return [line for line in lines if line.get("event") == "ai_attempt"]


def test_an_invalid_reply_logs_its_problem_name_and_never_the_reply_text(
    clock, store, guard, session_id, caplog
):
    caplog.set_level(logging.INFO, logger="learning_journey")
    marked = {
        "refused": False,
        "stages": [dict(s, title=f"Marker title {s['stageNumber']}") for s in VALID_5["stages"]],
    }
    generator, _ = build(clock, store, guard, [reply_text(marked), INVALID])
    generator.generate(session_id, "Rust", "planner")  # a guide-shaped reply has no hoursByKind
    attempts = attempt_lines(caplog)
    assert [a["bedrock_outcome"] for a in attempts] == ["invalid", "invalid"]
    assert [a.get("problem") for a in attempts] == ["hours_by_kind", "not_one_json_object"]
    assert "Marker title" not in caplog.text and "this is not json" not in caplog.text


def test_a_cut_off_reply_logs_the_problem_name_truncated(clock, store, guard, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, _ = build(clock, store, guard, [ModelTruncatedError(), VALID])
    generator.generate(session_id, "Rust")
    attempts = attempt_lines(caplog)
    assert attempts[0]["bedrock_outcome"] == "invalid" and attempts[0]["problem"] == "truncated"


def test_attempts_that_are_not_invalid_carry_no_problem_name(
    clock, store, guard, session_id, caplog
):
    caplog.set_level(logging.INFO, logger="learning_journey")
    generator, _ = build(clock, store, guard, [ModelError("slow down", True), VALID])
    generator.generate(session_id, "Rust")
    assert all("problem" not in a for a in attempt_lines(caplog))
