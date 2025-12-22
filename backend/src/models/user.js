// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["PASSENGER", "DRIVER", "COORDINATOR", "ADMIN"],
      default: "PASSENGER",
    },

    // YENİ EKLENEN ALAN → Admin kullanıcıyı pasif yapabilir
    isActive: {
      type: Boolean,
      default: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Driver = require("./Driver");
const Request = require("./Request");
const Vehicle = require("./Vehicle");

// -- TRIGGER (Cascade Delete) --
// When a User is deleted, clean up related data to maintain Referentail Integrity
userSchema.pre("findOneAndDelete", async function () {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (!doc) return;

    console.log(`[Cascade Delete] Deleting user ${doc._id} (${doc.role}). Cleaning dependent data...`);

    if (doc.role === "DRIVER") {
      // 1. Delete Driver Profile
      const driver = await mongoose.model("Driver").findOneAndDelete({ user: doc._id });
      if (driver) {
        console.log(`   -> Deleted Driver profile ${driver._id}`);
        // 2. Set Vehicles to INACTIVE or delete them? Let's setIsActive=false
        await mongoose.model("Vehicle").updateMany(
          { ownerDriver: driver._id },
          { $set: { isActive: false, availabilityStatus: "INACTIVE" } }
        );
        console.log(`   -> Deactivated vehicles for driver ${driver._id}`);
      }
    } else if (doc.role === "PASSENGER") {
      // 3. Cancel active requests?
      // Better: just delete PENDING requests. Keep history for others but maybe update ref?
      // Since it's NoSQL, if we delete user, the reference becomes dangling.
      // Let's delete PENDING requests to be clean.
      const result = await mongoose.model("Request").deleteMany({
        passenger: doc._id,
        status: "PENDING"
      });
      console.log(`   -> Deleted ${result.deletedCount} pending requests for passenger.`);
    }
  } catch (err) {
    console.error("Cascade delete error:", err);
  }
});

module.exports = mongoose.model("User", userSchema);
