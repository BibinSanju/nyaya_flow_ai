const OTPService = require("../services/otpService");
const UserModel = require("../models/User");
const { generateToken } = require("../middleware/authMiddleware");

class AuthController {
  /**
   * POST /api/auth/send-otp
   */
  static async sendOTP(req, res, next) {
    try {
      const { contact, type = "email", role = "citizen" } = req.body;

      if (!contact || typeof contact !== "string" || contact.trim().length < 4) {
        return res.status(400).json({
          success: false,
          error: "Please provide a valid contact (Email address, Phone number, or Aadhaar).",
        });
      }

      const result = await OTPService.generateAndSendOTP(contact, type, role);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  static async verifyOTP(req, res, next) {
    try {
      const { contact, otp, role = "citizen", fullName } = req.body;

      if (!contact || !otp) {
        return res.status(400).json({
          success: false,
          error: "Contact and 6-digit OTP are required.",
        });
      }

      if (String(otp).trim().length !== 6) {
        return res.status(400).json({
          success: false,
          error: "OTP must be exactly 6 digits.",
        });
      }

      const verification = await OTPService.verifyOTP(contact, otp);

      // Find or create user
      let user = await UserModel.findOne({
        $or: [{ email: contact.toLowerCase() }, { phone: contact }, { identifier: contact }],
      });

      if (!user) {
        user = await UserModel.create({
          email: contact.includes("@") ? contact.toLowerCase() : undefined,
          phone: !contact.includes("@") ? contact : undefined,
          fullName: fullName && fullName.trim() ? fullName.trim() : (role === "citizen" ? "Citizen Litigant" : `Verified ${role.toUpperCase()}`),
          role: role || verification.role || "citizen",
          identifier: contact,
          verifiedContact: true,
        });
      } else {
        const targetRole = role || verification.role || user.role;
        const updates = {
          verifiedContact: true,
          role: targetRole,
          lastLogin: new Date(),
        };
        if (fullName && fullName.trim()) {
          updates.fullName = fullName.trim();
          user.fullName = fullName.trim();
        }
        await UserModel.findByIdAndUpdate(user._id || user.id, updates);
        user.role = targetRole;
      }

      const userId = user._id || user.id;
      const token = generateToken({
        id: userId,
        role: user.role,
        email: user.email,
        phone: user.phone,
      });

      return res.status(200).json({
        success: true,
        message: "OTP verification successful.",
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
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { email, phone, fullName, role = "citizen", identifier } = req.body;

      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: "Full name is required.",
        });
      }

      const user = await UserModel.create({
        email: email ? email.toLowerCase().trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        fullName: fullName.trim(),
        role,
        identifier: identifier?.trim(),
      });

      const userId = user._id || user.id;
      const token = generateToken({ id: userId, role: user.role });

      return res.status(201).json({
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
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, full_name, role = "citizen", phone } = req.body;
      const lookup = email || phone || "guest@nyayaflow.gov.in";

      let user = await UserModel.findOne({
        $or: [{ email: lookup.toLowerCase() }, { phone: lookup }],
      });

      if (!user) {
        user = await UserModel.create({
          email: lookup.includes("@") ? lookup.toLowerCase() : `${lookup}@nyayaflow.local`,
          phone: !lookup.includes("@") ? lookup : undefined,
          fullName: full_name || "Authorized User",
          role,
        });
      }

      const userId = user._id || user.id;
      const token = generateToken({ id: userId, role: user.role });

      return res.status(200).json({
        success: true,
        id: userId,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        phone: user.phone,
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: "Successfully signed out.",
    });
  }
}

module.exports = AuthController;
