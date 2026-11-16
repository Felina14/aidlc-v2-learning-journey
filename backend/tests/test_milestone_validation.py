"""The server's milestone-name check (BR44.1)."""

import pytest
from learning_journey.validation import check_milestone


@pytest.mark.parametrize("name", ["first-stage", "halfway", "complete"])
def test_each_valid_name_is_accepted_as_given(name):
    result = check_milestone({"milestone": name})
    assert result.ok is True and result.milestone == name


@pytest.mark.parametrize(
    "name", ["", "First-Stage", "halfway ", "done", "all", "first_stage", "complete\n"]
)
def test_an_unknown_name_is_invalid(name):
    result = check_milestone({"milestone": name})
    assert result.ok is False and result.problem == "milestone_unknown"


@pytest.mark.parametrize("value", [None, 1, True, ["halfway"], {"a": 1}, 2.5])
def test_a_name_that_is_not_text_is_invalid(value):
    result = check_milestone({"milestone": value})
    assert result.ok is False and result.problem == "milestone_type"


@pytest.mark.parametrize("body", [None, [], "halfway", 5, {}, {"Milestone": "halfway"}])
def test_a_body_without_the_key_is_invalid(body):
    result = check_milestone(body)
    assert result.ok is False and result.problem == "milestone_missing"


def test_extra_keys_are_ignored():
    result = check_milestone({"milestone": "halfway", "extra": [1], "completed": True})
    assert result.ok is True and result.milestone == "halfway"
