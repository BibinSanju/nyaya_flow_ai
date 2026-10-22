require("dotenv").config();
const jwt = require("jsonwebtoken");

const getJwtSecret = () => process.env.JWT_SECRET || "nyayaflow_judicial_secret_key_2026";

const STAKEHOLDER_ROLES = ["citizen", "advocate", "police", "registrar", "judge", "admin"];

/**
 * Validates JWT token from Bearer header or query string (for downloads)
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session token. Please sign in again.",
      });
    }
  }

  // Fallback for non-strict development testing if headers supplied
  const fallbackUserId = req.headers["x-user-id"] || req.body?.userId || req.query?.userId;
  const fallbackRole = req.headers["x-user-role"] || req.body?.role || req.query?.role;

  if (fallbackUserId && fallbackRole && STAKEHOLDER_ROLES.includes(fallbackRole)) {
    req.user = {
      id: fallbackUserId,
      role: fallbackRole,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: "Authentication token required. Please sign in to continue.",
  });
};

/**
 * Optional authentication: attaches user if token is present, does not reject if absent
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
    } catch {
      // Ignore invalid token on optional routes
    }
  }

  if (!req.user) {
    const fallbackUserId = req.headers["x-user-id"] || req.body?.userId || "user_anonymous";
    const fallbackRole = req.headers["x-user-role"] || req.body?.role || "citizen";
    req.user = { id: fallbackUserId, role: fallbackRole };
  }

  next();
};

/**
 * Role-Based Authorization Guard
 * Admin role automatically passes all role checks.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required to access this resource.",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();

    // Admins bypass role restrictions
    if (userRole === "admin") {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Your role (${userRole}) is not authorized for this action. Required: [${allowedRoles.join(", ")}].`,
      });
    }

    next();
  };
};

const generateToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

module.exports = {
  authMiddleware,
  requireAuth: authMiddleware,
  optionalAuth,
  requireRole,
  generateToken,
  STAKEHOLDER_ROLES,
  getJwtSecret,
  get JWT_SECRET() {
    return getJwtSecret();
  },
};
