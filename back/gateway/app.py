"""
API Gateway service for Jira Migration backend.
Provides authentication and routing to backend microservices.
"""

# pylint: disable=too-many-lines

import logging
import os
import re
import hashlib
import secrets
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from urllib.parse import urlencode

from dotenv import load_dotenv
from flasgger import Swagger
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.security import check_password_hash, generate_password_hash
import requests
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from shared.core.config import Config
from shared.core.errors import register_error_handlers
from shared.core.extensions import jwt, mongo
from shared.repositories.user_repository import UserRepository
from shared.core.logger import setup_logger

load_dotenv()

logger = logging.getLogger(__name__)

WORKER_URL = os.getenv("WORKER_URL", "http://worker:5005")
REPORT_SERVICE_URL = os.getenv("REPORT_SERVICE_URL", "http://report_service:5004")
COMPATIBILITY_SERVICE_URL = os.getenv(
    "COMPATIBILITY_SERVICE_URL",
    "http://compatibility_service:5002",
)
KNOWLEDGE_SERVICE_URL = os.getenv("KNOWLEDGE_SERVICE_URL", "http://knowledge_service:5003")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
REQUEST_TIMEOUT = 180
RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET_KEY", "")
RECAPTCHA_MIN_SCORE = float(os.getenv("RECAPTCHA_MIN_SCORE", "0.5"))

EMAIL_REGEX = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|fr|tn)$"
PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$"
PASSWORD_RESET_TOKEN_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_MINUTES", "30"))


def _normalize_email(email: str) -> str:
    """Return a consistently stored email value."""
    return email.strip().lower()


def _is_valid_email(email: str) -> bool:
    """Validate email format and allowed top-level domains."""
    return bool(re.fullmatch(EMAIL_REGEX, email, flags=re.IGNORECASE))


def _is_valid_password(password: str) -> bool:
    """Validate password strength requirements."""
    return bool(re.fullmatch(PASSWORD_REGEX, password))


def _hash_reset_token(token: str) -> str:
    """Hash a reset token before storing or comparing it."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _get_password_reset_success_message(language: str | None = None) -> str:
    """Return the password reset success message in the requested language."""
    locale = (language or "").strip().lower()
    if locale.startswith("fr"):
        return (
            "Un lien de réinitialisation de mot de passe a été envoyé. "
            "Vérifiez votre boîte de réception ou les courriers indésirables."
        )
    return "A password reset link has been sent. Check your inbox or spam."


def _get_registration_success_message(language: str | None = None) -> str:
    """Return the registration success message in the requested language."""
    locale = (language or "").strip().lower()
    if locale.startswith("fr"):
        return (
            "Inscription réussie. Veuillez vérifier votre e-mail pour valider votre compte."
        )
    return "Registration successful. Please check your email to verify your account."


def _password_reset_link(email: str, token: str) -> str:
    """Build a frontend password reset URL."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    query = urlencode({"email": email, "token": token})
    return f"{frontend_url}/reset-password?{query}"


def _password_reset_message(reset_link: str) -> str:
    """Return the password reset email body (plain text)."""
    return (
        "Hello,\n\n"
        "You have requested a password reset for your Jira Migration account.\n\n"
        "To set a new password, visit the following link:\n"
        f"{reset_link}\n\n"
        f"This reset link will expire in {PASSWORD_RESET_TOKEN_MINUTES} minutes.\n\n"
        "If you did not request this, you can safely ignore this email. "
        "Your password will remain unchanged.\n\n"
        "Best regards,\n"
        "The Jira Migration Team"
    )


def _password_reset_message_html(reset_link: str) -> str:
    """Return the password reset email body (HTML)."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .header h2 {{
            color: #0052cc;
            margin: 0;
        }}
        .content {{
            margin: 20px 0;
        }}
        .button {{
            display: inline-block;
            background-color: #0052cc;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .button:hover {{
            background-color: #003d99;
        }}
        .footer {{
            border-top: 1px solid #ddd;
            padding-top: 20px;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }}
        .warning {{
            background-color: #fff3cd;
            padding: 12px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Password Reset</h2>
        </div>

        <div class="content">
            <p>Hello,</p>

            <p>You have requested a password reset for your
            <strong>Jira Migration</strong> account.</p>

            <p>To set a new password, click the button below:</p>

            <a
                href="{reset_link}"
                class="button"
                style="display:inline-block;background-color:#0052cc;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:700;"
            >Reset my password</a>

            <p><em>Or copy this link in your browser:</em></p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                {reset_link}
            </p>

            <div class="warning">
                <strong>⏱️ Important:</strong> This reset link will expire in
                <strong>{PASSWORD_RESET_TOKEN_MINUTES} minutes</strong>.
            </div>

            <p><strong>Did not request this reset?</strong></p>
            <p>
                If you did not request this password reset, you can ignore this email.
                Your password will remain unchanged.
            </p>
        </div>

        <div class="footer">
            <p>Best regards,<br>
            <strong>The Jira Migration Team</strong></p>
            <p>This email was sent to the address associated with your account.</p>
        </div>
    </div>
</body>
</html>
"""


def _send_password_reset_email_sendgrid(email: str, reset_link: str) -> None:
    """Send a password reset email using SendGrid, with SMTP fallback."""
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        logger.warning("SENDGRID_API_KEY is not configured. Falling back to SMTP.")
        return _send_password_reset_email_smtp(email, reset_link)

    sender = os.getenv("SMTP_FROM", os.getenv("SENDGRID_FROM", "no-reply@jira-migration.local"))
    payload = {
        "personalizations": [{"to": [{"email": email}]}],
        "from": {"email": sender},
        "subject": "Password Reset",
        "content": [
            {"type": "text/plain", "value": _password_reset_message(reset_link)},
            {"type": "text/html", "value": _password_reset_message_html(reset_link)},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        response = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        logger.info("Password reset email sent via SendGrid to %s", email)
    except requests.RequestException as error:
        logger.warning("SendGrid send failed, falling back to SMTP: %s", error)
        return _send_password_reset_email_smtp(email, reset_link)


def _send_password_reset_email_smtp(email: str, reset_link: str) -> None:
    """Send a password reset email via SMTP."""
    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        smtp_keys = [
            key
            for key in sorted(os.environ)
            if key.startswith("SMTP_")
        ]
        raise RuntimeError(
            f"SMTP_HOST is not configured. Present SMTP keys: {smtp_keys}. "
            "Check Portainer variables and redeploy the service."
        )

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_username or "no-reply@jira-migration.local")
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}

    message = EmailMessage()
    message["Subject"] = "Password Reset"
    message["From"] = smtp_from
    message["To"] = email
    message.set_content(_password_reset_message(reset_link))
    message.add_alternative(_password_reset_message_html(reset_link), subtype="html")

    try:
        if smtp_use_ssl or smtp_port == 465:
            smtp_connection = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            smtp_connection = smtplib.SMTP(smtp_host, smtp_port, timeout=5)

        with smtp_connection as smtp:
            if not smtp_use_ssl and smtp_use_tls:
                smtp.starttls()
            if smtp_username and smtp_password:
                smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
            logger.info("Password reset email sent to %s via SMTP host %s", email, smtp_host)
    except (OSError, smtplib.SMTPException) as error:
        logger.exception(
            "Failed to send password reset email to %s: %s",
            email,
            error,
        )
        raise


def _send_password_reset_email(email: str, reset_link: str) -> None:
    """Send a password reset email using the selected delivery provider."""
    provider = os.getenv("EMAIL_PROVIDER", "sendgrid").strip().lower()
    if provider == "smtp":
        try:
            return _send_password_reset_email_smtp(email, reset_link)
        except (OSError, smtplib.SMTPException, requests.RequestException) as error:
            logger.warning(
                "SMTP primary failed, falling back to SendGrid: %s",
                error,
            )
            return _send_password_reset_email_sendgrid(email, reset_link)

    if provider == "sendgrid":
        try:
            return _send_password_reset_email_sendgrid(email, reset_link)
        except (requests.RequestException, OSError, smtplib.SMTPException) as error:
            logger.warning(
                "SendGrid primary failed, falling back to SMTP: %s",
                error,
            )
            return _send_password_reset_email_smtp(email, reset_link)

    logger.warning(
        "Unsupported EMAIL_PROVIDER=%s. Defaulting to SendGrid.",
        provider,
    )


def _email_verification_link(email: str, token: str) -> str:
    """Build a frontend email verification URL."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    query = urlencode({"email": email, "token": token})
    return f"{frontend_url}/verify-email?{query}"


def _email_verification_message(verification_link: str) -> str:
    """Return the email verification email body (plain text)."""
    return (
        "Hello,\n\n"
        "Thank you for creating a Jira Migration account.\n\n"
        "To verify your email address and activate your account, visit the following link:\n"
        f"{verification_link}\n\n"
        f"This verification link will expire in {PASSWORD_RESET_TOKEN_MINUTES} minutes.\n\n"
        "If you did not create this account, you can safely ignore this email.\n\n"
        "Best regards,\n"
        "The Jira Migration Team"
    )


def _email_verification_message_html(verification_link: str) -> str:
    """Return the email verification email body (HTML)."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }}
        .header h2 {{
            color: #0052cc;
            margin: 0;
        }}
        .content {{
            margin: 20px 0;
        }}
        .button {{
            display: inline-block;
            background-color: #0052cc;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .button:hover {{
            background-color: #003d99;
        }}
        .footer {{
            border-top: 1px solid #ddd;
            padding-top: 20px;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }}
        .warning {{
            background-color: #fff3cd;
            padding: 12px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Verify Your Email Address</h2>
        </div>

        <div class="content">
            <p>Hello,</p>

            <p>Thank you for creating a <strong>Jira Migration</strong> account.</p>

            <p>To verify your email address and activate your account, click the button below:</p>

            <a
                href="{verification_link}"
                class="button"
                style="display:inline-block;background-color:#0052cc;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:700;"
            >Verify my email</a>

            <p><em>Or copy this link in your browser:</em></p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                {verification_link}
            </p>

            <div class="warning">
                <strong>⏱️ Important:</strong> This verification link will expire in
                <strong>{PASSWORD_RESET_TOKEN_MINUTES} minutes</strong>.
            </div>

            <p><strong>Did not create this account?</strong></p>
            <p>
                If you did not create this account, you can safely ignore this email.
            </p>
        </div>

        <div class="footer">
            <p>Best regards,<br>
            <strong>The Jira Migration Team</strong></p>
            <p>This email was sent to the address associated with your account registration.</p>
        </div>
    </div>
</body>
</html>
"""


def _send_email_verification_email(email: str, verification_link: str) -> None:
    """Send an email verification message using the selected delivery provider."""
    # Implement symmetric provider preference similar to password reset:
    # - If EMAIL_PROVIDER=="smtp": try SMTP first, fallback to SendGrid
    # - If EMAIL_PROVIDER=="sendgrid": try SendGrid first, fallback to SMTP
    # - Otherwise prefer SMTP first per project preference

    def _send_via_sendgrid(email: str, link: str) -> None:
        api_key = os.getenv("SENDGRID_API_KEY")
        sender = os.getenv("SMTP_FROM", os.getenv("SENDGRID_FROM", "no-reply@jira-migration.local"))
        if not api_key:
            logger.warning("SENDGRID_API_KEY is not configured. Cannot send via SendGrid.")
            raise RuntimeError("SendGrid API key missing")

        payload = {
            "personalizations": [{"to": [{"email": email}]}],
            "from": {"email": sender},
            "subject": "Verify Your Email Address",
            "content": [
                {"type": "text/plain", "value": _email_verification_message(link)},
                {"type": "text/html", "value": _email_verification_message_html(link)},
            ],
        }
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        response = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        logger.info("Email verification sent via SendGrid to %s", email)

    def _send_via_smtp(email: str, link: str) -> None:
        smtp_host = os.getenv("SMTP_HOST")
        if not smtp_host:
            smtp_keys = [k for k in sorted(os.environ) if k.startswith("SMTP_")]
            raise RuntimeError(
                f"SMTP_HOST is not configured. Present SMTP keys: {smtp_keys}."
            )

        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from = os.getenv("SMTP_FROM", smtp_username or "no-reply@jira-migration.local")
        smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
        smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}

        message = EmailMessage()
        message["Subject"] = "Verify Your Email Address"
        message["From"] = smtp_from
        message["To"] = email
        message.set_content(_email_verification_message(link))
        message.add_alternative(_email_verification_message_html(link), subtype="html")

        if smtp_use_ssl or smtp_port == 465:
            smtp_connection = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            smtp_connection = smtplib.SMTP(smtp_host, smtp_port, timeout=5)

        with smtp_connection as smtp:
            if not smtp_use_ssl and smtp_use_tls:
                smtp.starttls()
            if smtp_username and smtp_password:
                smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
            logger.info("Email verification sent to %s via SMTP host %s", email, smtp_host)

    provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()

    if provider == "smtp":
        try:
            _send_via_smtp(email, verification_link)
            return
        except (
            OSError,
            smtplib.SMTPException,
            RuntimeError,
            requests.RequestException,
        ) as err:
            logger.warning("SMTP primary failed; falling back to SendGrid: %s", err)
            try:
                _send_via_sendgrid(email, verification_link)
                return
            except (
                OSError,
                smtplib.SMTPException,
                RuntimeError,
                requests.RequestException,
            ) as err2:
                logger.exception(
                    "SMTP+SendGrid failed for verification email to %s: %s",
                    email,
                    err2,
                )
                raise

    if provider == "sendgrid":
        try:
            _send_via_sendgrid(email, verification_link)
            return
        except (requests.RequestException, RuntimeError) as err:
            logger.warning("SendGrid primary failed; falling back to SMTP: %s", err)
            try:
                _send_via_smtp(email, verification_link)
                return
            except (OSError, smtplib.SMTPException, RuntimeError) as err2:
                logger.exception(
                    "SendGrid+SMTP failed for verification email to %s: %s",
                    email,
                    err2,
                )
                raise

    # Default: prefer SMTP first
    try:
        _send_via_smtp(email, verification_link)
    except (
        OSError,
        smtplib.SMTPException,
        RuntimeError,
        requests.RequestException,
    ) as err:
        logger.warning("Default SMTP send failed; falling back to SendGrid: %s", err)
        _send_via_sendgrid(email, verification_link)


def _verify_recaptcha(token: str, remote_ip: str | None = None) -> dict:
    """Verify reCAPTCHA token with Google's API.

    Returns the parsed JSON response from Google's verify endpoint.
    Raises ValueError if verification fails or token is missing.
    """
    if not token:
        raise ValueError("reCAPTCHA token is required")

    if not RECAPTCHA_SECRET:
        # If no secret configured, fail closed for safety
        raise ValueError("reCAPTCHA secret key not configured on server")

    url = "https://www.google.com/recaptcha/api/siteverify"
    payload = {
        "secret": RECAPTCHA_SECRET,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        resp = requests.post(url, data=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        result = resp.json()
    except requests.RequestException as exc:  # pragma: no cover - network
        logger.exception("reCAPTCHA verification request failed: %s", exc)
        raise ValueError("reCAPTCHA verification failed") from exc

    # For reCAPTCHA v3 include score check
    success = bool(result.get("success"))
    score = result.get("score")
    # action is intentionally not used here; reCAPTCHA action can be
    # inspected in logs if needed.

    if not success:
        raise ValueError("reCAPTCHA verification unsuccessful")

    # If score is present, treat as v3 and require threshold
    if score is not None:
        try:
            s = float(score)
        except (TypeError, ValueError):
            s = 0.0
        if s < RECAPTCHA_MIN_SCORE:
            raise ValueError(f"reCAPTCHA score too low: {s}")

    return result


def _reset_token_is_expired(expires_at) -> bool:
    """Return True when a stored reset token expiration is in the past."""
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except ValueError:
            return True
    if not isinstance(expires_at, datetime):
        return True
    return expires_at < datetime.utcnow()

def _ensure_admin_user(user_repo: UserRepository) -> None:
    """Create default admin user from env variables if it does not exist."""
    admin_email = os.getenv("GATEWAY_ADMIN_EMAIL")
    admin_password = os.getenv("GATEWAY_ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        return

    if user_repo.get_user_by_email(admin_email) is None:
        admin_username = os.getenv("GATEWAY_ADMIN_USERNAME") or admin_email.split('@', 1)[0]
        user_repo.create_user(
            admin_email,
            admin_username,
            generate_password_hash(admin_password),
            role="admin",
        )

def _public_user(user: dict) -> dict:
    """Return user fields that are safe for the frontend."""
    return {
        "email": user.get("email"),
        "username": user.get("username"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "role": user.get("role", "user"),
        "auth_provider": user.get("auth_provider", "local"),
    }

def _google_client_ids() -> list[str]:
    """Return configured Google OAuth client IDs."""
    return [
        client_id.strip()
        for client_id in GOOGLE_CLIENT_ID.split(",")
        if client_id.strip()
    ]


def _verify_google_id_token(credential: str) -> dict:
    """Verify a Google Identity Services ID token."""
    client_ids = _google_client_ids()
    if not client_ids:
        raise ValueError("GOOGLE_CLIENT_ID is not configured.")

    last_error = None
    for client_id in client_ids:
        try:
            return google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except (ValueError, GoogleAuthError) as error:
            last_error = error

    raise ValueError(f"Invalid Google credential: {last_error}")


def create_app():
    """Create and configure the API Gateway Flask application."""
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}}) #, supports_credentials=True

    app.config["MONGO_URI"] = Config.MONGO_URI
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

    mongo.init_app(app)
    jwt.init_app(app)


    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Authorization token is missing",
            "message": str(error)
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "Invalid token",
            "message": str(error)
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return jsonify({
            "error": "Token has expired",
            "message": "Please log in again"
        }), 401

    user_repo = UserRepository()
    _ensure_admin_user(user_repo)

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "JiraMigration API Gateway",
            "description": "API Gateway with JWT Authentication",
            "version": "1.0.0",
        },
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Enter token with Bearer prefix: Bearer <token>",
            }
        },
    }
    Swagger(app, template=swagger_template)

    setup_logger(app)
    register_error_handlers(app)

    @app.route("/api/health", methods=["GET"])
    def health():
        """Gateway health check."""
        return jsonify({"status": "ok", "service": "gateway"}), 200

    @app.route("/api/login", methods=["POST"])
    def login():
        """
        User login endpoint. Validates credentials from environment or defaults.
        Returns a JWT access token on success.
        """
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        # Verify reCAPTCHA token
        recaptcha_token = data.get("recaptcha_token")
        try:
            _verify_recaptcha(recaptcha_token, request.remote_addr)
        except ValueError as err:
            logger.warning("reCAPTCHA validation failed: %s", err)
            return jsonify({"error": "reCAPTCHA validation failed"}), 400

        user = user_repo.get_user_by_email(_normalize_email(data.get("email", "")))
        password_hash = user.get("password_hash") if user else None
        if password_hash and check_password_hash(password_hash, data.get("password", "")):
            # Check if email is verified
            if not user.get("email_verified", False):
                return jsonify({
                    "error": "Email not verified. Check your inbox for a verification link."
                }), 403

            token = create_access_token(identity=user["email"])
            return jsonify({"token": token}), 200

        return jsonify({"error": "Invalid credentials"}), 401

    @app.route("/api/auth/google", methods=["POST"])
    def google_login():
        """
        Authenticate using a Google Identity Services ID token.

        Body:
          { "credential": "<google_id_token>" }
        """
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        credential = data.get("credential") or data.get("id_token")
        if not credential:
            return jsonify({"error": "Google credential is required"}), 400

        try:
            google_payload = _verify_google_id_token(credential)
        except ValueError as error:
            logger.warning("Google authentication failed: %s", error)
            return jsonify({"error": "Invalid Google credential"}), 401

        email = _normalize_email(google_payload.get("email", ""))
        email_verified = google_payload.get("email_verified")
        google_user_id = google_payload.get("sub")

        if not email or not google_user_id:
            return jsonify({"error": "Google credential is missing required profile data"}), 401

        if not _is_valid_email(email):
            return jsonify({
                "error": "Only valid .com, .fr, or .tn email addresses are accepted"
            }), 400

        if email_verified is not True:
            return jsonify({"error": "Google account email is not verified"}), 401

        user = user_repo.get_user_by_email(email)
        if user is None:
            user = user_repo.create_oauth_user(
                email=email,
                provider="google",
                provider_user_id=google_user_id,
                name=google_payload.get("name"),
                picture=google_payload.get("picture"),
            )
        else:
            user_repo.link_oauth_provider(
                email=email,
                provider="google",
                provider_user_id=google_user_id,
                name=google_payload.get("name"),
                picture=google_payload.get("picture"),
            )

        token = create_access_token(identity=email)
        return jsonify({
            "token": token,
            "user": {
                "email": email,
                "name": google_payload.get("name"),
                "picture": google_payload.get("picture"),
                "role": user.get("role", "user"),
                "auth_provider": "google",
            },
        }), 200

    @app.route("/api/register", methods=["POST"])
    def register():
        """Register a new user account and send verification email."""
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        email = _normalize_email(data.get("email", ""))
        username = (data.get("username", "") or "").strip()
        password = data.get("password", "")
        recaptcha_token = data.get("recaptcha_token")

        # Verify reCAPTCHA for registrations as well
        try:
            _verify_recaptcha(recaptcha_token, request.remote_addr)
        except ValueError as err:
            logger.warning("reCAPTCHA validation failed (register): %s", err)
            return jsonify({"error": "reCAPTCHA validation failed"}), 400

        if not username or not email or not password:
            return jsonify({"error": "Username, email and password are required"}), 400

        if not _is_valid_email(email):
            return jsonify({
                "error": "Email must be valid and end with .com, .fr, or .tn."
            }), 400

        if not re.match(PASSWORD_REGEX, password):
            return jsonify({
                "error": (
                    "Password must contain at least 8 characters, "
                    "one uppercase letter, one lowercase letter, and one digit."
                )
            }), 400

        if user_repo.get_user_by_email(email):
            return jsonify({"error": "Email already registered"}), 409

        if user_repo.get_user_by_username(username):
            return jsonify({"error": "Username already taken"}), 409

        # Create user with unverified email
        user_repo.create_user(
            email, username, generate_password_hash(password), role="user",
            email_verified=False
        )

        # Generate and send verification email
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES)
        user_repo.save_email_verification_token(
            email,
            _hash_reset_token(token),
            expires_at,
        )
        logger.info(
            "Email verification token saved for %s. expires_at=%s",
            email,
            expires_at.isoformat(),
        )

        verification_link = _email_verification_link(email, token)
        try:
            _send_email_verification_email(email, verification_link)
            logger.info("Verification email sent to %s", email)
        except (
            OSError, smtplib.SMTPException, requests.RequestException, RuntimeError
        ) as error:
            logger.error(
                "Failed to send verification email to %s: %s", email, error
            )
            # Don't fail the registration, just log the error

        requested_language = data.get("language")
        return jsonify({
            "message": _get_registration_success_message(requested_language)
        }), 201

    @app.route("/api/password/forgot", methods=["POST"])
    def forgot_password():
        """Create a password reset token and email the reset link."""
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        email = _normalize_email(data.get("email", ""))
        if not _is_valid_email(email):
            return jsonify({
                "error": "Email must be valid and end with .com, .fr, or .tn."
            }), 400

        requested_language = data.get("language")
        generic_message = {
            "message": _get_password_reset_success_message(requested_language)
        }

        user = user_repo.get_user_by_email(email)
        logger.info("Password reset requested for %s. user_exists=%s", email, bool(user))
        if user:
            token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(
                minutes=PASSWORD_RESET_TOKEN_MINUTES,
            )
            user_repo.save_password_reset_token(
                email,
                _hash_reset_token(token),
                expires_at,
            )
            logger.info(
                "Password reset token saved for %s. expires_at=%s",
                email,
                expires_at.isoformat(),
            )
            reset_link = _password_reset_link(email, token)
            try:
                _send_password_reset_email(email, reset_link)
            except (
                OSError,
                smtplib.SMTPException,
                requests.RequestException,
                RuntimeError,
            ) as error:
                logger.error(
                    "Failed to send password reset email to %s: %s",
                    email,
                    error,
                )
                return jsonify({
                    "error": "Unable to send password reset email."
                }), 502

        return jsonify(generic_message), 200

    @app.route("/api/password/reset", methods=["POST"])
    def reset_password():
        """Reset a user's password with a valid reset token."""
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        email = _normalize_email(data.get("email", ""))
        token = data.get("token", "")
        password = data.get("password", "")

        if not email or not token or not password:
            return jsonify({"error": "Email, token and password are required"}), 400

        if not _is_valid_email(email):
            return jsonify({
                "error": "Email must be valid and end with .com, .fr, or .tn."
            }), 400

        if not _is_valid_password(password):
            return jsonify({
                "error": (
                    "Password must contain at least 8 characters, "
                    "one uppercase letter, one lowercase letter, and one digit."
                )
            }), 400

        user = user_repo.get_user_by_password_reset_token(email, _hash_reset_token(token))
        if not user or _reset_token_is_expired(user.get("reset_password_expires_at")):
            return jsonify({"error": "The password reset link is invalid or expired."}), 400

        user_repo.update_password_and_clear_reset(email, generate_password_hash(password))
        return jsonify({"message": "Password updated successfully."}), 200

    @app.route("/api/email/verify", methods=["POST"])
    def verify_email():
        """Verify a user's email address with a valid verification token."""
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        email = _normalize_email(data.get("email", ""))
        token = data.get("token", "")

        if not email or not token:
            return jsonify({"error": "Email and token are required"}), 400

        if not _is_valid_email(email):
            return jsonify({
                "error": "Email must be valid and end with .com, .fr, or .tn."
            }), 400

        # Check if user exists
        user = user_repo.get_user_by_email(email)
        if not user:
            return jsonify({"error": "User not found."}), 404

        # If already verified, return success
        if user.get("email_verified", False):
            return jsonify({"message": "Email is already verified."}), 200

        # Get user by verification token
        user_with_token = user_repo.get_user_by_email_verification_token(
            email, _hash_reset_token(token)
        )

        if (
            not user_with_token
            or _reset_token_is_expired(
                user_with_token.get("email_verification_expires_at")
            )
        ):
            return jsonify({"error": "The email verification link is invalid or expired."}), 400

        # Mark email as verified
        user_repo.set_email_verified(email)
        logger.info("Email verified for user %s", email)

        return jsonify({"message": "Email verified successfully."}), 200

    @app.route("/api/me", methods=["GET"])
    @jwt_required()
    def me():
        """Return currently authenticated user."""
        return jsonify({"email": get_jwt_identity()}), 200
    @app.route("/api/me/profile", methods=["GET"])
    @jwt_required()
    def get_profile():
        """Return the authenticated user profile."""
        email = get_jwt_identity()
        user = user_repo.get_user_by_email(email)
        if not user:
            return jsonify({"error": "Authenticated user was not found."}), 404
        return jsonify(_public_user(user)), 200

    @app.route("/api/me/profile", methods=["PUT"])
    @jwt_required()
    def update_profile():
        """Update the authenticated user profile."""
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        current_email = get_jwt_identity()
        user = user_repo.get_user_by_email(current_email)
        if not user:
            return jsonify({"error": "Authenticated user was not found."}), 404

        new_email = _normalize_email(data.get("email", ""))
        if not new_email:
            return jsonify({"error": "Email is required"}), 400

        if not _is_valid_email(new_email):
            return jsonify(
                {"error": "Email must be valid and end with .com, .fr, or .tn."}
            ), 400

        if new_email != current_email and user_repo.get_user_by_email(new_email):
            return jsonify({"error": "Email already registered"}), 409

        picture = data.get("picture")
        if picture is not None and not isinstance(picture, str):
            return jsonify({"error": "Profile picture must be a valid string."}), 400

        if new_email != current_email:
            user_repo.update_user_profile(current_email, new_email, picture)
            user = user_repo.get_user_by_email(new_email) or {
                **user,
                "email": new_email,
                "picture": picture if picture is not None else user.get("picture"),
            }
            token = create_access_token(identity=new_email)
            return jsonify({
                "message": "Profile updated successfully.",
                "user": _public_user(user),
                "token": token,
            }), 200

        if picture is not None:
            user_repo.update_user_profile(current_email, current_email, picture)
            user["picture"] = picture

        return jsonify({
            "message": "Profile updated successfully.",
            "user": _public_user(user),
        }), 200

    @app.route("/api/me/password", methods=["PUT"])
    @jwt_required()
    def change_password():
        """Change the authenticated local user password."""
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")
        if not current_password or not new_password:
            return jsonify({"error": "Current password and new password are required"}), 400

        email = get_jwt_identity()
        user = user_repo.get_user_by_email(email)
        if not user:
            return jsonify({"error": "Authenticated user was not found."}), 404

        password_hash = user.get("password_hash")
        if not password_hash:
            return jsonify(
                {
                    "error": (
                        "This account uses Google OAuth. No local password is configured."
                    )
                }
            ), 400

        if not check_password_hash(password_hash, current_password):
            return jsonify({"error": "The current password is incorrect."}), 400

        if not _is_valid_password(new_password):
            return jsonify({
                "error": (
                    "The new password must contain at least 8 characters, "
                    "one uppercase letter, one lowercase letter, and one digit."
                )
            }), 400

        user_repo.update_password(email, generate_password_hash(new_password))
        return jsonify({"message": "Password updated successfully."}), 200

    @app.route("/api/analyze", methods=["POST"])
    @jwt_required()
    def analyze():

        """
        Trigger full analysis pipeline through Worker.

        Expects multipart/form-data:
          file=<zip/xml/json/sql>
        """
        if "file" not in request.files:
            return jsonify({"error": "File is required."}), 400

        uploaded_file = request.files["file"]

        if not uploaded_file.filename:
            return jsonify({"error": "Uploaded file must have a filename."}), 400

        try:
            url = f"{WORKER_URL.rstrip('/')}/worker/jobs/run"

            data = uploaded_file.read()
            logger.info(
                "Forwarding file to worker: filename=%s size=%s content_type=%s",
                uploaded_file.filename,
                len(data),
                uploaded_file.content_type,
            )
            files = {
                "file": (
                    uploaded_file.filename,
                    data,
                    uploaded_file.content_type,
                )
            }

            response = requests.post(
                url,
                files=files,
                timeout=REQUEST_TIMEOUT,
            )

            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as error:
            logger.error("Worker request failed: %s", error)
            return jsonify({"error": f"Worker request failed: {error}"}), 502

        except ValueError as error:
            logger.error("Invalid Worker response: %s", error)
            return jsonify({"error": "Invalid response from Worker service."}), 502

    @app.route("/api/jobs/<job_id>", methods=["GET"])
    @jwt_required()
    def get_job(job_id):
        """Get worker job status."""
        try:
            url = f"{WORKER_URL.rstrip('/')}/worker/jobs/{job_id}"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as error:
            logger.error("Worker job status request failed: %s", error)
            return jsonify({"error": f"Worker request failed: {error}"}), 502

    @app.route("/api/jobs", methods=["GET"])
    @jwt_required()
    def list_jobs():
        """List worker jobs."""
        try:
            limit = request.args.get("limit", 50)
            url = f"{WORKER_URL.rstrip('/')}/worker/jobs?limit={limit}"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as error:
            logger.error("Worker jobs request failed: %s", error)
            return jsonify({"error": f"Worker request failed: {error}"}), 502

    @app.route("/api/compatibility/cache/stats", methods=["GET"])
    @jwt_required()
    def compatibility_cache_stats():
        """Return component analysis cache statistics."""
        try:
            url = f"{COMPATIBILITY_SERVICE_URL.rstrip('/')}/compatibility/cache/stats"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as error:
            logger.error("Compatibility cache stats request failed: %s", error)
            return jsonify({"error": f"Compatibility service request failed: {error}"}), 502

    @app.route("/api/knowledge/index/learned-components", methods=["POST"])
    @jwt_required()
    def index_learned_components():
        """Proxy learned component indexing to the Knowledge Service."""
        try:
            url = f"{KNOWLEDGE_SERVICE_URL.rstrip('/')}/knowledge/index/learned-components"
            response = requests.post(url, json=request.get_json() or {}, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as error:
            logger.error("Learned component indexing request failed: %s", error)
            return jsonify({"error": f"Knowledge service request failed: {error}"}), 502

    @app.route("/api/reports/<report_id>", methods=["GET"])
    @jwt_required()
    def get_report(report_id):
        """Proxy report retrieval."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/{report_id}"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)

            # Vérifier si la requête a réussi avant de parser le JSON
            if response.status_code != 200:
                try:
                    return jsonify(response.json()), response.status_code
                except ValueError:
                    error_message = "Report not found or service error"
                    return jsonify({"error": error_message}), response.status_code

            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as error:
            logger.error("Report request failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports", methods=["GET"])
    @jwt_required()
    def list_reports():
        """List all generated reports."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as error:
            logger.error("List reports failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/archived", methods=["GET"])
    @jwt_required()
    def list_archived_reports():
        """List archived reports through the report service."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/archived"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as error:
            logger.error("List archived reports failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/<report_id>/archive", methods=["POST"])
    @jwt_required()
    def archive_report(report_id):
        """Proxy report archival to the report service."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/{report_id}/archive"
            response = requests.post(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as error:
            logger.error("Archive report request failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/<report_id>/translate", methods=["POST"])
    @jwt_required()
    def translate_report(report_id):
        """Proxy report translation request to the report service."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/{report_id}/translate"
            response = requests.post(url, json=request.get_json(), timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as error:
            logger.error("Translate report request failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/generate", methods=["POST"])
    @jwt_required()
    def generate_report():
        """Generate a report from matrix_id or analysis_id."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/generate"
            # Forward the JSON body to the report service
            response = requests.post(url, json=request.get_json(), timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as error:
            logger.error("Generate report failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/<report_id>/json", methods=["GET"])
    @jwt_required()
    def export_report_json(report_id):
        """Export report as JSON file."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/{report_id}/json"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)

            # If error (e.g. 404), return json error message
            if response.status_code != 200:
                return jsonify(response.json()), response.status_code

            # Pass the file content and headers back to the client
            filename = f'report_{report_id}.json'
            headers = {
                'Content-Disposition': response.headers.get(
                    'Content-Disposition', f'attachment; filename={filename}'
                ),
                'Content-Type': response.headers.get('Content-Type', 'application/json')
            }
            return response.content, 200, headers

        except requests.exceptions.RequestException as error:
            logger.error("Report JSON export failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/<report_id>/pdf", methods=["GET"])
    @jwt_required()
    def export_report_pdf(report_id):
        """Export report as PDF file."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/{report_id}/pdf"
            response = requests.get(url, timeout=REQUEST_TIMEOUT)

            # If error (e.g. 404), return json error message
            if response.status_code != 200:
                try:
                    return jsonify(response.json()), response.status_code
                except ValueError:
                    return jsonify({"error": "Failed to retrieve PDF"}), response.status_code

            # Pass the PDF file content and headers back to the client
            filename = f'report_{report_id}.pdf'
            headers = {
                'Content-Disposition': response.headers.get(
                    'Content-Disposition', f'attachment; filename={filename}'
                ),
                'Content-Type': response.headers.get('Content-Type', 'application/pdf')
            }
            return response.content, 200, headers

        except requests.exceptions.RequestException as error:
            logger.error("Report PDF export failed: %s", error)
            return jsonify({"error": f"Report request failed: {error}"}), 502

    @app.route("/api/reports/<report_id>", methods=["DELETE"])
    @jwt_required()
    def delete_report(report_id):
        """Proxy report soft-deletion to report_service."""
        try:
            url = f"{REPORT_SERVICE_URL.rstrip('/')}/reports/{report_id}"
            response = requests.delete(url, timeout=REQUEST_TIMEOUT)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as error:
            logger.error("Delete report request failed: %s", error)
            return jsonify({"error": f"Report service request failed: {error}"}), 502

    return app


if __name__ == "__main__":
    gateway_app = create_app()
    port = int(os.environ.get("PORT", 5000))
    debug = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes"}
    gateway_app.run(host="0.0.0.0", port=port, debug=debug)
