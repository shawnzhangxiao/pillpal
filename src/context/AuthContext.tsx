"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthState {
  userId: string | null;
  phone: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<string | null>;
  register: (phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          setUserId(data.id);
          setPhone(data.phone);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      return data.error || "登录失败";
    }
    const data = await res.json();
    setUserId(data.phone); // we don't get id back, use me endpoint
    setPhone(data.phone);
    router.push("/dashboard");
    return null;
  }, [router]);

  const register = useCallback(async (phone: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      return data.error || "注册失败";
    }
    router.push("/dashboard");
    return null;
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserId(null);
    setPhone(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ userId, phone, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
