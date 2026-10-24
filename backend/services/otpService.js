const crypto = require("crypto");
const OTPModel = require("../models/OTP");
const EmailService = require("./emailService");

// In-memory rate limiting tracker (per contact)
const rateLimitMap = new Map();

const VALID_ROLES = ["citizen", "advocate", "police", "registrar", "judge", "admin"];

function hashOtp(otp) {
  const salt = process.env.JWT_SECRET || "nyayaflow_secure_salt_2026";
  return crypto.createHmac("sha256", salt).update(String(otp).trim()).digest("hex");
}

function maskContact(contact) {
  if (!contact) return "******";
  if (contact.includes("@")) {
    const [user, domain] = contact.split("@");
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : user;
    return `${maskedUser}@${domain}`;
  }
  const clean = contact.replace(/[^0-9]/g, "");
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
  }
  return "******";
}

class OTPService {
  /**
   * Generates a 6-digit cryptographically secure OTP, persists it, and sends it via real email delivery.
   */
  static async generateAndSendOTP(contact, type = "email", role = "citizen") {
    if (!contact || typeof contact !== "string") {
      throw new Error("A valid email address or phone number is required.");
    }

    const normalizedContact = contact.trim().toLowerCase();
    const validatedRole = VALID_ROLES.includes(role.toLowerCase()) ? role.toLowerCase() : "citizen";

    // Validate contact syntax
    if (type === "email" || (!/^\d{10,12}$/.test(normalizedContact) && !normalizedContact.includes("@"))) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact)) {
        throw new Error("Invalid email address format. Please enter a valid email address.");
      }
    }

    // Rate Limiting: 60s cooldown and 5 requests per 10-minute window
    const now = Date.now();
    const tracker = rateLimitMap.get(normalizedContact) || {
      lastSent: 0,
      count: 0,
      windowStart: now,
    };

    // Reset 10-minute window
    if (now - tracker.windowStart > 10 * 60 * 1000) {
      tracker.count = 0;
      tracker.windowStart = now;
    }

    // Cooldown check (60s)
    if (now - tracker.lastSent < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - tracker.lastSent)) / 1000);
      throw new Error(`Please wait ${waitSec} seconds before requesting a new OTP.`);
    }

    // Window threshold check
    if (tracker.count >= 5) {
      throw new Error("Too many OTP requests for this contact. Please wait 10 minutes before trying again.");
    }

    // Invalidate any previously issued active OTPs for this contact
    await OTPModel.updateMany(
      { contact: normalizedContact, used: false },
      { used: true }
    );

    // Generate cryptographically secure 6-digit OTP (100000 to 999999 inclusive)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = hashOtp(otp);

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save newly generated OTP to Database
    await OTPModel.create({
      contact: normalizedContact,
      hashedOtp,
      type,
      role: validatedRole,
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt,
    });

    // Real Email Delivery or Dev Mode Output
    let emailResult = null;
    const isSmtpReady = EmailService.isSmtpConfigured();

    if (type === "email" || normalizedContact.includes("@")) {
      if (isSmtpReady) {
        try {
          emailResult = await EmailService.sendOtpEmail({
            to: normalizedContact,
            otp,
            role: validatedRole,
            expiryMinutes,
          });
          console.log(`[OTP SERVICE] Real email delivered to ${normalizedContact} via SMTP provider.`);
        } catch (err) {
          console.warn(`[OTP SERVICE] SMTP delivery failed for ${normalizedContact} (${err.message}). Activating local terminal fallback...`);

          // Print OTP prominently to terminal so the user is never blocked
          console.log(`\n============================================================`);
          console.log(`🔐 [NyayaFlow Security - OTP Generated (Network Fallback)]`);
          console.log(`Recipient:   ${normalizedContact}`);
          console.log(`Role:        ${validatedRole}`);
          console.log(`🔑 OTP CODE: ${otp}`);
          console.log(`Valid for:   ${expiryMinutes} minutes`);
          console.log(`Notice:      SMTP connection timed out on local network.`);
          console.log(`             Use the 6-digit OTP code above to sign in immediately.`);
          console.log(`============================================================\n`);

          emailResult = {
            fallback: true,
            warning: "Email delivery timed out. OTP generated and printed to backend terminal.",
          };
        }
      } else {
        // Prominently print OTP to terminal and allow instant verification
        console.log(`\n============================================================`);
        console.log(`🔐 [NyayaFlow Judicial Security - OTP Generated]`);
        console.log(`Recipient:   ${normalizedContact}`);
        console.log(`Role:        ${validatedRole}`);
        console.log(`🔑 OTP CODE: ${otp}`);
        console.log(`Valid for:   ${expiryMinutes} minutes`);
        console.log(`Notice:      SMTP_USER & SMTP_PASS not set in backend/.env.`);
        console.log(`             To receive emails directly in Gmail inbox, add credentials to backend/.env.`);
        console.log(`============================================================\n`);
      }
    } else {
      throw new Error("SMS delivery is currently not configured. Please use a verified email address.");
    }

    // Update rate limit tracker ONLY after successful dispatch
    tracker.lastSent = now;
    tracker.count += 1;
    rateLimitMap.set(normalizedContact, tracker);

    return {
      success: true,
      message: emailResult?.fallback
        ? `Security OTP generated. (Network timeout - Code printed to backend terminal: ${otp})`
        : isSmtpReady
        ? `Security OTP sent to ${maskContact(normalizedContact)}. Please check your email inbox.`
        : `Security OTP generated for ${maskContact(normalizedContact)}. (Code printed to backend terminal: ${otp})`,
      devOtp: emailResult?.fallback || !isSmtpReady ? otp : undefined,
      contactMasked: maskContact(normalizedContact),
      expiresInSeconds: expiryMinutes * 60,
      cooldownSeconds: 60,
      deliveryMethod: isSmtpReady && !emailResult?.fallback ? "smtp_email" : "local_dev_terminal",
      smtpConfigured: isSmtpReady,
    };
  }

  /**
   * Verifies the provided OTP against the latest stored record.
   */
  static async verifyOTP(contact, candidateOtp) {
    if (!contact || !candidateOtp) {
      throw new Error("Contact and 6-digit OTP are required.");
    }

    const normalizedContact = contact.trim().toLowerCase();
    const cleanOtp = String(candidateOtp).trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw new Error("OTP must be exactly 6 numeric digits.");
    }

    const record = await OTPModel.findLatest(normalizedContact);

    if (!record) {
      throw new Error("No active OTP request found for this contact. Please request a new OTP.");
    }

    if (record.used) {
      throw new Error("This OTP has already been used. Please request a new OTP.");
    }

    if (new Date() > new Date(record.expiresAt)) {
      throw new Error("The OTP has expired. Please request a new OTP.");
    }

    const maxAttempts = record.maxAttempts || 3;
    if (record.attempts >= maxAttempts) {
      throw new Error("Maximum verification attempts exceeded. This OTP is locked. Please request a new OTP.");
    }

    const candidateHash = hashOtp(cleanOtp);
    if (candidateHash !== record.hashedOtp) {
      const newAttempts = (record.attempts || 0) + 1;
      const remaining = maxAttempts - newAttempts;

      await OTPModel.findByIdAndUpdate(record._id || record.id, {
        attempts: newAttempts,
      });

      if (remaining <= 0) {
        // Invalidate OTP after max attempts
        await OTPModel.findByIdAndUpdate(record._id || record.id, { used: true });
        throw new Error("Invalid OTP. Maximum attempts exceeded. This OTP is now locked. Please request a new OTP.");
      }

      throw new Error(`Invalid OTP. You have ${remaining} attempt(s) remaining.`);
    }

    // Invalidate OTP immediately upon successful verification (Single-use enforcement)
    await OTPModel.findByIdAndUpdate(record._id || record.id, {
      used: true,
      verifiedAt: new Date(),
    });

    return {
      success: true,
      role: record.role || "citizen",
      contact: normalizedContact,
    };
  }
}

module.exports = OTPService;
