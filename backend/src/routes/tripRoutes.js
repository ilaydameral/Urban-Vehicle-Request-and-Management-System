// src/routes/tripRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  listTrips,
  listMyTrips,
  getTripDetail,
  rateTrip,
} = require("../controllers/tripController");

const router = express.Router();

router.post("/", authMiddleware, requireRole("DRIVER"), createTrip);
router.patch("/:id/start", authMiddleware, requireRole("DRIVER"), startTrip);
router.patch("/:id/complete", authMiddleware, requireRole("DRIVER"), completeTrip);
router.patch("/:id/cancel", authMiddleware, requireRole("DRIVER"), cancelTrip);
router.get("/", authMiddleware, requireRole("ADMIN", "COORDINATOR"), listTrips);
router.get("/my", authMiddleware, requireRole("DRIVER"), listMyTrips);
router.get(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "COORDINATOR", "DRIVER", "PASSENGER"),
  getTripDetail
);
router.post("/:id/rate", authMiddleware, requireRole("PASSENGER"), rateTrip);

module.exports = router;
