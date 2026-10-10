import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF";
  permissions: string[];
}

interface AuthCtx {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  can: (permission: string) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthCtx["status"]>("loading");

  const loadMe = useCallback(async () => {
    const { data } = await api.get<SessionUser>("/auth/me");
    setUser(data);
    setStatus("authenticated");
  }, []);

  // Bootstrap de sessão: tenta renovar via refresh token ao montar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refresh = tokenStore.getRefresh();
      if (!refresh) {
        setStatus("anonymous");
        return;
      }
      try {
        const { data } = await api.post("/auth/refresh", { refreshToken: refresh });
        tokenStore.setAccess(data.accessToken);
        tokenStore.setRefresh(data.refreshToken);
        if (cancelled) return;
        await loadMe();
      } catch {
        tokenStore.clear();
        if (!cancelled) setStatus("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear();
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener("nexus:session-expired", onExpired);
    return () => window.removeEventListener("nexus:session-expired", onExpired);
  }, []);

  const login = useCallback(
    async (email: string, password: string, companyId?: string) => {
      const { data } = await api.post("/auth/login", { email, password, companyId });
      tokenStore.setAccess(data.accessToken);
      tokenStore.setRefresh(data.refreshToken);
      setUser(data.user);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      await api.post("/auth/logout", { refreshToken: refresh });
    } catch {
      /* logout deve ser resiliente mesmo se a API falhar */
    }
    tokenStore.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const switchCompany = useCallback(
    async (companyId: string) => {
      const { data } = await api.post("/auth/switch-company", { companyId });
      tokenStore.setAccess(data.accessToken);
      tokenStore.setRefresh(data.refreshToken);
      setUser(data.user);
    },
    [],
  );

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.permissions.includes("*")) return true;
      if (user.permissions.includes(permission)) return true;
      const [resource] = permission.split(":");
      return user.permissions.includes(`${resource}:*`);
    },
    [user],
  );

  return (
    <Ctx.Provider value={{ user, status, login, logout, switchCompany, can }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
