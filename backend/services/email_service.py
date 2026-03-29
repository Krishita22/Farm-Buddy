"""
Email service for verification codes.
Uses Gmail SMTP (free) or falls back to showing code in UI.

To enable real email:
1. Go to https://myaccount.google.com/apppasswords
2. Generate an app password for "Mail"
3. Set SMTP_EMAIL and SMTP_PASSWORD in .env
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

logger = logging.getLogger(__name__)

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


def send_verification_email(to_email: str, code: str, name: str = "Farmer") -> bool:
    """Send verification code via email. Returns True if sent, False if fallback."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.info(f"Email not configured — showing code in UI. Code for {to_email}: {code}")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = f"Farm Buddy <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = f"Farm Buddy — Your verification code: {code}"

        body = f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 48px;">🌾</span>
                <h2 style="color: #166534; margin: 10px 0 5px;">Farm Buddy</h2>
            </div>
            <p>Hello {name},</p>
            <p>Your verification code is:</p>
            <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #166534;">{code}</span>
            </div>
            <p style="color: #888; font-size: 12px;">This code expires in 10 minutes.</p>
        </div>
        """

        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Verification email sent to {to_email}")
        return True

    except Exception as e:
        logger.warning(f"Email send failed: {e}")
        return False


def send_reset_email(to_email: str, code: str) -> bool:
    """Send password reset code via email."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.info(f"Email not configured — showing code in UI. Reset code for {to_email}: {code}")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = f"Farm Buddy <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = f"Farm Buddy — Password reset code: {code}"

        body = f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 48px;">🌾</span>
                <h2 style="color: #166534;">Farm Buddy — Password Reset</h2>
            </div>
            <p>Your password reset code is:</p>
            <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #92400e;">{code}</span>
            </div>
            <p style="color: #888; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
        """

        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Reset email sent to {to_email}")
        return True

    except Exception as e:
        logger.warning(f"Reset email failed: {e}")
        return False
