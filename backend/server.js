const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { connectDB, getMongoStatus } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const courtRoutes = require("./routes/courtRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");
const EmailService = require("./services/emailService");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database (MongoDB or local persistent storage)
connectDB();

// CORS setup supporting local development, configured origins, and production domains
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server, mobile)
      if (!origin) return callback(null, true);

      // Check allowed list or wildcard
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost & 127.0.0.1 on any port in development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview/production deployments
      if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user-role"],
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lightweight IP-based rate limiter for authentication endpoints
const ipRateLimitMap = new Map();
const authRateLimiter = (maxRequests = 10, windowMs = 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();
    const clientData = ipRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count += 1;
    }

    ipRateLimitMap.set(ip, clientData);

    if (clientData.count > maxRequests) {
      const waitSeconds = Math.ceil((clientData.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        error: `Too many authentication requests from this IP. Please wait ${waitSeconds} seconds before trying again.`,
      });
    }

    next();
  };
};

// System Health Probe
app.get("/health", (req, res) => {
  const dbStatus = getMongoStatus();
  res.json({
    status: "healthy",
    service: "NyayaFlow Node.js Judicial Workflow Engine",
    version: "2.1.0",
    database: dbStatus.mode,
    mongoConnected: dbStatus.connected,
    emailService: EmailService.isSmtpConfigured() ? "SMTP (Active & Configured)" : "SMTP Not Configured (Pending Credentials)",
    ocr: "Tesseract.js & PDF-Parse active",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes with IP rate limiting on auth
app.use("/api/auth", authRateLimiter(20, 60 * 1000), authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", courtRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`[NyayaFlow Backend] Server running on http://127.0.0.1:${PORT}`);
  console.log(`[Auth Endpoints]     http://127.0.0.1:${PORT}/api/auth/send-otp`);
  console.log(`[Document Endpoints] http://127.0.0.1:${PORT}/api/documents/upload`);
  console.log(`[Health Probe]       http://127.0.0.1:${PORT}/health`);
  console.log(`======================================================\n`);
});

module.exports = app;
