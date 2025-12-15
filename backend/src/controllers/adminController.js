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
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    const safeUsers = users.map((u) => ({
      _id: u._id,
      name: user.name,
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
        name: u.name,
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

    const [totalVehicles, verifiedVehicles, pendingVehicles] =
      await Promise.all([
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
          _id: "$status",
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

async function getConsistencyReport(req, res) {
  try {
    const drivers = await Driver.find({}).lean();
    const users = await User.find({}).select("_id").lean();
    const userIds = new Set(users.map((u) => String(u._id)));

    const driversWithMissingUser = drivers.filter(
      (d) => !d.user || !userIds.has(String(d.user))
    );

    const vehicles = await Vehicle.find({}).lean();
    const driverIds = new Set(drivers.map((d) => String(d._id)));

    const vehiclesWithMissingDriver = vehicles.filter(
      (v) => !v.ownerDriver || !driverIds.has(String(v.ownerDriver))
    );

    const requests = await Request.find({}).lean();

    const requestsWithMissingPassenger = requests.filter(
      (r) => !r.passenger || !userIds.has(String(r.passenger))
    );

    const trips = await Trip.find({}).lean();

    const tripsWithMissingRefs = [];
    const statusInconsistencies = [];

    const requestStatusMap = new Map(requests.map((r) => [String(r._id), r.status]));

    trips.forEach((t) => {
      const problems = [];

      if (!t.request || !requestStatusMap.has(String(t.request))) {
        problems.push("missing_request");
      }
      if (!t.driver || !driverIds.has(String(t.driver))) {
        problems.push("missing_driver");
      }

      if (!t.passenger || !userIds.has(String(t.passenger))) {
        problems.push("missing_passenger_user");
      }
      if (!t.vehicle) {
        problems.push("missing_vehicle");
      }

      if (problems.length > 0) {
        tripsWithMissingRefs.push({
          tripId: t._id,
          problems,
        });
      }

      if (t.request && requestStatusMap.has(String(t.request))) {
        const reqStatus = requestStatusMap.get(String(t.request));
        const tripStatus = t.status;

        if (reqStatus === "PENDING" && tripStatus !== "ON_GOING") {
          statusInconsistencies.push({
            tripId: t._id,
            issue:
              "Trip status should not be ON_GOING/COMPLETED/CANCELLED when request is PENDING",
            requestStatus: reqStatus,
            tripStatus,
          });
        }

        if (reqStatus === "ACCEPTED" && !["ON_GOING", "COMPLETED", "CANCELLED"].includes(tripStatus)) {
          statusInconsistencies.push({
            tripId: t._id,
            issue:
              "Trip status should be ON_GOING/COMPLETED/CANCELLED when request is ACCEPTED",
            requestStatus: reqStatus,
            tripStatus,
          });
        }

        if (reqStatus === "COMPLETED" && tripStatus !== "COMPLETED") {
          statusInconsistencies.push({
            tripId: t._id,
            issue: "Trip status should be COMPLETED when request is COMPLETED",
            requestStatus: reqStatus,
            tripStatus,
          });
        }

        if (reqStatus === "CANCELLED" && tripStatus === "ON_GOING") {
          statusInconsistencies.push({
            tripId: t._id,
            issue: "Trip cannot be ON_GOING when request is CANCELLED",
            requestStatus: reqStatus,
            tripStatus,
          });
        }
      }
    });

    return res.json({
      driversWithMissingUser,
      vehiclesWithMissingDriver,
      requestsWithMissingPassenger,
      tripsWithMissingRefs,
      statusInconsistencies,
    });
  } catch (err) {
    console.error("Admin consistency check error:", err);
    return res
      .status(500)
      .json({ message: "Server error while performing consistency check" });
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  updateUserStatus,
  getStats,
  getConsistencyReport,
};
