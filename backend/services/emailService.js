const nodemailer = require("nodemailer");

/*
 * Email delivery. Providers are tried in this order, using whichever are configured:
 *   1. Brevo   (BREVO_API_KEY)   – HTTPS API, works on Render free tier, no domain needed
 *   2. Resend  (RESEND_API_KEY)  – HTTPS API, needs a verified domain to email other people
 *   3. SMTP    (SMTP_HOST/USER/PASS) – local development or paid hosts; Render free blocks SMTP ports
 *
 * Sender: EMAIL_FROM_ADDRESS (must be a verified sender with the provider) and EMAIL_FROM_NAME.
 */

const env = (name) => (process.env[name] || "").trim();

const senderName = () => env("EMAIL_FROM_NAME") || "NyayaFlow";
const senderAddress = () => env("EMAIL_FROM_ADDRESS") || env("SMTP_USER");

const ROLE_LABELS = {
  citizen: "Citizen",
  advocate: "Advocate",
  police: "Police",
  registrar: "Court registry",
  judge: "Judge",
  admin: "Administrator",
};

async function sendViaBrevo({ to, subject, html, text }) {
  const from = senderAddress();
  if (!from) throw new Error("EMAIL_FROM_ADDRESS is not set (use the sender email you verified in Brevo).");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env("BREVO_API_KEY"), "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: senderName(), email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${data.message || JSON.stringify(data)}`);
  return { provider: "Brevo", messageId: data.messageId };
}

async function sendViaResend({ to, subject, html, text }) {
  const from = senderAddress() ? `${senderName()} <${senderAddress()}>` : `${senderName()} <onboarding@resend.dev>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend ${response.status}: ${data.message || JSON.stringify(data)}`);
  return { provider: "Resend", messageId: data.id };
}

async function sendViaSmtp({ to, subject, html, text }) {
  const port = parseInt(env("SMTP_PORT") || "465", 10);
  const transporter = nodemailer.createTransport({
    host: env("SMTP_HOST") || "smtp.gmail.com",
    port,
    secure: env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS").replace(/\s+/g, "") },
    family: 4,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  // Gmail rejects mail whose From differs from the authenticated account
  const info = await transporter.sendMail({
    from: `"${senderName()}" <${env("SMTP_USER")}>`,
    to,
    subject,
    text,
    html,
  });
  if (!(info.accepted || []).map(String).map((e) => e.toLowerCase()).includes(to)) {
    throw new Error(`SMTP server did not accept ${to}: ${info.response || "no response"}`);
  }
  return { provider: "SMTP", messageId: info.messageId };
}

function configuredProviders() {
  const list = [];
  if (env("BREVO_API_KEY")) list.push(["Brevo", sendViaBrevo]);
  if (env("RESEND_API_KEY")) list.push(["Resend", sendViaResend]);
  if (env("SMTP_USER") && env("SMTP_PASS")) list.push(["SMTP", sendViaSmtp]);
  return list;
}

function otpTemplate({ otp, role, expiryMinutes }) {
  const roleLabel = ROLE_LABELS[role] || role;
  const text = [
    `Your NyayaFlow sign-in code is ${otp}`,
    ``,
    `Account type: ${roleLabel}`,
    `The code expires in ${expiryMinutes} minutes and can be used once.`,
    ``,
    `If you didn't request this, you can ignore this email. Never share this code with anyone.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f5f6f8;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e5ea;border-radius:8px;">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e2e5ea;">
      <span style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#1d3a5f;">NyayaFlow</span>
    </td></tr>
    <tr><td style="padding:28px;">
      <p style="margin:0 0 16px;font-size:15px;">Your sign-in code for the <strong>${roleLabel}</strong> workspace:</p>
      <p style="margin:0 0 20px;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1d3a5f;">${otp}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;">It expires in ${expiryMinutes} minutes and can be used once.</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">If you didn't request this, ignore this email. Court and registry staff will never ask for your code.</p>
    </td></tr>
  </table>
</body>
</html>`;
  return { text, html };
}

class EmailService {
  static isConfigured() {
    return configuredProviders().length > 0;
  }

  static providerNames() {
    return configuredProviders().map(([name]) => name);
  }

  /**
   * Sends the sign-in code, falling through providers until one accepts it.
   */
  static async sendOtpEmail({ to, otp, role = "citizen", expiryMinutes = 10 }) {
    const recipient = String(to || "").trim().toLowerCase();
    const { text, html } = otpTemplate({ otp, role, expiryMinutes });
    const message = { to: recipient, subject: `${otp} is your NyayaFlow sign-in code`, text, html };

    const errors = [];
    for (const [name, send] of configuredProviders()) {
      try {
        const result = await send(message);
        console.log(`[Email] Code sent to ${recipient} via ${result.provider}`);
        return result;
      } catch (err) {
        console.warn(`[Email] ${name} failed: ${err.message}`);
        errors.push(`${name}: ${err.message}`);
      }
    }
    throw new Error(errors.length ? errors.join(" | ") : "No email provider configured.");
  }
}

module.exports = EmailService;
