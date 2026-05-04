import os
import boto3

SES_FROM = os.environ.get("SES_FROM_EMAIL", "noreply@probhammer.com")
REGION   = os.environ.get("AWS_REGION", "eu-west-3")
FRONTEND = os.environ.get("FRONTEND_URL", "https://40k.probhammer.com")

ses = boto3.client("ses", region_name=REGION)

_BASE = """
<div style="background:#0A1621;padding:40px;font-family:monospace;color:#9DB7C6;
            max-width:480px;margin:0 auto;border:1px solid #1E3A4C">
  <div style="color:#2FE0FF;font-size:16px;font-weight:700;letter-spacing:4px;
              margin-bottom:28px">PROB'HAMMER</div>
  {body}
  <p style="margin:28px 0 0;font-size:11px;color:#5F7C8A;border-top:1px solid #1E3A4C;padding-top:16px">
    {footer}
  </p>
</div>
"""

_BTN = '<a href="{href}" style="display:inline-block;background:#2FE0FF;color:#0A1621;padding:14px 28px;text-decoration:none;font-weight:700;letter-spacing:2px;font-size:12px;margin-top:20px">{label}</a>'


def _send(to: str, subject: str, body: str, footer: str):
    html = _BASE.format(body=body, footer=footer)
    ses.send_email(
        Source=SES_FROM,
        Destination={"ToAddresses": [to]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body":    {"Html": {"Data": html, "Charset": "UTF-8"}},
        },
    )


def send_verification_email(to: str, token: str):
    link = f"{FRONTEND}/verify-email?token={token}"
    body = (
        "<p style='margin:0 0 8px'>Verify your email address to activate your account.</p>"
        + _BTN.format(href=link, label="VERIFY EMAIL")
    )
    _send(to, "Verify your Prob'Hammer account", body,
          "Link expires in 24 hours. If you didn't create an account, ignore this email.")


def send_reset_email(to: str, token: str):
    link = f"{FRONTEND}/reset-password?token={token}"
    body = (
        "<p style='margin:0 0 8px'>You requested a password reset.</p>"
        + _BTN.format(href=link, label="RESET PASSWORD")
    )
    _send(to, "Reset your Prob'Hammer password", body,
          "Link expires in 1 hour. If you didn't request this, ignore this email.")
