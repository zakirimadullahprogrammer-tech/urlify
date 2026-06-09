const express = require("express");
const requireAuth = require("../middleware/requireAuth");

const {
  getAnalytics,
  getLinkAnalytics
} = require("../controllers/analytics.controller");

const router = express.Router();

router.get("/", requireAuth, getAnalytics);
router.get("/link/:linkId", requireAuth, getLinkAnalytics);

module.exports = router;