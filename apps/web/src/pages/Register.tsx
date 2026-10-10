import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { extractErrorMessage } from "../lib/api";
import { validateEmail, validateName, validatePassword, validateConfirm } from "../lib/validators";

interface FieldErrors { name?: string | null; email?: string | null; password?: string | null; confirm?: string | null }

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: null }));
  };

  function validate(): boolean {
    const errs: FieldErrors = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
    };
    setErrors(errs);
    return !errs.name && !errs.email && !errs.password && !errs.confirm;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      setSuccess(true);
      setTimeout(() => {
        notify.success("Conta criada com sucesso! Bem-vindo ao Nexus.");
        navigate("/app", { replace: true });
      }, 1100);
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível criar a conta."));
      setSubmitting(false);
    }
  }

  return (
    <div className="app-bg auth-page">
      <header className="login-top">
        <Link to="/login" className="back-pill">
          <span className="back-pill-arrow" aria-hidden="true">←</span>
          <span>Voltar</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="auth-card">
        <div className="auth-logo">
          <Logo size={62} animation="heartbeat" />
        </div>
        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-sub">Inicie a sua jornada conosco</p>

        <form onSubmit={onSubmit} className="auth-form" noValidate>
          <div className="field">
            <span className="field-label">Nome completo</span>
            <input
              type="text"
              className={"neu-input" + (errors.name ? " is-error" : "")}
              autoComplete="name"
              placeholder="Seu nome"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              onBlur={() => setErrors((x) => ({ ...x, name: validateName(form.name) }))}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field">
            <span className="field-label">E-mail</span>
            <input
              type="email"
              className={"neu-input" + (errors.email ? " is-error" : "")}
              autoComplete="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              onBlur={() => setErrors((x) => ({ ...x, email: validateEmail(form.email) }))}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field">
            <PasswordInput label="Senha" value={form.password} onChange={set("password")} autoComplete="new-password" inputClassName={"neu-input" + (errors.password ? " is-error" : "")} />
            <span className="auth-hint">Mínimo de 8 caracteres, com uma letra maiúscula e um caractere especial.</span>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="field">
            <PasswordInput label="Confirmar senha" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" inputClassName={"neu-input" + (errors.confirm ? " is-error" : "")} />
            {errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </div>

          {error && (
            <div className="form-error" role="alert">{error}</div>
          )}

          <button type="submit" className="neu-btn" disabled={submitting || success}>
            {submitting ? "Criando conta…" : "CRIAR CONTA"}
          </button>
        </form>

        <p className="auth-alt">
          Já tem uma conta?{" "}
          <Link to="/login" className="auth-link">Entrar</Link>
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
