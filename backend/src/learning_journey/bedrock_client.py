"""The model interface: a real Amazon Bedrock client and a scripted fake for tests (contract C3).

Only an Amazon Nova model is ever called, and the model identifier is set in one place
(``MODEL_ID``, see ``config.py``). The fake never touches AWS.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Protocol

from .config import DEFAULT_TEACHING_STYLE, MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS_LONG
from .logs import log_event

logger = logging.getLogger("learning_journey")

# Outcomes logged for each AI attempt (BR4.3).
OUTCOME_OK = "ok"
OUTCOME_REFUSED = "refused"
OUTCOME_INVALID = "invalid"
OUTCOME_ERROR = "error"
OUTCOME_THROTTLED = "throttled"


def output_cap(style: str) -> int:
    """The output cap in tokens: 4096 for the guide, the model's documented maximum otherwise."""
    return MAX_OUTPUT_TOKENS if style == DEFAULT_TEACHING_STYLE else MAX_OUTPUT_TOKENS_LONG


class ModelError(Exception):
    """The model call failed. ``throttled`` is true when Bedrock asked us to slow down."""

    def __init__(self, message: str = "model call failed", throttled: bool = False) -> None:
        super().__init__(message)
        self.throttled = throttled


class ModelTruncatedError(ModelError):
    """The reply was cut off by the output cap, so it cannot be a whole journey (invalid)."""

    def __init__(self) -> None:
        super().__init__("reply cut off by the output cap")


class ModelClient(Protocol):
    """One call: send the prompt, get the model's text back, or raise ``ModelError``."""

    model_id: str

    def invoke(self, prompt: str, timeout: float, max_tokens: int = MAX_OUTPUT_TOKENS) -> str: ...


class BedrockModelClient:
    """Calls the Bedrock runtime ``converse`` API with the configured Nova model."""

    def __init__(self, model_id: str, client_factory: Callable[[float], Any] | None = None) -> None:
        self.model_id = model_id
        self._client_factory = client_factory or self._default_client

    @staticmethod
    def _default_client(timeout: float) -> Any:
        import boto3
        from botocore.config import Config

        config = Config(
            read_timeout=timeout,
            connect_timeout=min(timeout, 3.0),
            retries={"max_attempts": 1, "mode": "standard"},
        )
        return boto3.client("bedrock-runtime", config=config)

    def invoke(self, prompt: str, timeout: float, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
        """Send ``prompt`` and return the reply text; any failure becomes ``ModelError``.

        A reply that stopped because it reached ``max_tokens`` raises ``ModelTruncatedError``.
        """
        try:
            client = self._client_factory(timeout)
            response = client.converse(
                modelId=self.model_id,
                messages=[{"role": "user", "content": [{"text": prompt}]}],
                inferenceConfig={"maxTokens": max_tokens, "temperature": 0.4},
            )
            truncated = response.get("stopReason") == "max_tokens"
            parts = response["output"]["message"]["content"]
            text = "".join(part.get("text", "") for part in parts)
        except Exception as exc:  # noqa: BLE001 - every failure is treated the same (BR2.4)
            code = getattr(exc, "response", {}).get("Error", {}).get("Code", "")
            throttled = code in ("ThrottlingException", "TooManyRequestsException")
            raise ModelError(type(exc).__name__, throttled=throttled) from None
        if truncated:
            raise ModelTruncatedError()
        return text


class FakeModelClient:
    """A scripted stand-in for tests. No test calls Bedrock.

    Each script step is a reply text, an exception to raise, or ``(delay_seconds, step)``. A delay
    calls ``on_delay`` (usually the test clock's ``advance``) so time rules need no real waiting.
    When the script runs out, further calls raise ``ModelError``.
    """

    def __init__(
        self,
        script: list[Any] | None = None,
        on_delay: Callable[[float], None] | None = None,
        model_id: str = "fake.nova-lite",
    ) -> None:
        self.model_id = model_id
        self._script = list(script or [])
        self._on_delay = on_delay
        self.calls: list[tuple[str, float]] = []
        self.max_tokens: list[int] = []  # the output cap of each call, in order

    def invoke(self, prompt: str, timeout: float, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
        self.calls.append((prompt, timeout))
        self.max_tokens.append(max_tokens)
        if not self._script:
            raise ModelError("fake script exhausted")
        step = self._script.pop(0)
        if isinstance(step, tuple):
            delay, step = step
            if self._on_delay is not None:
                self._on_delay(delay)
        if isinstance(step, BaseException):
            raise step
        return step


def log_attempt(model_id: str, outcome: str, attempt: int, problem: str | None = None) -> None:
    """Write one log line for an AI attempt: model identifier and outcome, nothing else (BR4.3).

    An invalid attempt also carries ``problem``: a short fixed name from the reply check (such as
    ``hours_by_kind``) or ``truncated``, never any reply or typed text.
    """
    fields: dict[str, object] = {
        "model_id": model_id,
        "bedrock_outcome": outcome,
        "attempt": attempt,
    }
    if problem is not None:
        fields["problem"] = problem
    log_event(event="ai_attempt", **fields)
