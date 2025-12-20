// src/models/Request.js
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pickupAddress: {
      type: String,
      required: true,
      trim: true,
    },

    dropAddress: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "ON_GOING", "CANCELLED", "COMPLETED", "REJECTED"],
      default: "PENDING",
    },

    // Coordinates for Map Integration
    pickupLat: { type: Number },
    pickupLng: { type: Number },
    dropLat: { type: Number },
    dropLng: { type: Number },

    // Rejection tracking
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    rejectedAt: {
      type: Date,
    },

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for trip
requestSchema.virtual('trip', {
  ref: 'Trip',
  localField: '_id',
  foreignField: 'request',
  justOne: true
});

module.exports = mongoose.model("Request", requestSchema);
