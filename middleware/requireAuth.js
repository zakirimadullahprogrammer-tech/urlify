const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHENTICATED",
      message: "Please login to continue."
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;
    return next();

  } catch (error) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });

    return res.status(401).json({
      success: false,
      code: "TOKEN_EXPIRED",
      message: "Session expired. Please login again."
    });
  }
}

module.exports = requireAuth;