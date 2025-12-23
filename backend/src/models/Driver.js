// src/models/Driver.js
const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    // Each driver is associated with exactly one user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one-to-one relation between User and Driver
    },

    // Basic license information
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    licenseClass: {
      type: String,
      required: true,
      trim: true,
    },

    // Coordinator will approve drivers
    isApproved: {
      type: Boolean,
      default: false,
    },

    // Is the driver currently active in the system?
    isActive: {
      type: Boolean,
      default: true,
    },

    // Optional statistics (can be improved later)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// STORED PROCEDURE
// This encapsulates the logic of aggregating driver stats in the DB layer
driverSchema.statics.calculateStats = async function (driverId) {
  console.log(`[Stored Proc] Calculating stats for driver ${driverId}...`);
  const stats = await mongoose.model("Trip").aggregate([
    {
      $match: {
        driver: new mongoose.Types.ObjectId(driverId),
        isRated: true,
        passengerRating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$driver",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$passengerRating" },
      },
    },
  ]);

  if (stats.length > 0) {
    const { nRating, avgRating } = stats[0];
    await this.findByIdAndUpdate(driverId, {
      rating: Math.round(avgRating * 10) / 10, // 1 decimal
      ratingCount: nRating,
    });
    console.log(`[Stored Proc] Driver ${driverId} updated: ${nRating} ratings, avg ${avgRating}`);
  } else {
    await this.findByIdAndUpdate(driverId, {
      rating: 0,
      ratingCount: 0,
    });
  }
};

module.exports = mongoose.model("Driver", driverSchema);
