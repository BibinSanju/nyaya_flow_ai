const OTPService = require("../services/otpService");
const UserModel = require("../models/User");
const { generateToken, STAKEHOLDER_ROLES } = require("../middleware/authMiddleware");

// Anyone may register for these roles. Official roles need an account created
// by an administrator (a row in the users table with that role).
const PUBLIC_ROLES = ["citizen", "advocate"];

const GENERIC_NAMES = ["Citizen", "Citizen Litigant", "Advocate", "Advocate Counsel", "Authorized User"];

const ROLE_LABELS = {
  citizen: "citizen",
  advocate: "advocate",
  police: "police officer",
  registrar: "registry officer",
  judge: "judge",
  admin: "administrator",
};

const csvEnv = (name) =>
  (process.env[name] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

// Police/registry/judge self sign-up: on by default in demo mode (codes shown on
// screen), off once real email delivery is enabled. ALLOW_OFFICIAL_SIGNUP overrides.
const officialSignupOpen = () => {
  const flag = (process.env.ALLOW_OFFICIAL_SIGNUP || "").trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return (process.env.OTP_DELIVERY || "").trim().toLowerCase() !== "email";
};

/**
 * Decides whether `email` may sign in as `requestedRole`.
 * Returns { ok, role, user } or { ok: false, status, error }.
 */
async function resolveLoginRole(email, requestedRole) {
  const role = String(requestedRole || "citizen").toLowerCase();
  if (!STAKEHOLDER_ROLES.includes(role)) {
    return { ok: false, status: 400, error: "Unknown account type." };
  }

  const user = await UserModel.findOne({ email });

  if (user) {
    if (user.role !== role) {
      return {
        ok: false,
        status: 403,
        error: `This email is registered as a ${ROLE_LABELS[user.role] || user.role}. Choose that account type to sign in.`,
      };
    }
    return { ok: true, role, user };
  }

  // New account
  if (PUBLIC_ROLES.includes(role)) return { ok: true, role, user: null };
  if (role === "admin") {
    if (csvEnv("ADMIN_EMAILS").includes(email)) return { ok: true, role, user: null };
  } else if (officialSignupOpen()) {
    return { ok: true, role, user: null };
  }

  return {
    ok: false,
    status: 403,
    error: `There is no ${ROLE_LABELS[role]} account for this email. Official accounts are created by the system administrator.`,
  };
}

class AuthController {
  /**
   * POST /api/auth/send-otp
   */
  static async sendOTP(req, res) {
    try {
      const email = normalizeEmail(req.body.contact);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: "Enter a valid email address." });
      }

      const access = await resolveLoginRole(email, req.body.role);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, error: access.error });
      }

      const result = await OTPService.generateAndSendOTP(email, access.role);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  static async verifyOTP(req, res) {
    try {
      const email = normalizeEmail(req.body.contact);
      const { otp, fullName } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ success: false, error: "Email and 6-digit code are required." });
      }

      // Re-check permission at verification time so a code cannot be reused for another role
      const access = await resolveLoginRole(email, req.body.role);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, error: access.error });
      }

      await OTPService.verifyOTP(email, otp, access.role);

      const cleanName = typeof fullName === "string" ? fullName.trim().slice(0, 120) : "";
      let user = access.user;

      if (!user) {
        user = await UserModel.create({
          email,
          fullName: cleanName || email.split("@")[0],
          role: access.role,
          verifiedContact: true,
        });
      } else {
        const updates = { verifiedContact: true, lastLogin: new Date().toISOString() };
        const hasRealName = user.fullName && !GENERIC_NAMES.includes(user.fullName);
        if (cleanName && (!hasRealName || !GENERIC_NAMES.includes(cleanName))) {
          updates.fullName = cleanName;
          user.fullName = cleanName;
        }
        await UserModel.findByIdAndUpdate(user._id || user.id, updates);
      }

      const userId = user._id || user.id;
      const token = generateToken({
        id: userId,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: userId,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/auth/logout
   * Sessions are stateless tokens; the client discards its token.
   */
  static async logout(req, res) {
    return res.status(200).json({ success: true });
  }
}

module.exports = AuthController;
