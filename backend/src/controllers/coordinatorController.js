const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Request = require("../models/Request");
const Trip = require("../models/Trip");

async function getOverview(req, res) {
  try {
    const pendingDrivers = await Driver.find({ isApproved: false })
      .populate("user")
      .sort({ createdAt: 1 });

    const pendingVehicles = await Vehicle.find({ isVerified: false })
      .populate({
        path: "ownerDriver",
        populate: { path: "user" },
      })
      .sort({ createdAt: 1 });

    const pendingRequests = await Request.find({ status: "PENDING" })
      .populate("passenger")
      .sort({ createdAt: 1 });

    const completedRequests = await Request.find({ status: "COMPLETED" })
      .populate("passenger")
      .sort({ updatedAt: -1 })
      .limit(5);

    const cancelledRequests = await Request.find({ status: "CANCELLED" })
      .populate("passenger")
      .sort({ updatedAt: -1 })
      .limit(5);
      

    const ongoingTrips = await Trip.find({ tripStatus: "ON_GOING" })
      .populate("driver")
      .populate("passenger")
      .populate("vehicle")
      .populate("request")
      .sort({ createdAt: 1 });

    const completedTrips = await Trip.find({ tripStatus: "COMPLETED" })
      .populate("driver passenger vehicle")
      .sort({ updatedAt: -1 })
      .limit(5);

    const cancelledTrips = await Trip.find({ tripStatus: "CANCELLED" })
      .populate("driver passenger vehicle")
      .sort({ updatedAt: -1 })
      .limit(5);
  
    return res.json({
      pendingDrivers,
      pendingVehicles,
      pendingRequests,
      completedRequests,
      cancelledRequests,
      ongoingTrips,
      completedTrips,
      cancelledTrips,
    });
  } catch (err) {
    console.error("Coordinator overview error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching coordinator overview" });
  }
}

async function getResources(req, res) {
  try {
    // Get approved drivers with their user info
    const drivers = await Driver.find({ isApproved: true })
      .populate("user")
      .sort({ createdAt: -1 });

    // Get verified vehicles with owner driver info
    const vehicles = await Vehicle.find({ isVerified: true })
      .populate({
        path: "ownerDriver",
        populate: { path: "user" },
      })
      .sort({ createdAt: -1 });

    // Group vehicles by driver ID
    const vehiclesByDriver = {};
    for (const vehicle of vehicles) {
      const driverId = String(vehicle.ownerDriver?._id || "");
      if (!driverId) continue;

      if (!vehiclesByDriver[driverId]) {
        vehiclesByDriver[driverId] = [];
      }
      vehiclesByDriver[driverId].push(vehicle);
    }

    return res.json({
      drivers,
      vehicles, // Keep this for compatibility
      vehiclesByDriver, // Frontend expects this
    });
  } catch (err) {
    console.error("Get resources error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching resources" });
  }
}


async function assignRequest(req, res) {
  try {
    const { requestId, driverId, vehicleId } = req.body;

    if (!requestId || !driverId || !vehicleId) {
      return res.status(400).json({
        message: "requestId, driverId, and vehicleId are required",
      });
    }

    // Verify request exists and is PENDING
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "PENDING") {
      return res.status(400).json({
        message: `Request status is ${request.status}, must be PENDING`,
      });
    }

    // Verify driver exists and is approved
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    if (!driver.isApproved) {
      return res.status(400).json({ message: "Driver is not approved" });
    }

    // Verify vehicle exists and is verified
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (!vehicle.isVerified) {
      return res.status(400).json({ message: "Vehicle is not verified" });
    }

    // Create trip using tripController's createTrip logic
    // We'll call it programmatically
    const Trip = require("../models/Trip");

    const trip = new Trip({
      request: requestId,
      passenger: request.passenger,
      driver: driverId,
      vehicle: vehicleId,
      tripStatus: "ACCEPTED",
      pickupAddress: request.pickupAddress,
      dropAddress: request.dropAddress,
    });

    await trip.save();

    // Update request status
    request.status = "ACCEPTED";
    await request.save();

    // Update vehicle availability
    vehicle.availabilityStatus = "ON_TRIP";
    await vehicle.save();

    // Send email notifications
    const { notifyPassengerTripAssigned, notifyDriverTripAssigned } = require("../utils/tripNotifications");
    const User = require("../models/user");

    // Get passenger user
    const passengerUser = await User.findById(request.passenger);

    // Send notifications asynchronously (don't wait)
    Promise.all([
      notifyPassengerTripAssigned({
        passenger: passengerUser,
        driver,
        vehicle,
        trip,
      }),
      notifyDriverTripAssigned({
        driver,
        passenger: passengerUser,
        trip,
        vehicle,
      }),
    ]).catch(err => console.error("Email notification error:", err));

    return res.json({
      message: "Trip assigned successfully",
      trip,
    });
  } catch (err) {
    console.error("Assign request error:", err);
    return res.status(500).json({
      message: "Server error while assigning request",
    });
  }
}

// coordinatorController.js (EN ALT TARAF)

async function approveDriver(req, res) {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId).populate("user");
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (driver.isApproved) {
      return res.json({ message: "Driver is already approved", driver });
    }

    driver.isApproved = true;
    await driver.save();

    return res.json({ message: "Driver approved successfully", driver });
  } catch (err) {
    console.error("Approve driver error:", err);
    return res.status(500).json({ message: "Server error while approving driver" });
  }
}


module.exports = {
  getOverview,
  getResources,
  assignRequest,
  approveDriver,
};
