const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  devResetPassword,
  updateProfile,
} = require("../controllers/authController");

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// GET /api/auth/me
router.get("/me", authMiddleware, getMe);

// PATCH /api/auth/profile
router.patch("/profile", authMiddleware, updateProfile);

// POST /api/auth/dev/reset-password (DEV ONLY)
router.post("/dev/reset-password", devResetPassword);

module.exports = router;
