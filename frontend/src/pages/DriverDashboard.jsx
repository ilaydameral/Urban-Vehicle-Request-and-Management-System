// src/pages/DriverDashboard.jsx
import { useAuth } from "../context/AuthContext";

export default function DriverDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 24 }}>
      <h2>Driver Dashboard</h2>
      <p>Welcome, {user?.name} ({user?.email})</p>
      <button onClick={logout}>Logout</button>
      {/* Buraya available requests + my trips gelecek */}
    </div>
  );
}
