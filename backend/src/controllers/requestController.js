const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const Request = require("../models/Request");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const { sendTripCancellationNotifications } = require("../utils/notificationService");

async function ensureDriverReadyForRequests(userId) {
  const driver = await Driver.findOne({ user: userId });

  if (!driver) {
    return { status: 404, message: "Driver profile not found" };
  }
  if (!driver.isApproved) {
    return { status: 403, message: "Driver is not approved yet" };
  }
  if (driver.isActive === false) {
    return { status: 403, message: "Driver account is inactive" };
  }

  const hasAvailableVehicle = await Vehicle.exists({
    ownerDriver: driver._id,
    isVerified: true,
    isActive: true,
    $or: [
      { availabilityStatus: "AVAILABLE" },
      { availabilityStatus: { $exists: false } },
    ],
  });

  if (!hasAvailableVehicle) {
    return {
      status: 403,
      message:
        "No verified and available vehicle found for this driver. Please contact coordinator.",
    };
  }

  const hasActiveTrip = await Trip.exists({
    driver: driver._id,
    tripStatus: { $in: ["ACCEPTED", "ON_GOING"] },
  });

  if (hasActiveTrip) {
    return {
      status: 400,
      message: "Driver already has an active trip and cannot accept new requests",
    };
  }

  return { driver };
}

async function createRequest(req, res) {
  try {
    const { pickupAddress, dropAddress } = req.body;

    if (!pickupAddress || !dropAddress) {
      return res.status(400).json({
        message: "pickupAddress and dropAddress are required",
      });
    }

    const existingActiveRequest = await Request.findOne({
      passenger: req.user.userId,
      status: { $in: ["PENDING", "ACCEPTED", "ON_GOING"] },
    });

    if (existingActiveRequest) {
      return res.status(400).json({
        message:
          `You already have an active request (${existingActiveRequest.status}): ${existingActiveRequest.pickupAddress} → ${existingActiveRequest.dropAddress}. Please cancel or wait until it is completed before creating a new one.`,
      });
    }

    const request = await Request.create({
      passenger: req.user.userId,
      pickupAddress,
      dropAddress,
      pickupLat: req.body.pickupLat,
      pickupLng: req.body.pickupLng,
      dropLat: req.body.dropLat,
      dropLng: req.body.dropLng,
    });

    return res.status(201).json({ request });
  } catch (err) {
    console.error("Create request error:", err);
    return res
      .status(500)
      .json({ message: "Server error while creating request" });
  }
}

async function getMyRequests(req, res) {
  try {
    const { status, from, to } = req.query;

    const filter = {
      passenger: req.user.userId,
    };

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        filter.createdAt.$lte = new Date(to);
      }
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 50);
    const skip = (page - 1) * limit;

    const [total, requests] = await Promise.all([
      Request.countDocuments(filter),
      Request.find(filter)
        .populate({
          path: 'trip',
          select: 'actualDropAddress actualDropLat actualDropLng tripStatus price'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get my requests error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching requests" });
  }
}

async function getAvailableRequests(req, res) {
  try {
    // Just verify driver exists and is approved
    const driver = await Driver.findOne({ user: req.user.userId });

    if (!driver) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    if (!driver.isApproved) {
      return res.status(403).json({ message: "Driver is not approved yet" });
    }

    // Get all PENDING requests that this driver has NOT rejected
    const requests = await Request.find({
      status: "PENDING",
      rejectedDrivers: { $ne: driver._id } // Exclude requests this driver rejected
    })
      .sort({ createdAt: -1 })
      .populate("passenger");

    return res.json({ requests });
  } catch (err) {
    console.error("Get available requests error:", err);
    return res.status(500).json({
      message: "Server error while fetching available requests",
    });
  }
}

async function getRequestDetail(req, res) {
  try {
    const { id } = req.params;

    const request = await Request.findById(id).populate("passenger");
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const trips = await Trip.find({ request: request._id })
      .populate({ path: "driver", populate: { path: "user", select: "_id" } })
      .populate("vehicle")
      .lean();

    const role = req.user.role;
    const userId = req.user.userId;

    let allowed = false;

    if (role === "ADMIN" || role === "COORDINATOR") {
      allowed = true;
    } else if (role === "PASSENGER") {
      const passengerId =
        request.passenger && request.passenger._id
          ? request.passenger._id.toString()
          : request.passenger.toString();

      if (passengerId === userId) {
        allowed = true;
      }
    } else if (role === "DRIVER") {
      const hasOwnTrip = trips.some((t) => {
        const driverUserId = t.driver?.user?._id;
        return driverUserId && driverUserId.toString() === userId;
      });

      if (hasOwnTrip) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res
        .status(403)
        .json({ message: "You are not allowed to view this request" });
    }

    return res.json({ request, trips });
  } catch (err) {
    console.error("Get request detail error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching request detail" });
  }
}

async function cancelRequest(req, res) {
  try {
    const requestId = req.params.id;

    const request = await Request.findById(requestId).populate(
      "passenger",
      "name email"
    );
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Check passenger ownership: handle both populated and non-populated
    const passengerId = request.passenger._id
      ? request.passenger._id.toString()
      : request.passenger.toString();

    if (passengerId !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to cancel this request" });
    }

    const cancellableStatuses = ["PENDING", "ACCEPTED"];

    if (!cancellableStatuses.includes(request.status)) {
      return res.status(400).json({
        message: `Request cannot be cancelled in status: ${request.status}`,
      });
    }

    if (request.status === "CANCELLED") {
      return res.json({ request });
    }

    let session = null;

    try {
      session = await mongoose.startSession();
      session.startTransaction();

      request.status = "CANCELLED";
      await request.save({ session });

      const trip = await Trip.findOne({ request: request._id }, null, { session })
        .populate({
          path: "driver",
          populate: { path: "user", select: "name email" },
        })
        .populate("vehicle")
        .populate({ path: "passenger", select: "name email" });

      if (trip) {
        const currentTripStatus = trip.tripStatus ?? trip.status;

        if (currentTripStatus !== "COMPLETED" && currentTripStatus !== "CANCELLED") {
          if (trip.tripStatus !== undefined) trip.tripStatus = "CANCELLED";
          else trip.status = "CANCELLED";

          if (trip.endTime !== undefined) trip.endTime = new Date();
          else trip.completedAt = new Date();

          await trip.save({ session });

          await Vehicle.updateOne(
            { _id: trip.vehicle },
            { $set: { availabilityStatus: "AVAILABLE" } },
            { session }
          );
        }
      }

      await session.commitTransaction();

      try {
        await sendTripCancellationNotifications({
          trip,
          request,
          cancelledBy: "PASSENGER",
        });
      } catch (notifyErr) {
        console.error("Request cancellation notification error:", notifyErr);
      }

      return res.json({ request });
    } catch (err) {
      if (session) await session.abortTransaction();
      console.error("Cancel request transaction error:", err);
      return res
        .status(500)
        .json({ message: "Server error while cancelling request" });
    } finally {
      if (session) session.endSession();
    }
  } catch (err) {
    console.error("Cancel request error:", err);
    return res
      .status(500)
      .json({ message: "Server error while cancelling request" });
  }
}

async function listRequests(req, res) {
  try {
    const { status, passengerId, from, to } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (passengerId) {
      filter.passenger = passengerId;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        filter.createdAt.$lte = new Date(to);
      }
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(limitRaw, 1), 100);
    const skip = (page - 1) * limit;

    const [total, requests] = await Promise.all([
      Request.countDocuments(filter),
      Request.find(filter)
        .sort({ createdAt: -1 })
        .populate("passenger")
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin/Coordinator list requests error:", err);
    return res
      .status(500)
      .json({ message: "Server error while listing requests" });
  }
}

/**
 * Reject a request (Driver)
 * This allows driver to reject a PENDING request without starting a trip
 */
async function rejectRequest(req, res) {
  try {
    const requestId = req.params.id;

    // Verify driver exists and is approved
    const driver = await Driver.findOne({ user: req.user.userId });
    if (!driver) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    if (!driver.isApproved) {
      return res.status(403).json({ message: "Driver is not approved yet" });
    }

    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Only PENDING requests can be rejected
    if (request.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot reject request in status: ${request.status}. Only PENDING requests can be rejected.`,
      });
    }

    // Check if this driver already rejected this request
    if (request.rejectedDrivers && request.rejectedDrivers.some(d => d.toString() === driver._id.toString())) {
      return res.status(400).json({
        message: "You have already rejected this request",
      });
    }

    // Add driver to rejectedDrivers array (keep request PENDING for other drivers)
    if (!request.rejectedDrivers) {
      request.rejectedDrivers = [];
    }
    request.rejectedDrivers.push(driver._id);

    // Keep backward compatibility with old fields
    request.rejectedBy = driver._id;
    request.rejectedAt = new Date();

    await request.save();

    return res.json({
      message: "Request rejected successfully. Other drivers can still accept this request.",
      request,
    });
  } catch (err) {
    console.error("Reject request error:", err);
    return res.status(500).json({
      message: "Server error while rejecting request",
    });
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getAvailableRequests,
  getRequestDetail,
  cancelRequest,
  rejectRequest,
  listRequests,
};
