import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => {
    if (!token || !email) return true;
    if (password.length < 6) return true;
    if (password !== confirm) return true;
    return false;
  }, [token, email, password, confirm]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/auth/reset-password", { token, email, password });
      setSuccess(response.data.message || "Password updated successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(
        err.response?.data?.message ||
        "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-midnight-900 via-midnight-800 to-brand-900 p-4">
      <div className="card-uber max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-midnight-300">
            Enter your new password below
          </p>
        </div>

        {(!token || !email) ? (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            Invalid reset link. Please use the link from your email.
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-400 text-sm">
                {success}
                <div className="mt-2 text-xs text-green-300">Redirecting to login...</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-midnight-200 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-uber w-full"
                  placeholder="Enter new password"
                  disabled={loading || !!success}
                  required
                />
                {password && password.length < 6 && (
                  <p className="mt-1 text-xs text-red-400">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-midnight-200 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-uber w-full"
                  placeholder="Confirm new password"
                  disabled={loading || !!success}
                  required
                />
                {confirm && password !== confirm && (
                  <p className="mt-1 text-xs text-red-400">
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={disabled || loading || !!success}
              >
                {loading ? "Updating..." : success ? "Password Updated!" : "Update Password"}
              </button>
            </form>
          </>
        )}

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
            disabled={loading}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
