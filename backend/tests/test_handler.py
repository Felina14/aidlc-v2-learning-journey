"""Handler tests, including handler to generator to store with the fake model (contract C1)."""

import base64
import json
import logging
import uuid

import pytest
from fixtures import HOSTILE_TOPICS, VALID_5, make_style_reply, reply_text
from learning_journey import handler as handler_module
from learning_journey.bedrock_client import FakeModelClient
from learning_journey.config import Settings
from learning_journey.errors import SAVE_FAILED, ApiError
from learning_journey.generator import JourneyGenerator
from learning_journey.handler import JourneyApp, is_session_id

PATH = "/api/v1/journey"
VALID = reply_text(VALID_5)
REFUSAL = json.dumps({"refused": True, "reason": "no"})


def make_app(clock, store, guard, script):
    model = FakeModelClient(script, on_delay=clock.advance)
    generator = JourneyGenerator(model, store, guard, clock=clock.monotonic, now=clock.now)
    return JourneyApp(generator, store, clock=clock.monotonic), model


def event(method, session_id, body=None, path=PATH, header="X-Session-Id", **extra):
    headers = {header: session_id} if session_id is not None else {}
    result = {
        "rawPath": path,
        "requestContext": {"http": {"method": method}},
        "headers": headers,
    }
    if body is not None:
        result["body"] = body if isinstance(body, str) else json.dumps(body)
    result.update(extra)
    return result


def parse(response):
    return response["statusCode"], json.loads(response["body"])


def test_post_creates_an_ai_journey_with_201_and_the_c2_shape(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event("POST", session_id, {"topic": "  Rust  "})))
    assert status == 201
    assert body["topic"] == "Rust" and body["source"] == "ai" and body["teachingStyle"] == "guide"
    assert len(body["stages"]) == 5
    assert body["completedStages"] == [] and body["goalDate"] is None
    assert body["milestonesShown"] == []
    assert "sessionId" not in body and "expiresAt" not in body


def test_get_returns_the_saved_journey_then_404_for_another_session(
    clock, store, guard, session_id
):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    status, body = parse(app.handle(event("GET", session_id)))
    assert status == 200 and body["topic"] == "Rust"
    status, body = parse(app.handle(event("GET", str(uuid.uuid4()))))
    assert status == 404 and body["error"]["code"] == "NOT_FOUND"


def test_a_second_post_replaces_the_first(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID, VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    app.handle(event("POST", session_id, {"topic": "Python"}))
    assert parse(app.handle(event("GET", session_id)))[1]["topic"] == "Python"


def test_bad_bedrock_gives_a_labelled_template_journey_with_201(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [])
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Rust"})))
    assert status == 201 and body["source"] == "template"


def test_error_responses_use_the_c1_shape(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [])
    response = app.handle(event("POST", session_id, {"topic": "!!!"}))
    status, body = parse(response)
    assert status == 400
    assert set(body) == {"error"} and set(body["error"]) == {"code", "message"}
    assert body["error"]["code"] == "TOPIC_INVALID"
    assert response["headers"]["Content-Type"] == "application/json"


@pytest.mark.parametrize("topic", ["a", "a" * 101, "!!!!", "   "])
def test_invalid_topics_are_400_and_make_no_model_call(clock, store, guard, session_id, topic):
    app, model = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event("POST", session_id, {"topic": topic})))
    assert status == 400 and body["error"]["code"] == "TOPIC_INVALID"
    assert model.calls == [] and guard.reserved == []


@pytest.mark.parametrize("session", [None, "", "not-a-uuid", "1234", str(uuid.uuid4()) + "x"])
def test_missing_or_malformed_session_id_is_invalid_request(clock, store, guard, session):
    app, model = make_app(clock, store, guard, [VALID])
    for method in ("POST", "GET"):
        status, body = parse(app.handle(event(method, session, {"topic": "Rust"})))
        assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"
    assert model.calls == []


def test_session_header_is_read_case_insensitively(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    status, _ = parse(
        app.handle(event("POST", session_id, {"topic": "Rust"}, header="x-session-id"))
    )
    assert status == 201


@pytest.mark.parametrize(
    "body", [None, "", "{not json", "[]", '"x"', "{}", '{"topic": 5}', '{"topic": null}']
)
def test_bad_bodies_are_invalid_request(clock, store, guard, session_id, body):
    app, _ = make_app(clock, store, guard, [VALID])
    status, payload = parse(app.handle(event("POST", session_id, body)))
    assert status == 400 and payload["error"]["code"] == "INVALID_REQUEST"


def test_oversized_and_undecodable_bodies_are_invalid_request(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    big = json.dumps({"topic": "a" * 20000})
    assert parse(app.handle(event("POST", session_id, big)))[0] == 400
    bad = event("POST", session_id, "%%%", isBase64Encoded=True)
    assert parse(app.handle(bad))[1]["error"]["code"] == "INVALID_REQUEST"


def test_base64_body_is_decoded(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    encoded = base64.b64encode(json.dumps({"topic": "Rust"}).encode()).decode()
    status, _ = parse(app.handle(event("POST", session_id, encoded, isBase64Encoded=True)))
    assert status == 201


def test_a_refused_topic_is_422_and_nothing_is_saved(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [REFUSAL])
    status, body = parse(app.handle(event("POST", session_id, {"topic": "bad"})))
    assert status == 422 and body["error"]["code"] == "TOPIC_NOT_ALLOWED"
    assert parse(app.handle(event("GET", session_id)))[0] == 404
    assert len(guard.released) == 1


def test_save_failure_is_500_save_failed(clock, guard, session_id):
    class FailingStore:
        def save(self, sid, journey):
            raise ApiError(SAVE_FAILED, "no")

    model = FakeModelClient([VALID])
    generator = JourneyGenerator(model, FailingStore(), guard, clock=clock.monotonic, now=clock.now)
    app = JourneyApp(generator, FailingStore(), clock=clock.monotonic)
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Rust"})))
    assert status == 500 and body["error"]["code"] == "SAVE_FAILED"


def test_load_failure_is_500_load_failed(clock, guard, session_id):
    class BrokenStore:
        def load(self, sid):
            raise OSError("down")

    app = JourneyApp(None, BrokenStore(), clock=clock.monotonic)
    status, body = parse(app.handle(event("GET", session_id)))
    assert status == 500 and body["error"]["code"] == "LOAD_FAILED"


def test_unexpected_error_in_a_create_is_a_500_failure(clock, store, guard, session_id):
    class Exploding:
        def generate(self, *args):
            raise RuntimeError("secret detail")

    app = JourneyApp(Exploding(), store, clock=clock.monotonic)
    response = app.handle(event("POST", session_id, {"topic": "Rust"}))
    assert response["statusCode"] == 500
    assert "secret detail" not in response["body"]


@pytest.mark.parametrize(
    "method,path", [("PUT", PATH), ("PATCH", PATH), ("GET", "/api/v1/other"), ("POST", "/")]
)
def test_unknown_routes_are_404(clock, store, guard, session_id, method, path):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event(method, session_id, {"topic": "Rust"}, path=path)))
    assert status == 404 and body["error"]["code"] == "NOT_FOUND"


@pytest.mark.parametrize("topic", HOSTILE_TOPICS)
def test_hostile_topics_come_back_as_plain_json_text(clock, store, guard, session_id, topic):
    app, model = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event("POST", session_id, {"topic": topic})))
    assert status == 201 and body["topic"] == topic
    # Whatever the topic holds, the model request has exactly one real pair of delimiters.
    prompt = model.calls[0][0]
    assert prompt.count("\n<<<TOPIC_START>>>\n") == 1 and prompt.count("\n<<<TOPIC_END>>>\n") == 1


def test_log_line_has_the_wanted_fields_and_no_secrets(clock, store, guard, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    app, _ = make_app(clock, store, guard, [(2, VALID)])
    app.handle(event("POST", session_id, {"topic": "Very Private Topic"}), request_id="req-1")
    lines = [json.loads(r.getMessage()) for r in caplog.records]
    request = next(line for line in lines if line["event"] == "request")
    assert request["request_id"] == "req-1" and request["route"] == f"POST {PATH}"
    assert request["outcome"] == "ok" and request["status"] == 201
    assert request["model_id"] == "fake.nova-lite" and request["bedrock_outcome"] == "ok"
    assert request["journey_source"] == "ai" and request["total_ms"] == 2000
    assert request["session"] == session_id[:8]
    assert session_id not in caplog.text
    assert "Very Private Topic" not in caplog.text and "Stage 1 title" not in caplog.text


def test_session_id_check_accepts_only_standard_uuid_text():
    assert is_session_id(str(uuid.uuid4())) and is_session_id(str(uuid.uuid4()).upper())
    assert not is_session_id(uuid.uuid4().hex) and not is_session_id(None)


def test_session_id_check_rejects_a_trailing_newline_or_other_extra_text():
    good = str(uuid.uuid4())
    for bad in (good + "\n", good + " ", " " + good, good + "x", "\n" + good):
        assert not is_session_id(bad)


def test_lambda_entry_point_wires_the_app_once(clock, store, guard, session_id, monkeypatch):
    app, _ = make_app(clock, store, guard, [VALID])
    calls = []
    monkeypatch.setattr(handler_module, "_app", None)
    monkeypatch.setattr(handler_module, "build_app", lambda: calls.append(1) or app)

    class Context:
        aws_request_id = "abc"

    first = handler_module.lambda_handler(event("POST", session_id, {"topic": "Rust"}), Context())
    second = handler_module.lambda_handler(event("GET", session_id), Context())
    assert first["statusCode"] == 201 and second["statusCode"] == 200 and calls == [1]
    monkeypatch.setattr(handler_module, "_app", None)


def test_build_app_wires_real_collaborators_from_settings(table):
    app = handler_module.build_app(Settings(table_name="journeys"))
    assert isinstance(app, JourneyApp)


def test_request_line_is_complete_on_a_refusal(clock, store, guard, session_id, caplog):
    caplog.set_level(logging.INFO, logger="learning_journey")
    app, _ = make_app(clock, store, guard, [REFUSAL])
    status, _ = parse(app.handle(event("POST", session_id, {"topic": "bad topic"})))
    lines = [json.loads(r.getMessage()) for r in caplog.records]
    request = next(line for line in lines if line["event"] == "request")
    assert status == 422 and request["outcome"] == "TOPIC_NOT_ALLOWED"
    assert request["model_id"] == "fake.nova-lite"
    assert request["bedrock_outcome"] == "refused" and request["journey_source"] is None


def test_request_line_is_complete_when_the_save_fails(clock, guard, session_id, caplog):
    class FailingStore:
        def save(self, session_id, journey):
            raise ApiError(SAVE_FAILED, "no")

    caplog.set_level(logging.INFO, logger="learning_journey")
    model = FakeModelClient([VALID])
    generator = JourneyGenerator(model, FailingStore(), guard, clock=clock.monotonic, now=clock.now)
    app = JourneyApp(generator, FailingStore(), clock=clock.monotonic)
    status, _ = parse(app.handle(event("POST", session_id, {"topic": "Rust"})))
    request = next(
        json.loads(r.getMessage())
        for r in caplog.records
        if json.loads(r.getMessage())["event"] == "request"
    )
    assert status == 500
    assert request["model_id"] == "fake.nova-lite" and request["bedrock_outcome"] == "ok"
    assert request["journey_source"] == "ai"


def test_a_joiner_flood_topic_is_rejected_with_topic_invalid(clock, store, guard, session_id):
    app, model = make_app(clock, store, guard, [VALID])
    flood = "ab" + "\u200d" * 199  # 201 code points, but only 2 visible characters
    status, body = parse(app.handle(event("POST", session_id, {"topic": flood})))
    assert status == 400 and body["error"]["code"] == "TOPIC_INVALID"
    assert model.calls == []


# -- PUT /api/v1/journey/stages/{stageNumber}/completion (BR11.3) -------------------------------


def put(session_id, stage, body, **extra):
    path = f"{PATH}/stages/{stage}/completion"
    return event("PUT", session_id, body, path=path, **extra)


def made_journey(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    return app


def test_put_marks_a_stage_and_answers_the_ascending_list(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    assert parse(app.handle(put(session_id, 3, {"completed": True}))) == (
        200,
        {"completedStages": [3]},
    )
    assert parse(app.handle(put(session_id, 1, {"completed": True})))[1] == {
        "completedStages": [1, 3]
    }
    assert parse(app.handle(put(session_id, 3, {"completed": False})))[1] == {
        "completedStages": [1]
    }
    assert parse(app.handle(event("GET", session_id)))[1]["completedStages"] == [1]


def test_put_repeat_is_a_200_with_the_same_list_and_an_empty_list_is_a_list(
    clock, store, guard, session_id
):
    app = made_journey(clock, store, guard, session_id)
    for _ in range(2):
        assert parse(app.handle(put(session_id, 2, {"completed": True})))[1] == {
            "completedStages": [2]
        }
    app.handle(put(session_id, 2, {"completed": False}))
    assert parse(app.handle(put(session_id, 2, {"completed": False})))[1] == {"completedStages": []}


@pytest.mark.parametrize(
    "stage", ["02", "+2", "2.0", "0", "7", "10", "-1", "", "٢", "２", "2 ", "2\n", "x", "1e0"]
)
def test_put_refuses_a_stage_number_that_is_not_plain_one_to_six(
    clock, store, guard, session_id, stage
):
    app = made_journey(clock, store, guard, session_id)
    status, body = parse(app.handle(put(session_id, stage, {"completed": True})))
    assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"
    assert parse(app.handle(event("GET", session_id)))[1]["completedStages"] == []


@pytest.mark.parametrize(
    "body",
    [
        None,
        "",
        "{bad",
        "[]",
        "{}",
        '{"completed": "true"}',
        '{"completed": 1}',
        '{"completed": null}',
    ],
)
def test_put_needs_a_json_object_with_completed_true_or_false(
    clock, store, guard, session_id, body
):
    app = made_journey(clock, store, guard, session_id)
    status, payload = parse(app.handle(put(session_id, 1, body)))
    assert status == 400 and payload["error"]["code"] == "INVALID_REQUEST"
    assert parse(app.handle(event("GET", session_id)))[1]["completedStages"] == []


def test_put_ignores_extra_body_keys(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    body = {"completed": True, "extra": [1], "stageNumber": 5}
    assert parse(app.handle(put(session_id, 1, body)))[1] == {"completedStages": [1]}


@pytest.mark.parametrize("session", [None, "", "not-a-uuid"])
def test_put_needs_a_valid_session_id(clock, store, guard, session):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(put(session, 1, {"completed": True})))
    assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"


def test_put_without_a_journey_is_404_and_creates_nothing(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(put(session_id, 1, {"completed": True})))
    assert status == 404 and body["error"]["code"] == "NOT_FOUND"
    assert parse(app.handle(event("GET", session_id)))[0] == 404


def test_put_on_an_expired_journey_is_404(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    clock.advance_days(91)
    assert parse(app.handle(put(session_id, 1, {"completed": True})))[0] == 404


def test_put_for_a_stage_the_journey_lacks_is_400(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)  # 5 stages
    status, body = parse(app.handle(put(session_id, 6, {"completed": True})))
    assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"
    assert parse(app.handle(event("GET", session_id)))[1]["completedStages"] == []


def test_put_save_failure_is_500_save_failed_in_the_c1_shape(clock, session_id):
    class BrokenStore:
        def set_stage_completion(self, *args):
            raise ApiError(SAVE_FAILED, "no")

    app = JourneyApp(None, BrokenStore(), clock=clock.monotonic)
    response = app.handle(put(session_id, 1, {"completed": True}))
    status, body = parse(response)
    assert status == 500 and body == {"error": {"code": "SAVE_FAILED", "message": "no"}}
    assert response["headers"]["Cache-Control"] == "no-store"


def test_put_unexpected_error_is_save_failed_without_detail(clock, session_id):
    class Exploding:
        def set_stage_completion(self, *args):
            raise RuntimeError("secret detail")

    app = JourneyApp(None, Exploding(), clock=clock.monotonic)
    response = app.handle(put(session_id, 1, {"completed": True}))
    assert response["statusCode"] == 500 and "secret detail" not in response["body"]
    assert json.loads(response["body"])["error"]["code"] == "SAVE_FAILED"


@pytest.mark.parametrize("method", ["GET", "POST", "DELETE"])
def test_the_completion_path_answers_only_put(clock, store, guard, session_id, method):
    app = made_journey(clock, store, guard, session_id)
    path = f"{PATH}/stages/1/completion"
    status, body = parse(app.handle(event(method, session_id, {"completed": True}, path=path)))
    assert status == 404 and body["error"]["code"] == "NOT_FOUND"


def test_put_log_line_has_the_route_and_a_short_session_and_no_full_id(
    clock, store, guard, session_id, caplog
):
    app = made_journey(clock, store, guard, session_id)
    caplog.clear()
    caplog.set_level(logging.INFO, logger="learning_journey")
    app.handle(put(session_id, 2, {"completed": True}), request_id="req-9")
    request = next(
        json.loads(r.getMessage())
        for r in caplog.records
        if json.loads(r.getMessage())["event"] == "request"
    )
    assert request["route"] == f"PUT {PATH}/stages/2/completion"
    assert request["outcome"] == "ok" and request["status"] == 200
    assert request["session"] == session_id[:8] and "total_ms" in request
    assert session_id not in caplog.text


def test_put_with_a_base64_body_is_decoded(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    encoded = base64.b64encode(json.dumps({"completed": True}).encode()).decode()
    status, body = parse(app.handle(put(session_id, 4, encoded, isBase64Encoded=True)))
    assert status == 200 and body == {"completedStages": [4]}


# --- DELETE and the daily cap, handler to guard to store (BR20, BR21.1, BR23.1) ---


def test_delete_answers_204_with_an_empty_body_twice(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    first = app.handle(event("DELETE", session_id))
    second = app.handle(event("DELETE", session_id))
    assert first["statusCode"] == 204 and first["body"] == ""
    assert second["statusCode"] == 204 and second["body"] == ""
    assert parse(app.handle(event("GET", session_id)))[0] == 404


def test_delete_with_a_bad_session_id_is_400(clock, store, guard):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event("DELETE", "nope")))
    assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"


def test_a_store_failure_on_delete_is_500_delete_failed(clock, guard, session_id):
    class BrokenTable:
        def delete_item(self, **kwargs):
            raise RuntimeError("down")

    from learning_journey.store import JourneyStore

    broken = JourneyStore(BrokenTable())
    app, _ = make_app(clock, broken, guard, [])
    status, body = parse(app.handle(event("DELETE", session_id)))
    assert status == 500 and body["error"]["code"] == "DELETE_FAILED"


def test_an_unexpected_delete_error_is_still_delete_failed(clock, guard, session_id):
    class Exploding:
        def delete(self, session_id):
            raise ValueError("bug")

    model = FakeModelClient([])
    generator = JourneyGenerator(model, Exploding(), guard, clock=clock.monotonic, now=clock.now)
    app = JourneyApp(generator, Exploding(), clock=clock.monotonic)
    status, body = parse(app.handle(event("DELETE", session_id)))
    assert status == 500 and body["error"]["code"] == "DELETE_FAILED"


def test_the_sixth_create_of_a_day_is_429_daily_limit_and_saves_nothing(
    clock, store, real_guard, session_id, table
):
    app, model = make_app(clock, store, real_guard, [VALID] * 7)
    for _ in range(5):
        assert app.handle(event("POST", session_id, {"topic": "Rust"}))["statusCode"] == 201
    calls = len(model.calls)
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Python"})))
    assert status == 429 and body == {
        "error": {"code": "DAILY_LIMIT", "message": "the daily limit is reached"}
    }
    assert len(model.calls) == calls
    assert store.load(session_id).topic == "Rust"


def test_delete_and_replace_never_give_slots_back(clock, store, real_guard, session_id):
    app, _ = make_app(clock, store, real_guard, [VALID] * 7)
    for _ in range(5):
        app.handle(event("POST", session_id, {"topic": "Rust"}))
    app.handle(event("DELETE", session_id))
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Go"})))
    assert status == 429 and body["error"]["code"] == "DAILY_LIMIT"


def test_a_failed_create_gives_its_slot_back_through_the_real_guard(
    clock, store, real_guard, session_id
):
    app, _ = make_app(clock, store, real_guard, [REFUSAL] * 6 + [VALID])
    for _ in range(6):
        assert app.handle(event("POST", session_id, {"topic": "bad"}))["statusCode"] == 422
    assert app.handle(event("POST", session_id, {"topic": "Rust"}))["statusCode"] == 201


def test_the_request_line_on_daily_limit_is_complete_and_hides_ids(
    clock, store, real_guard, session_id, caplog
):
    app, _ = make_app(clock, store, real_guard, [VALID] * 6)
    for _ in range(5):
        app.handle(event("POST", session_id, {"topic": "Rust"}))
    caplog.clear()
    caplog.set_level(logging.INFO, logger="learning_journey")
    app.handle(event("POST", session_id, {"topic": "Python"}))
    lines = [json.loads(r.getMessage()) for r in caplog.records]
    request = next(line for line in lines if line["event"] == "request")
    assert request["status"] == 429 and request["outcome"] == "DAILY_LIMIT"
    assert request["model_id"] == "fake.nova-lite" and request["bedrock_outcome"] == "none"
    assert request["journey_source"] is None and request["session"] == session_id[:8]
    assert session_id not in caplog.text


def test_a_guard_store_failure_lets_the_create_through(clock, store, session_id, caplog):
    from learning_journey.usage_guard import DynamoUsageGuard

    class DownTable:
        def update_item(self, **kwargs):
            raise RuntimeError("down")

    caplog.set_level(logging.INFO, logger="learning_journey")
    app, _ = make_app(clock, store, DynamoUsageGuard(DownTable()), [VALID])
    assert app.handle(event("POST", session_id, {"topic": "Rust"}))["statusCode"] == 201
    events = [json.loads(r.getMessage())["event"] for r in caplog.records]
    assert events.count("guard_skipped") == 1


# --- Teaching style on the create route (BR33.2) ---


@pytest.mark.parametrize("style", ["guide", "instructor", "planner"])
def test_post_with_a_style_makes_a_journey_in_that_style(clock, store, guard, session_id, style):
    app, model = make_app(clock, store, guard, [reply_text(make_style_reply(style))])
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Rust", "style": style})))
    assert status == 201 and body["source"] == "ai" and body["teachingStyle"] == style
    has_split = "hoursByKind" in body["stages"][0]
    assert has_split is (style == "planner")
    assert parse(app.handle(event("GET", session_id)))[1]["teachingStyle"] == style
    assert len(model.calls) == 1


def test_post_without_a_style_means_the_guide_style(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Rust"})))
    assert status == 201 and body["teachingStyle"] == "guide"


@pytest.mark.parametrize(
    "style", ["Guide", "expert", "", None, 3, True, ["guide"], {"a": 1}, "guide "]
)
def test_post_with_any_other_style_is_invalid_request_before_a_slot_or_a_model_call(
    clock, store, guard, session_id, style
):
    app, model = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(event("POST", session_id, {"topic": "Rust", "style": style})))
    assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"
    assert model.calls == [] and guard.reserved == []
    assert parse(app.handle(event("GET", session_id)))[0] == 404


def test_the_request_line_carries_the_style_and_never_typed_text(
    clock, store, guard, session_id, caplog
):
    caplog.set_level(logging.INFO, logger="learning_journey")
    app, _ = make_app(clock, store, guard, [reply_text(make_style_reply("instructor"))])
    app.handle(event("POST", session_id, {"topic": "Rust", "style": "instructor"}))
    app.handle(event("POST", session_id, {"topic": "Rust", "style": "Typed Secret Style"}))
    app.handle(event("GET", session_id))
    requests = [
        json.loads(r.getMessage()) for r in caplog.records if '"event": "request"' in r.getMessage()
    ]
    assert [line["style"] for line in requests] == ["instructor", None, None]
    assert "Typed Secret Style" not in caplog.text


# --- The goal route (BR32.1) ---

GOAL_PATH = "/api/v1/journey/goal"


def put_goal(app, session_id, body):
    return parse(app.handle(event("PUT", session_id, body, path=GOAL_PATH)))


def test_put_goal_sets_changes_and_clears_the_date_and_get_shows_it(
    clock, store, guard, session_id
):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    assert put_goal(app, session_id, {"goalDate": "2026-12-15"}) == (
        200,
        {"goalDate": "2026-12-15"},
    )
    assert parse(app.handle(event("GET", session_id)))[1]["goalDate"] == "2026-12-15"
    assert put_goal(app, session_id, {"goalDate": "2027-01-02"}) == (
        200,
        {"goalDate": "2027-01-02"},
    )
    assert put_goal(app, session_id, {"goalDate": None}) == (200, {"goalDate": None})
    assert parse(app.handle(event("GET", session_id)))[1]["goalDate"] is None
    assert put_goal(app, session_id, {"goalDate": None}) == (200, {"goalDate": None})


def test_put_goal_answers_in_the_c1_shape_with_no_store_header_and_extra_keys_ignored(
    clock, store, guard, session_id
):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    response = app.handle(
        event("PUT", session_id, {"goalDate": "2026-12-15", "completed": True}, path=GOAL_PATH)
    )
    assert response["statusCode"] == 200
    assert response["headers"]["Cache-Control"] == "no-store"
    assert json.loads(response["body"]) == {"goalDate": "2026-12-15"}


def test_put_goal_leaves_the_stage_progress_alone(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    app.handle(event("PUT", session_id, {"completed": True}, path=PATH + "/stages/2/completion"))
    put_goal(app, session_id, {"goalDate": "2026-12-15"})
    body = parse(app.handle(event("GET", session_id)))[1]
    assert body["completedStages"] == [2] and body["goalDate"] == "2026-12-15"


@pytest.mark.parametrize(
    "body",
    [
        {"goalDate": "2027-02-29"},
        {"goalDate": "2026-02-30"},
        {"goalDate": "26-11-10"},
        {"goalDate": "2026-11-10T00:00:00Z"},
        {"goalDate": 20261110},
        {"goalDate": ""},
        {},
        {"other": "2026-12-15"},
        [],
        "null",
        "{not json",
        "",
        None,
    ],
)
def test_put_goal_with_a_bad_body_is_invalid_request_and_changes_nothing(
    clock, store, guard, session_id, body
):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    status, payload = put_goal(app, session_id, body)
    assert status == 400 and payload["error"]["code"] == "INVALID_REQUEST"
    assert parse(app.handle(event("GET", session_id)))[1]["goalDate"] is None


@pytest.mark.parametrize("session", [None, "", "not-a-uuid", str(uuid.uuid4()) + "x"])
def test_put_goal_needs_a_session_id(clock, store, guard, session):
    app, _ = make_app(clock, store, guard, [VALID])
    status, payload = put_goal(app, session, {"goalDate": "2026-12-15"})
    assert status == 400 and payload["error"]["code"] == "INVALID_REQUEST"


def test_put_goal_with_no_journey_is_not_found_and_creates_nothing(
    clock, store, guard, session_id, table
):
    app, _ = make_app(clock, store, guard, [VALID])
    status, payload = put_goal(app, session_id, {"goalDate": "2026-12-15"})
    assert status == 404 and payload["error"]["code"] == "NOT_FOUND"
    assert table.get_item(Key={"sessionId": session_id, "sk": "JOURNEY"}).get("Item") is None


def test_put_goal_on_an_expired_journey_is_not_found(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    clock.advance_days(91)
    status, payload = put_goal(app, session_id, {"goalDate": "2026-12-15"})
    assert status == 404 and payload["error"]["code"] == "NOT_FOUND"


def test_put_goal_when_the_store_fails_is_save_failed(clock, guard, session_id):
    class FailingStore:
        def set_goal_date(self, sid, value):
            raise ApiError(SAVE_FAILED, "no")

    generator = JourneyGenerator(FakeModelClient([]), FailingStore(), guard)
    app = JourneyApp(generator, FailingStore(), clock=clock.monotonic)
    status, payload = put_goal(app, session_id, {"goalDate": "2026-12-15"})
    assert status == 500 and payload["error"]["code"] == "SAVE_FAILED"


def test_put_goal_logs_the_route_and_outcome_for_the_alarm_filters(
    clock, store, guard, session_id, caplog
):
    caplog.set_level(logging.INFO, logger="learning_journey")
    app, _ = make_app(clock, store, guard, [])
    put_goal(app, session_id, {"goalDate": "2026-12-15"})
    line = next(
        json.loads(r.getMessage()) for r in caplog.records if '"event": "request"' in r.getMessage()
    )
    assert line["route"] == f"PUT {GOAL_PATH}" and line["outcome"] == "NOT_FOUND"
    assert "total_ms" in line and "2026-12-15" not in caplog.text


@pytest.mark.parametrize("method", ["GET", "POST", "DELETE"])
def test_the_goal_path_only_answers_put(clock, store, guard, session_id, method):
    app, _ = make_app(clock, store, guard, [VALID])
    response = app.handle(event(method, session_id, {"goalDate": None}, path=GOAL_PATH))
    assert parse(response)[0] == 404


def test_put_goal_accepts_a_trailing_slash(clock, store, guard, session_id):
    app, _ = make_app(clock, store, guard, [VALID])
    app.handle(event("POST", session_id, {"topic": "Rust"}))
    response = app.handle(event("PUT", session_id, {"goalDate": None}, path=GOAL_PATH + "/"))
    assert response["statusCode"] == 200


# -- PUT /api/v1/journey/milestones (BR44.1) ------------------------------------------------------

MILESTONES_PATH = f"{PATH}/milestones"


def put_milestone(session_id, body, **extra):
    return event("PUT", session_id, body, path=MILESTONES_PATH, **extra)


def test_put_milestone_answers_the_set_in_the_fixed_order(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    assert parse(app.handle(put_milestone(session_id, {"milestone": "complete"}))) == (
        200,
        {"milestonesShown": ["complete"]},
    )
    assert parse(app.handle(put_milestone(session_id, {"milestone": "first-stage"})))[1] == {
        "milestonesShown": ["first-stage", "complete"]
    }
    # A repeat is a 200 with the same set.
    assert parse(app.handle(put_milestone(session_id, {"milestone": "first-stage"})))[1] == {
        "milestonesShown": ["first-stage", "complete"]
    }


def test_get_and_post_answer_the_sorted_milestones(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    for name in ("complete", "halfway", "first-stage"):
        app.handle(put_milestone(session_id, {"milestone": name}))
    body = parse(app.handle(event("GET", session_id)))[1]
    assert body["milestonesShown"] == ["first-stage", "halfway", "complete"]
    created, _ = make_app(clock, store, guard, [VALID])
    status, fresh = parse(created.handle(event("POST", session_id, {"topic": "Go"})))
    assert status == 201 and fresh["milestonesShown"] == []  # a replacement starts with none


@pytest.mark.parametrize(
    "body",
    [
        None,
        "",
        "{bad",
        "[]",
        "{}",
        '{"milestone": "done"}',
        '{"milestone": 3}',
        '{"milestone": null}',
        '{"milestone": ["halfway"]}',
    ],
)
def test_put_milestone_refuses_a_bad_body_and_stores_nothing(clock, store, guard, session_id, body):
    app = made_journey(clock, store, guard, session_id)
    status, payload = parse(app.handle(put_milestone(session_id, body)))
    assert status == 400 and payload["error"]["code"] == "INVALID_REQUEST"
    assert parse(app.handle(event("GET", session_id)))[1]["milestonesShown"] == []


def test_put_milestone_ignores_extra_body_keys(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    body = {"milestone": "halfway", "completed": True, "name": "ignored"}
    assert parse(app.handle(put_milestone(session_id, body)))[1] == {"milestonesShown": ["halfway"]}


@pytest.mark.parametrize("session", [None, "", "not-a-uuid"])
def test_put_milestone_needs_a_valid_session_id(clock, store, guard, session):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(put_milestone(session, {"milestone": "halfway"})))
    assert status == 400 and body["error"]["code"] == "INVALID_REQUEST"


def test_put_milestone_without_a_journey_is_404_and_creates_nothing(
    clock, store, guard, session_id
):
    app, _ = make_app(clock, store, guard, [VALID])
    status, body = parse(app.handle(put_milestone(session_id, {"milestone": "halfway"})))
    assert status == 404 and body["error"]["code"] == "NOT_FOUND"
    assert parse(app.handle(event("GET", session_id)))[0] == 404


def test_put_milestone_on_an_expired_journey_is_404(clock, store, guard, session_id):
    app = made_journey(clock, store, guard, session_id)
    clock.advance_days(91)
    assert parse(app.handle(put_milestone(session_id, {"milestone": "halfway"})))[0] == 404


def test_put_milestone_save_failure_is_500_save_failed(clock, session_id):
    class BrokenStore:
        def mark_milestone_shown(self, *args):
            raise ApiError(SAVE_FAILED, "no")

    app = JourneyApp(None, BrokenStore(), clock=clock.monotonic)
    response = app.handle(put_milestone(session_id, {"milestone": "halfway"}))
    status, body = parse(response)
    assert status == 500 and body == {"error": {"code": "SAVE_FAILED", "message": "no"}}


def test_put_milestone_unexpected_error_is_save_failed_without_detail(clock, session_id):
    class Exploding:
        def mark_milestone_shown(self, *args):
            raise RuntimeError("secret detail")

    app = JourneyApp(None, Exploding(), clock=clock.monotonic)
    response = app.handle(put_milestone(session_id, {"milestone": "halfway"}))
    assert response["statusCode"] == 500 and "secret detail" not in response["body"]


@pytest.mark.parametrize("method", ["GET", "POST", "DELETE"])
def test_the_milestones_path_answers_only_put(clock, store, guard, session_id, method):
    app = made_journey(clock, store, guard, session_id)
    status, body = parse(
        app.handle(event(method, session_id, {"milestone": "halfway"}, path=MILESTONES_PATH))
    )
    assert status == 404 and body["error"]["code"] == "NOT_FOUND"


def test_put_milestone_log_line_has_route_status_and_outcome_and_no_name(
    clock, store, guard, session_id, caplog
):
    app = made_journey(clock, store, guard, session_id)
    caplog.clear()
    caplog.set_level(logging.INFO, logger="learning_journey")
    app.handle(put_milestone(session_id, {"milestone": "halfway"}), request_id="req-5")
    request = next(
        json.loads(r.getMessage())
        for r in caplog.records
        if json.loads(r.getMessage())["event"] == "request"
    )
    assert request["route"] == f"PUT {MILESTONES_PATH}"
    assert request["status"] == 200 and request["outcome"] == "ok"
    assert "halfway" not in caplog.text and session_id not in caplog.text
