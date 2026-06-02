"""JWT helper utilities for the gateway middleware."""

from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity


def jwt_optional_identity():
    """Return identity from JWT if present, else None."""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:  # pylint: disable=broad-exception-caught
        return None
