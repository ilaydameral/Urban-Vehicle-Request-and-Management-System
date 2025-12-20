const User = require("../models/user");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Request = require("../models/Request");
const Trip = require("../models/Trip");

const ALLOWED_ROLES = ["PASSENGER", "DRIVER", "COORDINATOR", "ADMIN"];

async function listUsers(req, res) {
  try {
    const { role, isActive } = req.query;

    const filter = {};

    if (role && ALLOWED_ROLES.includes(role)) {
      filter.role = role;
    }

    if (typeof isActive !== "undefined") {
      if (isActive === "true") filter.isActive = true;
      if (isActive === "false") filter.isActive = false;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(limitRaw, 1), 100);
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const safeUsers = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive !== false,
      createdAt: u.createdAt,
    }));

    return res.json({
      users: safeUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin list users error:", err);
    return res
      .status(500)
      .json({ message: "Server error while listing users" });
  }
}

async function updateUserRole(req, res) {
  try {
    const { role } = req.body;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Allowed roles: " + ALLOWED_ROLES.join(", "),
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive !== false,
      },
    });
  } catch (err) {
    console.error("Admin update user role error:", err);
    return res
      .status(500)
      .json({ message: "Server error while updating user role" });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { isActive } = req.body;

    if (typeof isActive === "undefined") {
      return res
        .status(400)
        .json({ message: "isActive field is required (true/false)" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(isActive) },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive !== false,
      },
    });
  } catch (err) {
    console.error("Admin update user status error:", err);
    return res
      .status(500)
      .json({ message: "Server error while updating user status" });
  }
}

async function getStats(req, res) {
  try {
    const [totalUsers, activeUsers, passiveUsers, usersByRoleRaw] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const usersByRole = {};
    usersByRoleRaw.forEach((item) => {
      usersByRole[item._id] = item.count;
    });

    const [totalDrivers, approvedDrivers, pendingDrivers] = await Promise.all([
      Driver.countDocuments({}),
      Driver.countDocuments({ isApproved: true }),
      Driver.countDocuments({ isApproved: false }),
    ]);

    const [totalVehicles, verifiedVehicles, pendingVehicles] = await Promise.all([
      Vehicle.countDocuments({}),
      Vehicle.countDocuments({ isVerified: true }),
      Vehicle.countDocuments({ isVerified: false }),
    ]);

    const requestStatusRaw = await Request.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const requestStatus = {};
    requestStatusRaw.forEach((item) => {
      requestStatus[item._id] = item.count;
    });

    const tripStatusRaw = await Trip.aggregate([
      {
        $group: {
          _id: "$tripStatus",
          count: { $sum: 1 },
        },
      },
    ]);
    const tripStatus = {};
    tripStatusRaw.forEach((item) => {
      tripStatus[item._id] = item.count;
    });

    return res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        passive: passiveUsers,
        byRole: usersByRole,
      },
      drivers: {
        total: totalDrivers,
        approved: approvedDrivers,
        pending: pendingDrivers,
      },
      vehicles: {
        total: totalVehicles,
        verified: verifiedVehicles,
        pending: pendingVehicles,
      },
      requests: {
        byStatus: requestStatus,
      },
      trips: {
        byStatus: tripStatus,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res
      .status(500)
      .json({ message: "Server error while fetching admin stats" });
  }
}

async function checkConsistency(req, res) {
  try {
    // 1. Drivers: Populate user to check existence + get name (if exists)
    const drivers = await Driver.find({}).populate("user", "name email").lean();
    // If user is missing/null, it's an inconsistency
    const driversWithMissingUser = drivers.filter((d) => !d.user);

    // 2. Vehicles: Populate ownerDriver
    const vehicles = await Vehicle.find({})
      .populate({
        path: "ownerDriver",
        populate: { path: "user", select: "name email" },
      })
      .lean();
    const vehiclesWithMissingDriver = vehicles.filter((v) => !v.ownerDriver);

    // 3. Requests: Populate passenger
    const requests = await Request.find({})
      .populate("passenger", "name email")
      .lean();
    const requestsWithMissingPassenger = requests.filter((r) => !r.passenger);

    // 4. Trips
    const trips = await Trip.find({})
      .populate("passenger", "name email")
      .populate({
        path: "driver",
        populate: { path: "user", select: "name email" },
      })
      .populate("request") // needed for status check
      .populate("vehicle")
      .lean();

    const tripsWithMissingRefs = [];
    const statusInconsistencies = [];

    trips.forEach((t) => {
      const problems = [];

      if (!t.request) {
        problems.push("missing_request");
      }
      if (!t.driver) {
        problems.push("missing_driver");
      }
      if (!t.passenger) {
        problems.push("missing_passenger_user");
      }
      if (!t.vehicle) {
        problems.push("missing_vehicle");
      }

      if (problems.length > 0) {
        tripsWithMissingRefs.push({
          tripId: t._id,
          problems,
          // meaningful info if available
          passengerName: t.passenger?.name,
          driverName: t.driver?.user?.name,
        });
      }

      // Check Status Consistency
      if (t.request) {
        const reqStatus = t.request.status;
        const tripStatus = t.tripStatus || t.status;

        if (
          (tripStatus === "COMPLETED" && reqStatus !== "COMPLETED") ||
          (tripStatus === "ON_GOING" &&
            !["ACCEPTED", "ON_GOING"].includes(reqStatus)) ||
          (tripStatus === "CANCELLED" &&
            !["CANCELLED", "PENDING", "ACCEPTED"].includes(reqStatus))
        ) {
          statusInconsistencies.push({
            tripId: t._id,
            tripStatus,
            requestId: t.request._id,
            requestStatus: reqStatus,
            passengerName: t.passenger?.name || "Unknown",
            driverName: t.driver?.user?.name || "Unknown",
          });
        }
      }
    });

    return res.json({
      consistencyReport: {
        driversWithMissingUser,
        vehiclesWithMissingDriver,
        requestsWithMissingPassenger,
        tripsWithMissingRefs,
        statusInconsistencies,
      },
    });
  } catch (err) {
    console.error("Admin consistency check error:", err);
    return res.status(500).json({
      message: "Server error while running consistency checks",
    });
  }
}

async function overrideRequestStatus(req, res) {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      "PENDING",
      "ACCEPTED",
      "ON_GOING",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Allowed values: " + allowedStatuses.join(", "),
      });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const previousStatus = request.status;
    request.status = status;
    await request.save();

    const trips = await Trip.find({ request: request._id });

    for (const trip of trips) {
      const currentTripStatus = trip.tripStatus || trip.status;

      if (status === "CANCELLED" && !["COMPLETED", "CANCELLED"].includes(currentTripStatus)) {
        trip.tripStatus = "CANCELLED";
        trip.endTime = new Date();
        await trip.save();

        if (trip.vehicle) {
          await Vehicle.updateOne(
            { _id: trip.vehicle },
            { $set: { availabilityStatus: "AVAILABLE" } }
          );
        }
      }

      if (status === "ON_GOING" && currentTripStatus === "ACCEPTED") {
        trip.tripStatus = "ON_GOING";
        if (!trip.startTime) {
          trip.startTime = new Date();
        }
        await trip.save();

        if (trip.vehicle) {
          await Vehicle.updateOne(
            { _id: trip.vehicle },
            { $set: { availabilityStatus: "ON_TRIP" } }
          );
        }
      }

      if (status === "COMPLETED" && currentTripStatus !== "COMPLETED") {
        const prevTripStatus = currentTripStatus;
        trip.tripStatus = "COMPLETED";
        trip.endTime = new Date();
        await trip.save();

        if (trip.vehicle) {
          await Vehicle.updateOne(
            { _id: trip.vehicle },
            { $set: { availabilityStatus: "AVAILABLE" } }
          );
        }

        if (prevTripStatus !== "COMPLETED") {
          try {
            const driverProfile = await Driver.findById(trip.driver);
            if (driverProfile) {
              driverProfile.totalTrips =
                (driverProfile.totalTrips || 0) + 1;
              await driverProfile.save();
            }
          } catch (statsErr) {
            console.error(
              "Error while updating driver stats from admin request override:",
              statsErr
            );
          }
        }
      }
    }

    return res.json({
      request,
      previousStatus,
      updatedStatus: status,
    });
  } catch (err) {
    console.error("Admin override request status error:", err);
    return res.status(500).json({
      message: "Server error while overriding request status",
    });
  }
}

async function overrideTripStatus(req, res) {
  try {
    const { status } = req.body;
    const allowedStatuses = ["ON_GOING", "COMPLETED", "CANCELLED"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Allowed values: " + allowedStatuses.join(", "),
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const previousStatus = trip.tripStatus || trip.status;
    trip.tripStatus = status;

    if (status === "COMPLETED" || status === "CANCELLED") {
      trip.endTime = new Date();
      await Vehicle.updateOne(
        { _id: trip.vehicle },
        { $set: { availabilityStatus: "AVAILABLE" } }
      );
    } else if (status === "ON_GOING") {
      if (!trip.startTime) {
        trip.startTime = new Date();
      }
      await Vehicle.updateOne(
        { _id: trip.vehicle },
        { $set: { availabilityStatus: "ON_TRIP" } }
      );
    }

    await trip.save();

    let updatedRequest = null;
    try {
      if (trip.request) {
        const reqDoc = await Request.findById(trip.request);
        if (reqDoc) {
          if (status === "COMPLETED") {
            reqDoc.status = "COMPLETED";
          } else if (status === "CANCELLED") {
            reqDoc.status = "CANCELLED";
          } else if (status === "ON_GOING") {
            reqDoc.status = reqDoc.status === "PENDING" ? "ACCEPTED" : reqDoc.status;
            if (reqDoc.status !== "COMPLETED") {
              reqDoc.status = "ON_GOING";
            }
          }
          await reqDoc.save();
          updatedRequest = reqDoc;
        }
      }
    } catch (reqErr) {
      console.error(
        "Error while syncing request status from admin trip override:",
        reqErr
      );
    }

    if (previousStatus !== "COMPLETED" && status === "COMPLETED") {
      try {
        const driverProfile = await Driver.findById(trip.driver);
        if (driverProfile) {
          driverProfile.totalTrips = (driverProfile.totalTrips || 0) + 1;
          await driverProfile.save();
        }
      } catch (statsErr) {
        console.error(
          "Error while updating driver stats from admin trip override:",
          statsErr
        );
      }
    }

    return res.json({
      trip,
      request: updatedRequest,
      previousStatus,
      updatedStatus: status,
    });
  } catch (err) {
    console.error("Admin override trip status error:", err);
    return res.status(500).json({
      message: "Server error while overriding trip status",
    });
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  updateUserStatus,
  getStats,
  checkConsistency,
  overrideRequestStatus,
  overrideTripStatus,
};
