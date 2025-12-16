import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => {
    if (!token || !email) return true;
    if (password.length < 6) return true;
    if (password !== confirm) return true;
    return false;
  }, [token, email, password, confirm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/reset-password", { token, email, password });
      setMessage(res.data?.message || "Password updated successfully");
    } catch (err) {
      setError(err?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Reset Password</h2>

      {!token || !email ? (
        <p style={{ color: "red" }}>
          Invalid link. Please use the reset link in your email.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Confirm Password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {password && password.length < 6 && (
            <p style={{ color: "red" }}>Password must be at least 6 characters.</p>
          )}
          {confirm && password !== confirm && (
            <p style={{ color: "red" }}>Passwords do not match.</p>
          )}

          {message && <p style={{ color: "green" }}>{message}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" disabled={disabled || loading} style={{ padding: "10px 12px" }}>
            {loading ? "Saving..." : "Update Password"}
          </button>
        </form>
      )}

      <p style={{ marginTop: 16 }}>
        <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
}
