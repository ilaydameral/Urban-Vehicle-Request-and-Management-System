const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getOverview, getResources } = require("../controllers/coordinatorController");

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

module.exports = router;
