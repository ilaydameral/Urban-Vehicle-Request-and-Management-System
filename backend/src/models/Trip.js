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
      ref: "Driver", 
      required: true,
    },

    // Instead of a plain string, we now reference the Vehicle document
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    tripStatus: {
      type: String,
      enum: ["ACCEPTED", "ON_GOING", "COMPLETED", "CANCELLED"],
      default: "ACCEPTED",
    },
    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    // Was this trip rated by the passenger?
    isRated: {
      type: Boolean,
      default: false,
    },

    passengerRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Actual dropoff location
    actualDropLat: { type: Number },
    actualDropLng: { type: Number },
    actualDropAddress: { type: String },
  },
  {
    timestamps: true,
  }
);

// Let there be only one trip for the same request.
tripSchema.index({ request: 1 }, { unique: true });

// Only one active trip can be allowed at a time for the same driver.
tripSchema.index(
  { driver: 1 },
  {
    unique: true,
    partialFilterExpression: { tripStatus: { $in: ["ACCEPTED", "ON_GOING"] } },
  }
);

// 2) Only one active trip can be allowed at a time for the same vehicle.
tripSchema.index(
  { vehicle: 1 },
  {
    unique: true,
    partialFilterExpression: { tripStatus: { $in: ["ACCEPTED", "ON_GOING"] } },
  }
);

// -- TRIGGER (Simulated via Mongoose Middleware) --
tripSchema.post("save", async function () {
  if (this.isRated && this.passengerRating) {
    console.log(`[Trigger] Trip ${this._id} was rated. Updating driver stats...`);
    try {
      await Driver.calculateStats(this.driver);
    } catch (err) {
      console.error("[Trigger] Error updating driver stats:", err);
    }
  }
});

module.exports = mongoose.model("Trip", tripSchema);
