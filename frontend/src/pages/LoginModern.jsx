// src/pages/Login.jsx - Modern Uber-Inspired Login
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post("/auth/login", { email, password });
            const { token, user } = res.data;

            authLogin(user, token); // ✅ Fixed: (user, token) not (token, user)


            // Navigate based on role
            if (user.role === "ADMIN") {
                navigate("/admin/users");
            } else if (user.role === "COORDINATOR") {
                navigate("/coordinator");
            } else if (user.role === "DRIVER") {
                navigate("/driver");
            } else {
                navigate("/passenger");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Illustration (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-midnight-900 via-midnight-800 to-brand-600 items-center justify-center p-12">
                <div className="max-w-lg">
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-pill mb-6">
                            <span className="text-4xl">🚗</span>
                            <span className="text-2xl font-bold text-white">CityRide</span>
                        </div>
                    </div>

                    <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                        Your ride, <br />
                        <span className="text-brand-400">your way</span>
                    </h1>

                    <p className="text-xl text-blue-200 mb-12">
                        Professional ride-hailing made simple. Request, track, and pay—all in one app.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-white">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl">⚡</span>
                            </div>
                            <div>
                                <div className="font-semibold">Fast & Reliable</div>
                                <div className="text-sm text-blue-200">Get picked up in minutes</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-white">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <div>
                                <div className="font-semibold">Safe & Secure</div>
                                <div className="text-sm text-blue-200">Verified drivers and secure payments</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-white">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl">💰</span>
                            </div>
                            <div>
                                <div className="font-semibold">Fair Pricing</div>
                                <div className="text-sm text-blue-200">Transparent, upfront fares</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="inline-flex items-center gap-2 text-midnight-900 mb-4">
                            <span className="text-3xl">🚗</span>
                            <span className="text-2xl font-bold">CityRide</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-midnight-900 mb-2">Welcome back</h1>
                        <p className="text-gray-600">Sign in to continue your journey</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="input-uber"
                                disabled={loading}
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="input-uber"
                                disabled={loading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-l-4 border-error px-4 py-3 rounded">
                                <p className="text-sm text-error">{error}</p>
                            </div>
                        )}

                        {/* Remember & Forgot */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center">
                                <input type="checkbox" className="mr-2 rounded" />
                                <span className="text-gray-600">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-brand-600 font-semibold hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full text-lg relative"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-8 flex items-center">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-sm text-gray-500">or</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-gray-600">
                            Don&apos;t have an account?{" "}
                            <a href="/register" className="text-brand-600 font-semibold hover:underline">
                                Sign up
                            </a>
                        </p>
                    </div>

                    {/* Demo Credentials */}
                    <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Demo Credentials:</p>
                        <div className="space-y-1 text-xs text-gray-600">
                            <p>Passenger: <code className="bg-white px-2 py-0.5 rounded">passenger@test.com</code> / 123456</p>
                            <p>Driver: <code className="bg-white px-2 py-0.5 rounded">driver@test.com</code> / 123456</p>
                            <p>Admin: <code className="bg-white px-2 py-0.5 rounded">admin@test.com</code> / 123456</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
