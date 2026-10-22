const express = require("express");
const router = express.Router();
const ChatService = require("../services/chatService");

router.post("/", async (req, res) => {
  try {
    const { messages = [], role = "citizen", userName = "", userEmail = "" } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required.",
      });
    }

    const result = await ChatService.generateChatResponse({ messages, role, userName, userEmail });
    return res.status(200).json({
      success: true,
      reply: result.reply,
      model: result.model,
      role: result.role,
    });
  } catch (err) {
    console.error("[ChatRoutes] Error generating response:", err.message);
    return res.status(200).json({
      success: true,
      reply:
        "NyayaFlow Legal Advisory: System is operating under human authority. Please review your dashboard workspace for case filings, document scrutiny checklists, and cause lists.",
      model: "NyayaFlow Offline Copilot",
      role: req.body?.role || "citizen",
    });
  }
});

module.exports = router;
