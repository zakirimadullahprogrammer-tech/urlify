const path = require("path");

function loginPage(req, res) {
  return res.status(200).sendFile(
    path.join(
      __dirname,
      "..",
      "public",
      "pages",
      "login.html"
    )
  );
}

function signupPage(req, res) {
  return res.status(200).sendFile(
    path.join(
      __dirname,
      "..",
      "public",
      "pages",
      "signup.html"
    )
  );
}

function dashboardPage(req, res) {
  return res.status(200).sendFile(
    path.join(
      __dirname,
      "..",
      "public",
      "pages",
      "dashboard.html"
    )
  );
}

module.exports = {
  loginPage,
  signupPage,
  dashboardPage
};