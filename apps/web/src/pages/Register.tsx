import { useEffect, useState, type FormEvent } from "react";
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
import { lerConteudoPublico } from "../lib/landingApi";
import { slugPeloKind, type ResumoLegal } from "../lib/landingTypes";
import { rotuloLegal } from "../lib/brand";

interface FieldErrors {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  confirm?: string | null;
  termos?: string | null;
  privacidade?: string | null;
}

// F7 (item 1, LGPD): os dois textos que a pessoa aceita para criar conta. As
// frases abaixo são as mesmas que a API devolve quando o corpo chega sem o
// aceite (apps/api/src/modules/auth/schemas.ts) — trocar uma sem trocar a outra
// deixaria a tela com uma mensagem e o servidor com outra para o mesmo erro.
const ACEITE_TERMOS = "Leia e aceite os Termos de uso para criar a conta";
const ACEITE_PRIVACIDADE = "Leia e aceite a Política de privacidade para criar a conta";

/**
 * Documento publicado deste kind, ou null.
 *
 * A tela não inventa endereço: o link para o texto só existe se aquele kind
 * estiver publicado, que é a mesma regra do rodapé (F1.2) e do editor de legais.
 * Sem publicação, a caixa continua obrigatória — quem aceita aceita o texto que a
 * instalação tem, e a linha de aceite gravada na API guarda a versão daquele
 * momento.
 */
function publicadoPara(legais: readonly ResumoLegal[], kind: "TERMS" | "PRIVACY"): ResumoLegal | null {
  const achado = legais.find((doc) => doc.published && doc.kind.toUpperCase() === kind);
  return achado ?? null;
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [aceites, setAceites] = useState({ termos: false, privacidade: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Conteúdo público: é daqui que a tela sabe quais textos existem de verdade para
  // linkar. Falhou a leitura, falaram os links — as caixas não dependem dela.
  const [legais, setLegais] = useState<ResumoLegal[]>([]);
  // D2: depois do cadastro com verificação obrigatória, a tela troca de assunto —
  // deixa de ser formulário e passa a ser a instrução da caixa de entrada.
  const [pendente, setPendente] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    let vivo = true;
    void lerConteudoPublico()
      .then((conteudo) => {
        // A lista chega inteira ou não chega: uma resposta atrasada de outra
        // montagem não pode reescrever a tela (N51).
        if (vivo) setLegais(Array.isArray(conteudo.legais) ? conteudo.legais : []);
      })
      .catch(() => {
        if (vivo) setLegais([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: null }));
  };

  const marca = (k: keyof typeof aceites) => (v: boolean) => {
    setAceites((a) => ({ ...a, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: null }));
  };

  function validate(): boolean {
    const errs: FieldErrors = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
      termos: aceites.termos ? null : ACEITE_TERMOS,
      privacidade: aceites.privacidade ? null : ACEITE_PRIVACIDADE,
    };
    setErrors(errs);
    return !errs.name && !errs.email && !errs.password && !errs.confirm
      && !errs.termos && !errs.privacidade;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const resultado = await register(form.name.trim(), form.email.trim(), form.password, {
        aceitaTermos: aceites.termos,
        aceitaPrivacidade: aceites.privacidade,
      });
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

  const termos = publicadoPara(legais, "TERMS");
  const privacidade = publicadoPara(legais, "PRIVACY");
  const enderecos = [termos, privacidade].filter((doc): doc is ResumoLegal => doc !== null);

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
            <label className="field-label" htmlFor="nx-cadastro-nome">Nome completo</label>
            <input
              id="nx-cadastro-nome"
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
            <label className="field-label" htmlFor="nx-cadastro-email">E-mail</label>
            <input
              id="nx-cadastro-email"
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

          {/* F7 (item 1): as duas declarações de aceite. São caixas separadas e
              obrigatórias as duas — um único "aceito tudo" apagaria a diferença
              entre o contrato de uso e o tratamento de dados pessoais, e a linha
              gravada na API guarda um kind por texto. */}
          <div className="field auth-consent">
            <label className={"neu-check" + (errors.termos ? " is-error" : "")} htmlFor="nx-cadastro-termos">
              <input
                id="nx-cadastro-termos"
                type="checkbox"
                checked={aceites.termos}
                onChange={(e) => marca("termos")(e.target.checked)}
              />
              <span className="neu-check-box" aria-hidden="true" />
              <span>Li e aceito os Termos de uso</span>
            </label>
            {errors.termos && <span className="field-error">{errors.termos}</span>}

            <label className={"neu-check" + (errors.privacidade ? " is-error" : "")} htmlFor="nx-cadastro-privacidade">
              <input
                id="nx-cadastro-privacidade"
                type="checkbox"
                checked={aceites.privacidade}
                onChange={(e) => marca("privacidade")(e.target.checked)}
              />
              <span className="neu-check-box" aria-hidden="true" />
              <span>Li e aceito a Política de privacidade</span>
            </label>
            {errors.privacidade && <span className="field-error">{errors.privacidade}</span>}

            {enderecos.length > 0 ? (
              <p className="auth-consent-links">
                {"Leia antes de aceitar:"}{" "}
                {enderecos.map((doc, i) => (
                  <span key={doc.kind}>
                    {i > 0 ? ", " : null}
                    <Link className="auth-link" to={"/legal/" + slugPeloKind(doc.kind)}>
                      {rotuloLegal(doc)}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
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
