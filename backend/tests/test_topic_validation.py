"""Topic checks, written before the code (BR1.1, BR1.2, BR1.3)."""

import pytest
from learning_journey.validation import (
    DELIMITERS,
    check_topic,
    clean_topic,
    strip_delimiter,
    visible_length,
)


def test_clean_topic_trims_and_keeps_inner_spaces():
    assert clean_topic("  data  storytelling \t") == "data  storytelling"


def test_clean_topic_removes_control_characters():
    assert clean_topic("Kuber\x00netes\x07") == "Kubernetes"
    assert clean_topic("\x1b[31mGo\x1b[0m") == "[31mGo[0m"


def test_clean_topic_of_non_text_is_empty():
    assert clean_topic(None) == ""
    assert clean_topic(42) == ""


@pytest.mark.parametrize("length", [2, 100])
def test_topic_at_the_length_limits_passes(length):
    result = check_topic("a" * length)
    assert result.ok is True
    assert result.topic == "a" * length
    assert result.problem is None


@pytest.mark.parametrize("length", [0, 1, 101])
def test_topic_outside_the_length_limits_fails(length):
    result = check_topic("a" * length)
    assert result.ok is False
    assert result.problem == "length"


def test_whitespace_only_topic_fails_on_length():
    assert check_topic("     ").problem == "length"


def test_length_is_counted_after_trimming():
    assert check_topic("  " + "a" * 100 + "  ").ok is True
    assert check_topic("  a  ").problem == "length"


def test_emoji_and_accented_letters_count_as_one_character():
    assert visible_length("é") == 1
    assert visible_length("e\u0301") == 1  # e plus a combining accent
    assert visible_length("😀") == 1
    assert visible_length("👍🏽") == 1  # emoji plus skin tone
    assert visible_length("👨‍👩‍👧") == 1  # joined family emoji
    assert visible_length("🇳🇿") == 1  # flag made of two regional indicators
    assert check_topic("é" * 100).ok is True
    assert check_topic("😀" * 101).problem == "length"
    assert check_topic("a😀").ok is True


@pytest.mark.parametrize("text", ["!!!!", "?? ??", "😀😀", "---", "   ...   "])
def test_topic_without_a_letter_or_digit_fails(text):
    result = check_topic(text)
    assert result.ok is False
    assert result.problem == "no_letter_or_digit"


@pytest.mark.parametrize("text", ["C#", "Go 1", "42", "!!a!!", "日本語", "Привет", "الذكاء"])
def test_topic_with_a_letter_or_digit_in_any_script_passes(text):
    assert check_topic(text).ok is True


def test_markup_is_kept_as_plain_text():
    result = check_topic("<script>alert(1)</script>")
    assert result.ok is True
    assert result.topic == "<script>alert(1)</script>"


def test_check_topic_returns_the_cleaned_topic():
    result = check_topic("  Rust\x00 ")
    assert result.topic == "Rust"


@pytest.mark.parametrize("delimiter", DELIMITERS)
def test_delimiter_text_is_removed_from_the_topic(delimiter):
    assert strip_delimiter(f"learn {delimiter} python") == "learn  python"


def test_delimiter_lookalike_that_reforms_after_removal_is_removed_too():
    start, end = DELIMITERS
    nested = start[:6] + end + start[6:]
    assert strip_delimiter(nested) == ""


def test_delimiter_removal_ignores_letter_case():
    start, _ = DELIMITERS
    assert strip_delimiter("x" + start.lower() + "y") == "xy"


def test_text_without_a_delimiter_is_unchanged():
    assert strip_delimiter("plain topic") == "plain topic"


# --- raw length bound (review R-01): marks and joiners must not stretch the visible limit -------

JOINER_FLOOD = "ab" + "\u200dx" * 4000 + "\u0301" * 1000
MARK_FLOOD = "e" + "\u0301" * 5000


def test_the_visible_length_rule_alone_would_accept_the_attack_topics():
    # This is why the raw bound exists: both topics look short to the visible-length rule.
    assert visible_length(JOINER_FLOOD) <= 100
    assert visible_length(MARK_FLOOD) <= 100


@pytest.mark.parametrize("topic", [JOINER_FLOOD, MARK_FLOOD])
def test_joiner_and_combining_mark_floods_are_rejected_on_raw_length(topic):
    result = check_topic(topic)
    assert result.ok is False
    assert result.problem == "length"


def test_a_topic_of_exactly_200_raw_characters_with_a_short_visible_length_passes():
    topic = "e" + "\u0301" * 199  # 200 code points, one visible character plus marks
    assert len(topic) == 200
    assert check_topic("ab" + topic[2:]).ok is True


def test_a_topic_of_201_raw_characters_is_rejected_even_when_it_looks_short():
    topic = "ab" + "\u0301" * 199  # 201 code points
    assert len(topic) == 201
    result = check_topic(topic)
    assert result.ok is False and result.problem == "length"


def test_the_raw_bound_counts_code_points_after_cleaning():
    # Control characters are removed first, so they do not count towards the 200.
    assert check_topic("ab" + "\x00" * 500).ok is True
