const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

router.post("/send-otp", AuthController.sendOTP);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/logout", AuthController.logout);

module.exports = router;
