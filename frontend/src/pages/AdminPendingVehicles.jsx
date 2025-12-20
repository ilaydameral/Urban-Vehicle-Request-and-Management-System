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

export default function AdminPendingVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState("");

  async function fetchPendingVehicles() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/vehicles/pending");
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Error loading pending vehicles:", err);
      const msg = err.response?.data?.message || "An error occurred while loading pending vehicles.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingVehicles();
  }, []);

  async function handleVerify(id) {
    setError("");
    setVerifyingId(id);
    try {
      await api.patch(`/vehicles/${id}/verify`);
      setVehicles((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      console.error("Error verifying vehicle:", err);
      const msg = err.response?.data?.message || "An error occurred while verifying the vehicle.";
      setError(msg);
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚙</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Pending Vehicles</h1>
                <p className="text-xs text-gray-500">Inspect & Verify New Vehicles</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/admin/pending-drivers" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Pending Drivers
              </Link>
              <Link to="/admin/users" className="btn-outline py-2 px-4 text-sm rounded-pill">
                All Users
              </Link>
              <button
                onClick={fetchPendingVehicles}
                disabled={loading || verifyingId !== null}
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
          <div className="p-4 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center gap-4 flex-1">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-xl">ℹ️</div>
            <div>
              <h3 className="font-bold text-midnight-900">Vehicle Inspection</h3>
              <p className="text-sm text-gray-500">There are <span className="font-bold text-blue-600">{vehicles.length}</span> vehicles waiting for verification.</p>
            </div>
          </div>
        </div>

        <div className="floating-panel">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="shimmer h-12 w-full rounded-lg"></div>)}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 bg-green-50 rounded-lg border border-green-100">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-800 font-medium">All caught up! No pending vehicles.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plate</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle Info</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered At</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="bg-amber-100 text-amber-900 px-2 py-1 rounded text-sm font-mono font-bold border border-amber-200">
                          {v.plateNumber || "NO PLATE"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-midnight-900">{v.brand || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{v.model}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {v.ownerDriver?.user?.name ? v.ownerDriver.user.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="text-sm text-gray-900">{v.ownerDriver?.user?.name || "Unknown Owner"}</div>
                            <div className="text-xs text-gray-500">{v.ownerDriver?.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {formatDate(v.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={verifyingId === v._id}
                          onClick={() => handleVerify(v._id)}
                          className="btn-primary py-2 px-4 text-xs shadow-none bg-emerald-600 hover:bg-emerald-700"
                        >
                          {verifyingId === v._id ? "Verifying..." : "Verify Vehicle"}
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
