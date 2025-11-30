// src/pages/PassengerDashboard.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PassengerDashboard() {
  const { user, logout } = useAuth();

  const [form, setForm] = useState({
    pickupAddress: "",
    dropoffAddress: "",
  });

  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sayfa açıldığında kendi taleplerini getir
  useEffect(() => {
    fetchMyRequests();
  }, []);

  async function fetchMyRequests() {
    setLoadingList(true);
    setError("");

    try {
      const res = await api.get("/requests/my");
      const data = res.data;

      let list = [];

      // Backend direkt array döndürüyorsa
      if (Array.isArray(data)) {
        list = data;
      }
      // Backend { requests: [...] } şeklinde döndürüyorsa
      else if (Array.isArray(data?.requests)) {
        list = data.requests;
      }

      setRequests(list);
    } catch (err) {
      console.error("Error fetching my requests", err);
      setError(
        err.response?.data?.message ||
          "Failed to load your requests. Please try again."
      );
    } finally {
      setLoadingList(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setCreating(true);

    try {
      await api.post("/requests", {
        pickupAddress: form.pickupAddress,
        dropoffAddress: form.dropoffAddress,
      });

      setSuccessMsg("Request created successfully.");
      setForm({ pickupAddress: "", dropoffAddress: "" });

      // Listeyi yenile
      await fetchMyRequests();
    } catch (err) {
      console.error("Error creating request", err);
      setError(
        err.response?.data?.message ||
          "Failed to create request. Please check your inputs."
      );
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h2>Passenger Dashboard</h2>
          <p>
            Welcome, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      {/* Request oluşturma formu */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <h3>Create New Ride Request</h3>
        <form onSubmit={handleCreateRequest}>
          <div style={{ marginBottom: 12 }}>
            <label>Pickup Address</label>
            <input
              type="text"
              name="pickupAddress"
              value={form.pickupAddress}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Dropoff Address</label>
            <input
              type="text"
              name="dropoffAddress"
              value={form.dropoffAddress}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          {error && (
            <p style={{ color: "red", marginBottom: 8 }}>{error}</p>
          )}
          {successMsg && (
            <p style={{ color: "green", marginBottom: 8 }}>{successMsg}</p>
          )}

          <button type="submit" disabled={creating} style={{ padding: "8px 16px" }}>
            {creating ? "Creating..." : "Create Request"}
          </button>
        </form>
      </section>

      {/* My requests listesi */}
      <section
        style={{
          border: "1px solid #ddd",
          padding: 16,
          borderRadius: 4,
        }}
      >
        <h3>My Requests</h3>

        {loadingList ? (
          <p>Loading your requests...</p>
        ) : !Array.isArray(requests) || requests.length === 0 ? (
          <p>You have no requests yet.</p>
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
                  Pickup
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Dropoff
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Status
                </th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
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
                      textTransform: "capitalize",
                    }}
                  >
                    {req.status}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    {formatDate(req.createdAt)}
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
