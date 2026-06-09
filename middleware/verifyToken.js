const jwt = require("jsonwebtoken");

function redirectIfAuthenticated(
    req,
    res,
    next
) {

    const token =
        req.cookies.token;


    // No token → continue
    if (!token) {
        return next();
    }

    try {
        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = decoded;
        console.log("User logged in")
        // Already logged in
        return res.redirect(
            "/pages/dashboard"
        );

    } catch (err) {

        // Invalid/expired token
        return next();

    }
}

module.exports = {
    redirectIfAuthenticated
};