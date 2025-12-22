// Fix existing REJECTED requests - convert them back to PENDING
// Run this script ONCE to fix the data

const mongoose = require('mongoose');
const Request = require('./src/models/Request');

async function fixRejectedRequests() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cityride');
        console.log('✓ Connected to MongoDB');

        // Find all REJECTED requests that have no associated COMPLETED trip
        const rejectedRequests = await Request.find({ status: 'REJECTED' });

        console.log(`Found ${rejectedRequests.length} REJECTED requests`);

        if (rejectedRequests.length === 0) {
            console.log('No REJECTED requests to fix');
            process.exit(0);
        }

        // For each request, check if it was legitimately rejected (had a trip) or just rejected by a driver
        for (const request of rejectedRequests) {
            // Check if there's a completed trip for this request
            const Trip = require('./src/models/Trip');
            const trip = await Trip.findOne({ request: request._id });

            if (!trip || trip.tripStatus === 'CANCELLED') {
                // No trip or cancelled trip - this request should be PENDING again
                // Move rejectedBy to rejectedDrivers array
                if (request.rejectedBy && !request.rejectedDrivers?.includes(request.rejectedBy)) {
                    if (!request.rejectedDrivers) {
                        request.rejectedDrivers = [];
                    }
                    request.rejectedDrivers.push(request.rejectedBy);
                }

                // Reset status to PENDING
                request.status = 'PENDING';
                await request.save();

                console.log(`✓ Fixed request ${request._id}: ${request.pickupAddress} → ${request.dropAddress}`);
            } else {
                console.log(`- Skipped request ${request._id} (has completed trip)`);
            }
        }

        console.log('\n✓ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing rejected requests:', error);
        process.exit(1);
    }
}

// Run only if executed directly
if (require.main === module) {
    fixRejectedRequests();
}

module.exports = fixRejectedRequests;
