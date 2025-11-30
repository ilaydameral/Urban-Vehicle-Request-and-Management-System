// src/routes/requestRoutes.js
const express = require("express");
const Request = require("../models/Request");
const Trip = require("../models/Trip");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

// POST /api/requests
// Yolcu yeni talep oluşturur
router.post("/", authMiddleware, requireRole("PASSENGER"), async (req, res) => {
  try {
    const { pickupAddress, dropoffAddress } = req.body;

    if (!pickupAddress || !dropoffAddress) {
      return res
        .status(400)
        .json({ message: "pickupAddress and dropoffAddress are required" });
    }

    const request = await Request.create({
      passenger: req.user.userId,
      pickupAddress,
      dropoffAddress,
    });

    res.status(201).json({ request });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ message: "Server error while creating request" });
  }
});

// GET /api/requests/my
// Yolcu kendi taleplerini görür
router.get("/my", authMiddleware, requireRole("PASSENGER"), async (req, res) => {
  try {
    const requests = await Request.find({ passenger: req.user.userId }).sort({
      createdAt: -1,
    });
    res.json({ requests });
  } catch (err) {
    console.error("Get my requests error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching requests" });
  }
});

// GET /api/requests/available
// Şoförlerin göreceği, henüz alınmamış istekler
router.get(
  "/available",
  authMiddleware,
  requireRole("DRIVER"),
  async (req, res) => {
    try {
      const requests = await Request.find({ status: "PENDING" }).sort({
        createdAt: 1,
      });
      res.json({ requests });
    } catch (err) {
      console.error("Get available requests error:", err);
      res
        .status(500)
        .json({ message: "Server error while fetching available requests" });
    }
  }
);

// PATCH /api/requests/:id/cancel
// Yolcu talebini iptal eder
router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole("PASSENGER"),
  async (req, res) => {
    try {
      const request = await Request.findById(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.passenger.toString() !== req.user.userId) {
        return res.status(403).json({ message: "You cannot cancel this request" });
      }

      if (!["PENDING", "ACCEPTED"].includes(request.status)) {
        return res.status(400).json({ message: "Request cannot be cancelled" });
      }

      request.status = "CANCELLED";
      await request.save();

      // İlgili trip'i de iptal et
      const trip = await Trip.findOne({ request: request._id, status: "ON_GOING" });
      if (trip) {
        trip.status = "CANCELLED";
        trip.completedAt = new Date();
        await trip.save();
      }

      res.json({ request });
    } catch (err) {
      console.error("Cancel request error:", err);
      res.status(500).json({ message: "Server error while cancelling request" });
    }
  }
);

// PATCH /api/requests/:id/cancel
// Yolcu talebini iptal eder
router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole("PASSENGER"),
  async (req, res) => {
    try {
      const request = await Request.findById(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.passenger.toString() !== req.user.userId) {
        return res.status(403).json({ message: "You cannot cancel this request" });
      }

      if (!["PENDING", "ACCEPTED"].includes(request.status)) {
        return res.status(400).json({ message: "Request cannot be cancelled" });
      }

      request.status = "CANCELLED";
      await request.save();

      // İlgili trip'i de iptal et
      const trip = await Trip.findOne({
        request: request._id,
        status: { $in: ["ACCEPTED", "ON_GOING"] },
      });

      if (trip) {
        trip.status = "CANCELLED";
        trip.completedAt = new Date();
        await trip.save();
      }

      res.json({ request });
    } catch (err) {
      console.error("Cancel request error:", err);
      res.status(500).json({ message: "Server error while cancelling request" });
    }
  }
);

module.exports = router;
