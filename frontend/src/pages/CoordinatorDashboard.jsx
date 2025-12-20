// src/pages/CoordinatorDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function StatCard({ title, value, subtitle, to, gradient }) {
  const content = (
    <div className={`h-full p-6 rounded-xl text-white shadow-lg transition-transform hover:scale-[1.02] ${gradient}`}>
      <div className="text-sm font-medium opacity-90 mb-1">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      {subtitle && <div className="text-xs opacity-75 mb-4">{subtitle}</div>}
      {to && (
        <div className="text-sm font-semibold flex items-center gap-1 hover:underline">
          View Details <span>→</span>
        </div>
      )}
    </div>
  );

  if (to) return <Link to={to} className="block h-full">{content}</Link>;
  return <div className="h-full">{content}</div>;
}

function Section({ title, items, emptyText, renderRow, footerLink }) {
  return (
    <div className="floating-panel h-full">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-midnight-900">{title}</h4>
        {footerLink && (
          <Link to={footerLink.to} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            {footerLink.label} →
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {items && items.length ? (
          items.map((it) => (
            <div key={it?._id || JSON.stringify(it)} className="p-3 bg-slate-50 rounded-lg border border-gray-100 hover:bg-slate-100 transition-colors">
              {renderRow(it)}
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-sm italic py-2">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    pendingDrivers: [],
    pendingVehicles: [],
    pendingRequests: [],
    ongoingTrips: [],
    completedTrips: [],
    cancelledTrips: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/coordinator/overview");
      setData({
        pendingDrivers: res.data?.pendingDrivers || [],
        pendingVehicles: res.data?.pendingVehicles || [],
        pendingRequests: res.data?.pendingRequests || [],
        ongoingTrips: res.data?.ongoingTrips || [],
        completedTrips: res.data?.completedTrips || [],
        cancelledTrips: res.data?.cancelledTrips || []
      });
    } catch (err) {
      console.error("Coordinator overview load error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load coordinator overview";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  const counts = useMemo(
    () => ({
      pendingDrivers: data.pendingDrivers.length,
      pendingVehicles: data.pendingVehicles.length,
      pendingRequests: data.pendingRequests.length,
      ongoingTrips: data.ongoingTrips.length,
      completedTrips: data.completedTrips?.length || 0,
      cancelledTrips: data.cancelledTrips?.length || 0
    }),
    [data]
  );

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Modern Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚖</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Coordinator Portal</h1>
                <p className="text-xs text-gray-500">Overview & Management</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-gray-500">Logged in as</div>
                <div className="text-sm font-bold text-midnight-900">{user?.name || "Coordinator"}</div>
              </div>
              <button
                onClick={fetchOverview}
                disabled={loading}
                className="btn-secondary text-sm py-2 px-4 shadow-none rounded-pill"
              >
                {loading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-error p-4 rounded-r shadow-sm">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-midnight-900 mb-2">Operational Overview</h2>
          <p className="text-gray-600">Real-time status of drivers, vehicles, and trip requests.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Pending Drivers"
            value={counts.pendingDrivers}
            to="/admin/pending-drivers"
            subtitle="Waiting for approval"
            gradient="bg-gradient-to-br from-orange-400 to-red-500"
          />
          <StatCard
            title="Pending Vehicles"
            value={counts.pendingVehicles}
            to="/admin/pending-vehicles"
            subtitle="Waiting for inspection"
            gradient="bg-gradient-to-br from-yellow-400 to-orange-500"
          />
          <StatCard
            title="Pending Requests"
            value={counts.pendingRequests}
            to="/coordinator/requests"
            subtitle="Needs assignment"
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard
            title="Ongoing Trips"
            value={counts.ongoingTrips}
            to="/admin/trips"
            subtitle="Active on road"
            gradient="bg-gradient-to-br from-emerald-400 to-teal-600"
          />
        </div>

        {/* Detailed Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Section
            title="Recent Driver Applications"
            items={data.pendingDrivers.slice(0, 5)}
            emptyText="No pending driver applications."
            footerLink={{ to: "/admin/pending-drivers", label: "View all" }}
            renderRow={(d) => (
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-midnight-900">{d?.user?.name || d?.user?.email || "Unknown User"}</div>
                  <div className="text-xs text-gray-500">Applied: {formatDate(d?.createdAt)}</div>
                </div>
                {d?.licenseNumber && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    Lic: {d.licenseNumber}
                  </span>
                )}
              </div>
            )}
          />

          <Section
            title="Recent Vehicle Submissions"
            items={data.pendingVehicles.slice(0, 5)}
            emptyText="No pending vehicle submissions."
            footerLink={{ to: "/admin/pending-vehicles", label: "View all" }}
            renderRow={(v) => (
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-midnight-900">{v?.plateNumber || "No Plate"}</div>
                  <div className="text-xs text-gray-500">
                    Owner: {v?.driver?.user?.name || "Unknown"}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{formatDate(v?.createdAt)}</div>
              </div>
            )}
          />

          <Section
            title="Latest Ride Requests"
            items={data.pendingRequests.slice(0, 5)}
            emptyText="No pending requests at the moment."
            footerLink={{ to: "/admin/requests", label: "View all" }}
            renderRow={(r) => (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="font-bold text-brand-600">
                    {r?.passenger?.name || "Guest Passenger"}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(r?.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-700 truncate w-full">
                  <span className="font-semibold">From:</span> {r?.pickupAddress}
                </div>
                <div className="text-xs text-gray-700 truncate w-full">
                  <span className="font-semibold">To:</span> {r?.dropAddress || r?.dropoffAddress}
                </div>
              </div>
            )}
          />

          <Section
            title="Active Trips"
            items={data.ongoingTrips.slice(0, 5)}
            emptyText="No trips currently in progress."
            footerLink={{ to: "/admin/trips", label: "View all" }}
            renderRow={(t) => (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="font-bold text-emerald-600">Trip #{t?._id?.slice(-6)}</span>
                  <span className="text-xs text-gray-500">{formatDate(t?.createdAt)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Driver: <span className="text-midnight-900 font-medium">{t?.driver?.user?.name || "Unknown"}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Passenger: <span className="text-midnight-900 font-medium">{t?.passenger?.name || "Unknown"}</span>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
