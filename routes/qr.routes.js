const express = require("express");

const {
  generateQR
} = require("../controllers/qr.controller");

const router = express.Router();

router.get("/", generateQR);

module.exports = router;