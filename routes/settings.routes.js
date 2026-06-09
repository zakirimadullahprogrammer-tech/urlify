const express = require("express");
const requireAuth = require("../middleware/requireAuth");

const {
  getSettings,
  updateAccount,
  updatePassword,
  updatePreferences,
  deleteAccount,
  exportLinks,
  exportAnalytics
} = require("../controllers/settings.controller");

const router = express.Router();

router.get("/", requireAuth, getSettings);
router.patch("/account", requireAuth, updateAccount);
router.patch("/password", requireAuth, updatePassword);
router.patch("/preferences", requireAuth, updatePreferences);
router.delete("/account", requireAuth, deleteAccount);
router.get("/export/links", requireAuth, exportLinks);
router.get("/export/analytics", requireAuth, exportAnalytics);

module.exports = router;