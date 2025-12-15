// src/routes/authRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { register, login, getMe, devResetPassword } = require("../controllers/authController");

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me
router.get("/me", authMiddleware, getMe);

// POST /api/auth/dev/reset-password (DEV ONLY)
router.post("/dev/reset-password", devResetPassword);

module.exports = router;
