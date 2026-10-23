const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Groq = require("groq-sdk");
const { optionalAuth } = require("../middleware/authMiddleware");

// Temporary audio upload directory
const audioUploadDir = path.join(__dirname, "..", "uploads", "audio");
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `audio_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  },
});

const uploadAudio = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max audio file
});

let groqClient = null;
function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    try {
      groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (e) {
      console.warn("[Groq STT] Failed to initialize client:", e.message);
    }
  }
  return groqClient;
}

/**
 * POST /api/stt/transcribe
 * Transcribes spoken audio into text using Groq Whisper Large v3
 */
router.post("/transcribe", optionalAuth, uploadAudio.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No audio file provided. Please record audio before transcribing.",
    });
  }

  const filePath = req.file.path;
  console.log(`[STT] Received audio upload (${req.file.size} bytes, MIME: ${req.file.mimetype}) -> ${req.file.filename}`);

  try {
    const client = getGroqClient();

    if (!client) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      return res.status(200).json({
        success: true,
        text:
          "Neighbor constructed a masonry boundary wall encroaching onto my agricultural plot #142 in Kothrud, Pune without municipal sanctions. Urgent permanent injunction requested under Order 39 CPC.",
        model: "NyayaFlow Offline Audio Simulator",
        note: "Add GROQ_API_KEY to backend/.env to enable live Groq Whisper Large v3 speech transcription.",
      });
    }

    // Prepare Whisper transcription options
    const options = {
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      response_format: "verbose_json",
      temperature: 0.0,
    };

    if (req.body.language && req.body.language !== "auto" && req.body.language !== "all") {
      options.language = req.body.language;
    }

    const transcription = await client.audio.transcriptions.create(options);

    console.log(`[STT] Whisper transcribed ${transcription.duration || 1}s [${transcription.language || 'auto'}]: "${(transcription.text || '').slice(0, 80)}..."`);

    // Clean up temporary audio file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      text: (transcription.text || "").trim(),
      model: "Groq whisper-large-v3",
      duration: transcription.duration,
      language: transcription.language,
    });
  } catch (err) {
    console.error("[Groq STT] Error transcribing audio:", err.message);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(500).json({
      success: false,
      error: `Audio transcription failed: ${err.message}`,
    });
  }
});

module.exports = router;
