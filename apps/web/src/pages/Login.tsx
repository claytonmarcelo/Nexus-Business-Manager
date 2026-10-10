import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { extractErrorMessage } from "../lib/api";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      notify.success("Bem-vindo de volta!");
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, "Não foi possível entrar."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-bg login-page">
      <header className="login-top">
        <Link to="/" className="login-back">← Voltar</Link>
        <ThemeToggle />
      </header>
      <main className="login-card card-surface animate-fade">
        <Logo size={72} animated />
        <h1 className="login-title">Entrar no Nexus</h1>
        <p className="login-sub">Acesse sua conta empresarial</p>

        <form onSubmit={onSubmit} className="login-form" noValidate>
          <label className="field">
            <span className="field-label">E-mail</span>
            <input
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Senha</span>
            <input
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-brand btn-block" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
