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
      enum: ["PENDING", "ACCEPTED", "ON_GOING", "CANCELLED", "COMPLETED"],
      default: "PENDING",
    },

    // Coordinates for Map Integration
    pickupLat: { type: Number },
    pickupLng: { type: Number },
    dropLat: { type: Number },
    dropLng: { type: Number },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
