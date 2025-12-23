const mongoose = require("mongoose");
const axios = require("axios");
const Trip = require("../models/Trip");
const Request = require("../models/Request");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const {
  sendTripAssignmentNotifications,
  sendTripCancellationNotifications,
} = require("../utils/notificationService");

async function assertDriverOperational(userId, session) {
  const driver = await Driver.findOne({ user: userId }, null, { session });

  if (!driver) {
    throw new Error("Driver profile does not exist for this user");
  }
  if (!driver.isApproved) {
    throw new Error("Driver is not approved yet");
  }
  if (driver.isActive === false) {
    throw new Error("Driver is not active");
  }

  return driver;
}

async function getApprovedDriverAndVerifiedVehicle(userId) {
  const driver = await assertDriverOperational(userId);

  const vehicle = await Vehicle.findOne({
    ownerDriver: driver._id,
    isVerified: true,
    isActive: true,
    $or: [
      { availabilityStatus: "AVAILABLE" },
      { availabilityStatus: { $exists: false } },
    ],
  });

  if (!vehicle) {
    throw new Error(
      "No verified, active and AVAILABLE vehicle found for this driver. Please contact coordinator."
    );
  }

  return { driver, vehicle };
}

async function createTrip(req, res) {
  let session;

  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    let driverInfo;
    try {
      driverInfo = await getApprovedDriverAndVerifiedVehicle(req.user.userId);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const { driver, vehicle } = driverInfo;

    session = await mongoose.startSession();
    session.startTransaction();

    const existingTrip = await Trip.findOne(
      { driver: driver._id, tripStatus: { $in: ["ACCEPTED", "ON_GOING"] } },
      null,
      { session }
    );

    if (existingTrip) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Driver already has an active trip" });
    }

    const request = await Request.findOneAndUpdate(
      { _id: requestId, status: "PENDING" },
      { $set: { status: "ACCEPTED" } },
      { new: true, session }
    );

    console.log(`[createTrip] Request ${requestId} updated to ACCEPTED:`, request ? `Success (new status: ${request.status})` : 'Failed - request not found or not PENDING');

    await Vehicle.updateOne(
      { _id: vehicle._id },
      { $set: { availabilityStatus: "ON_TRIP" } },
      { session }
    );

    if (!request) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Request is not available (not found or not in PENDING status)",
      });
    }

    const trip = await Trip.create(
      [
        {
          request: request._id,
          passenger: request.passenger,
          driver: driver._id,
          vehicle: vehicle._id,
          tripStatus: "ACCEPTED",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populatedTrip = await Trip.findById(trip[0]._id)
      .populate({
        path: "request",
        populate: { path: "passenger", select: "name email" },
      })
      .populate({ path: "driver", populate: { path: "user", select: "name email" } })
      .populate({ path: "passenger", select: "name email" })
      .populate("vehicle");

    try {
      await sendTripAssignmentNotifications(populatedTrip);
    } catch (notifyErr) {
      console.error("Trip assignment notification error:", notifyErr);
    }

    return res.status(201).json({ trip: populatedTrip });
  } catch (err) {
    try {
      if (session) await session.abortTransaction();
    } catch (_) { }

    if (err && typeof err.message === "string") {
      const msg = err.message.toLowerCase();
      if (
        msg.includes("transaction numbers are only allowed") ||
        msg.includes("replica set")
      ) {
        return res.status(500).json({
          message:
            "MongoDB transactions require a replica set (or Atlas). Please run MongoDB as a replica set or use Atlas cluster.",
          hint:
            "If you are using local MongoDB, start it with --replSet and initiate rs.initiate().",
        });
      }
    }

    if (err && err.code === 11000) {
      const key = err.keyPattern || {};
      if (key.request) {
        return res.status(409).json({
          message: "This request has already been accepted by another driver.",
        });
      }
      if (key.driver) {
        return res.status(409).json({
          message: "Driver already has an ongoing trip (DB constraint).",
        });
      }
      if (key.vehicle) {
        return res.status(409).json({
          message: "Vehicle already has an ongoing trip (DB constraint).",
        });
      }

      return res.status(409).json({ message: "Duplicate constraint violation." });
    }

    console.error("Create trip error:", err);
    return res.status(500).json({ message: "Server error while creating trip" });
  } finally {
    if (session) session.endSession();
  }
}

async function startTrip(req, res) {
  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const trip = await Trip.findById(req.params.id)
      .session(session)
      .populate("request")
      .populate("vehicle");

    if (!trip) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Trip not found" });
    }

    let driver;
    try {
      driver = await assertDriverOperational(req.user.userId, session);
    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ message: err.message });
    }

    if (trip.driver.toString() !== driver._id.toString()) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ message: "You are not allowed to start this trip" });
    }

    if (!trip.request) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Trip has no request" });
    }

    const hasOtherDriverTrip = await Trip.exists({
      _id: { $ne: trip._id },
      driver: driver._id,
      tripStatus: { $in: ["ACCEPTED", "ON_GOING"] },
    }).session(session);

    if (hasOtherDriverTrip) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Driver already has another active trip",
      });
    }

    const hasOtherVehicleTrip = await Trip.exists({
      _id: { $ne: trip._id },
      vehicle: trip.vehicle,
      tripStatus: { $in: ["ACCEPTED", "ON_GOING"] },
    }).session(session);

    if (hasOtherVehicleTrip) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Vehicle is already assigned to another active trip",
      });
    }

    if (trip.request.status !== "ACCEPTED") {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Trip can only be started when request is ACCEPTED",
        currentRequestStatus: trip.request.status,
      });
    }

    if (trip.tripStatus !== "ACCEPTED") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Trip can only be started when tripStatus is ACCEPTED (current: ${trip.tripStatus})`,
      });
    }

    trip.request.status = "ON_GOING";
    await trip.request.save({ session });

    trip.tripStatus = "ON_GOING";
    if (!trip.startTime) trip.startTime = new Date();
    await trip.save({ session });

    if (trip.vehicle) {
      await Vehicle.updateOne(
        { _id: trip.vehicle },
        { $set: { availabilityStatus: "ON_TRIP" } },
        { session }
      );
    }

    await session.commitTransaction();

    return res.json({ message: "Trip started", trip });
  } catch (err) {
    try {
      if (session) await session.abortTransaction();
    } catch (_) { }

    if (err && typeof err.message === "string") {
      const msg = err.message.toLowerCase();
      if (
        msg.includes("transaction numbers are only allowed") ||
        msg.includes("replica set")
      ) {
        return res.status(500).json({
          message:
            "MongoDB transactions require a replica set (or Atlas). Please run MongoDB as a replica set or use Atlas cluster.",
          hint:
            "If you are using local MongoDB, start it with --replSet and initiate rs.initiate().",
        });
      }
    }

    console.error("Start trip error:", err);
    return res.status(500).json({ message: "Server error while starting trip" });
  } finally {
    if (session) session.endSession();
  }
}

async function completeTrip(req, res) {
  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const trip = await Trip.findById(req.params.id, null, { session })
      .populate({
        path: "request",
        populate: { path: "passenger", select: "name email" },
      })
      .populate({ path: "driver", populate: { path: "user", select: "name email" } })
      .populate("vehicle")
      .populate({ path: "passenger", select: "name email" });
    if (!trip) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Trip not found" });
    }

    let driverProfile;
    try {
      driverProfile = await assertDriverOperational(req.user.userId, session);
    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ message: err.message });
    }

    if (String(trip.driver?._id || trip.driver) !== String(driverProfile._id)) {
      await session.abortTransaction();
      return res.status(403).json({ message: "You are not the driver of this trip" });
    }

    if (trip.tripStatus !== "ON_GOING") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Only ON_GOING trips can be completed (current: ${trip.tripStatus})`,
      });
    }

    trip.tripStatus = "COMPLETED";
    trip.endTime = new Date();

    // Handle actual dropoff location
    const { actualDropLat, actualDropLng, actualDropAddress } = req.body || {};
    if (actualDropLat && actualDropLng) {
      trip.actualDropLat = actualDropLat;
      trip.actualDropLng = actualDropLng;

      // Use address from frontend if provided
      if (actualDropAddress) {
        trip.actualDropAddress = actualDropAddress;
        console.log(`📍 Actual dropoff (from frontend): ${trip.actualDropAddress}`);
      } else {
        // Fallback: Reverse geocode in backend
        try {
          const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              latlng: `${actualDropLat},${actualDropLng}`,
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
          });

          if (response.data.results && response.data.results.length > 0) {
            trip.actualDropAddress = response.data.results[0].formatted_address;
            console.log(`📍 Actual dropoff (from backend): ${trip.actualDropAddress}`);
          }
        } catch (geocodeErr) {
          console.error('❌ Reverse geocoding failed:', geocodeErr.message);
          trip.actualDropAddress = `${actualDropLat}, ${actualDropLng}`;
        }
      }
    }

    // Fare Calculation - Based on Kilometers
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    };

    // Use actual dropoff for distance calculation if available
    const dropLat = trip.actualDropLat || trip.request?.dropLat;
    const dropLng = trip.actualDropLng || trip.request?.dropLng;

    let distanceKm = 0;
    if (trip.request?.pickupLat && trip.request?.pickupLng && dropLat && dropLng) {
      distanceKm = calculateDistance(
        trip.request.pickupLat,
        trip.request.pickupLng,
        dropLat,
        dropLng
      );
    }

    console.log(`💰 Fare Calculation for Trip ${trip._id}:`);
    console.log(`   Pickup: (${trip.request?.pickupLat}, ${trip.request?.pickupLng})`);
    console.log(`   Drop: (${trip.request?.dropLat}, ${trip.request?.dropLng})`);
    console.log(`   Distance: ${distanceKm.toFixed(2)} km`);

    const BASE_FARE = ​​20; // Initial fee (TL)
    const PER_KM_RATE = 8; // Fee per KM (TL)
    const MINIMUM_FARE = ​​30; // Minimum fee (TL)

    let calculatedFare = BASE_FARE + (distanceKm * PER_KM_RATE);
    calculatedFare = Math.max(calculatedFare, MINIMUM_FARE); 

    trip.price = Math.round(calculatedFare * 100) / 100;

    console.log(`   Calculated Fare: ${trip.price} TL (${distanceKm.toFixed(2)} km x ${PER_KM_RATE} TL/km + ${BASE_FARE} TL base)`);

    await trip.save({ session });

    if (trip.request) {
      trip.request.status = "COMPLETED";
      await trip.request.save({ session });
    }

    await Vehicle.updateOne(
      { _id: trip.vehicle },
      { $set: { availabilityStatus: "AVAILABLE" } },
      { session }
    );

    driverProfile.totalTrips = (driverProfile.totalTrips || 0) + 1;
    await driverProfile.save({ session });

    await session.commitTransaction();

    return res.json({ trip });
  } catch (err) {
    try {
      if (session) await session.abortTransaction();
    } catch (_) { }

    console.error("Complete trip error:", err);
    return res.status(500).json({ message: "Server error while completing trip" });
  } finally {
    if (session) session.endSession();
  }
}

async function cancelTrip(req, res) {
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const trip = await Trip.findById(req.params.id, null, { session })
      .populate({
        path: "request",
        populate: { path: "passenger", select: "name email" },
      })
      .populate({ path: "driver", populate: { path: "user", select: "name email" } })
      .populate("vehicle")
      .populate({ path: "passenger", select: "name email" });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userRole = req.user.role;
    const userId = req.user.userId;

    // Check permissions: DRIVER must be the trip's driver, PASSENGER must be the trip's passenger
    if (userRole === "DRIVER") {
      let driverProfile;
      try {
        driverProfile = await assertDriverOperational(userId);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

      if (String(trip.driver) !== String(driverProfile._id)) {
        return res.status(403).json({ message: "You are not the driver of this trip" });
      }
    } else if (userRole === "PASSENGER") {
      if (String(trip.passenger) !== String(userId)) {
        return res.status(403).json({ message: "You are not the passenger of this trip" });
      }
    }

    if (trip.tripStatus === "COMPLETED") {
      return res.status(400).json({ message: "COMPLETED trip cannot be cancelled" });
    }

    if (trip.tripStatus === "CANCELLED") {
      return res.json({ trip });
    }

    // Update trip without transaction
    trip.tripStatus = "CANCELLED";
    trip.endTime = new Date();
    await trip.save();

    // Update request
    if (trip.request && trip.request.status !== "COMPLETED") {
      trip.request.status = "CANCELLED";
      await trip.request.save();
    }

    await Vehicle.updateOne(
      { _id: trip.vehicle },
      { $set: { availabilityStatus: "AVAILABLE" } },
      { session }
    );

    await session.commitTransaction();

    try {
      await sendTripCancellationNotifications({
        trip,
        request: trip.request,
        cancelledBy: "DRIVER",
      });
    } catch (notifyErr) {
      console.error("Trip cancellation notification error:", notifyErr);
    }

    return res.json({ trip });
  } catch (err) {
    console.error("Cancel trip error:", err);
    return res.status(500).json({ message: "Server error while cancelling trip" });
  }
}

async function listTrips(req, res) {
  try {
    const {
      status,
      driverId,
      passengerId,
      requestId,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status) filter.tripStatus = status;
    if (passengerId) filter.passenger = passengerId;
    if (requestId) filter.request = requestId;

    if (driverId) {
      const d = await Driver.findOne({ user: driverId }).select("_id");
      if (d) {
        filter.driver = d._id;
      } else {
        filter.driver = driverId;
      }
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) filter.createdAt.$lte = toDate;
      }
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [total, trips] = await Promise.all([
      Trip.countDocuments(filter),
      Trip.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("request")
        .populate("passenger")
        .populate("vehicle")
        .populate({ path: "driver", populate: { path: "user" } }),
    ]);

    return res.json({
      total,
      page: pageNum,
      limit: limitNum,
      trips,
    });
  } catch (err) {
    console.error("List trips error:", err);
    return res
      .status(500)
      .json({ message: "Server error while listing trips" });
  }
}

async function getMyTrips(req, res) {
  try {
    const { status, from, to } = req.query;

    let driverProfile;
    try {
      driverProfile = await assertDriverOperational(req.user.userId);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const filter = { driver: driverProfile._id };

    if (status) {
      filter.tripStatus = status;
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

    const [total, trips] = await Promise.all([
      Trip.countDocuments(filter),
      Trip.find(filter)
        .populate("request")
        .populate("passenger")
        .populate("vehicle")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get my trips error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching trips" });
  }
}

async function getPassengerTrips(req, res) {
  try {
    const { status, from, to } = req.query;

    const filter = {
      passenger: req.user.userId,
    };

    if (status) {
      filter.tripStatus = status;
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

    const [total, trips] = await Promise.all([
      Trip.countDocuments(filter),
      Trip.find(filter)
        .populate("request")
        .populate({ path: "driver", populate: { path: "user" } })
        .populate("vehicle")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get my passenger trips error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching passenger trips" });
  }
}

async function getTripById(req, res) {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(req.params.id)
      .populate("request")
      .populate({ path: "driver", populate: { path: "user" } })
      .populate("passenger")
      .populate("vehicle");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const role = req.user.role;
    const userId = req.user.userId;

    let allowed = false;

    if (role === "ADMIN" || role === "COORDINATOR") {
      allowed = true;
    } else if (role === "DRIVER") {
      const tripDriverUserId = trip.driver?.user?._id
        ? String(trip.driver.user._id)
        : String(trip.driver?.user);

      if (tripDriverUserId === userId) allowed = true;
    } else if (role === "PASSENGER") {
      const passengerField =
        trip.passenger && trip.passenger._id
          ? trip.passenger._id
          : trip.passenger;
      if (passengerField && passengerField.toString() === userId) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res
        .status(403)
        .json({ message: "You are not allowed to view this trip" });
    }

    return res.json({ trip });
  } catch (err) {
    console.error("Get trip detail error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching trip detail" });
  }
}

async function rateTrip(req, res) {
  try {
    const { rating } = req.body;

    if (typeof rating !== "number" || Number.isNaN(rating)) {
      return res
        .status(400)
        .json({ message: "rating must be a number between 1 and 5" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "rating must be between 1 and 5" });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.passenger.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "You are not the passenger of this trip" });
    }

    if (trip.tripStatus !== "COMPLETED") {
      return res.status(400).json({
        message: "Only completed trips can be rated",
      });
    }

    if (trip.isRated) {
      return res
        .status(400)
        .json({ message: "This trip has already been rated" });
    }

    const driverProfile = await Driver.findById(trip.driver);
    if (!driverProfile) {
      return res.status(404).json({ message: "Driver profile not found" });
    }

    const currentAvg = driverProfile.rating || 0;
    const currentCount = driverProfile.ratingCount || 0;
    const newCount = currentCount + 1;

    const newAvg =
      currentCount === 0
        ? rating
        : (currentAvg * currentCount + rating) / newCount;

    driverProfile.rating = newAvg;
    driverProfile.ratingCount = newCount;
    await driverProfile.save();

    trip.isRated = true;
    trip.passengerRating = rating;
    await trip.save();

    return res.json({
      message: "Rating submitted successfully",
      driver: {
        id: driverProfile._id,
        rating: driverProfile.rating,
        ratingCount: driverProfile.ratingCount,
        totalTrips: driverProfile.totalTrips,
      },
      trip,
    });
  } catch (err) {
    console.error("Rate trip error:", err);
    return res
      .status(500)
      .json({ message: "Server error while rating trip" });
  }
}

module.exports = {
  createTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  listTrips,
  getMyTrips,
  getPassengerTrips,
  getTripById,
  rateTrip,
};
