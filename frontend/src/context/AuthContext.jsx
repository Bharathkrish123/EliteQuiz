import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("eqg_token");
    if (!token) { setReady(true); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("eqg_token"))
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("eqg_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (email, username, password) => {
    const r = await api.post("/auth/register", { email, username, password });
    localStorage.setItem("eqg_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("eqg_token");
    setUser(null);
  };

  const refresh = async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch {}
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
