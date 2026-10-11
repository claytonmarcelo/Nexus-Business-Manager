import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, refreshSession } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";
import { configurarFormatos } from "../lib/format";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  companyId: string;
  companyName: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF";
  permissions: string[];
  currency: string;
  timezone: string;
  language: string;
}

interface AuthCtx {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  reload: () => Promise<void>;
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

  // Moeda, fuso e idioma da empresa ativa governam a formatação das telas.
  // Sem sessão, volta ao padrão brasileiro.
  useEffect(() => {
    configurarFormatos(
      user ? { moeda: user.currency, fuso: user.timezone, idioma: user.language } : null,
    );
  }, [user]);

  // A tela de configurações pede a sessão de novo depois de gravar perfil ou
  // empresa, em vez de manter uma cópia local desses dados.
  const reload = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refresh = tokenStore.getRefresh();
      if (!refresh) {
        setStatus("anonymous");
        return;
      }
      // Bootstrap de sessão: uma unica renovacao compartilhada (ver lib/api.ts).
      const novoAccess = await refreshSession();
      if (cancelled) return;
      if (!novoAccess) {
        setStatus("anonymous");
        return;
      }
      try {
        await loadMe();
      } catch {
        tokenStore.clear();
        setStatus("anonymous");
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

  // Cadastro self-service: a API cria usuario + empresa (OWNER) e ja devolve sessao.
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await api.post("/auth/register", { name, email, password });
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
    <Ctx.Provider value={{ user, status, login, register, logout, switchCompany, reload, can }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
