// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, role }
  const [loading, setLoading] = useState(true);

  const normalizeUser = (u) => {
    if (!u) return null;
    return {
      id: u._id || u.id,
      name: u.name || "",
      email: u.email || "",
      role: u.role || "",
      profileImage: u.profileImage || "",
      createdAt: u.createdAt || "",
    };
  };

  // Sayfa yenilenince /app açıldığında kullanıcıyı otomatik yükle
  useEffect(() => {
    async function fetchMe() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        setUser(normalizeUser(res.data?.user));
      } catch (err) {
        console.error("Failed to fetch /auth/me", err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMe();
  }, []);

  const login = (userData, token) => {
    if (token) {
      localStorage.setItem("token", token);
    }
    setUser(normalizeUser(userData));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(normalizeUser(userData));
  };

  const value = { user, loading, login, logout, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}