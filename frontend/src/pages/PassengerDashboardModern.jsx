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
    const [showProfile, setShowProfile] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        profileImageUrl: user?.profileImage || "",
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (user?.name || user?.email) {
            setProfileForm(prev => ({
                ...prev,
                name: user.name || "",
                email: user.email || "",
                profileImageUrl: user.profileImage || "",
            }));
        }
    }, [user]);

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

    async function handleUpdateProfile(e) {
        e.preventDefault();
        setUpdating(true);
        setError("");
        setSuccessMsg("");

        try {
            console.log("🔄 Updating profile:", {
                name: profileForm.name,
                email: profileForm.email,
                hasImage: !!profileForm.profileImageUrl,
                imageSize: profileForm.profileImageUrl?.length
            });

            const res = await api.patch("/auth/profile", {
                name: profileForm.name,
                email: profileForm.email,
                profileImage: profileForm.profileImageUrl,
            });

            console.log("✅ Update successful:", res.data);
            setSuccessMsg("Profile updated successfully!");
            setEditMode(false);

            // Update user context if needed (reload page or update context)
            setTimeout(() => {
                window.location.reload(); // Simple approach to refresh user data
            }, 1000);
        } catch (err) {
            console.error("❌ Update failed:", err);
            console.error("Error details:", err.response?.data);
            setError(err.response?.data?.message || "Failed to update profile.");
        } finally {
            setUpdating(false);
        }
    }

    function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError("Image size must be less than 2MB");
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileForm(prev => ({
                ...prev,
                profileImageUrl: reader.result
            }));
        };
        reader.readAsDataURL(file);
    }

    function handleCancelEdit() {
        setEditMode(false);
        setProfileForm({
            name: user?.name || "",
            email: user?.email || "",
            profileImageUrl: user?.profileImage || "",
        });
        setError("");
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
                            <button
                                onClick={() => setShowProfile(!showProfile)}
                                className="text-brand-600 hover:text-brand-700 font-semibold text-sm"
                            >
                                {showProfile ? "Dashboard" : "Profile"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {showProfile ? (
                    /* Profile View */
                    <div className="max-w-4xl mx-auto">
                        <div className="floating-panel mb-8">
                            {/* Profile Header */}
                            <form onSubmit={handleUpdateProfile}>
                                <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-200">
                                    <div className="relative">
                                        {profileForm.profileImageUrl ? (
                                            <img
                                                src={profileForm.profileImageUrl}
                                                alt="Profile"
                                                className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-90 transition"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-4xl font-bold cursor-pointer hover:opacity-90 transition">
                                                {user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {editMode && (
                                            <>
                                                <input
                                                    type="file"
                                                    id="profile-image-upload"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor="profile-image-upload"
                                                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100"
                                                >
                                                    <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </label>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        {editMode ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="text-3xl font-bold text-midnight-900 mb-2 border-b-2 border-brand-500 focus:outline-none w-full"
                                                    placeholder="Your name"
                                                />
                                                <input
                                                    type="email"
                                                    value={profileForm.email}
                                                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                                    className="text-gray-600 mb-1 border-b border-gray-300 focus:border-brand-500 focus:outline-none w-full"
                                                    placeholder="your@email.com"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <h1 className="text-3xl font-bold text-midnight-900 mb-2">{user?.name}</h1>
                                                <p className="text-gray-600 mb-1">{user?.email}</p>
                                            </>
                                        )}
                                        <span className="inline-block px-3 py-1 bg-brand-100 text-brand-700 text-sm font-semibold rounded-full">
                                            Passenger
                                        </span>
                                    </div>
                                    <div>
                                        {editMode ? (
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={updating}
                                                    className="btn-primary px-4 py-2"
                                                >
                                                    {updating ? "Saving..." : "Save"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="btn-secondary px-4 py-2"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setEditMode(true)}
                                                className="text-brand-600 hover:text-brand-700 font-semibold text-sm flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit Profile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-gradient-to-br from-brand-50 to-brand-100 p-6 rounded-xl">
                                    <div className="text-sm text-brand-700 font-semibold mb-2">Total Requests</div>
                                    <div className="text-3xl font-bold text-brand-900">
                                        {requests.length}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                                    <div className="text-sm text-green-700 font-semibold mb-2">Completed Trips</div>
                                    <div className="text-3xl font-bold text-green-900">
                                        {requests.filter(r => r.status === 'COMPLETED').length}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                                    <div className="text-sm text-purple-700 font-semibold mb-2">Active Requests</div>
                                    <div className="text-3xl font-bold text-purple-900">
                                        {requests.filter(r => r.status === 'PENDING' || r.status === 'ACCEPTED').length}
                                    </div>
                                </div>
                            </div>

                            {/* Profile Information */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-midnight-900 mb-4">Account Information</h2>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="text-sm text-gray-600 mb-1 block">Full Name</label>
                                    <div className="text-lg font-semibold text-midnight-900">{user?.name}</div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="text-sm text-gray-600 mb-1 block">Email Address</label>
                                    <div className="text-lg font-semibold text-midnight-900">{user?.email}</div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="text-sm text-gray-600 mb-1 block">Account Type</label>
                                    <div className="text-lg font-semibold text-midnight-900">Passenger</div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="text-sm text-gray-600 mb-1 block">Member Since</label>
                                    <div className="text-lg font-semibold text-midnight-900">
                                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <button className="btn-secondary w-full mb-3">
                                    Change Password
                                </button>
                                <button className="text-error font-semibold text-sm hover:underline w-full">
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Dashboard View */
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
                )}
            </div>
        </div>
    );
}
