// src/routes/requestRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createRequest,
  getMyRequests,
  getAvailableRequests,
  getRequestDetail,
  cancelRequest,
  rejectRequest,
  listRequests,
} = require("../controllers/requestController");

const router = express.Router();


router.post("/", authMiddleware, requireRole("PASSENGER"), createRequest);

router.get("/my", authMiddleware, requireRole("PASSENGER"), getMyRequests);


router.get(
  "/available",
  authMiddleware,
  requireRole("DRIVER"),
  getAvailableRequests
);

router.get("/", authMiddleware, requireRole("COORDINATOR", "ADMIN"), listRequests);

router.get(
  "/:id",
  authMiddleware,
  requireRole("PASSENGER", "DRIVER", "COORDINATOR", "ADMIN"),
  getRequestDetail
);


router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole("PASSENGER"),
  cancelRequest
);


router.patch(
  "/:id/reject",
  authMiddleware,
  requireRole("DRIVER"),
  rejectRequest
);

module.exports = router;
