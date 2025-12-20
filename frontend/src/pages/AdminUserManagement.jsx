/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const ROLES = ["PASSENGER", "DRIVER", "COORDINATOR", "ADMIN"];

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

export default function AdminUserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL / ACTIVE / INACTIVE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filterRole !== "ALL") {
        params.role = filterRole;
      }
      if (filterStatus === "ACTIVE") {
        params.isActive = "true";
      } else if (filterStatus === "INACTIVE") {
        params.isActive = "false";
      }

      const res = await api.get("/admin/users", { params });
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error("Error loading users:", err);
      const msg = err.response?.data?.message || "An error occurred while loading users.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterStatus]);

  async function handleChangeRole(userId, newRole) {
    setError("");
    setUpdatingId(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, {
        role: newRole,
      });
      const updated = res.data?.user;
      if (updated) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
      }
    } catch (err) {
      console.error("Error updating role:", err);
      const msg = err.response?.data?.message || "An error occurred while updating the user role.";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(userId, currentActive) {
    setError("");
    setUpdatingId(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, {
        isActive: !currentActive,
      });
      const updated = res.data?.user;
      if (updated) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
      }
    } catch (err) {
      console.error("Error updating status:", err);
      const msg = err.response?.data?.message || "An error occurred while updating the user status.";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen map-bg pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <div>
                <h1 className="text-xl font-bold text-midnight-900">User Management</h1>
                <p className="text-xs text-gray-500">Manage System Access & Roles</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/admin/pending-drivers" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Pending Drivers
              </Link>
              <Link to="/admin/requests" className="btn-outline py-2 px-4 text-sm rounded-pill">
                Global Requests
              </Link>
              <button
                onClick={fetchUsers}
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

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Role:</label>
            <select
              className="input-uber py-2 px-3 text-sm w-40"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              className="input-uber py-2 px-3 text-sm w-40"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-error p-4 rounded-r shadow-sm">
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        <div className="floating-panel">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-midnight-900">Users List</h2>
            <span className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-600">
              Total: {users.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="shimmer h-12 w-full rounded-lg"></div>)}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No users found matching filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const isActive = u.isActive !== false;
                    const isSelf = currentUser && currentUser.id === u._id;

                    return (
                      <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                                ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' :
                                u.role === 'DRIVER' ? 'bg-amber-100 text-amber-600' :
                                  u.role === 'COORDINATOR' ? 'bg-blue-100 text-blue-600' :
                                    'bg-slate-100 text-slate-600'}`}>
                              {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span className="font-medium text-midnight-900">{u.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            className="text-xs font-medium bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-gray-100 rounded px-1 py-1"
                            value={u.role}
                            disabled={updatingId === u._id}
                            onChange={(e) => handleChangeRole(u._id, e.target.value)}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full 
                                            ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={updatingId === u._id || isSelf}
                            onClick={() => handleToggleActive(u._id, isActive)}
                            className={`text-xs px-3 py-1.5 rounded transition-colors
                                                ${isSelf ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                                  'bg-green-50 text-green-600 hover:bg-green-100'}`}
                          >
                            {isSelf ? "Self" : isActive ? "Deactivate" : "Activate"}
                          </button>
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
