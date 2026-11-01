const crypto = require("crypto");
const OTPModel = require("../models/OTP");
const EmailService = require("./emailService");
const { getJwtSecret } = require("../middleware/authMiddleware");

// Per-email throttle: 60s between codes, at most 5 codes per 10 minutes
const rateLimitMap = new Map();
const COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const isProduction = () => process.env.NODE_ENV === "production";

function hashOtp(otp) {
  return crypto.createHmac("sha256", getJwtSecret()).update(String(otp).trim()).digest("hex");
}

function maskEmail(email) {
  const [user, domain] = email.split("@");
  const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : user;
  return `${maskedUser}@${domain}`;
}

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

class OTPService {
  /**
   * Creates a single-use 6-digit code for `email` and emails it.
   * The code is only returned in the response during local development
   * when no email provider is configured.
   */
  static async generateAndSendOTP(email, role) {
    const now = Date.now();
    const tracker = rateLimitMap.get(email) || { lastSent: 0, count: 0, windowStart: now };

    if (now - tracker.windowStart > WINDOW_MS) {
      tracker.count = 0;
      tracker.windowStart = now;
    }
    if (now - tracker.lastSent < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - tracker.lastSent)) / 1000);
      throw httpError(`Please wait ${waitSec} seconds before requesting another code.`, 429);
    }
    if (tracker.count >= MAX_PER_WINDOW) {
      throw httpError("Too many codes requested. Please wait 10 minutes and try again.", 429);
    }

    const emailConfigured = EmailService.isConfigured();
    if (!emailConfigured && isProduction()) {
      console.error("[OTP] No email provider configured (set BREVO_API_KEY or RESEND_API_KEY).");
      throw httpError("Sign-in codes can't be sent right now. Please contact the administrator.", 503);
    }

    // Invalidate earlier unused codes for this email
    await OTPModel.updateMany({ contact: email, used: false }, { used: true });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);

    const record = await OTPModel.create({
      contact: email,
      hashedOtp: hashOtp(otp),
      role,
      attempts: 0,
      used: false,
      expiresAt: new Date(now + expiryMinutes * 60 * 1000),
    });

    let devOtp;
    if (emailConfigured) {
      try {
        await EmailService.sendOtpEmail({ to: email, otp, role, expiryMinutes });
      } catch (err) {
        console.error(`[OTP] Email delivery failed for ${maskEmail(email)}: ${err.message}`);
        await OTPModel.findByIdAndUpdate(record._id || record.id, { used: true });
        throw httpError("We couldn't send the sign-in email right now. Please try again in a few minutes.", 502);
      }
    } else {
      // Local development only
      console.log(`\n[OTP] Email not configured. Code for ${email} (${role}): ${otp}\n`);
      devOtp = otp;
    }

    tracker.lastSent = now;
    tracker.count += 1;
    rateLimitMap.set(email, tracker);

    return {
      success: true,
      message: `We sent a 6-digit code to ${maskEmail(email)}.`,
      contactMasked: maskEmail(email),
      expiresInSeconds: expiryMinutes * 60,
      cooldownSeconds: COOLDOWN_MS / 1000,
      ...(devOtp ? { devOtp } : {}),
    };
  }

  /**
   * Checks `candidateOtp` against the latest code issued to `email` for `role`.
   */
  static async verifyOTP(email, candidateOtp, role) {
    const cleanOtp = String(candidateOtp || "").trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw httpError("Enter the 6-digit code.", 400);
    }

    const record = await OTPModel.findLatest(email);
    if (!record || record.used) {
      throw httpError("This code is no longer valid. Request a new one.", 400);
    }
    if (new Date() > new Date(record.expiresAt)) {
      throw httpError("This code has expired. Request a new one.", 400);
    }
    if (record.role && role && record.role !== role) {
      throw httpError("This code was issued for a different account type. Request a new one.", 400);
    }

    const maxAttempts = record.maxAttempts || 3;
    if (record.attempts >= maxAttempts) {
      throw httpError("Too many wrong attempts. Request a new code.", 400);
    }

    const candidate = Buffer.from(hashOtp(cleanOtp));
    const stored = Buffer.from(String(record.hashedOtp || ""));
    const matches = candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);

    if (!matches) {
      const attempts = (record.attempts || 0) + 1;
      const remaining = maxAttempts - attempts;
      await OTPModel.findByIdAndUpdate(record._id || record.id, {
        attempts,
        ...(remaining <= 0 ? { used: true } : {}),
      });
      throw httpError(
        remaining <= 0
          ? "Too many wrong attempts. Request a new code."
          : `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
        400
      );
    }

    await OTPModel.findByIdAndUpdate(record._id || record.id, { used: true });
    return { success: true };
  }
}

module.exports = OTPService;
