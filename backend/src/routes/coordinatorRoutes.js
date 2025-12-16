const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getOverview, getResources, assignRequest, approveDriver } = require("../controllers/coordinatorController");

router.get(
  "/overview",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  getOverview
);

router.get(
  "/resources",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  getResources
);

router.post(
  "/assign",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  assignRequest
);
router.patch(
  "/drivers/:driverId/approve",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  approveDriver
);

module.exports = router;
