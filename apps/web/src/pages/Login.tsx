import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { extractErrorMessage } from "../lib/api";
import { validateEmail, validateRequired } from "../lib/validators";

const REMEMBER_KEY = "nexus.remember.email";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  // Regra de UX: o e-mail lembrado fica APENAS no navegador, nunca visível no campo.
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Lembrar de mim": guarda o e-mail localmente sem pré-preencher o campo (nunca a senha).
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(effectiveEmail, password);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, effectiveEmail);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* noop */
      }
      setSuccess(true);
      // Pequena pausa para o indicador de sucesso antes do redirecionamento.
      setTimeout(() => {
        notify.success("Bem-vindo de volta!");
        navigate(from, { replace: true });
      }, 900);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível entrar."));
      setSubmitting(false);
    }
  }

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
        <h1 className="auth-title">Seja bem-vindo</h1>
        <p className="auth-sub">Insira os seus dados para continuar</p>

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

        <p className="auth-alt">
          Não tem uma conta?{" "}
          <Link to="/cadastro" className="auth-link">Criar conta</Link>
        </p>
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
