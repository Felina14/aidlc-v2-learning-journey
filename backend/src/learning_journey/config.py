"""Settings and fixed limits for the backend (BR3.1, BR3.3, BR5.1, entities.md limits)."""

from __future__ import annotations

import os
from dataclasses import dataclass

# Time rules, in seconds (BR3.1, BR3.3, BR5.1).
AI_BUDGET_SECONDS = 15.0
REQUEST_CAP_SECONDS = 18.0
SAVE_TIMEOUT_SECONDS = 2.0  # total for one store call: connect plus read, one attempt (BR5.1)
STORE_CONNECT_TIMEOUT_SECONDS = 1.0
STORE_READ_TIMEOUT_SECONDS = SAVE_TIMEOUT_SECONDS - STORE_CONNECT_TIMEOUT_SECONDS
RETRY_MIN_SECONDS = 5.0
DEFAULT_BEDROCK_TIMEOUT = 12.0

# Journey record rules.
EXPIRY_DAYS = 90
JOURNEY_SORT_KEY = "JOURNEY"
USAGE_SORT_KEY_PREFIX = "USAGE#"
DAILY_CAP = 5  # new journeys per session per UTC day (BR20.1)
MIN_STAGE_NUMBER = 1
MAX_STAGE_NUMBER = 6  # a journey has 5 or 6 stages; the stored stageCount decides per journey

# Size limits shared by the reply checks and the template (entities.md).
MIN_TOPIC_CHARS = 2
MAX_TOPIC_CHARS = 100
# Raw bound (review R-01): marks, tones and joiners add no visible length, so the cleaned topic is
# also limited to this many code points. It is twice the visible maximum, a generous room for
# accents and joined emoji.
MAX_RAW_TOPIC_CHARS = 200
MAX_TEXT_CHARS = 2000
MIN_LIST_ITEMS = 1
MAX_LIST_ITEMS = 5
MAX_HOURS = 20

DEFAULT_MODEL_ID = "amazon.nova-lite-v1:0"
DEFAULT_TEACHING_STYLE = "guide"
TEACHING_STYLES = ("guide", "instructor", "planner")  # the only styles; never typed text

# The three milestones, in the fixed order the stored set is always sent in (BR44.1).
MILESTONES = ("first-stage", "halfway", "complete")

# Style reply checks (BR33.4).
INSTRUCTOR_MIN_EXERCISES = 2
INSTRUCTOR_MIN_QUIZ = 1
HOURS_KINDS = ("reading", "exercises", "miniProject", "quiz")
PLANNER_TOLERANCE_HOURS = 0.1

# Output caps in tokens (BR33.3). The guide keeps 4096. The instructor and planner ask for more
# text per stage, so they use Amazon Nova Lite's documented maximum output of about 5K tokens;
# 5000 is used so the request never exceeds that figure.
MAX_OUTPUT_TOKENS = 4096
MAX_OUTPUT_TOKENS_LONG = 5000


@dataclass(frozen=True)
class Settings:
    """Environment settings read once per Lambda start."""

    table_name: str
    model_id: str = DEFAULT_MODEL_ID
    bedrock_timeout: float = DEFAULT_BEDROCK_TIMEOUT

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Settings:
        """Build settings from environment variables (``TABLE_NAME`` is required)."""
        source = os.environ if env is None else env
        table_name = source.get("TABLE_NAME", "").strip()
        if not table_name:
            raise RuntimeError("TABLE_NAME is not set")
        model_id = source.get("MODEL_ID", "").strip() or DEFAULT_MODEL_ID
        raw_timeout = source.get("BEDROCK_TIMEOUT", "").strip()
        timeout = float(raw_timeout) if raw_timeout else DEFAULT_BEDROCK_TIMEOUT
        return cls(table_name=table_name, model_id=model_id, bedrock_timeout=timeout)
