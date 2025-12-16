// Clean up trips with inconsistent status
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Trip = require('../src/models/Trip');
const Request = require('../src/models/Request');

async function cleanInconsistentTrips() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cityride';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Find trips with ACCEPTED status but their requests are not ACCEPTED
        const trips = await Trip.find({ tripStatus: 'ACCEPTED' }).populate('request');

        console.log(`Found ${trips.length} ACCEPTED trips`);

        for (const trip of trips) {
            if (!trip.request) {
                console.log(`Trip ${trip._id}: No request found - DELETING`);
                await Trip.deleteOne({ _id: trip._id });
                continue;
            }

            if (trip.request.status !== 'ACCEPTED') {
                console.log(`Trip ${trip._id}: Request status is ${trip.request.status} (should be ACCEPTED)`);
                console.log(`  Pickup: ${trip.request.pickupAddress} → ${trip.request.dropAddress}`);
                console.log(`  Action: DELETING inconsistent trip`);
                await Trip.deleteOne({ _id: trip._id });

                // Also reset request status to PENDING if it's COMPLETED
                if (trip.request.status === 'COMPLETED') {
                    trip.request.status = 'PENDING';
                    await trip.request.save();
                    console.log(`  Request reset to PENDING`);
                }
            } else {
                console.log(`Trip ${trip._id}: ✅ Consistent (both ACCEPTED)`);
            }
        }

        console.log('\nCleanup complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

cleanInconsistentTrips();
