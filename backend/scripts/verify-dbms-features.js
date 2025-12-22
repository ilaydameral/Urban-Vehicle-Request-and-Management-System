const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../src/models/user");
const Driver = require("../src/models/Driver");
const Vehicle = require("../src/models/Vehicle");
const Request = require("../src/models/Request");
const Trip = require("../src/models/Trip");

dotenv.config({ path: "./.env" });

async function main() {
    console.log("🚀 Starting DBMS Features Verification...");

    // UPDATED: Using MONGODB_URI
    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is missing in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ DB Connection Failed:", err.message);
        process.exit(1);
    }

    let session;
    let userId, driverUserId, driverId, requestId, tripId, vehicleId;

    try {
        // 1. SETUP DATA
        console.log("\n--- 1. Setting up Test Data ---");
        const passengerUser = await User.create({
            name: "Test Passenger",
            email: `testpassenger_${Date.now()}@example.com`,
            password: "password123",
            role: "PASSENGER",
        });
        userId = passengerUser._id;

        const driverUser = await User.create({
            name: "Test Driver",
            email: `testdriver_${Date.now()}@example.com`,
            password: "password123",
            role: "DRIVER",
        });
        driverUserId = driverUser._id;

        const driver = await Driver.create({
            user: driverUserId,
            licenseNumber: "TR-123",
            licenseClass: "B",
            isApproved: true,
            isActive: true,
        });
        driverId = driver._id;

        const vehicle = await Vehicle.create({
            ownerDriver: driverId,
            brand: "TestCar",
            model: "X",
            plateNumber: `34TEST${Math.floor(Math.random() * 1000)}`,
            seatCount: 4,
            isVerified: true,
            isActive: true,
            vehicleType: "CAR",
            availabilityStatus: "AVAILABLE",
            locationLat: 41.0,
            locationLng: 29.0
        });
        vehicleId = vehicle._id;

        const request = await Request.create({
            passenger: userId,
            pickupAddress: "A",
            dropAddress: "B",
            pickupLat: 41.0,
            pickupLng: 29.0,
            dropLat: 41.1,
            dropLng: 29.1,
            status: "ACCEPTED",
        });
        requestId = request._id;

        console.log("✅ Test Data Created");

        // 2. TRANSACTION TEST (create Trip)
        console.log("\n--- 2. Testing Transaction (Trip Creation) ---");
        session = await mongoose.startSession();
        session.startTransaction();
        const trip = new Trip({
            request: requestId,
            passenger: userId,
            driver: driverId,
            vehicle: vehicleId,
            tripStatus: "ACCEPTED",
        });
        await trip.save({ session });

        await Vehicle.updateOne({ _id: vehicleId }, { availabilityStatus: "ON_TRIP" }, { session });

        await session.commitTransaction();
        tripId = trip._id;
        console.log("✅ Transaction Committed: Trip Created & Vehicle set to ON_TRIP");

        // 3. TRIGGER & STORED PROCEDURE TEST (Rating)
        console.log("\n--- 3. Testing Trigger & Stored Procedure (Rating) ---");

        trip.tripStatus = "COMPLETED";
        trip.isRated = true;
        trip.passengerRating = 5;
        await trip.save();

        console.log("ℹ️ Trip saved with 5 star rating. Waiting for trigger...");

        // Wait 3s
        await new Promise(r => setTimeout(r, 3000));

        const updatedDriver = await Driver.findById(driverId);
        console.log(`Driver Rating: ${updatedDriver.rating} (Expected: 5)`);
        console.log(`Driver Rating Count: ${updatedDriver.ratingCount} (Expected: 1)`);

        if (updatedDriver.rating === 5 && updatedDriver.ratingCount === 1) {
            console.log("✅ Trigger & Stored Procedure Verified!");
        } else {
            console.error("❌ Trigger Failed: Driver stats not updated correctly.");
        }

        // 4. VIEW / AGGREGATION TEST
        console.log("\n--- 4. Testing Aggregation View (Driver Report) ---");
        // We use the same aggregation pipeline logic as in adminController.js
        const report = await Driver.aggregate([
            { $match: { _id: driverId } },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userInfo",
                },
            },
            { $unwind: "$userInfo" },
            {
                $lookup: {
                    from: "trips",
                    localField: "_id",
                    foreignField: "driver",
                    as: "trips",
                },
            },
            {
                $project: {
                    name: "$userInfo.name",
                    totalTrips: 1,
                    rating: 1,
                    completedTripsCount: {
                        $size: {
                            $filter: {
                                input: "$trips",
                                as: "trip",
                                cond: { $eq: ["$$trip.tripStatus", "COMPLETED"] },
                            },
                        },
                    },
                },
            },
        ]);

        console.log("Report Result:", report[0]);
        if (report.length > 0 && report[0].rating === 5 && report[0].completedTripsCount === 1) {
            console.log("✅ Aggregation View Verified!");
        } else {
            console.error("❌ Aggregation Failed or Data Mismatch.");
        }

        // 5. CASCADE DELETE TEST
        console.log("\n--- 5. Testing Cascade Delete (User Trigger) ---");
        // We will delete the driverUser -> Should delete driverProfile and set Vehicle to inactive
        await User.findOneAndDelete({ _id: driverUserId });

        const deletedDriver = await Driver.findById(driverId);
        const deactivatedVehicle = await Vehicle.findById(vehicleId);

        if (!deletedDriver) {
            console.log("✅ Driver profile deleted automatically.");
        } else {
            console.error("❌ Driver profile still exists.");
        }

        if (deactivatedVehicle && deactivatedVehicle.isActive === false && deactivatedVehicle.availabilityStatus === "INACTIVE") {
            console.log("✅ Vehicle deactivated automatically.");
        } else {
            console.error("❌ Vehicle not deactivated.", deactivatedVehicle);
        }

        // 6. DASHBOARD ANALYTICS VIEW TEST
        console.log("\n--- 6. Testing Dashboard Analytics View ---");
        // Create extensive fake requests to test aggregation
        console.log("Creating 10 dummy requests for analytics...");
        const dummyRequests = [];
        for (let i = 0; i < 10; i++) {
            dummyRequests.push({
                passenger: userId, // Warning: userId deleted in cleanup if not careful, but we use existing userId
                pickupAddress: i % 2 === 0 ? "Besiktas" : "Kadikoy",
                dropAddress: "X",
                status: "COMPLETED"
            });
        }
        await Request.insertMany(dummyRequests);

        const peakHoursRaw = await Request.aggregate([
            { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log("Peak Hours Result:", peakHoursRaw);
        if (peakHoursRaw.length > 0) {
            console.log("✅ Peak Hours Aggregation Verified!");
        }

        // Cleanup dummy requests
        await Request.deleteMany({ dropAddress: "X" });

    } catch (err) {
        console.error("❌ Test Failed:", err);
        if (session && session.inTransaction()) {
            await session.abortTransaction();
        }
    } finally {
        if (session) session.endSession();
        // CLEANUP
        console.log("\n--- Cleaning Up ---");
        if (userId) await User.deleteOne({ _id: userId });
        if (driverUserId) await User.deleteOne({ _id: driverUserId });
        if (driverId) await Driver.deleteOne({ _id: driverId });
        if (vehicleId) await Vehicle.deleteOne({ _id: vehicleId });
        if (requestId) await Request.deleteOne({ _id: requestId });
        if (tripId) await Trip.deleteOne({ _id: tripId });
        console.log("✅ Cleanup Complete");
        await mongoose.disconnect();
    }
}

main();
