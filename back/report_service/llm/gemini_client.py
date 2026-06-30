"""
Gemini client for Report Service.

Generates human-readable migration report text with:
- fallback
- retry
- clean logging
"""

import json
import logging
import os
import time

# Import google.generativeai optionally — the package may not be installed in
# developer environments. When unavailable we fall back to deterministic text.
try:
    # Use a clear variable name to satisfy linting naming conventions.
    import google.generativeai as google_genai  # type: ignore[import]
except ImportError:  # pragma: no cover - optional dependency
    google_genai = None  # type: ignore

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gemini-2.5-flash"
MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 3


def get_gemini_api_key() -> str:
    """Return Gemini API key from environment."""
    return os.getenv("GEMINI_API_KEY", "")


def get_gemini_model() -> str:
    """Return Gemini model name from environment."""
    return os.getenv("GEMINI_MODEL", DEFAULT_MODEL)


def is_gemini_available() -> bool:
    """Return True if Gemini API key is configured and client library is present."""
    return bool(get_gemini_api_key().strip()) and google_genai is not None


def generate_report_text(prompt: str, fallback_text: str = "") -> dict:
    """
    Generate report text using Gemini.

    Returns:
        {
          "used_ai": true/false,
          "model": "...",
          "text": "...",
          "error": ""
        }
    """
    if not prompt or not prompt.strip():
        return {
            "used_ai": False,
            "model": get_gemini_model(),
            "text": fallback_text,
            "error": "Empty prompt.",
        }

    if not is_gemini_available():
        logger.warning("Gemini API key not configured. Using fallback report text.")
        return {
            "used_ai": False,
            "model": get_gemini_model(),
            "text": fallback_text,
            "error": "Gemini API key not configured.",
        }

    # Configure and call the Google Generative AI client
    google_genai.configure(api_key=get_gemini_api_key())
    model_name = get_gemini_model()
    model = google_genai.GenerativeModel(model_name)

    last_error = ""

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(
                "Generating AI report text with Gemini model=%s attempt=%d/%d",
                model_name,
                attempt,
                MAX_RETRIES,
            )

            response = model.generate_content(prompt)
            text = getattr(response, "text", "") or ""

            if not text.strip():
                raise ValueError("Gemini returned empty text.")

            logger.info("AI report text generated successfully.")
            return {
                "used_ai": True,
                "model": model_name,
                "text": text.strip(),
                "error": "",
            }

        except Exception as error:  # pylint: disable=broad-exception-caught
            last_error = str(error)
            logger.warning(
                "Gemini report generation failed on attempt %d/%d: %s",
                attempt,
                MAX_RETRIES,
                last_error,
            )

            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS)

    logger.warning("Using fallback report text after Gemini failure.")
    return {
        "used_ai": False,
        "model": model_name,
        "text": fallback_text,
        "error": last_error,
    }


def _extract_json_object(text: str) -> str | None:
    """Extract the first top-level JSON object from text, ignoring braces inside strings."""
    start = text.find("{")
    if start == -1:
        return None

    brace_count = 0
    in_string = False
    escape = False

    for index in range(start, len(text)):
        char = text[index]

        if escape:
            escape = False
            continue

        if char == "\\":
            escape = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == "{":
            brace_count += 1
        elif char == "}":
            brace_count -= 1
            if brace_count == 0:
                return text[start:index + 1]

    return None


def generate_report_json(prompt: str, fallback_json: dict | None = None) -> dict:
    """
    Optional JSON-generation helper for future structured AI reports.
    """
    fallback_json = fallback_json or {}

    result = generate_report_text(
        prompt=prompt,
        fallback_text=json.dumps(fallback_json, ensure_ascii=False),
    )

    text = result["text"].strip()

    try:
        parsed = json.loads(text)
        return {
            "used_ai": result["used_ai"],
            "model": result["model"],
            "data": parsed,
            "error": result["error"],
        }
    except json.JSONDecodeError as error:
        logger.warning("Gemini JSON parsing failed: %s", error)
        logger.debug("Gemini raw text for JSON parse failure: %s", text)

        candidate = _extract_json_object(text)
        if candidate:
            try:
                parsed = json.loads(candidate)
                logger.info("Recovered JSON translation from Gemini output.")
                logger.debug("Gemini extracted JSON candidate: %s", candidate)
                return {
                    "used_ai": result["used_ai"],
                    "model": result["model"],
                    "data": parsed,
                    "error": result["error"],
                }
            except json.JSONDecodeError as nested_error:
                logger.warning("Gemini JSON candidate extraction failed: %s", nested_error)
                logger.debug("Gemini candidate text: %s", candidate)

        return {
            "used_ai": False,
            "model": result["model"],
            "data": fallback_json,
            "error": str(error),
        }
