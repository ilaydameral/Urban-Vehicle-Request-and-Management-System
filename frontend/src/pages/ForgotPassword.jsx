import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data?.message || "If that email is registered, reset instructions were sent.");
    } catch (err) {
      setError(err?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {message && <p style={{ color: "green" }}>{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: "10px 12px" }}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
}
