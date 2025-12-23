// src/pages/Home.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "DRIVER":
      return <Navigate to="/driver" replace />;
    case "ADMIN":
      return <Navigate to="/admin/users" replace />;
    case "COORDINATOR":
      return <Navigate to="/admin/requests" replace />;
    case "PASSENGER":
    default:
      return <Navigate to="/passenger" replace />;
  }
}
