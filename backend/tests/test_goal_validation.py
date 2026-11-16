"""The server's goal-date check, written before the code (BR32.1)."""

import pytest
from learning_journey.validation import check_goal_date


def test_null_is_valid_and_means_clear():
    result = check_goal_date({"goalDate": None})
    assert result.ok is True
    assert result.goal_date is None


@pytest.mark.parametrize("date", ["2026-11-10", "2028-02-29", "2026-12-31", "2027-01-01"])
def test_a_real_calendar_date_is_valid_and_returned_as_given(date):
    result = check_goal_date({"goalDate": date})
    assert result.ok is True
    assert result.goal_date == date


@pytest.mark.parametrize(
    "date",
    [
        "2027-02-29",  # not a leap year
        "2026-02-30",
        "2026-04-31",
        "2026-13-01",
        "2026-00-10",
        "2026-11-00",
        "26-11-10",
        "2026-11-10T00:00:00Z",
        "2026-11-10 ",
        " 2026-11-10",
        "2026-11-10\n",
        "2026-1-10",
        "10/11/2026",
        "10-11-2026",
        "20261110",
        "٢٠٢٦-١١-١٠",  # digits from another script
        "",
        "tomorrow",
    ],
)
def test_text_that_is_not_exactly_a_real_date_is_invalid(date):
    result = check_goal_date({"goalDate": date})
    assert result.ok is False
    assert result.problem


@pytest.mark.parametrize("value", [20261110, 1.5, True, False, [], ["2026-11-10"], {}, {"d": 1}])
def test_a_value_that_is_not_null_or_text_is_invalid(value):
    assert check_goal_date({"goalDate": value}).ok is False


def test_a_missing_key_is_invalid():
    assert check_goal_date({}).ok is False
    assert check_goal_date({"goaldate": "2026-11-10"}).ok is False


@pytest.mark.parametrize("body", [None, "2026-11-10", 5, ["2026-11-10"], True])
def test_a_body_that_is_not_an_object_is_invalid(body):
    assert check_goal_date(body).ok is False


def test_other_keys_are_ignored():
    result = check_goal_date({"goalDate": "2026-11-10", "completed": True, "extra": [1]})
    assert result.ok is True
    assert result.goal_date == "2026-11-10"
    assert check_goal_date({"goalDate": None, "x": 1}).ok is True


def test_the_365_day_range_is_not_applied_on_the_server():
    assert check_goal_date({"goalDate": "1999-01-01"}).ok is True
    assert check_goal_date({"goalDate": "2999-12-31"}).ok is True
