import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { extractErrorMessage } from "../lib/api";
import { validateEmail, validateRequired } from "../lib/validators";
import { destinoSeguro } from "../lib/destino";
import { prepararPeloTokenDeEtapa } from "../lib/segundoFator";

const REMEMBER_KEY = "nexus.remember.email";

// F4 (D3): a tela de entrada tem quatro passos, e não um formulário só.
//
//   credenciais -> codigo       (quem já ligou o segundo fator: falta o código)
//   credenciais -> configurar   (papel obrigado sem segundo fator: falta ligar)
//   configurar  -> codigos      (os dez códigos de recuperação aparecem aqui, uma vez)
//
// O que não muda é o que a pessoa vê entre passos: a mesma caixa, o mesmo
// botão. Uma etapa de autenticação que troca de layout no meio faz a pessoa
// duvidar de onde está.
type Etapa = "credenciais" | "codigo" | "configurar" | "codigos";

interface ConfiguraçãoDeEtapa {
  setupToken: string;
  mensagem: string;
  segredoBase32: string;
  uri: string;
  obrigatorio: boolean;
}

export function Login() {
  const { login, confirmarDesafio, ligarSegundoFatorNoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // T3.5: a rota de origem é texto que chegou por navegação. Só volta para ela
  // se for um caminho deste aplicativo (ver lib/destino.ts).
  const from = destinoSeguro((location.state as { from?: string } | null)?.from);

  const [etapa, setEtapa] = useState<Etapa>("credenciais");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  // Regra de UX: o e-mail lembrado fica APENAS no navegador, nunca visível no campo.
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Os dois tokens de etapa vivem em estado de tela, e só neles a tela se apoia:
  // não vão para o localStorage, não vão para nenhum lugar que sobreviva à aba.
  const [desafio, setDesafio] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfiguraçãoDeEtapa | null>(null);
  const [codigo, setCodigo] = useState("");
  const [codigosDeRecuperacao, setCodigosDeRecuperacao] = useState<string[]>([]);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(REMEMBER_KEY);
      if (salvo) {
        setRememberedEmail(salvo);
        setRemember(true);
      }
    } catch {
      /* storage indisponível */
    }
  }, []);

  // E-mail efetivo: o digitado tem prioridade; se o campo estiver vazio usamos o lembrado.
  const effectiveEmail = email.trim() || rememberedEmail || "";

  function validate(): boolean {
    const errs = {
      email: effectiveEmail ? null : validateEmail(email),
      password: validateRequired(password, "senha"),
    };
    setErrors(errs);
    return !errs.email && !errs.password;
  }

  function entrarNoPainel() {
    setSuccess(true);
    // Pequena pausa para o indicador de sucesso antes do redirecionamento.
    setTimeout(() => {
      notify.success("Bem-vindo de volta!");
      navigate(from, { replace: true });
    }, 900);
  }

  /** Sai da etapa e volta para a senha, sem deixar token de etapa na tela. */
  function desfazerEtapa() {
    setEtapa("credenciais");
    setDesafio(null);
    setConfig(null);
    setCodigo("");
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const resultado = await login(effectiveEmail, password);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, effectiveEmail);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* noop */
      }
      if (resultado.estado === "sessao") {
        entrarNoPainel();
        return;
      }
      if (resultado.estado === "desafio") {
        setDesafio(resultado.challengeToken);
        setEtapa("codigo");
        setSubmitting(false);
        return;
      }
      // Obrigatoriedade: o segredo é gerado agora, na mão da pessoa, e a etapa só
      // termina quando um código do aplicativo provar que ele foi lido.
      const segredo = await prepararPeloTokenDeEtapa(resultado.setupToken);
      setConfig({ setupToken: resultado.setupToken, mensagem: resultado.mensagem, ...segredo });
      setEtapa("configurar");
      setSubmitting(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível entrar."));
      setSubmitting(false);
    }
  }

  async function onCodigo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (codigo.trim().length === 0) {
      setError("Digite o código de seis dígitos do aplicativo, ou um código de recuperação.");
      return;
    }
    setSubmitting(true);
    try {
      if (etapa === "codigo" && desafio) {
        await confirmarDesafio(desafio, codigo.trim());
        entrarNoPainel();
        return;
      }
      if (etapa === "configurar" && config) {
        const ativado = await ligarSegundoFatorNoLogin(config.setupToken, codigo.trim());
        if (ativado.entrou) {
          // A sessão já foi instalada pelo contexto: o que falta nesta tela é o
          // que só existe nesta resposta — os códigos de recuperação, que a API
          // não mostra uma segunda vez.
          setCodigosDeRecuperacao(ativado.codigosDeRecuperacao);
          setDesafio(null);
          setConfig(null);
          setEtapa("codigos");
          setSubmitting(false);
          return;
        }
        setError("O segundo fator ligou, mas a sessão não foi emitida. Entre de novo.");
        setCodigo("");
        setConfig(null);
        setEtapa("credenciais");
        setSubmitting(false);
        return;
      }
      // Só se chega aqui se a tela perdeu o token da etapa (o botão "voltar para a
      // senha" é o único caminho normal). A mensagem fica visível de propósito: a
      // pessoa precisa saber que voltou para o começo, e não que está travada.
      setError("Esta etapa expirou. Faça login novamente.");
      setSubmitting(false);
      setEtapa("credenciais");
      setDesafio(null);
      setConfig(null);
      setCodigo("");
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível confirmar o código."));
      setSubmitting(false);
    }
  }

  const tituloDaEtapa =
    etapa === "codigo"
      ? "Segundo fator"
      : etapa === "configurar"
        ? "Ativar o segundo fator"
        : etapa === "codigos"
          ? "Guarde os seus códigos"
          : "Seja bem-vindo";

  const subDaEtapa =
    etapa === "codigo"
      ? "Digite o código do aplicativo autenticador. Um código de recuperação também abre."
      : etapa === "configurar"
        ? (config?.mensagem ?? "Cadastre a chave no seu aplicativo autenticador e confirme o código.")
        : etapa === "codigos"
          ? "Cada código abre a porta uma única vez, se o aplicativo não estiver à mão."
          : "Insira os seus dados para continuar";

  return (
    <div className="app-bg auth-page">
      <header className="login-top">
        <Link to="/" className="back-pill">
          <span className="back-pill-arrow" aria-hidden="true">←</span>
          <span>Voltar</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="auth-card">
        <div className="auth-logo">
          <Logo size={72} animation="heartbeat" />
        </div>
        <h1 className="auth-title">{tituloDaEtapa}</h1>
        <p className="auth-sub">{subDaEtapa}</p>

        {etapa === "credenciais" ? (
          <form onSubmit={onSubmit} className="auth-form" noValidate>
            <div className="field">
              <span className="field-label">E-mail</span>
              <input
                type="email"
                className={"neu-input" + (errors.email ? " is-error" : "")}
                autoComplete="off"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: null })); }}
                onBlur={() => setErrors((x) => ({ ...x, email: email.trim() || rememberedEmail ? null : validateEmail(email) }))}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
              {!errors.email && rememberedEmail && !email.trim() ? (
                <span className="auth-hint">Usaremos automaticamente o e-mail lembrado neste navegador.</span>
              ) : null}
            </div>

            <div className="field">
              <PasswordInput label="Senha" value={password} onChange={(v) => { setPassword(v); if (errors.password) setErrors((x) => ({ ...x, password: null })); }} autoComplete="current-password" inputClassName={"neu-input" + (errors.password ? " is-error" : "")} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="auth-row">
              <label className="neu-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="neu-check-box" aria-hidden="true" />
                <span>Lembrar de mim</span>
              </label>
              <Link to="/recuperar-senha" className="auth-link">Esqueceu a senha?</Link>
            </div>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="neu-btn" disabled={submitting || success}>
              {submitting ? "Entrando…" : "ENTRAR"}
            </button>
          </form>
        ) : null}

        {etapa === "configurar" && config ? (
          <div className="auth-2fa-chave">
            <p className="auth-hint">
              Abra o seu aplicativo autenticador, escolha "adicionar conta com uma chave" e
              digite a chave abaixo. Ela aparece uma única vez.
            </p>
            <p className="auth-2fa-segredo">{config.segredoBase32}</p>
            <details className="auth-2fa-uri">
              <summary>Endereço de configuração (para copiar em outro aparelho)</summary>
              <p>{config.uri}</p>
            </details>
          </div>
        ) : null}

        {etapa === "codigos" ? (
          <div className="auth-2fa-codigos">
            <ol>
              {codigosDeRecuperacao.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            <p className="auth-hint">
              Guarde estes códigos em lugar seguro — anotar fora do navegador é o que os mantém
              úteis se o aplicativo sumir. Nenhum deles aparece de novo aqui.
            </p>
          </div>
        ) : null}

        {etapa === "codigo" || etapa === "configurar" ? (
          <form onSubmit={onCodigo} className="auth-form" noValidate>
            <div className="field">
              <span className="field-label">Código</span>
              <input
                className={"neu-input auth-2fa-input" + (error ? " is-error" : "")}
                inputMode="text"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={12}
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value); if (error) setError(null); }}
              />
              <span className="auth-hint">
                Seis dígitos do aplicativo, ou um dos dez códigos de recuperação no formato
                abcde-fghij.
              </span>
            </div>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="neu-btn" disabled={submitting || success}>
              {submitting ? "Confirmando…" : etapa === "configurar" ? "ATIVAR E ENTRAR" : "ENTRAR"}
            </button>
            <button type="button" className="auth-link auth-2fa-voltar" onClick={desfazerEtapa}>
              Voltar para a senha
            </button>
          </form>
        ) : null}

        {etapa === "codigos" ? (
          <button type="button" className="neu-btn" onClick={entrarNoPainel} disabled={success}>
            ENTRAR NO PAINEL
          </button>
        ) : null}

        {etapa === "credenciais" ? (
          <p className="auth-alt">
            Não tem uma conta?{" "}
            <Link to="/cadastro" className="auth-link">Criar conta</Link>
          </p>
        ) : null}
      </main>

      {success && (
        <div className="auth-success-overlay" role="status" aria-live="polite">
          <div className="auth-success-badge">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </div>
          <span className="auth-success-text">Sucesso!</span>
        </div>
      )}
    </div>
  );
}
