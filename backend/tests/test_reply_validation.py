"""Model reply checks, written before the code (BR1.4, BR2.1 to BR2.4)."""

import json

import pytest
from fixtures import (
    LONG_FIELD,
    PLANNER_SPLIT,
    REFUSAL,
    REFUSAL_WITH_STAGES,
    TOO_LONG_FIELD,
    VALID_5,
    VALID_6,
    make_instructor_stage,
    make_planner_stage,
    make_reply,
    make_style_reply,
    reply_text,
    with_material_change,
    with_stage_change,
)
from learning_journey.validation import check_reply


def assert_invalid(reply_or_text):
    text = reply_or_text if isinstance(reply_or_text, str) else reply_text(reply_or_text)
    result = check_reply(text)
    assert result.kind == "invalid", result
    assert result.reply is None
    assert result.problem
    return result


# --- BR1.4: a refusal is recognised first -------------------------------------------------------


def test_refusal_is_recognised():
    result = check_reply(reply_text(REFUSAL))
    assert result.kind == "refusal"
    assert result.reply is not None and result.reply.refused is True
    assert result.reply.reason == "not a professional topic"


def test_refusal_wins_even_when_stages_are_also_present():
    result = check_reply(reply_text(REFUSAL_WITH_STAGES))
    assert result.kind == "refusal"


def test_refusal_wins_even_when_the_stages_are_broken():
    result = check_reply(reply_text({"refused": True, "stages": "nonsense"}))
    assert result.kind == "refusal"


def test_refusal_without_a_reason_is_still_a_refusal():
    result = check_reply(reply_text({"refused": True}))
    assert result.kind == "refusal"
    assert result.reply is not None and result.reply.reason == ""


# --- BR2.1: stage count, numbering, required fields ----------------------------------------------


@pytest.mark.parametrize("reply", [VALID_5, VALID_6])
def test_five_or_six_stages_are_valid(reply):
    result = check_reply(reply_text(reply))
    assert result.kind == "valid"
    assert result.reply is not None and result.reply.refused is False
    assert [s.stage_number for s in result.reply.stages] == list(range(1, len(reply["stages"]) + 1))


@pytest.mark.parametrize("count", [0, 1, 4, 7, 10])
def test_other_stage_counts_are_invalid(count):
    assert_invalid(make_reply(count))


def test_numbering_with_a_gap_is_invalid():
    reply = make_reply(5)
    reply["stages"][3]["stageNumber"] = 5
    assert_invalid(reply)


def test_repeated_stage_number_is_invalid():
    assert_invalid(with_stage_change(make_reply(5), 2, stageNumber=2))


def test_stages_out_of_order_are_invalid():
    reply = make_reply(5)
    reply["stages"][0], reply["stages"][1] = reply["stages"][1], reply["stages"][0]
    assert_invalid(reply)


def test_numbering_that_does_not_start_at_one_is_invalid():
    reply = make_reply(5)
    for stage in reply["stages"]:
        stage["stageNumber"] += 1
    assert_invalid(reply)


@pytest.mark.parametrize("field", ["title", "whatItIs", "whyItMatters", "afterThis"])
def test_missing_or_empty_required_text_is_invalid(field):
    missing = make_reply(5)
    del missing["stages"][2][field]
    assert_invalid(missing)
    assert_invalid(with_stage_change(make_reply(5), 2, **{field: "   "}))


def test_missing_materials_is_invalid():
    reply = make_reply(5)
    del reply["stages"][1]["materials"]
    assert_invalid(reply)


def test_missing_hours_is_invalid():
    reply = make_reply(5)
    del reply["stages"][0]["hours"]
    assert_invalid(reply)


def test_extra_unknown_fields_are_ignored():
    reply = make_reply(5, note="extra")
    reply["stages"][0]["surprise"] = True
    result = check_reply(reply_text(reply))
    assert result.kind == "valid"


# --- BR2.2: list sizes, one mini project, hours --------------------------------------------------


@pytest.mark.parametrize("field", ["reading", "exercises", "quiz"])
def test_lists_of_one_to_five_items_are_valid(field):
    for size in (1, 5):
        reply = with_material_change(
            make_reply(5), 0, **{field: [f"item {i}" for i in range(size)]}
        )
        assert check_reply(reply_text(reply)).kind == "valid"


@pytest.mark.parametrize("field", ["reading", "exercises", "quiz"])
@pytest.mark.parametrize("size", [0, 6])
def test_lists_outside_one_to_five_items_are_invalid(field, size):
    assert_invalid(
        with_material_change(make_reply(5), 0, **{field: [f"item {i}" for i in range(size)]})
    )


@pytest.mark.parametrize("bad", [["one", "two"], [], None, 7, ""])
def test_mini_project_must_be_exactly_one_text(bad):
    assert_invalid(with_material_change(make_reply(5), 1, miniProject=bad))


@pytest.mark.parametrize("hours", [0, -1, 20.5, 21, 1000])
def test_hours_outside_zero_to_twenty_are_invalid(hours):
    assert_invalid(with_stage_change(make_reply(5), 0, hours=hours))


@pytest.mark.parametrize("hours", [0.5, 1, 20])
def test_hours_above_zero_and_at_most_twenty_are_valid(hours):
    result = check_reply(reply_text(with_stage_change(make_reply(5), 0, hours=hours)))
    assert result.kind == "valid"


@pytest.mark.parametrize("hours", ["3", "three", None, True, [3], {"n": 3}])
def test_hours_that_is_not_a_number_is_invalid(hours):
    assert_invalid(with_stage_change(make_reply(5), 0, hours=hours))


def test_hours_that_is_not_finite_is_invalid():
    text = reply_text(make_reply(5)).replace('"hours": 3', '"hours": NaN', 1)
    assert_invalid(text)


# --- BR2.3: 2,000-character cap, never cut -------------------------------------------------------


def test_text_of_exactly_2000_characters_is_valid_and_kept_whole():
    reply = with_stage_change(make_reply(5), 0, whatItIs=LONG_FIELD)
    result = check_reply(reply_text(reply))
    assert result.kind == "valid"
    assert result.reply.stages[0].what_it_is == LONG_FIELD


@pytest.mark.parametrize("field", ["title", "whatItIs", "whyItMatters", "afterThis"])
def test_stage_text_over_2000_characters_is_invalid(field):
    assert_invalid(with_stage_change(make_reply(5), 0, **{field: TOO_LONG_FIELD}))


def test_material_item_over_2000_characters_is_invalid():
    assert_invalid(with_material_change(make_reply(5), 0, reading=[TOO_LONG_FIELD]))
    assert_invalid(with_material_change(make_reply(5), 0, miniProject=TOO_LONG_FIELD))


# --- BR2.4: not one JSON object in an accepted shape ---------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "",
        "   ",
        "not json at all",
        "Here is your journey: " + json.dumps(VALID_5),
        json.dumps(VALID_5) + " trailing words",
        json.dumps(VALID_5) + json.dumps(VALID_5),
        "[]",
        json.dumps([VALID_5]),
        '"just a string"',
        "42",
        "null",
        "{}",
    ],
)
def test_anything_but_one_json_object_in_an_accepted_shape_is_invalid(text):
    assert_invalid(text)


@pytest.mark.parametrize("text", [None, 7, b"bytes", ["x"]])
def test_non_text_reply_is_invalid(text):
    assert check_reply(text).kind == "invalid"


@pytest.mark.parametrize("refused", [None, "false", 0, "true", 1])
def test_refused_must_be_a_real_boolean(refused):
    assert_invalid({"refused": refused, "stages": VALID_5["stages"]})


def test_missing_refused_is_invalid():
    assert_invalid({"stages": VALID_5["stages"]})


@pytest.mark.parametrize("stages", [None, "five", {"1": {}}, [None] * 5, ["x"] * 5])
def test_stages_of_the_wrong_type_are_invalid(stages):
    assert_invalid({"refused": False, "stages": stages})


def test_wrong_field_types_inside_a_stage_are_invalid():
    assert_invalid(with_stage_change(make_reply(5), 0, title=["a list"]))
    assert_invalid(with_stage_change(make_reply(5), 0, stageNumber="1"))
    assert_invalid(with_stage_change(make_reply(5), 0, stageNumber=True))
    assert_invalid(with_stage_change(make_reply(5), 0, materials=["not", "an", "object"]))
    assert_invalid(with_material_change(make_reply(5), 0, reading="a string"))
    assert_invalid(with_material_change(make_reply(5), 0, quiz=[1, 2]))


def test_one_json_object_inside_a_code_fence_is_accepted():
    fenced = "```json\n" + reply_text(VALID_5) + "\n```"
    assert check_reply(fenced).kind == "valid"


def test_markup_in_reply_text_is_kept_as_text_not_removed():
    reply = with_stage_change(make_reply(5), 0, whatItIs="<img src=x onerror=alert(1)>")
    result = check_reply(reply_text(reply))
    assert result.kind == "valid"
    assert result.reply.stages[0].what_it_is == "<img src=x onerror=alert(1)>"


# --- BR33.4: style-specific reply checks (written first) -----------------------------------------


def check_for(style, reply):
    return check_reply(reply_text(reply), style)


def assert_invalid_for(style, reply):
    result = check_for(style, reply)
    assert result.kind == "invalid", result
    assert result.reply is None and result.problem
    return result


@pytest.mark.parametrize("style", ["guide", "instructor", "planner"])
def test_a_reply_made_for_its_style_is_valid(style):
    result = check_for(style, make_style_reply(style))
    assert result.kind == "valid"
    assert len(result.reply.stages) == 5


@pytest.mark.parametrize("style", ["guide", "instructor", "planner"])
def test_a_refusal_is_recognised_for_every_style(style):
    assert check_for(style, REFUSAL).kind == "refusal"


@pytest.mark.parametrize("style", ["guide", "instructor", "planner"])
def test_earlier_reply_rules_still_apply_to_every_style(style):
    assert_invalid_for(style, make_style_reply(style, 4))
    broken = make_style_reply(style)
    broken["stages"][0]["hours"] = 0
    assert_invalid_for(style, broken)


def test_the_style_defaults_to_guide():
    assert check_reply(reply_text(make_reply(5))).kind == "valid"


def test_instructor_reply_with_one_exercise_in_a_stage_is_invalid():
    reply = make_style_reply("instructor")
    reply["stages"][3]["materials"]["exercises"] = ["only one"]
    assert_invalid_for("instructor", reply)


def test_instructor_reply_with_no_quiz_item_is_invalid():
    reply = make_style_reply("instructor")
    reply["stages"][2]["materials"]["quiz"] = []
    assert_invalid_for("instructor", reply)


def test_instructor_reply_at_exactly_two_exercises_and_one_quiz_item_is_valid():
    assert check_for("instructor", make_style_reply("instructor", 6)).kind == "valid"


def test_instructor_reply_keeps_the_upper_limit_of_five_items():
    reply = make_style_reply("instructor")
    reply["stages"][0]["materials"]["exercises"] = [f"e{i}" for i in range(6)]
    assert_invalid_for("instructor", reply)
    reply["stages"][0]["materials"]["exercises"] = [f"e{i}" for i in range(5)]
    assert check_for("instructor", reply).kind == "valid"


def test_the_instructor_minimums_are_not_asked_of_guide_or_planner():
    plain = make_reply(5)  # one exercise and one quiz item per stage
    assert check_for("guide", plain).kind == "valid"
    planner = make_style_reply("planner")
    assert check_for("planner", planner).kind == "valid"


def test_planner_reply_without_hours_by_kind_in_a_stage_is_invalid():
    reply = make_style_reply("planner")
    del reply["stages"][1]["hoursByKind"]
    assert_invalid_for("planner", reply)


@pytest.mark.parametrize("missing", ["reading", "exercises", "miniProject", "quiz"])
def test_planner_reply_missing_one_of_the_four_numbers_is_invalid(missing):
    reply = make_style_reply("planner")
    del reply["stages"][0]["hoursByKind"][missing]
    assert_invalid_for("planner", reply)


def test_planner_reply_with_a_negative_number_is_invalid():
    reply = make_style_reply("planner")
    # still sums to 3, so only the sign makes it invalid
    reply["stages"][0]["hoursByKind"] = {
        "reading": 3.5,
        "exercises": 1,
        "miniProject": 0,
        "quiz": -1.5,
    }
    assert_invalid_for("planner", reply)


@pytest.mark.parametrize("bad", ["1", None, True, [1], {"n": 1}])
def test_planner_reply_with_a_number_that_is_not_a_number_is_invalid(bad):
    reply = make_style_reply("planner")
    reply["stages"][0]["hoursByKind"]["reading"] = bad
    assert_invalid_for("planner", reply)


@pytest.mark.parametrize("split", [None, "3 hours", [1, 1, 0.5, 0.5]])
def test_planner_reply_with_hours_by_kind_of_the_wrong_type_is_invalid(split):
    reply = make_style_reply("planner")
    reply["stages"][0]["hoursByKind"] = split
    assert_invalid_for("planner", reply)


def test_planner_reply_whose_four_do_not_add_up_is_invalid():
    reply = make_style_reply("planner")
    reply["stages"][4]["hoursByKind"] = {"reading": 1, "exercises": 1, "miniProject": 1, "quiz": 1}
    assert_invalid_for("planner", reply)


def test_planner_tolerance_is_valid_at_exactly_point_one_and_invalid_at_point_eleven():
    close = make_style_reply("planner")
    close["stages"][0]["hours"] = 3.5
    close["stages"][0]["hoursByKind"] = {
        "reading": 1.5,
        "exercises": 1,
        "miniProject": 0.5,
        "quiz": 0.5,
    }
    assert check_for("planner", close).kind == "valid"  # sum 3.5
    close["stages"][0]["hoursByKind"] = {
        "reading": 1,
        "exercises": 1,
        "miniProject": 0.5,
        "quiz": 0.9,
    }
    assert check_for("planner", close).kind == "valid"  # sum 3.4, off by 0.1
    close["stages"][0]["hoursByKind"] = {
        "reading": 1,
        "exercises": 1,
        "miniProject": 0.5,
        "quiz": 0.89,
    }
    assert_invalid_for("planner", close)  # sum 3.39, off by 0.11


def test_planner_numbers_are_kept_on_the_checked_stage():
    result = check_for("planner", make_style_reply("planner"))
    assert result.reply.stages[0].hours_by_kind == {
        "reading": 1,
        "exercises": 1,
        "miniProject": 0.5,
        "quiz": 0.5,
    }


@pytest.mark.parametrize("style", ["guide", "instructor"])
def test_a_stray_hours_by_kind_is_accepted_and_dropped_for_guide_and_instructor(style):
    reply = make_style_reply(style)
    reply["stages"][0]["hoursByKind"] = {"reading": 9}  # even a malformed one is ignored
    reply["stages"][1]["hoursByKind"] = dict(PLANNER_SPLIT)
    result = check_for(style, reply)
    assert result.kind == "valid"
    assert all(stage.hours_by_kind is None for stage in result.reply.stages)
    assert all("hoursByKind" not in stage.to_dict() for stage in result.reply.stages)


# --- huge numbers are invalid, never an error ----------------------------------------------------

HUGE = 10**400


def _raw_with(reply, replacements):
    """Reply text where each placeholder string is swapped for a raw JSON number."""
    text = reply_text(reply)
    for placeholder, raw in replacements.items():
        text = text.replace(f'"{placeholder}"', raw)
    return text


@pytest.mark.parametrize("style", ["guide", "instructor", "planner"])
def test_a_huge_whole_number_in_hours_is_invalid(style):
    reply = make_style_reply(style)
    reply["stages"][0]["hours"] = "HUGE"
    result = check_reply(_raw_with(reply, {"HUGE": str(HUGE)}), style)
    assert result.kind == "invalid" and result.reply is None and result.problem


@pytest.mark.parametrize("kind", ["reading", "exercises", "miniProject", "quiz"])
def test_a_huge_whole_number_in_each_hours_by_kind_value_is_invalid(kind):
    reply = make_style_reply("planner")
    reply["stages"][0]["hoursByKind"][kind] = "HUGE"
    result = check_reply(_raw_with(reply, {"HUGE": str(HUGE)}), "planner")
    assert result.kind == "invalid" and result.reply is None and result.problem


def test_a_huge_whole_number_sum_in_hours_by_kind_is_invalid():
    reply = make_style_reply("planner")
    big = 10**308  # each one converts to a finite float, but the whole-number sum does not
    reply["stages"][0]["hours"] = 3.5
    reply["stages"][0]["hoursByKind"] = {k: big for k in PLANNER_SPLIT}
    assert_invalid_for("planner", reply)


@pytest.mark.parametrize("raw", ["1e400", "-1e400", "NaN", "Infinity"])
def test_non_finite_and_out_of_range_numbers_stay_invalid(raw):
    reply = make_style_reply("planner")
    reply["stages"][0]["hours"] = "X"
    assert check_reply(_raw_with(reply, {"X": raw}), "planner").kind == "invalid"
    reply = make_style_reply("planner")
    reply["stages"][0]["hoursByKind"]["quiz"] = "X"
    assert check_reply(_raw_with(reply, {"X": raw}), "planner").kind == "invalid"


def test_the_stage_helpers_build_what_they_say():
    assert len(make_instructor_stage(1)["materials"]["exercises"]) == 2
    assert make_planner_stage(1)["hoursByKind"]["reading"] == 1
