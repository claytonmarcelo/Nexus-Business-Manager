import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "nexus.theme";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* noop */
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

// N7: a raiz do documento carrega o tema em dois atributos, e nunca em um só.
// Os tokens deste projeto lêem data-theme; o CSS do AdminLTE 4 que usamos lê
// data-bs-theme (sao 21 regras em adminlte.min.css, entre elas as variaveis da
// barra lateral, a seta do select, o switch, o botao de fechar e o
// color-scheme). Escrever so o nosso atributo deixava essas regras inertes: o
// shell ficava escuro sobre um painel claro. A escrita dupla e a unica porta de
// saida do tema — quem muda o tema muda os dois, sempre no mesmo lugar.
function escreveTema(tema: Theme): void {
  const raiz = document.documentElement;
  raiz.setAttribute("data-theme", tema);
  raiz.setAttribute("data-bs-theme", tema);
}

// O atributo vem de index.html como "dark" porque o banco não tem como saber a
// preferência de quem chega. Sem esta função, quem salvou o tema claro via a
// página um flash do tema errado antes de o React pintar. Ela é chamada em
// main.tsx antes do primeiro render — não num script inline do html, porque o
// CSP de produção (padrão do helmet) só deixa script de mesma origem.
export function aplicaTemaSalvo(): Theme {
  const tema = initialTheme();
  escreveTema(tema);
  return tema;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Inicializar pelo tema salvo já põe o atributo certo antes do primeiro
  // paint; o efeito abaixo continua responsável por acompanhar as mudanças.
  const [theme, setThemeState] = useState<Theme>(aplicaTemaSalvo);

  useEffect(() => {
    escreveTema(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
