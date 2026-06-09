const express = require("express");
const requireAuth = require("../middleware/requireAuth");

const {
  getLinks,
  createLink,
  updateLink,
  deleteLink
} = require("../controllers/links.controller");

const router = express.Router();

router.get("/", requireAuth, getLinks);
router.post("/", requireAuth, createLink);
router.patch("/:id", requireAuth, updateLink);
router.delete("/:id", requireAuth, deleteLink);

module.exports = router;