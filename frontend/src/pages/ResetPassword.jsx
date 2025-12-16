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
    return !token || !email;
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        email,
        password,
      });
      const msg = res?.data?.message || "Şifreniz başarıyla güncellendi.";
      setMessage(msg);
    } catch (err) {
      console.error("Reset password error", err);
      setError(
        err?.response?.data?.message ||
          "Şifre güncellenirken sorun oluştu. Lütfen bağlantınızı kontrol ederek tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Şifreyi Sıfırla</h1>

      {disabled ? (
        <p style={{ color: "red" }}>
          Geçersiz bağlantı. Lütfen e-postadaki sıfırlama linkini kullanın.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Yeni Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Şifre Tekrar
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
              style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc" }}
            />
          </label>

          {message && <p style={{ color: "green" }}>{message}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: "10px 12px" }}>
            {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      )}

      <p style={{ marginTop: 16 }}>
        <Link to="/login">Giriş ekranına dön</Link>
      </p>
    </div>
  );
}
