"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Role = "ADMIN" | "USER";

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  companyId: string | null;
  role: Role | null;
  userName: string | null;
  companyName: string | null;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthContext() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch("/api/protected/me", {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    success: boolean;
    data?: {
      userId: string;
      companyId: string;
      role: Role;
      userName: string | null;
      companyName: string | null;
    };
  };

  if (!body.success || !body.data) {
    return null;
  }

  return body.data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    isAuthenticated: false,
    userId: null,
    companyId: null,
    role: null,
    userName: null,
    companyName: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const context = await fetchAuthContext();

    if (!context) {
      setState({
        loading: false,
        isAuthenticated: false,
        userId: null,
        companyId: null,
        role: null,
        userName: null,
        companyName: null,
      });
      return;
    }

    setState({
      loading: false,
      isAuthenticated: true,
      userId: context.userId,
      companyId: context.companyId,
      role: context.role,
      userName: context.userName,
      companyName: context.companyName,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const context = await fetchAuthContext();

      if (cancelled) {
        return;
      }

      if (!context) {
        setState({
          loading: false,
          isAuthenticated: false,
          userId: null,
          companyId: null,
          role: null,
          userName: null,
          companyName: null,
        });
        return;
      }

      setState({
        loading: false,
        isAuthenticated: true,
        userId: context.userId,
        companyId: context.companyId,
        role: context.role,
        userName: context.userName,
        companyName: context.companyName,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }

    setState({
      loading: false,
      isAuthenticated: false,
      userId: null,
      companyId: null,
      role: null,
      userName: null,
      companyName: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      logout,
    }),
    [state, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
