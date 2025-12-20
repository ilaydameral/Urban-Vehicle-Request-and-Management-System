// frontend/src/pages/DriverDashboard.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import DriverTripMap from "../components/DriverTripMap";


export default function DriverDashboard() {
  const { user, logout } = useAuth();

  const [driverProfile, setDriverProfile] = useState(null);

  // Driver profile creation form (shown when /drivers/me returns 404 / no profile)
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseClass, setLicenseClass] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Add vehicle form
  const [plateNumber, setPlateNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [availableRequests, setAvailableRequests] = useState([]);
  const [trips, setTrips] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null); // Yeni: dashboard istatistikleri
  const [currentTripPosition, setCurrentTripPosition] = useState(null); // Track current position for manual complete

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      try {
        // 1) Driver profile (404 normal -> show form)
        let profile = null;
        try {
          const driverRes = await api.get("/drivers/me");
          profile = driverRes.data;
        } catch (err) {
          if (err.response?.status === 404) {
            profile = null;
          } else {
            throw err;
          }
        }
        setDriverProfile(profile);

        // 1.5) Dashboard stats (rating, earnings, etc.)
        if (profile) {
          try {
            const dashboardRes = await api.get("/drivers/dashboard");
            setDashboardStats(dashboardRes.data);
          } catch (err) {
            console.error("Error fetching dashboard stats:", err);
            // Dashboard stats optional, don't block
          }
        }

        // 2) Vehicles
        const vehiclesRes = await api.get("/vehicles/my");
        const raw = vehiclesRes.data;
        const list = Array.isArray(raw) ? raw : raw?.vehicles || [];
        setVehicles(list);

        // default select first verified
        const verified = list.filter((v) => v.isVerified);
        if (verified.length > 0) setSelectedVehicleId(verified[0]._id);

        // 3) Available requests
        await fetchAvailableRequests();

        // 4) My trips
        await fetchMyTrips();
      } catch (err) {
        console.error("Error initializing driver dashboard", err);
        setError(
          err.response?.data?.message ||
          "Failed to load driver data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function fetchAvailableRequests() {
    try {
      const res = await api.get("/requests/available");
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.requests || [];
      setAvailableRequests(list);
    } catch (err) {
      console.error("Error fetching available requests", err);
    }
  }

  async function fetchMyTrips() {
    try {
      const res = await api.get("/trips/my");
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.trips || [];
      setTrips(list);
    } catch (err) {
      console.error("Error fetching my trips", err);
    }
  }

  const handleVehicleChange = (e) => {
    setSelectedVehicleId(e.target.value);
  };

  async function handleCreateProfile(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const ln = licenseNumber.trim();
    const lc = licenseClass.trim();

    if (!ln || !lc) {
      setError("Please fill in both license number and license class.");
      return;
    }

    setProfileSubmitting(true);
    try {
      await api.post("/drivers/profile", {
        licenseNumber: ln,
        licenseClass: lc,
      });

      const driverRes = await api.get("/drivers/me");
      setDriverProfile(driverRes.data);

      setSuccessMsg(
        "Driver profile created successfully. Waiting for coordinator approval."
      );
    } catch (err) {
      console.error("Error creating driver profile", err);
      setError(
        err.response?.data?.message ||
        "Failed to create driver profile. Please try again."
      );
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const p = plateNumber.trim();
    const b = brand.trim();
    const m = model.trim();

    if (!p || !b || !m) {
      setError("Please fill plateNumber, brand and model.");
      return;
    }

    setVehicleSubmitting(true);
    try {
      await api.post("/vehicles", { plateNumber: p, brand: b, model: m });

      setSuccessMsg(
        "Vehicle added successfully. Waiting for coordinator verification."
      );

      // refresh vehicles list
      const vehiclesRes = await api.get("/vehicles/my");
      const raw = vehiclesRes.data;
      const list = Array.isArray(raw) ? raw : raw?.vehicles || [];
      setVehicles(list);

      const verified = list.filter((v) => v.isVerified);
      if (!selectedVehicleId && verified.length > 0) {
        setSelectedVehicleId(verified[0]._id);
      }

      setPlateNumber("");
      setBrand("");
      setModel("");
    } catch (err) {
      console.error("Error adding vehicle", err);
      setError(
        err.response?.data?.message || "Failed to add vehicle. Please try again."
      );
    } finally {
      setVehicleSubmitting(false);
    }
  }

  // PENDING request kabul → trip oluştur (status = ON_GOING)
  async function handleAcceptRequest(requestId) {
    // ✅ Phase 2: prevent accidental accept
    if (!window.confirm("Accept this request and start a trip?")) return;

    if (!driverProfile) {
      setError("Driver profile is missing. Please create your profile first.");
      return;
    }

    if (!driverProfile.isApproved) {
      setError(
        "Your driver profile is not approved yet. Please wait for coordinator approval."
      );
      return;
    }

    if (!selectedVehicleId) {
      setError("You must select a verified vehicle before accepting a request.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      await api.post("/trips", {
        requestId,
        vehicleId: selectedVehicleId,
      });

      setSuccessMsg("Request accepted. Trip created successfully.");

      // Force refresh with retry to ensure backend is updated
      setActionLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for backend

      await fetchMyTrips();
      await fetchAvailableRequests();

      // Double-check refresh after 1 second
      setTimeout(async () => {
        await fetchMyTrips();
        await fetchAvailableRequests();
      }, 1000);

      setActionLoading(false);

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Error accepting request", err);
      setError(
        err.response?.data?.message ||
        "Failed to accept request. Please try again."
      );
      // Auto-clear error message after 5 seconds
      setTimeout(() => setError(""), 5000);
    } finally {
      setActionLoading(false);
    }
  }

  // REJECT request → marks as REJECTED
  async function handleRejectRequest(requestId) {
    if (!window.confirm("Reject this request?")) return;

    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      await api.patch(`/requests/${requestId}/reject`);
      setSuccessMsg("Request rejected successfully.");

      // Immediate refresh with retry (like accept)
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchAvailableRequests();

      // Double-check refresh after 1 second
      setTimeout(async () => {
        await fetchAvailableRequests();
      }, 1000);

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Error rejecting request", err);
      setError(
        err.response?.data?.message ||
        "Failed to reject request. Please try again."
      );
      // Auto-clear error message after 5 seconds
      setTimeout(() => setError(""), 5000);
    } finally {
      setActionLoading(false);
    }
  }

  // ACCEPTED trip → ON_GOING (Start the trip)
  async function handleStartTrip(tripId) {
    if (!window.confirm("Start this trip?")) return;

    console.log("[handleStartTrip] Starting trip:", tripId);
    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      const response = await api.patch(`/trips/${tripId}/start`);
      console.log("[handleStartTrip] Success:", response.data);
      setSuccessMsg("Trip started successfully!");

      // Auto-refresh with retry
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchMyTrips();
      await fetchAvailableRequests();

      setTimeout(async () => {
        await fetchMyTrips();
        await fetchAvailableRequests();
      }, 1000);

      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("[handleStartTrip] Error:", err);
      console.error("[handleStartTrip] Response:", err.response?.data);

      const errorMsg = err.response?.data?.message || "Failed to start trip. Please try again.";
      setError(`Start failed: ${errorMsg}`);

      // Show error longer for debugging
      setTimeout(() => setError(""), 10000);
    } finally {
      setActionLoading(false);
    }
  }

  // ON_GOING trip → COMPLETED
  async function handleCompleteTrip(tripId, currentPosition = null) {
    // ✅ Phase 2: prevent accidental complete
    if (!window.confirm("Complete this trip?")) return;

    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      const payload = {};
      if (currentPosition) {
        payload.actualDropLat = currentPosition.lat;
        payload.actualDropLng = currentPosition.lng;

        // Reverse geocode in frontend
        if (window.google && window.google.maps) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const result = await new Promise((resolve, reject) => {
              geocoder.geocode(
                { location: { lat: currentPosition.lat, lng: currentPosition.lng } },
                (results, status) => {
                  if (status === 'OK' && results[0]) {
                    resolve(results[0].formatted_address);
                  } else {
                    reject(new Error('Geocoding failed'));
                  }
                }
              );
            });
            payload.actualDropAddress = result;
            console.log('📍 Frontend geocoded address:', result);
          } catch (geoErr) {
            console.error('Frontend geocoding failed:', geoErr);
            payload.actualDropAddress = `${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}`;
          }
        }
      }
      await api.patch(`/trips/${tripId}/complete`, payload);
      setSuccessMsg("Trip completed.");

      // Auto-refresh with retry
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchMyTrips();
      await fetchAvailableRequests();

      setTimeout(async () => {
        await fetchMyTrips();
        await fetchAvailableRequests();
      }, 1000);

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Error completing trip", err);
      setError(
        err.response?.data?.message ||
        "Failed to complete trip. Please try again."
      );
      // Auto-clear error message after 5 seconds
      setTimeout(() => setError(""), 5000);
    } finally {
      setActionLoading(false);
    }
  }

  // ON_GOING trip → CANCELLED
  async function handleCancelTrip(tripId) {
    // ✅ Phase 2: prevent accidental cancel
    if (!window.confirm("Cancel this trip?")) return;

    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      await api.patch(`/trips/${tripId}/cancel`);
      setSuccessMsg("Trip cancelled.");

      // Auto-refresh with retry
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchMyTrips();
      await fetchAvailableRequests();

      setTimeout(async () => {
        await fetchMyTrips();
        await fetchAvailableRequests();
      }, 1000);

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Error cancelling trip", err);
      setError(
        err.response?.data?.message ||
        "Failed to cancel trip. Please try again."
      );
      // Auto-clear error message after 5 seconds
      setTimeout(() => setError(""), 5000);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading driver dashboard...</p>
      </div>
    );
  }

  const verifiedVehicles = vehicles.filter((v) => v.isVerified);
  const canDrive = Boolean(driverProfile?.isApproved);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h2>Driver Dashboard</h2>
          <p>
            Welcome, <strong>{user?.name}</strong> ({user?.email})
          </p>

          {driverProfile ? (
            <p style={{ fontSize: 14 }}>
              License: <strong>{driverProfile.licenseNumber}</strong> — Class:{" "}
              <strong>{driverProfile.licenseClass}</strong> — Status:{" "}
              <strong>
                {driverProfile.isApproved ? "Approved" : "Pending approval"}
              </strong>
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "#a15c00" }}>
              You don&apos;t have a driver profile yet. Please create it below.
            </p>
          )}
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      {error && <p style={{ color: "red", marginBottom: 8 }}>{error}</p>}
      {successMsg && (
        <p style={{ color: "green", marginBottom: 8 }}>{successMsg}</p>
      )}

      {/* Driver Statistics Card */}
      {dashboardStats && driverProfile && (
        <section
          style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 6,
            marginBottom: 24,
            backgroundColor: "#f9f9f9"
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>📊 Your Statistics</h3>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>⭐ Average Rating</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#0066ff" }}>
                {dashboardStats.driver?.rating?.toFixed(1) || "0.0"} / 5.0
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                ({dashboardStats.driver?.ratingCount || 0} ratings)
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>🚗 Total Trips</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#28a745" }}>
                {dashboardStats.driver?.totalTrips || 0}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                ({dashboardStats.trips?.counts?.completed || 0} completed)
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>📅 Today's Earnings</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#28a745" }}>
                ₺{(trips.filter(t => {
                  const completedAt = t.endTime || t.completedAt;
                  if (!completedAt) return false;
                  const today = new Date();
                  const tripDate = new Date(completedAt);
                  return tripDate.toDateString() === today.toDateString() && t.tripStatus === 'COMPLETED';
                }).reduce((sum, t) => sum + (t.price || 0), 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                Today's completed trips
              </div>
            </div>
          </div>
        </section>
      )}

      {/* (1) Driver Profile creation */}
      {!driverProfile && (
        <section
          style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 6,
            marginBottom: 24,
          }}
        >
          <h3>Create Driver Profile</h3>
          <p style={{ fontSize: 14, marginBottom: 12 }}>
            You must create a driver profile to be eligible for approval and to
            accept requests.
          </p>

          <form onSubmit={handleCreateProfile}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, marginBottom: 4 }}>
                  License Number
                </label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="licenseNumber"
                  style={{ padding: 8, minWidth: 260 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: 13, marginBottom: 4 }}>
                  License Class
                </label>
                <input
                  value={licenseClass}
                  onChange={(e) => setLicenseClass(e.target.value)}
                  placeholder="licenseClass (e.g., B)"
                  style={{ padding: 8, minWidth: 200 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "end" }}>
                <button type="submit" disabled={profileSubmitting}>
                  {profileSubmitting ? "Creating..." : "Create Profile"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* (2) Add Vehicle UI */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 6,
          marginBottom: 24,
        }}
      >
        <h3>Add Vehicle</h3>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Add your vehicle. Coordinator verification is required before you can
          use it.
        </p>

        <form onSubmit={handleAddVehicle}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: 13, marginBottom: 4 }}>
                Plate Number
              </label>
              <input
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="plateNumber"
                style={{ padding: 8, minWidth: 220 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: 13, marginBottom: 4 }}>Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="brand"
                style={{ padding: 8, minWidth: 180 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: 13, marginBottom: 4 }}>Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="model"
                style={{ padding: 8, minWidth: 180 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button type="submit" disabled={vehicleSubmitting}>
                {vehicleSubmitting ? "Adding..." : "Add Vehicle"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* (3) Vehicle selection */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 6,
          marginBottom: 24,
        }}
      >
        <h3>My Vehicles</h3>

        {driverProfile && !driverProfile.isApproved && (
          <p style={{ color: "orange", marginTop: 8 }}>
            Your driver profile is pending coordinator approval. You can view
            requests, but you cannot accept them until you are approved.
          </p>
        )}

        {vehicles.length === 0 ? (
          <p>You have no vehicles yet.</p>
        ) : (
          <>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Only verified vehicles can be used to accept requests.
            </p>

            <select
              value={selectedVehicleId}
              onChange={handleVehicleChange}
              style={{ padding: 8, minWidth: 320 }}
            >
              <option value="">Select vehicle</option>
              {verifiedVehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {(v.plateNumber || "").toUpperCase()} — {v.brand} {v.model}
                </option>
              ))}
            </select>

            {verifiedVehicles.length === 0 && (
              <p style={{ color: "orange", marginTop: 8 }}>
                You currently have no verified vehicles. Coordinator verification
                is required before you can drive.
              </p>
            )}

            {/* Vehicles list (optional view) */}
            <div style={{ marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                      Plate
                    </th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                      Vehicle
                    </th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v._id}>
                      <td style={{ padding: "6px 0" }}>
                        {(v.plateNumber || "").toUpperCase()}
                      </td>
                      <td style={{ padding: "6px 0" }}>
                        {v.brand} {v.model}
                      </td>
                      <td style={{ padding: "6px 0" }}>
                        {v.isVerified ? "YES" : "NO"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* (4) Available Requests */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 6,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Available Requests</h3>
          <button
            onClick={fetchAvailableRequests}
            disabled={actionLoading}
            style={{
              padding: "6px 12px",
              backgroundColor: actionLoading ? "#ccc" : "#0066ff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontSize: "13px"
            }}
          >
            {actionLoading ? "..." : "🔄 Refresh"}
          </button>
        </div>

        {availableRequests.length === 0 ? (
          <p>No pending requests at the moment.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Passenger
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Pickup
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Dropoff
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Created At
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Status
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {availableRequests.map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: "6px 4px" }}>
                    {r.passenger?.name || r.passengerName || "-"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>{r.pickupAddress}</td>
                  <td style={{ padding: "6px 4px" }}>{r.dropAddress || r.dropoffAddress}</td>
                  <td style={{ padding: "6px 4px" }}>{formatDate(r.createdAt)}</td>
                  <td style={{ padding: "6px 4px" }}>{r.status}</td>
                  <td style={{ padding: "6px 4px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleAcceptRequest(r._id)}
                        disabled={
                          actionLoading ||
                          !selectedVehicleId ||
                          !driverProfile ||
                          !canDrive
                        }
                        style={{
                          padding: "6px 12px",
                          backgroundColor: actionLoading || !selectedVehicleId || !driverProfile || !canDrive ? "#ccc" : "#0066ff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: actionLoading || !selectedVehicleId || !driverProfile || !canDrive ? "not-allowed" : "pointer",
                          fontSize: "13px"
                        }}
                      >
                        {actionLoading ? "..." : "Accept"}
                      </button>

                      <button
                        onClick={() => handleRejectRequest(r._id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: actionLoading ? "#ccc" : "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                          fontSize: "13px"
                        }}
                      >
                        {actionLoading ? "..." : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* (4.5) Active Trip with Live Map */}
      {trips.filter(t => t.tripStatus === "ON_GOING").length > 0 && (
        <section
          style={{
            border: "2px solid #0066ff",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            backgroundColor: "#f0f8ff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "#0066ff" }}>
            🚗 Active Trip - Live Tracking
          </h3>
          {trips
            .filter(t => t.tripStatus === "ON_GOING")
            .map(trip => (
              <div key={trip._id}>
                <DriverTripMap
                  trip={trip}
                  onTripComplete={handleCompleteTrip}
                  onPositionUpdate={setCurrentTripPosition}
                />

                {/* Manual Complete Button (fallback) */}
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <button
                    onClick={() => handleCompleteTrip(trip._id, currentTripPosition)}
                    disabled={actionLoading}
                    style={{
                      padding: "10px 24px",
                      backgroundColor: actionLoading ? "#ccc" : "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {actionLoading ? "Completing..." : "✅ Complete Trip Now"}
                  </button>
                </div>
              </div>
            ))}
        </section>
      )}

      {/* (5) My Trips */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>My Trips</h3>
          <button
            onClick={fetchMyTrips}
            disabled={actionLoading}
            style={{
              padding: "6px 12px",
              backgroundColor: actionLoading ? "#ccc" : "#0066ff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontSize: "13px"
            }}
          >
            {actionLoading ? "..." : "🔄 Refresh"}
          </button>
        </div>

        {trips.length === 0 ? (
          <p>You have no trips yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Passenger
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Pickup
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Dropoff
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Status
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Started At
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Completed At
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Price
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t._id}>
                  <td style={{ padding: "6px 4px" }}>
                    {t.passenger?.name || t.request?.passenger?.name || "-"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    {t.request?.pickupAddress || t.pickupAddress || "-"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    <div>
                      {t.actualDropAddress || t.request?.dropAddress ||
                        t.request?.dropoffAddress ||
                        t.dropAddress ||
                        t.dropoffAddress ||
                        "-"}
                    </div>
                    {t.actualDropAddress && (
                      <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                        (Erken iniş)
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 4px" }}>{t.tripStatus}</td>
                  <td style={{ padding: "6px 4px" }}>{formatDate(t.startTime)}</td>
                  <td style={{ padding: "6px 4px" }}>{formatDate(t.endTime)}</td>
                  <td style={{ padding: "6px 4px", fontWeight: "bold", color: "#28a745" }}>
                    {t.price ? `₺${t.price.toFixed(2)}` : "-"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    {t.tripStatus === "ACCEPTED" ? (
                      <button
                        onClick={() => handleStartTrip(t._id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: actionLoading ? "not-allowed" : "pointer"
                        }}
                      >
                        {actionLoading ? "..." : "Start"}
                      </button>
                    ) : t.tripStatus === "ON_GOING" ? (
                      <>
                        <button
                          onClick={() => handleCompleteTrip(t._id)}
                          disabled={actionLoading}
                          style={{ marginRight: 8 }}
                        >
                          {actionLoading ? "..." : "Complete"}
                        </button>
                        <button
                          onClick={() => handleCancelTrip(t._id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "..." : "Cancel"}
                        </button>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}