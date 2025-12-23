import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

function StatCard({ title, value, subtitle, gradient }) {
  return (
    <div className={`h-full p-6 rounded-xl text-white shadow-lg transition-transform hover:scale-[1.02] ${gradient}`}>
      <div className="text-sm font-medium opacity-90 mb-1">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      {subtitle && <div className="text-xs opacity-75">{subtitle}</div>}
    </div>
  );
}

export default function AdminConsistency() {
  const [checks, setChecks] = useState(null); // Changed to null initial to differentiate loading
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [consRes, statsRes] = await Promise.all([
        api.get("/admin/consistency"),
        api.get("/admin/stats")
      ]);

      setChecks(consRes.data?.checks || consRes.data?.consistencyReport || {});
      setStats(statsRes.data);
    } catch (err) {
      console.error("Data load error:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Compute summary metrics (counts)
  const metrics = useMemo(() => {
    if (!stats || !checks) return null;

    let issueCount = 0;
    let orphanCount = 0;

    // Helper to sum arrays in the object
    const countIssues = (obj) => {
      if (!obj) return 0;
      return Object.values(obj).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : 0), 0);
    };

    issueCount = countIssues(checks);

    // Count orphans (missing refs) specifically
    if (checks.driversWithMissingUser) orphanCount += checks.driversWithMissingUser.length;
    if (checks.vehiclesWithMissingDriver) orphanCount += checks.vehiclesWithMissingDriver.length;
    if (checks.requestsWithMissingPassenger) orphanCount += checks.requestsWithMissingPassenger.length;
    if (checks.tripsWithMissingRefs) orphanCount += checks.tripsWithMissingRefs.length;

    return {
      totalUsers: stats.users?.total || 0,
      activeDrivers: stats.drivers?.approved || 0,
      activeVehicles: stats.vehicles?.verified || 0,
      inconsistentCount: issueCount,
      orphanCount
    };
  }, [stats, checks]);

  // Flatten checks object into a list of specific issues for the table
  const detailedIssues = useMemo(() => {
    if (!checks) return [];

    const list = [];

    // Drivers Missing User
    if (checks.driversWithMissingUser?.length) {
      checks.driversWithMissingUser.forEach(d => {
        list.push({
          // Display Name if available 
          displayId: d.user?.name || `Driver (Lic: ${d.licenseNumber || 'N/A'})`,
          type: "Driver",
          issue: "Missing User",
          details: `Driver record has no valid User ID linked.`,
          link: `/admin/pending-drivers`
        });
      });
    }

    // Vehicles Missing Driver
    if (checks.vehiclesWithMissingDriver?.length) {
      checks.vehiclesWithMissingDriver.forEach(v => {
        list.push({
          // Vehicle Identifier
          displayId: v.plateNumber || 'No Plate',
          type: "Vehicle",
          issue: "Missing Owner",
          details: `Vehicle (${v.model || 'Unknown'}) has no valid Driver ID.`,
          link: `/admin/pending-vehicles`
        });
      });
    }

    // Requests Missing Passenger
    if (checks.requestsWithMissingPassenger?.length) {
      checks.requestsWithMissingPassenger.forEach(r => {
        list.push({
          // Passenger Name if available 
          displayId: r.passenger?.name || `Request (From: ${r.pickupAddress})`,
          type: "Request",
          issue: "Missing Passenger",
          details: `Request has no valid Passenger ID.`,
          link: `/admin/requests`
        });
      });
    }

    // Trips Missing References
    if (checks.tripsWithMissingRefs?.length) {
      checks.tripsWithMissingRefs.forEach(t => {
        // Prefer Passenger Name, then Driver Name, then Trip ID
        const name = t.passengerName || t.driverName || `Trip #${t.tripId.slice(-6)}`;
        list.push({
          displayId: name,
          type: "Trip",
          issue: "Broken References",
          details: `Missing refs: ${t.problems?.join(", ") || "Unknown"}`,
          link: `/admin/trips`
        });
      });
    }

    // Status Inconsistencies
    if (checks.statusInconsistencies?.length) {
      checks.statusInconsistencies.forEach(item => {
        const name = item.passengerName || item.driverName || `Trip #${item.tripId.slice(-6)}`;
        list.push({
          displayId: name,
          type: "Trip / Request",
          issue: "Status Mismatch",
          details: `Trip: ${item.tripStatus} ≠ Req: ${item.requestStatus}`,
          link: `/admin/trips`
        });
      });
    }

    return list;
  }, [checks]);

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">System Consistency</h1>
                <p className="text-xs text-gray-500">Database Integrity Monitor</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/users" className="btn-outline py-2 px-4 text-sm rounded-pill">
                ← Back to Admin
              </Link>
              <button
                onClick={fetchData}
                disabled={loading}
                className="btn-secondary text-sm py-2 px-4 shadow-none rounded-pill"
              >
                {loading ? "Refreshing..." : "Refresh"}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={metrics?.totalUsers ?? "-"}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard
            title="Inconsistent Records"
            value={metrics?.inconsistentCount ?? "-"}
            subtitle="Total detected issues"
            gradient={metrics?.inconsistentCount > 0 ? "bg-gradient-to-br from-red-500 to-pink-600" : "bg-gradient-to-br from-green-500 to-emerald-600"}
          />
          <StatCard
            title="Active Drivers"
            value={metrics?.activeDrivers ?? "-"}
            gradient="bg-gradient-to-br from-orange-400 to-amber-500"
          />
          <StatCard
            title="Active Vehicles"
            value={metrics?.activeVehicles ?? "-"}
            gradient="bg-gradient-to-br from-teal-400 to-cyan-600"
          />
          <StatCard
            title="Orphan Records"
            value={metrics?.orphanCount ?? "-"}
            subtitle="Missing references"
            gradient="bg-gradient-to-br from-purple-500 to-violet-600"
          />
        </div>

        <div className="floating-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-midnight-900">Detailed Report</h2>
            <div className="text-sm text-gray-500">
              {detailedIssues.length} issues found
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="shimmer h-12 w-full rounded-lg"></div>)}
            </div>
          ) : detailedIssues.length === 0 ? (
            <div className="text-center py-12 bg-green-50 rounded-lg border border-green-100">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-700 font-medium">All systems go. No consistency issues found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User / Identifier</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailedIssues.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-bold text-midnight-900">
                        {item.displayId}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-700">
                        {item.type}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {item.issue}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {item.details}
                      </td>
                      <td className="py-3 px-4">
                        {item.link && (
                          <Link to={item.link} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                            View
                          </Link>
                        )}
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
