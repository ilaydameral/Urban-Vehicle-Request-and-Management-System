// src/routes/vehicleRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createVehicle,
  getMyVehicles,
  listVehicles,
  getPendingVehicles,
  verifyVehicle,
  updateVehicleStatus,
} = require("../controllers/vehicleController");

router.post("/", authMiddleware, requireRole("DRIVER"), createVehicle);

router.get("/my", authMiddleware, requireRole("DRIVER"), getMyVehicles);

router.get(
  "/",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  listVehicles
);

router.get(
  "/pending",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  getPendingVehicles
);

router.patch(
  "/:id/verify",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  verifyVehicle
);

router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("COORDINATOR", "ADMIN"),
  updateVehicleStatus
);

module.exports = router;
