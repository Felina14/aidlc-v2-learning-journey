"""The fixed template journey (BR4.1)."""

import json

from learning_journey.template import build_template
from learning_journey.validation import check_reply


def as_reply_text(stages) -> str:
    return json.dumps({"refused": False, "stages": [s.to_dict() for s in stages]})


def test_template_has_five_stages_with_the_fixed_titles():
    stages = build_template("Rust")
    assert [s.stage_number for s in stages] == [1, 2, 3, 4, 5]
    assert [s.title for s in stages] == [
        "Foundations",
        "Core ideas",
        "Hands-on practice",
        "A real project",
        "Mastery and next steps",
    ]


def test_template_hours_are_2_3_3_4_4_and_total_16():
    stages = build_template("Rust")
    assert [s.hours for s in stages] == [2, 3, 3, 4, 4]
    assert sum(s.hours for s in stages) == 16


def test_template_inserts_the_topic_as_plain_text_everywhere():
    topic = "<b>Rust & Go</b>"
    for stage in build_template(topic):
        assert topic in stage.what_it_is + stage.why_it_matters + stage.after_this + (
            stage.materials.mini_project
        )
        assert topic in stage.materials.reading[0]


def test_template_passes_the_same_reply_check_as_an_ai_journey():
    for topic in ("Rust", "x" * 100, "日本語", "😀😀"):
        assert check_reply(as_reply_text(build_template(topic))).kind == "valid"


def test_template_has_one_item_per_material_kind_and_one_mini_project():
    for stage in build_template("Rust"):
        assert len(stage.materials.reading) == 1
        assert len(stage.materials.exercises) == 1
        assert len(stage.materials.quiz) == 1
        assert isinstance(stage.materials.mini_project, str) and stage.materials.mini_project


def test_template_is_the_same_apart_from_the_topic():
    one = [s.to_dict() for s in build_template("AAA")]
    two = [s.to_dict() for s in build_template("BBB")]
    assert json.dumps(one).replace("AAA", "BBB") == json.dumps(two)


def test_template_is_the_same_for_every_style_because_it_takes_no_style():
    import inspect

    assert list(inspect.signature(build_template).parameters) == ["topic"]
    assert [s.to_dict() for s in build_template("Rust")] == [
        s.to_dict() for s in build_template("Rust")
    ]


def test_template_stages_carry_no_hours_breakdown():
    for stage in build_template("Rust"):
        assert stage.hours_by_kind is None
        assert "hoursByKind" not in stage.to_dict()


def test_template_keeps_its_hours_and_shape_whatever_style_a_journey_was_asked_for():
    # The template is exempt from the instructor and planner reply checks, and its hours stay
    # 2, 3, 3, 4, 4 (BR33.5).
    stages = build_template("Rust")
    assert [s.hours for s in stages] == [2, 3, 3, 4, 4]
    assert check_reply(as_reply_text(stages), "guide").kind == "valid"
    assert check_reply(as_reply_text(stages), "instructor").kind == "invalid"
    assert check_reply(as_reply_text(stages), "planner").kind == "invalid"
