import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Login } from "../pages/Login";
import { api } from "../lib/api";
import { tokenStore } from "../lib/tokenStore";
import { monteAdaptador, rotasDeSessao, USUARIO_DE_TESTE, type Rota } from "./fabrica-api";

// F5, item 1 (Problema C): a tela de entrada nao pode deixar rastro de senha neste
// navegador, e o "lembrar de mim" nao pode sobreviver a uma sessao encerrada.
//
// A senha desta prova e ficticia e existe so para ser procurada: cada caso abaixo
// verifica um lugar onde ela nao pode aparecer — armazenamento, console, URL,
// estado de rota — ou um dos tres momentos em que o campo tem de voltar vazio:
// depois de enviar, ao desmontar a tela e quando o navegador devolve a pagina do
// historico (o bfcache guarda o que estava digitado).
//
// O e-mail lembrado e outro dado, e a regra dele e diferente: pode ficar no
// navegador enquanto a sessao vive, e sai em todo fim de sessao.

const CHAVE_LEMBRADO = "nexus.remember.email";
const EMAIL_LEMBRADO = "dono.lembrado@empresa.teste";
const SENHA_DE_PROVA = "SenhaFicticia1!";

// 401 na senha: a tela mostra o erro e continua aberta, que e justamente o estado
// em que a senha digitada ainda esta no campo. A rota de sessao real atende o
// resto para o fluxo do AuthContext funcionar de verdade.
const REDE_DE_LOGIN: Rota[] = [
  { caminho: "/auth/login", status: 401, data: { error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." } },
  ...rotasDeSessao(),
];

function pareRede(rotas: Rota[]) {
  const adaptador = monteAdaptador(rotas);
  axios.defaults.adapter = adaptador;
  api.defaults.adapter = adaptador;
}

function monteLogin(rotas: Rota[] = REDE_DE_LOGIN) {
  pareRede(rotas);
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<div>tela do painel</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

/** Localizador robusto: o rotulo associado e provado a parte, no caso proprio. */
function campoEmail(): HTMLInputElement {
  const el = document.querySelector('input[type="email"]');
  if (!el) throw new Error("a tela de entrada nao tem campo de e-mail");
  return el as HTMLInputElement;
}

function campoSenha(): HTMLInputElement {
  const el = document.querySelector('input[type="password"]');
  if (!el) throw new Error("a tela de entrada nao tem campo de senha");
  return el as HTMLInputElement;
}

function digite(email: string, senha: string) {
  fireEvent.change(campoEmail(), { target: { value: email } });
  fireEvent.change(campoSenha(), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));
}

// ---------------------------------------------------------------------------
// As portas de fim de sessão: mesmo painel do teste de navegação, sem a vitrine
// real, para a assercao ficar no que saiu do navegador.
// ---------------------------------------------------------------------------

function SondaDeRota() {
  const { pathname } = useLocation();
  return <span data-testid="rota-atual">{pathname}</span>;
}

function PainelDeTeste() {
  const { logout } = useAuth();
  return (
    <div>
      tela de vendas
      <button type="button" onClick={() => void logout()}>sair do painel</button>
    </div>
  );
}

function montePainel(rotas: Rota[]) {
  pareRede(rotas);
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/app/vendas"]}>
          <SondaDeRota />
          <Routes>
            <Route path="/" element={<div>pagina de boas-vindas</div>} />
            <Route path="/login" element={<div>tela de entrada</div>} />
            <Route path="/app/vendas" element={<ProtectedRoute><PainelDeTeste /></ProtectedRoute>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

async function abraOPainelComEmailLembrado(rotas: Rota[] = rotasDeSessao()) {
  localStorage.setItem(CHAVE_LEMBRADO, EMAIL_LEMBRADO);
  tokenStore.setRefresh("r0");
  montePainel(rotas);
  await screen.findByText("tela de vendas");
  expect(localStorage.getItem(CHAVE_LEMBRADO)).toBe(EMAIL_LEMBRADO);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-bs-theme");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("O formulario de entrada monta sempre vazio", () => {
  it("os dois campos comecam vazios mesmo com um e-mail lembrado no navegador", () => {
    localStorage.setItem(CHAVE_LEMBRADO, EMAIL_LEMBRADO);
    monteLogin();
    expect(campoEmail().value).toBe("");
    expect(campoSenha().value).toBe("");
    // O lembrado continua sendo usado em silencio — a dica e o contrato visual.
    expect(document.body.textContent).toContain("e-mail lembrado");
  });

  it("o campo de e-mail nao se oferece ao gerenciador de senhas e o de senha pede senha nova", () => {
    monteLogin();
    const email = campoEmail();
    expect(email.autocomplete).toBe("off");
    // Nome e id neutros: nem "email", nem "user", nem "login" — o gerenciador de
    // senhas decide pelo texto dos atributos.
    const identificadores = (email.name + " " + email.id).toLowerCase();
    expect(identificadores).not.toMatch(/mail|user|usuario|login|conta|senha|password/);
    expect(campoSenha().autocomplete).toBe("new-password");
  });

  it("os dois campos tem rotulo associado, sem truque que piore a acessibilidade", () => {
    monteLogin();
    expect(screen.getByLabelText("E-mail")).toBe(campoEmail());
    expect(screen.getByLabelText("Senha")).toBe(campoSenha());
  });
});

describe("A senha e zerada nos tres momentos", () => {
  it("depois do envio, quando a entrada falha", async () => {
    monteLogin();
    digite("dono@empresa.teste", SENHA_DE_PROVA);
    await screen.findByRole("alert");
    expect(campoSenha().value).toBe("");
  });

  it("quando a tela desmonta", () => {
    const arvore = monteLogin();
    digite("dono@empresa.teste", SENHA_DE_PROVA);
    const campo = campoSenha();
    expect(campo.value).toBe(SENHA_DE_PROVA);
    arvore.unmount();
    // O no sai do documento, mas o valor que ele carregava e o que a limpeza
    // tinha de ter apagado: uma pagina restaurada do historico mostraria isso.
    expect(campo.value).toBe("");
  });

  it("quando o navegador devolve a pagina do historico", () => {
    monteLogin();
    digite("dono@empresa.teste", SENHA_DE_PROVA);
    const campo = campoSenha();
    expect(campo.value).toBe(SENHA_DE_PROVA);
    act(() => {
      const evento = new Event("pageshow");
      Object.defineProperty(evento, "persisted", { value: true });
      window.dispatchEvent(evento);
    });
    expect(campo.value).toBe("");
  });

  it("uma pageshow comum, de carregamento normal, nao apaga o que a pessoa esta digitando", () => {
    monteLogin();
    fireEvent.change(campoSenha(), { target: { value: SENHA_DE_PROVA } });
    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(campoSenha().value).toBe(SENHA_DE_PROVA);
  });
});

describe("A senha nao aparece em lugar nenhum que sobreviva ou se imprima", () => {
  it("nenhum setItem de armazenamento recebe a senha, nem localStorage nem sessionStorage", async () => {
    const escritas: string[] = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (chave: string, valor: string) {
      escritas.push(String(chave) + " :: " + String(valor).length + " chars");
      return original.call(this, chave, valor);
    };
    try {
      monteLogin();
      digite("dono@empresa.teste", SENHA_DE_PROVA);
      await screen.findByRole("alert");
      fireEvent.change(campoSenha(), { target: { value: SENHA_DE_PROVA } });
      digite("dono.lembrado@empresa.teste", SENHA_DE_PROVA);
      act(() => {
        const evento = new Event("pageshow");
        Object.defineProperty(evento, "persisted", { value: true });
        window.dispatchEvent(evento);
      });
    } finally {
      Storage.prototype.setItem = original;
    }
    const vazamento = escritas.filter((linha) => linha.includes(SENHA_DE_PROVA));
    expect(vazamento).toHaveLength(0);
    // O "lembrar de mim" so pode gravar o e-mail.
    expect(escritas.every((linha) => !linha.toLowerCase().includes("senha"))).toBe(true);
  });

  it("nenhum console imprime a senha", async () => {
    const vistos: string[] = [];
    for (const metodo of ["log", "info", "warn", "error", "debug"] as const) {
      const esiao = vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => {
        vistos.push(args.map((a) => (typeof a === "string" ? a : "")).join(" "));
      });
      expect(esiao.mock).toBeTruthy();
    }
    monteLogin();
    digite("dono@empresa.teste", SENHA_DE_PROVA);
    await screen.findByRole("alert");
    vi.restoreAllMocks();
    expect(vistos.filter((linha) => linha.includes(SENHA_DE_PROVA))).toHaveLength(0);
  });

  it("a URL e o estado de rota nao levam a senha", async () => {
    const rotas = [
      { caminho: "/auth/login", status: 200, data: { accessToken: "a1", refreshToken: "r1", user: USUARIO_DE_TESTE } },
      ...rotasDeSessao(),
    ];
    pareRede(rotas);
    const estados: { caminho: string; temState: boolean }[] = [];
    function Sonda() {
      const loc = useLocation();
      estados.push({ caminho: loc.pathname, temState: Boolean(loc.state) });
      return null;
    }
    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={["/login"]}>
            <Sonda />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/app" element={<Sonda />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>,
    );
    digite("dono@empresa.teste", SENHA_DE_PROVA);
    // A tela espera 900 ms antes de navegar: o login deu sessao, o painel abre.
    await waitFor(() => expect(estados.at(-1)?.caminho).toBe("/app"), { timeout: 3000 });
    expect(window.location.href).not.toContain(SENHA_DE_PROVA);
    // O destino nao leva estado nenhum: so o caminho.
    expect(estados.at(-1)?.temState).toBe(false);
  });
});

describe("O e-mail lembrado sai do navegador em todo fim de sessao", () => {
  it("logout pelo botao", async () => {
    await abraOPainelComEmailLembrado();
    fireEvent.click(screen.getByRole("button", { name: "sair do painel" }));
    await waitFor(() => expect(screen.getByTestId("rota-atual").textContent).toBe("/"));
    expect(localStorage.getItem(CHAVE_LEMBRADO)).toBeNull();
  });

  it("sessao expirada no meio do trabalho", async () => {
    await abraOPainelComEmailLembrado();
    act(() => {
      window.dispatchEvent(new Event("nexus:session-expired"));
    });
    await waitFor(() => expect(screen.getByTestId("rota-atual").textContent).toBe("/"));
    expect(localStorage.getItem(CHAVE_LEMBRADO)).toBeNull();
  });

  it("logout feito em outra aba", async () => {
    await abraOPainelComEmailLembrado();
    act(() => {
      localStorage.removeItem("nexus.refresh");
      window.dispatchEvent(new StorageEvent("storage", { key: "nexus.refresh", newValue: null, storageArea: localStorage }));
    });
    await waitFor(() => expect(screen.getByTestId("rota-atual").textContent).toBe("/"));
    expect(localStorage.getItem(CHAVE_LEMBRADO)).toBeNull();
  });

  it("renovacao que nao passa mais, na abertura do navegador", async () => {
    // Aqui a pessoa nem chega ao painel: o refresh token do disco nao vale mais,
    // e a sessao morre no bootstrap. O rastro tem de sair do mesmo jeito.
    localStorage.setItem(CHAVE_LEMBRADO, EMAIL_LEMBRADO);
    tokenStore.setRefresh("r0");
    montePainel([
      { caminho: "/auth/refresh", status: 401, data: { error: "UNAUTHORIZED" } },
      { caminho: "/auth/me", status: 200, data: USUARIO_DE_TESTE },
    ]);
    await waitFor(() => expect(screen.getByTestId("rota-atual").textContent).toBe("/"));
    expect(localStorage.getItem(CHAVE_LEMBRADO)).toBeNull();
  });

  it("a preferencia de tema deste navegador continua no lugar depois do logout", async () => {
    localStorage.setItem("nexus.theme", "light");
    await abraOPainelComEmailLembrado();
    fireEvent.click(screen.getByRole("button", { name: "sair do painel" }));
    await waitFor(() => expect(screen.getByTestId("rota-atual").textContent).toBe("/"));
    expect(localStorage.getItem("nexus.theme")).toBe("light");
  });
});
