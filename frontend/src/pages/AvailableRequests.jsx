import { useEffect, useState } from "react";
import axios from "axios";

function AvailableRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");

  // Fetch all available requests for DRIVER
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get("http://localhost:5001/api/requests/available", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching available requests:", err);
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Accept request → starts a new trip
  const acceptRequest = async (requestId) => {
    try {
      setLoadingId(requestId);
      setError("");

      const res = await axios.post("http://localhost:5001/api/trips",
        { requestId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("Trip started successfully!");
      console.log("Trip created:", res.data);

      // Refresh list after accepting
      fetchRequests();
    } catch (err) {
      console.error("Error accepting request:", err);
      setError(err.response?.data?.message || "Error accepting request");
    } finally {
      setLoadingId(null);
    }
  };

  // Reject request → marks as REJECTED
  const rejectRequest = async (requestId) => {
    try {
      setLoadingId(requestId);
      setError("");

      const res = await axios.patch(
        `http://localhost:5001/api/requests/${requestId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("Request rejected successfully!");
      console.log("Request rejected:", res.data);

      // Refresh list after rejecting
      fetchRequests();
    } catch (err) {
      console.error("Error rejecting request:", err);
      setError(err.response?.data?.message || "Error rejecting request");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>Available Requests</h2>
        <button
          onClick={fetchRequests}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: loading ? "#ccc" : "#0066ff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {error && (
        <p style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </p>
      )}

      {loading && <p>Loading...</p>}

      {!loading && requests.length === 0 && (
        <p>No pending requests available.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {requests.map((req) => (
          <li
            key={req._id}
            style={{
              border: "1px solid #ddd",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          >
            <p><strong>Pickup:</strong> {req.pickupAddress}</p>
            <p><strong>Dropoff:</strong> {req.dropAddress || req.dropoffAddress}</p>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => acceptRequest(req._id)}
                disabled={loadingId === req._id}
                style={{
                  padding: "8px 12px",
                  backgroundColor: loadingId === req._id ? "#888" : "#0066ff",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: loadingId === req._id ? "not-allowed" : "pointer",
                  flex: 1,
                }}
              >
                {loadingId === req._id ? "Processing..." : "✅ Accept Request"}
              </button>

              <button
                onClick={() => rejectRequest(req._id)}
                disabled={loadingId === req._id}
                style={{
                  padding: "8px 12px",
                  backgroundColor: loadingId === req._id ? "#888" : "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: loadingId === req._id ? "not-allowed" : "pointer",
                  flex: 1,
                }}
              >
                {loadingId === req._id ? "Processing..." : "❌ Reject"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AvailableRequests;
