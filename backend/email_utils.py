import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER     = os.getenv("GMAIL_USER", "")
GMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://probhammer.com")


def send_reset_email(to_email: str, reset_token: str):
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Réinitialisation de ton mot de passe ProbHammer"
    msg["From"]    = f"ProbHammer <{GMAIL_USER}>"
    msg["To"]      = to_email

    text_body = f"Clique sur ce lien pour réinitialiser ton mot de passe (valable 1h) :\n{reset_link}"
    html_body = f"""
    <html><body>
      <p>Tu as demandé à réinitialiser ton mot de passe sur <strong>ProbHammer</strong>.</p>
      <p><a href="{reset_link}" style="background:#e63946;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;display:inline-block;">Réinitialiser mon mot de passe</a></p>
      <p style="color:#888;font-size:12px;">Ce lien expire dans 1h. Si tu n'as pas fait cette demande, ignore cet email.</p>
    </body></html>
    """

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())
