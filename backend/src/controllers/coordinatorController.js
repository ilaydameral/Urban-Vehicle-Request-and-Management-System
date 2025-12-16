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

    const ongoingTrips = await Trip.find({ tripStatus: "ON_GOING" })
      .populate("driver")
      .populate("passenger")
      .populate("vehicle")
      .populate("request")
      .sort({ createdAt: 1 });

    return res.json({
      pendingDrivers,
      pendingVehicles,
      pendingRequests,
      ongoingTrips,
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

module.exports = {
  getOverview,
  getResources,
};
