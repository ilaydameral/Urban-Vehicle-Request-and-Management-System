import { useEffect, useState } from "react";
import api from "../api/client";
import { Link, useSearchParams } from "react-router-dom";

const TRIP_STATUSES = ["ON_GOING", "COMPLETED", "CANCELLED"];

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

export default function AdminGlobalTrips() {
  const [searchParams] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const initialStatus = searchParams.get("status") || "";
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  async function fetchTrips() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter) {
        params.tripstatus = statusFilter;
        params.status = statusFilter;
      }
      const res = await api.get("/trips", { params });
      setTrips(res.data?.trips || []);
    } catch (err) {
      console.error("Error loading trips:", err);
      const msg = err.response?.data?.message || "An error occurred while loading trips.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const s = searchParams.get("status") || "";
    if (s !== statusFilter) setStatusFilter(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚖</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Admin Trips</h1>
                <p className="text-xs text-gray-500">Global Trip Management</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/admin/pending-drivers" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Pending Drivers
              </Link>
              <Link to="/admin/pending-vehicles" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Pending Vehicles
              </Link>
              <Link to="/admin/requests" className="btn-outline py-2 px-4 text-sm rounded-pill">
                All Requests
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white drop-shadow-md">Global Trips Overview</h2>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
            <span className="text-sm text-gray-500 pl-2">Status:</span>
            <select
              className="input-uber py-1 px-3 bg-transparent border-none focus:ring-0 text-sm font-medium text-midnight-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {TRIP_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={fetchTrips}
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
          ) : trips.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No trips found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Passenger</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Driver</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Vehicle</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[300px]">Route</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Fare</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Date</th>
                    <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trips.map((t) => {
                    const passengerName = t.passenger?.name || t.passenger?.email || "Unknown";
                    const driverName = t.driver?.name || t.driver?.user?.name || t.driver?.email || "Unassigned";

                    return (
                      <tr key={t._id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {passengerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-midnight-900">{passengerName}</div>
                              {t.passenger?.email && <div className="text-xs text-gray-500 truncate max-w-[120px]">{t.passenger.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                              {driverName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-midnight-900">{driverName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top text-sm text-gray-600">
                          {t.vehicle?.plateNumber ? (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-medium border border-gray-200">
                              {t.vehicle.plateNumber}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="py-4 px-4 align-top">
                          {t.request ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-start gap-1">
                                <span className="text-green-500 text-xs mt-1">●</span>
                                <span className="text-sm text-gray-700 truncate max-w-xs" title={t.request.pickupAddress}>{t.request.pickupAddress}</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="text-red-500 text-xs mt-1">●</span>
                                <span className="text-sm text-gray-700 truncate max-w-xs" title={t.request.dropAddress || t.request.dropoffAddress}>
                                  {t.request.dropAddress || t.request.dropoffAddress}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">No route data</span>
                          )}
                        </td>
                        <td className="py-4 px-4 align-top">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full 
                                            ${(t.tripstatus || t.status) === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              (t.tripstatus || t.status) === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'}`}>
                            {t.tripstatus || t.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-top text-sm font-medium text-midnight-900">
                          {typeof t.price === "number" ? t.price.toFixed(2) : typeof t.fare === "number" ? t.fare.toFixed(2) : "-"}
                          <span className="text-xs text-gray-400 font-normal ml-1">TL</span>
                        </td>
                        <td className="py-4 px-4 align-top text-xs text-gray-500">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="py-4 px-4 align-top">
                          <Link
                            to={`/trips/${t._id}`}
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