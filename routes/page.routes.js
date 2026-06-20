const express =
  require("express");

const requireAuth =
  require(
    "../middleware/requireAuth"
  );

const {
  redirectIfAuthenticated
} = require(
  "../middleware/verifyToken"
);

const {
  loginPage,
  signupPage,
  dashboardPage,
  termsPage
} = require(
  "../controllers/page.controller"
);

const router =
  express.Router();

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
  "/terms",
  redirectIfAuthenticated,
  termsPage
);
router.get(
  "/dashboard",
  requireAuth,
  dashboardPage
);

module.exports =
  router;