// src/pages/CoordinatorRequests.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50">
          <h3 className="text-xl font-bold text-midnight-900 m-0">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CoordinatorRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // resources
  const [drivers, setDrivers] = useState([]);
  const [vehiclesByDriver, setVehiclesByDriver] = useState({});
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");

  // selection
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");

  async function fetchPendingRequests() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/requests", { params: { status: "PENDING" } });
      setRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Pending requests error:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load pending requests"
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchResources() {
    setResourceLoading(true);
    setResourceError("");
    try {
      const res = await api.get("/coordinator/resources");
      setDrivers(res.data?.drivers || []);
      setVehiclesByDriver(res.data?.vehiclesByDriver || {});
    } catch (err) {
      console.error("Resources error:", err);
      setResourceError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load drivers/vehicles"
      );
    } finally {
      setResourceLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const vehiclesForSelectedDriver = useMemo(() => {
    if (!driverId) return [];
    return vehiclesByDriver[String(driverId)] || [];
  }, [driverId, vehiclesByDriver]);

  function openAssign(r) {
    setSelectedRequest(r);
    setAssignMsg("");
    setDriverId("");
    setVehicleId("");
    setAssignOpen(true);
    fetchResources();
  }

  async function submitAssign() {
    if (!selectedRequest?._id) return;

    if (!driverId || !vehicleId) {
      setAssignMsg("Please select both a driver and a vehicle.");
      return;
    }

    const ok = window.confirm(
      "Confirm assignment? This will create/start a trip for this request."
    );
    if (!ok) return;

    setAssigning(true);
    setAssignMsg("");

    try {
      const res = await api.post("/coordinator/assign", {
        requestId: selectedRequest._id,
        driverId,
        vehicleId,
      });

      const tripId = res.data?.trip?._id;
      setAssignMsg(
        tripId ? `Assigned successfully. Trip: ${tripId}` : "Assigned successfully."
      );

      // listeleri yenile
      await fetchPendingRequests();
      await fetchResources();
      // Wait a moment then close
      setTimeout(() => setAssignOpen(false), 1500);
    } catch (err) {
      console.error("Assign error:", err);
      setAssignMsg(
        err?.response?.data?.message || err?.message || "Assignment failed"
      );
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚖</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Pending Requests</h1>
                <p className="text-xs text-gray-500">Assign drivers & vehicles</p>
              </div>
            </div>
            <button
              onClick={fetchPendingRequests}
              disabled={loading}
              className="btn-secondary text-sm py-2 px-4 shadow-none rounded-pill"
            >
              {loading ? "Refreshing..." : "Refresh List"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-error p-4 rounded-r shadow-sm">
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <div className="floating-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-midnight-900">Waitlist</h2>
            <div className="text-sm text-gray-500">
              {requests.length} request{requests.length !== 1 ? 's' : ''} pending
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="shimmer h-16 w-full rounded-lg"></div>)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 font-medium">No pending requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Passenger</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pickup</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dropoff</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested At</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-midnight-900">{r.passenger?.name || "Guest"}</div>
                        <div className="text-xs text-brand-600">{r.passenger?.email || "-"}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm max-w-xs truncate" title={r.pickupAddress}>
                        {r.pickupAddress}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm max-w-xs truncate" title={r.dropAddress || r.dropoffAddress}>
                        {r.dropAddress || r.dropoffAddress}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openAssign(r)}
                          className="btn-primary py-1 px-4 text-sm shadow-sm hover:shadow-md"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={assignOpen}
        title="Assign Request"
        onClose={() => setAssignOpen(false)}
      >
        {selectedRequest ? (
          <div className="text-sm">
            <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Pickup Location</div>
                  <div className="font-semibold text-midnight-900">{selectedRequest.pickupAddress}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Dropoff Location</div>
                  <div className="font-semibold text-midnight-900">{selectedRequest.dropAddress || selectedRequest.dropoffAddress}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 uppercase">Passenger</div>
                <div className="font-semibold text-midnight-900">{selectedRequest.passenger?.name || "Guest"} <span className="text-gray-400 font-normal">({selectedRequest.passenger?.email || "-"})</span></div>
              </div>
            </div>

            {resourceError && (
              <div className="mb-4 bg-red-50 text-error p-3 rounded-lg text-sm">
                {resourceError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Driver</label>
                <select
                  value={driverId}
                  onChange={(e) => {
                    setDriverId(e.target.value);
                    setVehicleId("");
                    setAssignMsg("");
                  }}
                  disabled={resourceLoading}
                  className="input-uber appearance-none"
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.user?.name || d.user?.email || "Unknown"} (Lic: {d.licenseNumber || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value);
                    setAssignMsg("");
                  }}
                  disabled={!driverId || resourceLoading}
                  className="input-uber appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {driverId ? "Choose a vehicle..." : "Select driver first..."}
                  </option>
                  {vehiclesForSelectedDriver.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.plateNumber} ({v.model || 'Unknown Model'})
                    </option>
                  ))}
                </select>
              </div>

              {assignMsg && (
                <div className={`text-sm font-medium p-2 rounded ${assignMsg.includes("success") ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                  {assignMsg}
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  onClick={submitAssign}
                  disabled={!driverId || !vehicleId || assigning}
                  className="btn-primary w-full flex justify-center items-center"
                >
                  {assigning ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                      Assigning...
                    </>
                  ) : "Confirm Assignment"}
                </button>
                <button
                  onClick={fetchResources}
                  disabled={resourceLoading}
                  className="btn-outline px-4"
                  title="Reload Resources"
                >
                  ↻
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No request selected</div>
        )}
      </Modal>
    </div>
  );
}