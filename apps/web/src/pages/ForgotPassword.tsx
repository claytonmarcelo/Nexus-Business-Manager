import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { PasswordInput } from "../components/PasswordInput";
import { api, extractErrorMessage } from "../lib/api";
import { notify } from "../lib/notify";
import { validateEmail, validatePassword, validateConfirm } from "../lib/validators";
import { PASSWORD_RULE_HINT } from "../lib/uiCopy";

// Fluxo em duas etapas: solicitar codigo e depois redefinir a senha.
export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string | null; token?: string | null; password?: string | null; confirm?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function request(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errEmail = validateEmail(email);
    setErrors({ email: errEmail });
    if (errEmail) return;
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setStep(2);
      // Em desenvolvimento a API devolve o codigo (sem SMTP configurado).
      if (data.devToken) {
        setToken(data.devToken);
        setDevHint(data.devToken);
      }
      notify.success("Se o e-mail estiver cadastrado, enviaremos as instruções.");
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível iniciar a recuperação."));
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = {
      token: token.trim().length < 16 ? "Cole o código de recuperação recebido." : null,
      password: validatePassword(password),
      confirm: validateConfirm(password, confirm),
    };
    setErrors(errs);
    if (errs.token || errs.password || errs.confirm) return;
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { email: email.trim(), token: token.trim(), password });
      setSuccess(true);
      setTimeout(() => {
        notify.success("Senha redefinida! Faça login com a nova senha.");
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível redefinir a senha."));
      setBusy(false);
    }
  }

  return (
    <div className="app-bg auth-page">
      <header className="login-top">
        <Link to="/login" className="back-pill">
          <span className="back-pill-arrow" aria-hidden="true">&#8592;</span>
          <span>Voltar</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="auth-card">
        <div className="auth-logo">
          <Logo size={72} animation="heartbeat" />
        </div>
        <h1 className="auth-title">Recuperar senha</h1>
        <p className="auth-sub">{step === 1 ? "Informe o e-mail da sua conta" : "Digite o código e a nova senha"}</p>

        <div className="auth-steps" aria-hidden="true">
          <span className={"auth-step-dot" + (step === 1 ? " is-active" : "")} />
          <span className={"auth-step-dot" + (step === 2 ? " is-active" : "")} />
        </div>

        {step === 1 ? (
          <form onSubmit={request} className="auth-form" noValidate>
            <div className="field">
              <label className="field-label" htmlFor="nx-recuperacao-email">E-mail</label>
              <input
                id="nx-recuperacao-email"
                type="email"
                className={"neu-input" + (errors.email ? " is-error" : "")}
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: null })); }}
                onBlur={() => setErrors((x) => ({ ...x, email: validateEmail(email) }))}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="neu-btn" disabled={busy}>
              {busy ? "Enviando…" : "ENVIAR CÓDIGO"}
            </button>
            <p className="auth-alt">
              Lembrou a senha?{" "}
              <Link to="/login" className="auth-link">Entrar</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={reset} className="auth-form" noValidate>
            {devHint && (
              <div className="auth-dev-note">
                Modo desenvolvimento (sem e-mail configurado): seu código de recuperação é{" "}
                <strong>{devHint}</strong> - já preenchido abaixo.
              </div>
            )}
            <div className="field">
              <label className="field-label" htmlFor="nx-recuperacao-codigo">Código de recuperação</label>
              <input
                id="nx-recuperacao-codigo"
                type="text"
                className={"neu-input" + (errors.token ? " is-error" : "")}
                placeholder="Cole o código recebido"
                value={token}
                onChange={(e) => { setToken(e.target.value); if (errors.token) setErrors((x) => ({ ...x, token: null })); }}
              />
              {errors.token && <span className="field-error">{errors.token}</span>}
            </div>
            <div className="field">
              <PasswordInput label="Nova senha" value={password} onChange={(v) => { setPassword(v); if (errors.password) setErrors((x) => ({ ...x, password: null })); }} autoComplete="new-password" inputClassName={"neu-input" + (errors.password ? " is-error" : "")} />
              <span className="auth-hint">{PASSWORD_RULE_HINT}</span>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="field">
              <PasswordInput label="Confirmar nova senha" value={confirm} onChange={(v) => { setConfirm(v); if (errors.confirm) setErrors((x) => ({ ...x, confirm: null })); }} autoComplete="new-password" inputClassName={"neu-input" + (errors.confirm ? " is-error" : "")} />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="neu-btn" disabled={busy || success}>
              {busy ? "Salvando…" : "REDEFINIR SENHA"}
            </button>
          </form>
        )}
      </main>

      {success && (
        <div className="auth-success-overlay" role="status" aria-live="polite">
          <div className="auth-success-badge">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </div>
          <span className="auth-success-text">Senha redefinida!</span>
        </div>
      )}
    </div>
  );
}
