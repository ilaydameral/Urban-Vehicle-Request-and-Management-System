/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

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

export default function AdminPendingDrivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState("");

  async function fetchPendingDrivers() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/drivers/pending");
      setDrivers(res.data || []);
    } catch (err) {
      console.error("Error loading pending drivers:", err);
      const msg = err.response?.data?.message || "An error occurred while loading pending drivers.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingDrivers();
  }, []);

  async function handleApprove(id) {
    setError("");
    setApprovingId(id);
    try {
      await api.patch(`/drivers/${id}/approve`);
      setDrivers((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error("Error approving driver:", err);
      const msg = err.response?.data?.message || "An error occurred while approving the driver.";
      setError(msg);
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🪪</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Pending Drivers</h1>
                <p className="text-xs text-gray-500">Review & Approve Driver Applications</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/admin/pending-vehicles" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Pending Vehicles
              </Link>
              <Link to="/admin/users" className="btn-outline py-2 px-4 text-sm rounded-pill">
                All Users
              </Link>
              <button
                onClick={fetchPendingDrivers}
                disabled={loading || approvingId !== null}
                className="btn-secondary text-sm py-2 px-4 shadow-none rounded-pill"
              >
                {loading ? "Refreshing..." : "Refresh list"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-error p-4 rounded-r shadow-sm">
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {/* Info Card */}
        <div className="flex gap-4 mb-6">
          <div className="p-4 bg-white rounded-xl shadow-sm border border-orange-100 flex items-center gap-4 flex-1">
            <div className="bg-orange-100 p-3 rounded-full text-orange-600 text-xl">⚠️</div>
            <div>
              <h3 className="font-bold text-midnight-900">Action Required</h3>
              <p className="text-sm text-gray-500">There are <span className="font-bold text-orange-600">{drivers.length}</span> drivers waiting for approval.</p>
            </div>
          </div>
        </div>

        <div className="floating-panel">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="shimmer h-12 w-full rounded-lg"></div>)}
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-12 bg-green-50 rounded-lg border border-green-100">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-800 font-medium">All caught up! No pending applications.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">License No</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied At</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {drivers.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {d.user?.name ? d.user.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-medium text-midnight-900">{d.user?.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {d.user?.email || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-gray-700">
                        {d.licenseNumber || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-800">
                          {d.licenseClass || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {formatDate(d.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={approvingId === d._id}
                          onClick={() => handleApprove(d._id)}
                          className="btn-primary py-2 px-4 text-xs shadow-none"
                        >
                          {approvingId === d._id ? "Approving..." : "Approve Application"}
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
    </div>
  );
}