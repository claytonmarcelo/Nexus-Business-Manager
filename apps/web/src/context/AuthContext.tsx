import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, refreshSession } from "../lib/api";
import { REFRESH_KEY, tokenStore } from "../lib/tokenStore";
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
  // Administrador da plataforma (Fase 1b): governa CMS e Rotinas, áreas que
  // não pertencem a nenhuma empresa. A API confere no banco a cada request;
  // aqui serve só para esconder o que a pessoa não pode abrir.
  platform: boolean;
}

// Por que a sessão desta aba terminou. É o que diz ao ProtectedRoute se o
// destino é a página de boas-vindas (havia sessão e ela acabou) ou o login
// (nunca houve sessão nenhuma), e é o que diz à vitrine se deve avisar.
export type FimDeSessao = "logout" | "expirada" | "outra-aba";

interface AuthCtx {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  reload: () => Promise<void>;
  can: (permission: string) => boolean;
  consumirFimDeSessao: () => FimDeSessao | null;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthCtx["status"]>("loading");

  // O motivo do fim de sessão vive num ref, e não num estado: quem o lê é o
  // ProtectedRoute, durante o render que decide o destino. Um setState chegaria
  // depois de <Navigate> já ter sido escolhido. Ler esvazia o registro, então o
  // aviso não se repete quando a pessoa simplesmente volta uma página.
  const fimRef = useRef<FimDeSessao | null>(null);
  // statusRef espelha o estado para os ouvintes de eventos (401, storage), que
  // precisam saber se havia sessão em curso para encerrar. Ele é escrito junto
  // com o próprio estado, e não em useEffect: o flush do efeito poderia deixar
  // o ref atrasado um instante, e é exatamente nesse instante que um clique em
  // "sair" acontece depois de montar a tela.
  const statusRef = useRef(status);
  const aplicaStatus = useCallback((proximo: AuthCtx["status"]) => {
    statusRef.current = proximo;
    setStatus(proximo);
  }, []);

  const consumirFimDeSessao = useCallback((): FimDeSessao | null => {
    const motivo = fimRef.current;
    fimRef.current = null;
    return motivo;
  }, []);

  // Registra o motivo sem depender do estado da tela. É o caso do bootstrap: ali
  // a prova de que havia sessão é o próprio refresh token que estava no disco, e
  // a renovação que não passa mais é uma sessão que terminou — não um visitante
  // que nunca entrou.
  const marque = useCallback((motivo: FimDeSessao) => {
    fimRef.current = motivo;
  }, []);

  // Encerra a sessão deste navegador guardando o motivo. Só age se havia sessão
  // autenticada: um 401 avulso recebido por quem nunca entrou não pode tratar
  // visitante como expirado, nem tirá-lo do caminho certo (o login).
  const encerrar = useCallback((motivo: FimDeSessao) => {
    if (statusRef.current !== "authenticated") return;
    fimRef.current = motivo;
    // clear() remove só o refresh token e o pulso da manutenção: preferências
    // deste navegador, como o tema escolhido, continuam no lugar.
    tokenStore.clear();
    setUser(null);
    aplicaStatus("anonymous");
  }, [aplicaStatus]);

  const loadMe = useCallback(async () => {
    const { data } = await api.get<SessionUser>("/auth/me");
    setUser(data);
    aplicaStatus("authenticated");
  }, [aplicaStatus]);

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
  }, [loadMe, aplicaStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refresh = tokenStore.getRefresh();
      if (!refresh) {
        aplicaStatus("anonymous");
        return;
      }
      // Bootstrap de sessão: uma unica renovacao compartilhada (ver lib/api.ts).
      const novoAccess = await refreshSession();
      if (cancelled) return;
      if (!novoAccess) {
        // Havia refresh token e a renovação não passou: a sessão desta pessoa
        // acabou antes desta tela, e o destino é a vitrine com o aviso.
        marque("expirada");
        tokenStore.clear();
        aplicaStatus("anonymous");
        return;
      }
      try {
        await loadMe();
      } catch {
        marque("expirada");
        tokenStore.clear();
        aplicaStatus("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, aplicaStatus, marque]);

  // O aviso vindo de lib/api.ts (401 sem renovação possível) chega aqui, e a
  // vitrine também o emite quando o cronômetro da API encerra a sessão.
  useEffect(() => {
    const onExpired = () => encerrar("expirada");
    window.addEventListener("nexus:session-expired", onExpired);
    return () => window.removeEventListener("nexus:session-expired", onExpired);
  }, [encerrar]);

  // Logout feito em outra aba: o refresh token saiu do localStorage e esta aba
  // só enxerga o evento de storage. A rotação da renovação grava um valor novo,
  // por isso a checada é no que ficou no disco, e não no recado em si: do
  // contrário cada renovação derrubaria a própria sessão.
  useEffect(() => {
    const onStorage = (evento: StorageEvent) => {
      // key === null é o localStorage.clear() de outra aba: a chave também sumiu.
      if (evento.key !== null && evento.key !== REFRESH_KEY) return;
      if (tokenStore.getRefresh()) return;
      encerrar("outra-aba");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [encerrar]);

  const login = useCallback(
    async (email: string, password: string, companyId?: string) => {
      const { data } = await api.post("/auth/login", { email, password, companyId });
      tokenStore.setAccess(data.accessToken);
      tokenStore.setRefresh(data.refreshToken);
      // Sessão nova: um motivo de fim antigo não tem mais o que avisar.
      fimRef.current = null;
      setUser(data.user);
      aplicaStatus("authenticated");
    },
    [aplicaStatus],
  );

  // Cadastro self-service: a API cria usuario + empresa (OWNER) e ja devolve sessao.
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await api.post("/auth/register", { name, email, password });
      tokenStore.setAccess(data.accessToken);
      tokenStore.setRefresh(data.refreshToken);
      fimRef.current = null;
      setUser(data.user);
      aplicaStatus("authenticated");
    },
    [aplicaStatus],
  );

  // Só encerra a sessão e diz por quê. O destino (a página de boas-vindas) é
  // garantia do ProtectedRoute, que vê o motivo registrado: um navigate() aqui
  // seria uma corrida com o estado e poderia ser atropelado por ele.
  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      await api.post("/auth/logout", { refreshToken: refresh });
    } catch {
      /* logout deve ser resiliente mesmo se a API falhar */
    }
    encerrar("logout");
  }, [encerrar]);

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
    <Ctx.Provider
      value={{
        user,
        status,
        login,
        register,
        logout,
        switchCompany,
        reload,
        can,
        consumirFimDeSessao,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
