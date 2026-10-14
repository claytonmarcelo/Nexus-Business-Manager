import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { extractErrorMessage } from "../lib/api";
import { validateEmail, validateName, validatePassword, validateConfirm } from "../lib/validators";
import { PASSWORD_RULE_HINT } from "../lib/uiCopy";
import { reenviarVerificacao } from "../lib/verificacao";

interface FieldErrors { name?: string | null; email?: string | null; password?: string | null; confirm?: string | null }

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // D2: depois do cadastro com verificação obrigatória, a tela troca de assunto —
  // deixa de ser formulário e passa a ser a instrução da caixa de entrada.
  const [pendente, setPendente] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

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
      const resultado = await register(form.name.trim(), form.email.trim(), form.password);
      // D2: com a verificação ligada a conta existe, mas não entra. A tela é o
      // "confirme o seu e-mail", e não o painel — navegar aqui seria fingir que
      // havia sessão quando a API respondeu exatamente o contrário.
      if (resultado.estado === "verificacao-pendente") {
        setPendente(true);
        setSubmitting(false);
        return;
      }
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

  async function reenviar() {
    setReenviando(true);
    try {
      await reenviarVerificacao(form.email.trim());
      setReenviado(true);
    } catch (err) {
      notify.error(extractErrorMessage(err, "Não foi possível reenviar agora."));
    } finally {
      setReenviando(false);
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
          <Logo size={72} animation="heartbeat" />
        </div>
        {pendente ? (
          <PainelVerificacao
            email={form.email}
            reenviando={reenviando}
            reenviado={reenviado}
            aoReenviar={reenviar}
          />
        ) : (
          <>
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
            <span className="auth-hint">{PASSWORD_RULE_HINT}</span>
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
          </>
        )}
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

/**
 * D2: a tela de quem acabou de criar conta e ainda não entrou.
 *
 * O endereço é o que a pessoa digitou — não há confirmação da API de que aquela
 * conta existe (a rota de reenvio responde a mesma frase genérica para qualquer
 * endereço), e a tela também não afirma nada além do que pode saber: "enviamos se
 * houver conta esperando". O link do e-mail leva para `/verificar-e-mail`, que é
 * onde o token é conferido.
 */
function PainelVerificacao(props: {
  email: string;
  reenviando: boolean;
  reenviado: boolean;
  aoReenviar: () => void;
}) {
  return (
    <>
      <h1 className="auth-title">Confirme o seu e-mail</h1>
      <p className="auth-sub">
        Enviamos uma mensagem para {props.email || "o endereço digitado"}. Abra-a e clique no
        link para ativar a conta — o link vale por sete dias.
      </p>
      <p className="auth-hint">
        Não recebeu? Confira a caixa de spam e peça outra mensagem. Se houver uma conta
        esperando confirmação neste endereço, ela chega de novo.
      </p>
      {props.reenviado ? (
        <p className="auth-hint">Pedido registrado. Confira a caixa de entrada em instantes.</p>
      ) : null}
      <div className="auth-form">
        <button type="button" className="neu-btn" onClick={props.aoReenviar} disabled={props.reenviando}>
          {props.reenviando ? "Enviando…" : "REENVIAR A MENSAGEM"}
        </button>
        <Link to="/login" className="auth-link">
          Já confirmei, quero entrar
        </Link>
      </div>
    </>
  );
}
