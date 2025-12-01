// src/pages/DriverDashboard.jsx
<<<<<<< HEAD
import { useEffect, useState } from "react";
import api from "../api/client";
=======
>>>>>>> 892cf5dcc2251b94c4069cfa95815817b9588784
import { useAuth } from "../context/AuthContext";

export default function DriverDashboard() {
  const { user, logout } = useAuth();

<<<<<<< HEAD
  const [driverProfile, setDriverProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [availableRequests, setAvailableRequests] = useState([]);
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sayfa açıldığında gerekli her şeyi yükle
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");
      try {
        // 1) Sürücü profili
        const driverRes = await api.get("/drivers/me");
        setDriverProfile(driverRes.data);

        // 2) Kendi araçları
        const vehiclesRes = await api.get("/vehicles/my");
        const list = Array.isArray(vehiclesRes.data)
          ? vehiclesRes.data
          : vehiclesRes.data?.vehicles || [];

        setVehicles(list);

        // Varsayılan olarak ilk doğrulanmış aracı seç
        const verifiedVehicles = list.filter((v) => v.isVerified);
        if (verifiedVehicles.length > 0) {
          setSelectedVehicleId(verifiedVehicles[0]._id);
        }

        // 3) Uygun (PENDING) talepler
        await fetchAvailableRequests();

        // 4) Kendi trip'leri
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
      // burada error'ı ekrana basmak zorunda değiliz, genel hata mesajı zaten var
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

  async function handleAcceptRequest(requestId) {
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

      setSuccessMsg("Request accepted. Trip created.");
      await Promise.all([fetchAvailableRequests(), fetchMyTrips()]);
    } catch (err) {
      console.error("Error accepting request", err);
      setError(
        err.response?.data?.message ||
          "Failed to accept request. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartTrip(tripId) {
    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      await api.patch(`/trips/${tripId}/start`);
      setSuccessMsg("Trip started.");
      await fetchMyTrips();
    } catch (err) {
      console.error("Error starting trip", err);
      setError(
        err.response?.data?.message ||
          "Failed to start trip. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteTrip(tripId) {
    setError("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      await api.patch(`/trips/${tripId}/complete`);
      setSuccessMsg("Trip completed.");
      await fetchMyTrips();
    } catch (err) {
      console.error("Error completing trip", err);
      setError(
        err.response?.data?.message ||
          "Failed to complete trip. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading driver dashboard...</p>
      </div>
    );
  }

  const verifiedVehicles = vehicles.filter((v) => v.isVerified);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
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
          {driverProfile && (
            <p style={{ fontSize: 14 }}>
              License: <strong>{driverProfile.licenseNumber}</strong> – Class:{" "}
              <strong>{driverProfile.licenseClass}</strong> – Status:{" "}
              <strong>
                {driverProfile.isApproved ? "Approved" : "Pending approval"}
              </strong>
            </p>
          )}
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      {error && (
        <p style={{ color: "red", marginBottom: 8 }}>
          {error}
        </p>
      )}
      {successMsg && (
        <p style={{ color: "green", marginBottom: 8 }}>
          {successMsg}
        </p>
      )}

      {/* Vehicle selection */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <h3>My Vehicles</h3>
        {vehicles.length === 0 ? (
          <p>
            You have no vehicles yet. Please add a vehicle via the backend or
            coordinator flow.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Only verified vehicles can be used to accept requests.
            </p>
            <select
              value={selectedVehicleId}
              onChange={handleVehicleChange}
              style={{ padding: 8, minWidth: 260 }}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.plate} – {v.model}{" "}
                  {v.isVerified ? "(Verified)" : "(Pending)"}
                </option>
              ))}
            </select>
            {verifiedVehicles.length === 0 && (
              <p style={{ color: "orange", marginTop: 8 }}>
                You currently have no verified vehicles. Coordinator approval is
                required before you can drive.
              </p>
            )}
          </>
        )}
      </section>

      {/* Available Requests */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <h3>Available Requests</h3>
        {availableRequests.length === 0 ? (
          <p>No pending requests at the moment.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
            }}
          >
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
                <th style={{ borderBottom: "1px solid #ccc" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableRequests.map((req) => (
                <tr key={req._id}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {req.passenger?.name || req.passengerName || "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {req.pickupAddress}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {req.dropoffAddress}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {formatDate(req.createdAt)}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                      textAlign: "center",
                    }}
                  >
                    <button
                      disabled={actionLoading || !selectedVehicleId}
                      onClick={() => handleAcceptRequest(req._id)}
                    >
                      Accept
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* My Trips */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 4,
        }}
      >
        <h3>My Trips</h3>
        {trips.length === 0 ? (
          <p>You have no trips yet.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Request
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Vehicle
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Status
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Created
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Updated
                </th>
                <th style={{ borderBottom: "1px solid #ccc" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip._id}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {trip.request?.pickupAddress} →{" "}
                    {trip.request?.dropoffAddress}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {trip.vehicle?.plate} – {trip.vehicle?.model}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                      textTransform: "capitalize",
                    }}
                  >
                    {trip.status}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {formatDate(trip.createdAt)}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {formatDate(trip.updatedAt)}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                      textAlign: "center",
                    }}
                  >
                    {trip.status === "ACCEPTED" && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleStartTrip(trip._id)}
                      >
                        Start
                      </button>
                    )}
                    {trip.status === "ON_GOING" && (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleCompleteTrip(trip._id)}
                      >
                        Complete
                      </button>
                    )}
                    {trip.status !== "ACCEPTED" &&
                      trip.status !== "ON_GOING" && <span>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
=======
  return (
    <div style={{ padding: 24 }}>
      <h2>Driver Dashboard</h2>
      <p>Welcome, {user?.name} ({user?.email})</p>
      <button onClick={logout}>Logout</button>
      {/* Buraya available requests + my trips gelecek */}
>>>>>>> 892cf5dcc2251b94c4069cfa95815817b9588784
    </div>
  );
}
