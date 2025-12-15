// src/routes/driverRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  saveProfile,
  getMyProfile,
  listPending,
  approveDriver,
  updateStatus,
  getDashboard,
} = require("../controllers/driverController");

router.post("/profile", authMiddleware, requireRole("DRIVER"), saveProfile);
router.get("/me", authMiddleware, requireRole("DRIVER"), getMyProfile);
router.get(
  "/pending",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  listPending
);
router.patch(
  "/:id/approve",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  approveDriver
);
router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  updateStatus
);
router.get("/dashboard", authMiddleware, requireRole("DRIVER"), getDashboard);

module.exports = router;
