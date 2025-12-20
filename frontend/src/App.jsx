// src/App.jsx
import { Route, Routes, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import PassengerDashboard from "./pages/PassengerDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import AvailableRequests from "./pages/AvailableRequests";
import MyTrips from "./pages/MyTrips";

// Modern Design Components
import LoginModern from "./pages/LoginModern";
import PassengerDashboardModern from "./pages/PassengerDashboardModern";


import AdminUserManagement from "./pages/AdminUserManagement";
import AdminPendingDrivers from "./pages/AdminPendingDrivers";
import AdminPendingVehicles from "./pages/AdminPendingVehicles";
import AdminGlobalRequests from "./pages/AdminGlobalRequests";
import AdminGlobalTrips from "./pages/AdminGlobalTrips";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import CoordinatorRequests from "./pages/CoordinatorRequests";
import TripDetail from "./pages/TripDetail";
import RequestDetail from "./pages/RequestDetail";
import AdminStats from "./pages/AdminStats";
import AdminConsistency from "./pages/AdminConsistency";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import HomePage from "./pages/Home";
import PassengerTrips from "./pages/PassengerTrips"; // ✅ yeni trip history sayfası

// Küçük helper: tarih formatlayıcı (admin & coordinator sayfalarında kullanacağız)
export function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

// Ortak küçük component: Admin / Coordinator sekme menüsü
export function AdminTabs() {
  const { user } = useAuth();

  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isCoordinator = role === "COORDINATOR";

  // Admin isterse coordinator sayfalarını da görsün istiyorsan:
  const canSeeCoordinatorTabs = isCoordinator;

  return (
    <div style={{ display: "flex", gap: 10, margin: "12px 0" }}>
      {isAdmin && (
        <>
          <a href="/admin/users">Users</a>
          <a href="/admin/global-trips">Global Trips</a>
        </>
      )}

      {canSeeCoordinatorTabs && (
        <>
          <a href="/coordinator">Coordinator Dashboard</a>
          <a href="/coordinator/requests">Coordinator Requests</a>
        </>
      )}
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <p>Access denied for role: {user.role}</p>;
  }

  return children;
}

export default function App() {
  const { user, logout } = useAuth();

  return (
    <div>
      {/* ÜST MENÜ */}
      <nav style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
        <Link to="/" style={{ marginRight: 12 }}>
          Home
        </Link>

        {user ? (
          <>
            <span style={{ marginRight: 16 }}>
              Logged in as: <strong>{user.name}</strong> ({user.role})
            </span>

            {/* Passenger linkleri */}
            {user.role === "PASSENGER" && (
              <>
                <Link to="/passenger" style={{ marginRight: 12 }}>
                  Passenger Dashboard
                </Link>
                <Link to="/passenger/trips" style={{ marginRight: 12 }}>
                  Trip History
                </Link>
              </>
            )}

            {/* Driver linkleri */}
            {user.role === "DRIVER" && (
              <Link to="/driver" style={{ marginRight: 12 }}>
                Driver Dashboard
              </Link>
            )}

            {/* Admin linkleri */}
            {user.role === "ADMIN" && (
              <>
                <Link to="/admin/users" style={{ marginRight: 12 }}>
                  Users
                </Link>
                <Link to="/admin/requests" style={{ marginRight: 12 }}>
                  Requests
                </Link>
                <Link to="/admin/trips" style={{ marginRight: 12 }}>
                  Trips
                </Link>
                <Link to="/admin/stats" style={{ marginRight: 12 }}>
                  Stats
                </Link>
                <Link to="/admin/consistency" style={{ marginRight: 12 }}>
                  Consistency
                </Link>
              </>
            )}

            {/* COORDINATOR linkleri (admin ile aynı operasyon ekranlarına gider) */}
            {user.role === "COORDINATOR" && (
              <>
                <Link to="/coordinator" style={{ marginRight: 12 }}>
                  Dashboard
                </Link>
                <Link to="/coordinator/requests" style={{ marginRight: 12 }}>
                  Requests
                </Link>
              </>
            )}

            <button
              onClick={logout}
              style={{ marginLeft: 16, padding: "4px 8px" }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: 8 }}>
              Login
            </Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>

      {/* ROUTES */}
      <Routes>
        {/* / artık HomePage → giriş yapmışsa role göre redirect, değilse login */}
        <Route path="/" element={<HomePage />} />

        {/* Modern Design - New UI */}
        <Route path="/login" element={<LoginModern />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Test Routes for Old Design (if you want to compare) */}
        <Route path="/login-old" element={<LoginPage />} />
        <Route path="/passenger-old" element={<PassengerDashboard />} />

        {/* PASSENGER DASHBOARD - Modern Design */}
        <Route
          path="/passenger"
          element={
            <ProtectedRoute allowedRoles={["PASSENGER"]}>
              <PassengerDashboardModern />
            </ProtectedRoute>
          }
        />
        {/* PASSENGER -> TRIP HISTORY */}
        <Route
          path="/passenger/trips"
          element={
            <ProtectedRoute allowedRoles={["PASSENGER"]}>
              <PassengerTrips />
            </ProtectedRoute>
          }
        />
        {/* DRIVER DASHBOARD -> ANA SAYFA */}
        <Route
          path="/driver"
          element={
            <ProtectedRoute allowedRoles={["DRIVER"]}>
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        {/* DRIVER -> AVAILABLE REQUESTS */}
        <Route
          path="/driver/requests"
          element={
            <ProtectedRoute allowedRoles={["DRIVER"]}>
              <AvailableRequests />
            </ProtectedRoute>
          }
        />

        {/* DRIVER -> MY TRIPS */}
        <Route
          path="/driver/my-trips"
          element={
            <ProtectedRoute allowedRoles={["DRIVER"]}>
              <MyTrips />
            </ProtectedRoute>
          }
        />
        {/* COORDINATOR DASHBOARD */}
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute allowedRoles={["COORDINATOR"]}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        {/* COORDINATOR -> REQUESTS */}
        <Route
          path="/coordinator/requests"
          element={
            <ProtectedRoute allowedRoles={["COORDINATOR"]}>
              <CoordinatorRequests />
            </ProtectedRoute>
          }
        />
        {/* ADMIN DASHBOARD & ALT SAYFALAR */}

        {/* ADMIN */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminUserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pending-drivers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminPendingDrivers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pending-vehicles"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminPendingVehicles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/requests"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminGlobalRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/trips"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminGlobalTrips />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR", "DRIVER", "PASSENGER"]}>
              <TripDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR", "DRIVER", "PASSENGER"]}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminStats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/consistency"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminConsistency />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback -> login sayfasına yönlendir */}
        <Route path="*" element={<Navigate to="/login" replace />} />




      </Routes>



    </div>
  );
}