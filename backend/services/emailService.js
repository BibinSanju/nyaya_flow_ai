const nodemailer = require("nodemailer");

let cachedTransporter = null;

class EmailService {
  /**
   * Determine if production/real SMTP settings are configured in environment
   */
  static isSmtpConfigured() {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_HOST.trim() &&
      process.env.SMTP_USER &&
      process.env.SMTP_USER.trim() &&
      process.env.SMTP_PASS &&
      process.env.SMTP_PASS.trim()
    );
  }

  /**
   * Get or initialize Nodemailer transporter.
   * Strictly enforces that unconfigured SMTP fails instead of silently simulating success.
   */
  static async getTransporter() {
    if (this.isSmtpConfigured()) {
      if (cachedTransporter) return cachedTransporter;

      const host = process.env.SMTP_HOST.trim();
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const secure = process.env.SMTP_SECURE === "true" || port === 465;

      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: process.env.SMTP_PASS.trim(),
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === "production",
        },
      });

      return cachedTransporter;
    }

    // Explicit test mailer allowed ONLY if ALLOW_DEV_TEST_MAILER=true is set in testing scripts
    if (process.env.ALLOW_DEV_TEST_MAILER === "true") {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    throw new Error(
      "Real email delivery to Gmail requires SMTP_USER and a 16-character Google App Password (SMTP_PASS) configured in backend/.env. No SMTP credentials are configured. OTP could not be delivered to the recipient's Gmail inbox."
    );
  }

  /**
   * Send real OTP email to recipient.
   * Strictly reports success ONLY when the provider accepts the email.
   *
   * @param {string} to - Recipient email address
   * @param {string} otp - 6-digit OTP code
   * @param {string} role - Stakeholder role
   * @param {number} expiryMinutes - OTP validity in minutes
   */
  static async sendOtpEmail({ to, otp, role = "citizen", expiryMinutes = 10 }) {
    const cleanTo = String(to || "").trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanTo || !emailRegex.test(cleanTo)) {
      throw new Error(`Invalid recipient email address format: "${to}". Please enter a valid email.`);
    }

    const transporter = await this.getTransporter();

    // For Gmail SMTP, sender address MUST match the authenticated SMTP_USER to avoid SPF/DKIM rejections
    const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : "";
    const fromAddress = smtpUser
      ? `"NyayaFlow Judicial Portal" <${smtpUser}>`
      : (process.env.EMAIL_FROM || '"NyayaFlow Judicial Portal" <no-reply@nyayaflow.gov.in>');

    const roleNameMap = {
      citizen: "Citizen Litigant",
      advocate: "Advocate Counsel",
      police: "Police Officer",
      registrar: "Court Registrar",
      judge: "Presiding Judge",
      admin: "System Administrator",
    };
    const roleDisplayName = roleNameMap[role] || role.toUpperCase();

    const subject = `Your NyayaFlow One-Time Password (OTP) - ${roleDisplayName}`;

    const textContent = [
      `NyayaFlow Judicial Workflow Platform`,
      `Official One-Time Password (OTP)`,
      ``,
      `Stakeholder Portal: ${roleDisplayName}`,
      `Your 6-digit verification code: ${otp}`,
      ``,
      `This security token is valid for ${expiryMinutes} minutes and can only be used once.`,
      `Never share this code with anyone. Court officials and registry clerks will never ask for your OTP.`,
      ``,
      `If you did not request this login code, please ignore this email.`,
    ].join("\n");

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NyayaFlow Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 32px; border-bottom: 2px solid #000000; background-color: #ffffff;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <span style="font-size: 18px; font-weight: 700; color: #000000; letter-spacing: -0.5px;">NyayaFlow ⚖️</span>
              <span style="display: block; font-size: 11px; color: #666666; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                Digital Court Case Management Platform
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <h1 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #000000;">
          One-Time Security Verification
        </h1>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #333333;">
          Use the 6-digit code below to authenticate your session for the 
          <strong>${roleDisplayName}</strong> workspace.
        </p>

        <!-- OTP Display Box -->
        <div style="margin: 24px 0; padding: 18px 24px; background-color: #000000; border-radius: 6px; text-align: center;">
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 8px;">
            ${otp}
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #cccccc; letter-spacing: 0.5px;">
            VALID FOR ${expiryMinutes} MINUTES • SINGLE-USE TOKEN
          </div>
        </div>

        <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #555555;">
          This code will expire automatically in <strong>${expiryMinutes} minutes</strong> and can only be used once. If you did not initiate this request, someone may have mistyped their identifier. No changes have been made to your account.
        </p>

        <div style="margin-top: 24px; padding: 12px 16px; background-color: #f9f9f9; border-left: 3px solid #000000; font-size: 12px; color: #444444; line-height: 1.4;">
          <strong>Security Notice:</strong> Judicial registry officers, police personnel, and system administrators will never ask for your verification code. Never share your OTP with anyone.
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888; text-align: center;">
        NyayaFlow Platform • Electronic Case Management & Judicial Scrutiny Engine<br>
        Confidential Communication • Automated Notification
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const mailOptions = {
      from: fromAddress,
      to: cleanTo,
      subject,
      text: textContent,
      html: htmlContent,
    };

    let info;
    try {
      info = await transporter.sendMail(mailOptions);
    } catch (sendErr) {
      // Sanitize error messages to eliminate secrets and provide actionable troubleshooting guidance
      const rawMsg = sendErr.message || "";
      if (rawMsg.includes("535") || rawMsg.includes("Username and Password not accepted") || rawMsg.includes("BadCredentials")) {
        throw new Error(
          "Gmail SMTP Authentication Failed: Invalid credentials. For Gmail, you must use your full Gmail address in SMTP_USER and a 16-character Google App Password (not your standard Google account password) in SMTP_PASS. Generate one at Google Account > Security > 2-Step Verification > App Passwords."
        );
      }
      if (rawMsg.includes("ECONNREFUSED") || rawMsg.includes("ETIMEDOUT") || rawMsg.includes("ENOTFOUND")) {
        throw new Error(
          `Could not connect to SMTP server ${process.env.SMTP_HOST || "smtp.gmail.com"} on port ${process.env.SMTP_PORT || "587"}. Please verify network connectivity and SMTP host/port configuration.`
        );
      }
      if (rawMsg.includes("550") || rawMsg.includes("5.7.1")) {
        throw new Error(
          "Gmail SMTP Sender Rejection: The authenticated Google account does not have permission to send from this address. Ensure the sender address matches your authenticated Gmail."
        );
      }
      throw new Error(`SMTP Mail delivery failed: ${rawMsg}`);
    }

    // Verify provider acceptance
    const acceptedList = Array.isArray(info.accepted) ? info.accepted.map((e) => String(e).toLowerCase()) : [];
    const isAccepted = acceptedList.includes(cleanTo);

    if (!isAccepted) {
      const rejectedList = Array.isArray(info.rejected) ? info.rejected.join(", ") : "none";
      throw new Error(
        `Email rejected by mail provider. Recipient ${cleanTo} was not accepted by the SMTP server (Rejected: ${rejectedList}, Response: ${info.response || "No response"}).`
      );
    }

    console.log(`\n======================================================`);
    console.log(`[EmailService] OTP Email accepted by mail provider!`);
    console.log(`[Recipient]   ${cleanTo}`);
    console.log(`[Role]        ${roleDisplayName}`);
    console.log(`[MessageId]   ${info.messageId}`);
    console.log(`[Provider Response] ${info.response || "Accepted"}`);
    console.log(`======================================================\n`);

    return {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
      isRealSmtp: this.isSmtpConfigured(),
    };
  }
}

module.exports = EmailService;
