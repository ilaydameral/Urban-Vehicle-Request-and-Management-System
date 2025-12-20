/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

function StatCard({ title, value, subtitle, gradient }) {
  return (
    <div className={`p-6 rounded-xl text-white shadow-lg transition-transform hover:scale-[1.02] ${gradient}`}>
      <div className="text-sm font-medium opacity-90 mb-1">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      {subtitle && <div className="text-xs opacity-75">{subtitle}</div>}
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError("Failed to load statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen map-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">System Performance & Statistics</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/consistency" className="btn-outline py-2 px-4 text-sm rounded-pill flex items-center gap-2">
                <span>🛡️</span> Check Consistency
              </Link>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="btn-secondary text-sm py-2 px-4 shadow-none rounded-pill"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg shadow-sm border border-red-200">{error}</div>}

        {/* Section 1: Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            subtitle={`${stats?.users?.active || 0} active users`}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          />
          <StatCard
            title="Total Drivers"
            value={stats?.drivers?.total || 0}
            subtitle={`${stats?.drivers?.approved || 0} approved`}
            gradient="bg-gradient-to-br from-orange-400 to-amber-500"
          />
          <StatCard
            title="Total Vehicles"
            value={stats?.vehicles?.total || 0}
            subtitle={`${stats?.vehicles?.verified || 0} verified`}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <StatCard
            title="Active Trips"
            value={stats?.trips?.byStatus?.ON_GOING || 0}
            subtitle={`${stats?.requests?.byStatus?.PENDING || 0} pending requests`}
            gradient="bg-gradient-to-br from-purple-500 to-violet-600"
          />
        </div>

        {/* Section 2: Detailed Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Requests Card */}
          <div className="floating-panel">
            <h3 className="text-lg font-bold text-midnight-900 mb-4 border-b border-gray-100 pb-2">Request Status</h3>
            <div className="space-y-3">
              {Object.entries(stats?.requests?.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-800 shadow-sm">
                    {count}
                  </span>
                </div>
              ))}
              {Object.keys(stats?.requests?.byStatus || {}).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No requests found.</p>}
            </div>
          </div>

          {/* Trips Card */}
          <div className="floating-panel">
            <h3 className="text-lg font-bold text-midnight-900 mb-4 border-b border-gray-100 pb-2">Trip Status</h3>
            <div className="space-y-3">
              {Object.entries(stats?.trips?.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-800 shadow-sm">
                    {count}
                  </span>
                </div>
              ))}
              {Object.keys(stats?.trips?.byStatus || {}).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No trips found.</p>}
            </div>
          </div>
        </div>

        {/* Approval Info / Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-12">
          <div className="floating-panel border-l-4 border-yellow-400 relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] text-yellow-100 text-9xl -z-10 opacity-50 rotate-12">⚠️</div>
            <div className="flex justify-between items-center z-10 relative">
              <div>
                <h4 className="text-md font-bold text-midnight-900">Pending Approvals</h4>
                <p className="text-sm text-gray-500">Drivers & Vehicles waiting for verification</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-600">
                  {(stats?.drivers?.pending || 0) + (stats?.vehicles?.pending || 0)}
                </div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Pending</div>
              </div>
            </div>
          </div>

          <div className="floating-panel border-l-4 border-red-400 relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] text-red-100 text-9xl -z-10 opacity-50 rotate-12">✕</div>
            <div className="flex justify-between items-center z-10 relative">
              <div>
                <h4 className="text-md font-bold text-midnight-900">Cancelled Trips</h4>
                <p className="text-sm text-gray-500">Total cancelled trips in system</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-500">
                  {stats?.trips?.byStatus?.CANCELLED || 0}
                </div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Cancelled</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
