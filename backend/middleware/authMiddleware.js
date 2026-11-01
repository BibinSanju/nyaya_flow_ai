const jwt = require("jsonwebtoken");

const STAKEHOLDER_ROLES = ["citizen", "advocate", "police", "registrar", "judge", "admin"];
const STAFF_ROLES = ["registrar", "judge", "admin"];

const DEV_FALLBACK_SECRET = "nyayaflow-local-dev-only-secret";

/**
 * The signing secret must be set in production. Locally we fall back to a fixed
 * development value so the app runs without configuration.
 */
const getJwtSecret = () => {
  const secret = (process.env.JWT_SECRET || "").trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not set. Refusing to sign or verify sessions in production.");
  }
  return DEV_FALLBACK_SECRET;
};

const readToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
};

/**
 * Requires a valid session token.
 */
const authMiddleware = (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: "Please sign in to continue." });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Your session has expired. Please sign in again." });
  }
};

/**
 * Attaches req.user when a valid token is present; otherwise leaves it unset.
 */
const optionalAuth = (req, res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, getJwtSecret());
    } catch {
      // Treat an invalid token on a public route as anonymous
    }
  }
  next();
};

/**
 * Role-based guard. Admins pass every role check.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Please sign in to continue." });
    }

    const userRole = (req.user.role || "").toLowerCase();
    if (userRole === "admin" || allowedRoles.includes(userRole)) return next();

    return res.status(403).json({
      success: false,
      error: "Your account does not have permission to do this.",
    });
  };
};

const generateToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

const isStaff = (user) => STAFF_ROLES.includes((user?.role || "").toLowerCase());

module.exports = {
  authMiddleware,
  requireAuth: authMiddleware,
  optionalAuth,
  requireRole,
  generateToken,
  getJwtSecret,
  isStaff,
  STAKEHOLDER_ROLES,
  STAFF_ROLES,
};
