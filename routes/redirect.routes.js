const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  redirectToOriginalUrl
} = require("../controllers/redirect.controller");

const router = express.Router();

const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Try again later."
  }
});

router.get("/:shortCode", redirectLimiter, redirectToOriginalUrl);

module.exports = router;