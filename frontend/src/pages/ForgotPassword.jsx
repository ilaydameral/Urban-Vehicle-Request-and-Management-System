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
      const msg = res?.data?.message;
      setMessage(
        msg ||
          "Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin."
      );
    } catch (err) {
      console.error("Forgot password error", err);
      setError(
        err?.response?.data?.message ||
          "Şifre sıfırlama isteği şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Şifremi Unuttum</h1>
      <p style={{ marginBottom: 12 }}>
        E-posta adresinizi girin. Eğer kayıtlıysa şifre sıfırlama bağlantısını
        gönderelim.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          E-posta
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@mail.com"
            style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>

        {message && <p style={{ color: "green" }}>{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: "10px 12px" }}>
          {loading ? "Gönderiliyor..." : "Bağlantıyı Gönder"}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        <Link to="/login">Giriş ekranına dön</Link>
      </p>
    </div>
  );
}
