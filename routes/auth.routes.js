const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  signup,
  login,
  logout
} = require("../controllers/auth.controller");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    message: "Too many attempts. Try again later."
  }
});

router.post("/api/auth/signup",authLimiter, async (req, res) => {
    try {
        const {
            username,
            password,
            fullname
        } = req.body;

        if (!username || !password || !fullname) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (!isValidUsername(username)) {
            return res.status(400).json({
                message: "Username must start with a lowercase letter and contain only lowercase letters, numbers or underscore (3-30 chars)"
            });
        }

        if (!isValidFullName(fullname)) {
            return res.status(400).json({
                message: "Please enter a valid full name"
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                message: "Password must contain uppercase, lowercase, number, special character and be 8+ characters long. Spaces are not allowed."
            });
        }

        const existingUser = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, password, fullname)
             VALUES ($1, $2, $3)
             RETURNING id, username, fullname`,
            [username, hashedPassword, fullname]
        );

        return res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (err) {
        console.error("Signup Error:", err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

router.post("/api/auth/login",authLimiter, async (req, res) => {
    try {
        const {
            username,
            password
        } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign({
                id: user.id,
                username: user.username
            },
            process.env.JWT_SECRET, {
                expiresIn: "1h"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                fullname: user.fullname
            }
        });

    } catch (err) {
        console.error("Login Error:", err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
});


router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);

module.exports = router;