/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["PENDING", "ACCEPTED", "COMPLETED", "CANCELLED"];

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function AdminGlobalRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchRequests() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/requests", { params });
      setRequests(res.data?.requests || []);
    } catch (err) {
      console.error("Error loading requests:", err);
      const msg = err.response?.data?.message || "An error occurred while loading requests.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📡</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Global Requests</h1>
                <p className="text-xs text-gray-500">Monitor all ride requests</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/admin/trips" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Global Trips
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white drop-shadow-md">Requests Feed</h2>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
            <span className="text-sm text-gray-500 pl-2">Status:</span>
            <select
              className="input-uber py-1 px-3 bg-transparent border-none focus:ring-0 text-sm font-medium text-midnight-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={fetchRequests}
              className="btn-secondary text-xs px-3 py-1.5 h-full"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-error p-4 rounded-r shadow-sm">
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <div className="floating-panel">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="shimmer h-16 w-full rounded-lg"></div>)}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No requests found for this status.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Passenger</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[300px]">Route</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Status</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Date</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((r) => {
                    const passengerName = r.passenger?.name || r.passenger?.email || "Unknown";

                    return (
                      <tr key={r._id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {passengerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-midnight-900">{passengerName}</div>
                              {r.passenger?.email && <div className="text-xs text-gray-500 truncate max-w-[120px]">{r.passenger.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-1">
                              <span className="text-green-500 text-xs mt-1">●</span>
                              <span className="text-sm text-gray-700 truncate max-w-xs" title={r.pickupAddress}>{r.pickupAddress}</span>
                            </div>
                            <div className="flex items-start gap-1">
                              <span className="text-red-500 text-xs mt-1">●</span>
                              <span className="text-sm text-gray-700 truncate max-w-xs" title={r.dropAddress || r.dropoffAddress}>
                                {r.dropAddress || r.dropoffAddress}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                            ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              r.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-top text-xs text-gray-500">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="py-4 px-4 align-top">
                          <Link
                            to={`/requests/${r._id}`}
                            className="text-brand-600 hover:text-brand-700 font-medium text-sm hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}