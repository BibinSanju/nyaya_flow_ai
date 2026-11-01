const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { getSupabaseStatus, isSupabaseConfigured } = require("./config/supabase");
const { ensureStorageBucket } = require("./services/storageService");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const courtRoutes = require("./routes/courtRoutes");
const chatRoutes = require("./routes/chatRoutes");
const sttRoutes = require("./routes/sttRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");
const { rateLimit } = require("./middleware/rateLimit");
const { getJwtSecret } = require("./middleware/authMiddleware");
const EmailService = require("./services/emailService");

const isProduction = process.env.NODE_ENV === "production";

// Fail fast on missing production configuration
getJwtSecret();
if (isProduction && !isSupabaseConfigured()) {
  console.error("[Config] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Render (and most hosts) sit behind one proxy; needed for correct client IPs in rate limiting
app.set("trust proxy", 1);
app.disable("x-powered-by");

// CORS: only the configured frontend origins (plus localhost during development)
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);
if (isProduction && allowedOrigins.length === 0) {
  console.warn("[Config] CORS_ORIGIN is not set; allowing *.vercel.app origins. Set it to your exact frontend URL.");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server, curl
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      if (allowedOrigins.length === 0 && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked request from ${origin}`);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/health", (req, res) => {
  const supaStatus = getSupabaseStatus();
  const providers = EmailService.providerNames();
  res.json({
    status: "healthy",
    service: "NyayaFlow API",
    database: supaStatus.configured ? "Supabase connected" : "Not configured (in-memory)",
    supabaseConfigured: supaStatus.configured,
    groqAi: process.env.GROQ_API_KEY ? "Groq connected" : "Offline answers only",
    emailService:
      (process.env.OTP_DELIVERY || "").trim().toLowerCase() === "email"
        ? providers.length ? `Email via ${providers.join(", ")}` : "Email selected but no provider configured"
        : "Demo mode (codes shown on screen)",
    ocr: "Tesseract.js and pdf-parse",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", rateLimit({ max: 20, windowMs: 60 * 1000 }), authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", rateLimit({ max: 20, windowMs: 60 * 1000, message: "You're sending messages too quickly. Please wait a moment." }), chatRoutes);
app.use("/api/stt", rateLimit({ max: 15, windowMs: 60 * 1000 }), sttRoutes);
app.use("/api", courtRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`[NyayaFlow] API listening on port ${PORT}`);
  console.log(`[NyayaFlow] Database: ${isSupabaseConfigured() ? "Supabase" : "in-memory (local dev)"}`);
  console.log(`[NyayaFlow] Sign-in codes: ${(process.env.OTP_DELIVERY || "").trim().toLowerCase() === "email" ? `email (${EmailService.providerNames().join(", ") || "no provider!"})` : "shown on screen (demo mode)"}`);
  await ensureStorageBucket();
});

module.exports = app;
