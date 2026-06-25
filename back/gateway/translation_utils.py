"""Translation utilities for the Gateway service."""

import logging
import os

from shared.core.config import Config

logger = logging.getLogger(__name__)

TRANSLATION_MODEL = os.getenv("TRANSLATION_MODEL", "gemini-2.5-flash")


def _gemini_translate(text: str, source_locale: str, target_locale: str) -> dict:
    """Translate text using Google Gemini AI."""
    try:
        import google.generativeai as genai  # type: ignore[import]  # pylint: disable=import-outside-toplevel
    except ImportError as err:
        logger.exception("Gemini client unavailable: %s", err)
        raise

    genai.configure(api_key=Config.GEMINI_API_KEY)
    model_name = os.getenv("GEMINI_MODEL", TRANSLATION_MODEL)
    model = genai.GenerativeModel(model_name)

    prompt = (
        f"Translate the following text from {source_locale} to {target_locale}. "
        "Keep technical identifiers, component names, URLs, and code snippets unchanged. "
        "Preserve meaning and make the output natural for a business application.\n\n"
        f"Text:\n{text}\n"
        "\nTranslate only the text, do not add explanations."
    )

    response = model.generate_content(prompt)
    translated = getattr(response, "text", "") or ""
    return {
        "used_ai": True,
        "model": model_name,
        "text": translated.strip(),
        "error": "",
    }


def translate_text(text: str, source_locale: str, target_locale: str) -> dict:
    """Return translated text using Gemini or a safe fallback.

    If the source and target locales are equal, the original text is returned
    without calling the AI model.
    """
    if not text or source_locale == target_locale:
        return {"used_ai": False, "text": text, "error": ""}

    if Config.GEMINI_API_KEY:
        try:
            return _gemini_translate(text, source_locale, target_locale)
        except Exception as error:  # pylint: disable=broad-exception-caught
            logger.exception("Gemini translation failed: %s", error)
            return {"used_ai": False, "text": text, "error": str(error)}

    logger.warning("Gemini API key not configured. Translation endpoint will return source text.")
    return {"used_ai": False, "text": text, "error": "Gemini API key not configured."}
