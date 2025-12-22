// src/routes/adminRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  listUsers,
  updateUserRole,
  updateUserStatus,
  getStats,
  checkConsistency,
  overrideRequestStatus,
  overrideTripStatus,
  getDriverPerformanceReport,
  getDashboardAnalytics,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/users", authMiddleware, requireRole("ADMIN"), listUsers);

router.get(
  "/reports/drivers",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR"),
  getDriverPerformanceReport
);

router.get(
  "/analytics/dashboard",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR"),
  getDashboardAnalytics
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  requireRole("ADMIN"),
  updateUserRole
);

router.patch(
  "/users/:id/status",
  authMiddleware,
  requireRole("ADMIN"),
  updateUserStatus
);

router.get(
  "/stats",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR"),
  getStats
);

router.get(
  "/consistency",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR"),
  checkConsistency
);

router.patch(
  "/requests/:id/status",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR"),
  overrideRequestStatus
);

router.patch(
  "/trips/:id/status",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR"),
  overrideTripStatus
);

module.exports = router;
