// src/utils/tripNotifications.js
const { sendEmail } = require("./emailService");

 // Send an email when a vehicle/driver is assigned to the passenger.
async function notifyPassengerTripAssigned({ passenger, driver, vehicle, trip }) {
    try {
        const passengerEmail = passenger.email;
        const passengerName = passenger.name || "Valued Customer";
        const driverName = driver.user?.name || driver.user?.email || "Driver";
        const vehiclePlate = vehicle.plateNumber || "vehicle";

        const subject = "🚗 CityRide - Your Ride Has Been Assigned!";

        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">Your Ride is Ready!</h2>
        <p>Hello ${passengerName},</p>
        <p>Great news! Your ride request has been assigned to a driver.</p>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trip Details:</h3>
          <p><strong>Pickup:</strong> ${trip.pickupAddress}</p>
          <p><strong>Drop-off:</strong> ${trip.dropAddress}</p>
          <p><strong>Driver:</strong> ${driverName}</p>
          <p><strong>Vehicle:</strong> ${vehiclePlate}</p>
          <p><strong>Status:</strong> ${trip.tripStatus}</p>
        </div>
        
        <p>Your driver will contact you shortly for pickup.</p>
        <p>Have a safe journey!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CityRide - Urban Transportation Service
        </p>
      </div>
    `;

        const text = `
Hello ${passengerName},

Your ride request has been assigned!

Trip Details:
- Pickup: ${trip.pickupAddress}
- Drop-off: ${trip.dropAddress}
- Driver: ${driverName}
- Vehicle: ${vehiclePlate}
- Status: ${trip.tripStatus}

Have a safe journey!

CityRide
    `;

        await sendEmail({
            to: passengerEmail,
            subject,
            text,
            html,
        });

        console.log(`✅ Email sent to passenger: ${passengerEmail}`);
    } catch (err) {
        console.error("Error sending passenger assignment email:", err);
    }
}


// Send an email when the driver is assigned a new task.
async function notifyDriverTripAssigned({ driver, passenger, trip, vehicle }) {
    try {
        const driverEmail = driver.user?.email;
        const driverName = driver.user?.name || "Driver";
        const passengerName = passenger.name || passenger.email || "Passenger";

        if (!driverEmail) {
            console.warn("Driver email not found, skipping notification");
            return;
        }

        const subject = "🚗 CityRide - New Trip Assignment";

        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">New Trip Assigned</h2>
        <p>Hello ${driverName},</p>
        <p>You have been assigned a new trip. Please prepare for pickup.</p>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trip Details:</h3>
          <p><strong>Passenger:</strong> ${passengerName}</p>
          <p><strong>Pickup:</strong> ${trip.pickupAddress}</p>
          <p><strong>Drop-off:</strong> ${trip.dropAddress}</p>
          <p><strong>Vehicle:</strong> ${vehicle?.plateNumber || "Your vehicle"}</p>
          <p><strong>Status:</strong> ${trip.tripStatus}</p>
        </div>
        
        <p>Please contact the passenger for pickup coordination.</p>
        <p>Drive safely!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          CityRide - Urban Transportation Service
        </p>
      </div>
    `;

        const text = `
Hello ${driverName},

You have been assigned a new trip.

Trip Details:
- Passenger: ${passengerName}
- Pickup: ${trip.pickupAddress}
- Drop-off: ${trip.dropAddress}
- Vehicle: ${vehicle?.plateNumber || "Your vehicle"}
- Status: ${trip.tripStatus}

Drive safely!

CityRide
    `;

        await sendEmail({
            to: driverEmail,
            subject,
            text,
            html,
        });

        console.log(`✅ Email sent to driver: ${driverEmail}`);
    } catch (err) {
        console.error("Error sending driver assignment email:", err);
    }
}

//When a trip is cancelled, an email is sent to both the passenger and the driver.
async function notifyTripCancellation({ passenger, driver, trip, cancelledBy }) {
    try {
        // Passenger email
        if (passenger?.email) {
            const passengerSubject = "❌ CityRide - Trip Cancelled";
            const passengerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Trip Cancelled</h2>
          <p>Hello ${passenger.name || "Valued Customer"},</p>
          <p>Your trip has been cancelled.</p>
          
          <div style="background: #fff5f5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0;">Cancelled Trip:</h3>
            <p><strong>Pickup:</strong> ${trip.pickupAddress}</p>
            <p><strong>Drop-off:</strong> ${trip.dropAddress}</p>
            <p><strong>Cancelled by:</strong> ${cancelledBy || "System"}</p>
          </div>
          
          <p>You can create a new ride request anytime from your dashboard.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            CityRide - Urban Transportation Service
          </p>
        </div>
      `;

            await sendEmail({
                to: passenger.email,
                subject: passengerSubject,
                text: `Hello ${passenger.name || "Valued Customer"},\n\nYour trip from ${trip.pickupAddress} to ${trip.dropAddress} has been cancelled.\n\nCityRide`,
                html: passengerHtml,
            });

            console.log(`✅ Cancellation email sent to passenger: ${passenger.email}`);
        }

        // Driver email
        if (driver?.user?.email) {
            const driverSubject = "❌ CityRide - Trip Cancelled";
            const driverHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Trip Cancelled</h2>
          <p>Hello ${driver.user?.name || "Driver"},</p>
          <p>A trip assigned to you has been cancelled.</p>
          
          <div style="background: #fff5f5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0;">Cancelled Trip:</h3>
            <p><strong>Passenger:</strong> ${passenger?.name || passenger?.email || "Passenger"}</p>
            <p><strong>Pickup:</strong> ${trip.pickupAddress}</p>
            <p><strong>Drop-off:</strong> ${trip.dropAddress}</p>
            <p><strong>Cancelled by:</strong> ${cancelledBy || "System"}</p>
          </div>
          
          <p>You are now available for new assignments.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            CityRide - Urban Transportation Service
          </p>
        </div>
      `;

            await sendEmail({
                to: driver.user.email,
                subject: driverSubject,
                text: `Hello ${driver.user?.name || "Driver"},\n\nThe trip from ${trip.pickupAddress} to ${trip.dropAddress} has been cancelled.\n\nCityRide`,
                html: driverHtml,
            });

            console.log(`✅ Cancellation email sent to driver: ${driver.user.email}`);
        }
    } catch (err) {
        console.error("Error sending cancellation emails:", err);
    }
}

module.exports = {
    notifyPassengerTripAssigned,
    notifyDriverTripAssigned,
    notifyTripCancellation,
};
