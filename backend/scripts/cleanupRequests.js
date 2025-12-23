// scripts/cleanupRequests.js

require("dotenv").config();
const mongoose = require("mongoose");
const Request = require("../src/models/Request");

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connected");

        // Boş dropoffAddress'leri bul
        const invalidRequests = await Request.find({
            $or: [
                { dropoffAddress: "" },
                { dropoffAddress: { $exists: false } },
                { dropoffAddress: null }
            ]
        });

        console.log(`Found ${invalidRequests.length} invalid requests with empty dropoffAddress`);

        if (invalidRequests.length > 0) {
            console.log("\nInvalid requests:");
            invalidRequests.forEach((req, index) => {
                console.log(`  ${index + 1}. ID: ${req._id}, Pickup: ${req.pickupAddress}, Dropoff: "${req.dropoffAddress}"`);
            });

            const readline = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
            });

            readline.question("\nDo you want to DELETE these invalid requests? (yes/no): ", async (answer) => {
                if (answer.toLowerCase() === "yes") {
                    const result = await Request.deleteMany({
                        $or: [
                            { dropoffAddress: "" },
                            { dropoffAddress: { $exists: false } },
                            { dropoffAddress: null }
                        ]
                    });

                    console.log(`\n✅ Deleted ${result.deletedCount} invalid requests`);
                } else {
                    console.log("\n❌ Cleanup cancelled");
                }

                readline.close();
                await mongoose.connection.close();
                console.log("Database connection closed");
                process.exit(0);
            });
        } else {
            console.log("\n✅ No invalid requests found!");
            await mongoose.connection.close();
            process.exit(0);
        }

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

cleanup();
