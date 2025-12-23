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
    // Trip.js içinde
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",   // "User" yerine
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

    // Bu trip yolcu tarafından puanlandı mı?
    isRated: {
      type: Boolean,
      default: false,
    },

    // Yolcunun sürücüye verdiği puan (1–5 arası)
    passengerRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // Optional: later we can add fare, distance, etc.
    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Actual dropoff location (if completed early)
    actualDropLat: { type: Number },
    actualDropLng: { type: Number },
    actualDropAddress: { type: String },
  },
  {
    timestamps: true,
  }
);

// 1) Aynı request için 1 tane trip olsun
tripSchema.index({ request: 1 }, { unique: true });

// 2) Aynı driver için aynı anda sadece 1 aktif (ACCEPTED veya ON_GOING) trip olsun
tripSchema.index(
  { driver: 1 },
  {
    unique: true,
    partialFilterExpression: { tripStatus: { $in: ["ACCEPTED", "ON_GOING"] } },
  }
);

// 3) Aynı araç için aynı anda sadece 1 aktif (ACCEPTED veya ON_GOING) trip olsun
tripSchema.index(
  { vehicle: 1 },
  {
    unique: true,
    partialFilterExpression: { tripStatus: { $in: ["ACCEPTED", "ON_GOING"] } },
  }
);

// -- TRIGGER (Simulated via Mongoose Middleware) --
// After a trip is saved, check if we need to update Driver stats
tripSchema.post("save", async function () {
  // 'this' refers to the document that was just saved
  if (this.isRated && this.passengerRating) {
    console.log(`[Trigger] Trip ${this._id} was rated. Updating driver stats...`);
    // Call the "Stored Procedure" on the Driver model
    // We access the model via mongoose.model to avoid circular requires if possible,
    // or simply require Driver at top. But mongoose.model('Driver') is safer here.
    const Driver = mongoose.model("Driver");
    try {
      await Driver.calculateStats(this.driver);
    } catch (err) {
      console.error("[Trigger] Error updating driver stats:", err);
    }
  }
});

module.exports = mongoose.model("Trip", tripSchema);
