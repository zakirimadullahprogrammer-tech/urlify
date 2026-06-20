const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  generateQR
} = require("../controllers/qr.controller");

const router = express.Router();

const qrLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many QR requests. Please try again later."
  }
});

router.get("/", qrLimiter, generateQR);

module.exports = router;