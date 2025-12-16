// src/pages/PassengerDashboardModern.jsx - Uber-Inspired Blue Theme
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PassengerDashboardModern() {
    const { user } = useAuth();

    const [form, setForm] = useState({
        pickupAddress: "",
        dropAddress: "",
    });

    const [requests, setRequests] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const formatDate = (iso) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleString();
    };

    useEffect(() => {
        fetchMyRequests();
    }, []);

    async function fetchMyRequests() {
        setLoadingList(true);
        setError("");

        try {
            const res = await api.get("/requests/my");
            const data = res.data;
            const list = Array.isArray(data) ? data : data?.requests || [];
            setRequests(list);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load your requests.");
        } finally {
            setLoadingList(false);
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setCreating(true);

        try {
            await api.post("/requests", {
                pickupAddress: form.pickupAddress,
                dropAddress: form.dropAddress,
            });

            setSuccessMsg("Request created successfully!");
            setForm({ pickupAddress: "", dropAddress: "" });
            await fetchMyRequests();

            // Auto-clear success message
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create request.");
        } finally {
            setCreating(false);
        }
    };

    async function handleCancelRequest(requestId) {
        if (!window.confirm("Cancel this request?")) return;

        setError("");
        setSuccessMsg("");

        try {
            await api.patch(`/requests/${requestId}/cancel`);
            setSuccessMsg("Request cancelled.");
            await fetchMyRequests();
            setTimeout(() => setSuccessMsg(""), 5000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to cancel request.");
        }
    }

    return (
        <div className="min-h-screen map-bg">
            {/* Modern Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🚗</span>
                            <span className="text-2xl font-bold text-midnight-900">CityRide</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                <div className="text-gray-600">Welcome,</div>
                                <div className="font-semibold text-midnight-900">{user?.name}</div>
                            </div>
                            <button className="text-brand-600 hover:text-brand-700 font-semibold text-sm">
                                Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Request Form */}
                    <div>
                        <div className="floating-panel">
                            <h2 className="text-2xl font-bold text-midnight-900 mb-6">
                                Where to?
                            </h2>

                            <form onSubmit={handleCreateRequest} className="space-y-4">
                                {/* Pickup */}
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                        <div className="w-3 h-3 rounded-full bg-brand-600"></div>
                                    </div>
                                    <input
                                        type="text"
                                        name="pickupAddress"
                                        value={form.pickupAddress}
                                        onChange={handleChange}
                                        placeholder="Pickup location"
                                        required
                                        className="input-uber pl-10"
                                    />
                                </div>

                                {/* Connector Line */}
                                <div className="flex justify-center">
                                    <div className="w-px h-6 bg-gray-300"></div>
                                </div>

                                {/* Dropoff */}
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                                        <div className="w-3 h-3 bg-midnight-900"></div>
                                    </div>
                                    <input
                                        type="text"
                                        name="dropAddress"
                                        value={form.dropAddress}
                                        onChange={handleChange}
                                        placeholder="Dropoff location"
                                        required
                                        className="input-uber pl-10"
                                    />
                                </div>

                                {/* Messages */}
                                {error && (
                                    <div className="bg-red-50 border-l-4 border-error px-4 py-3 rounded">
                                        <p className="text-sm text-error">{error}</p>
                                    </div>
                                )}

                                {successMsg && (
                                    <div className="bg-green-50 border-l-4 border-success px-4 py-3 rounded">
                                        <p className="text-sm text-success">{successMsg}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="btn-primary w-full text-lg"
                                >
                                    {creating ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Creating...
                                        </span>
                                    ) : (
                                        "Request Ride"
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: My Requests */}
                    <div>
                        <div className="card">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-midnight-900">
                                    My Requests
                                </h3>
                                <button
                                    onClick={fetchMyRequests}
                                    disabled={loadingList}
                                    className="text-brand-600 hover:text-brand-700 font-semibold text-sm"
                                >
                                    {loadingList ? "Refreshing..." : "🔄 Refresh"}
                                </button>
                            </div>

                            {loadingList ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="shimmer h-24 rounded-lg"></div>
                                    ))}
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🚗</div>
                                    <p className="text-gray-600">No requests yet</p>
                                    <p className="text-sm text-gray-500">Create your first ride request</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {requests.map((req) => (
                                        <div
                                            key={req._id}
                                            className="bg-slate-50 hover:bg-slate-100 rounded-lg p-4 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-2 h-2 rounded-full bg-brand-600"></div>
                                                        <span className="text-sm text-gray-600">Pickup</span>
                                                    </div>
                                                    <p className="font-semibold text-midnight-900 mb-3">
                                                        {req.pickupAddress}
                                                    </p>

                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-2 h-2 bg-midnight-900"></div>
                                                        <span className="text-sm text-gray-600">Dropoff</span>
                                                    </div>
                                                    <p className="font-semibold text-midnight-900">
                                                        {req.dropAddress}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <span className={`badge badge-${req.status.toLowerCase()}`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(req.createdAt)}
                                                </span>

                                                {(req.status === "PENDING" || req.status === "ACCEPTED") && (
                                                    <button
                                                        onClick={() => handleCancelRequest(req._id)}
                                                        className="text-sm text-error font-semibold hover:underline"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
