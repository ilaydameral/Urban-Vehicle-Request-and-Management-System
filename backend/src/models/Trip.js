// src/models/Trip.js
const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    },
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Instead of a plain string, we now reference the Vehicle document
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACCEPTED", "ON_GOING", "COMPLETED", "CANCELLED"],
      default: "ACCEPTED",
    },

    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },

    // Optional: later we can add fare, distance, etc.
    fare: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Trip", tripSchema);
  