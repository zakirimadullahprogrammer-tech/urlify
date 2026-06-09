const express = require("express");

const {
  redirectIfAuthenticated
} = require(
  "../middleware/verifyToken"
);

const {
  loginPage,
  signupPage,
  dashboardPage
} = require(
  "../controllers/page.controller"
);

const router = express.Router();

router.get(
  "/login",
  redirectIfAuthenticated,
  loginPage
);

router.get(
  "/signup",
  redirectIfAuthenticated,
  signupPage
);

router.get(
  "/dashboard",
  dashboardPage
);

module.exports = router;