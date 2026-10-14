import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { extractErrorMessage } from "../lib/api";
import { notify } from "../lib/notify";
import { confirmarEmail, reenviarVerificacao } from "../lib/verificacao";
import { validateEmail } from "../lib/validators";

// F4 (decisão D2): a tela do link de confirmação.
//
// Quem chega aqui ainda não tem sessão nenhuma — o token no endereço é a
// credencial. A rota é /verificar-e-mail?token=..., exatamente o caminho que a
// mensagem de e-mail escreve (ver `enviarTokenDeVerificacao` na API).
//
// Um token velho, usado ou inexistente devolve a mesma frase, e a tela repete
// essa frase sem perguntar qual dos três foi: a resposta da API já não distingue,
// e uma tela que distinguisse seria um canal de informação sobre a lista de
// contas. O que a pessoa faz nesse caso é pedir outra mensagem, e o botão está
// aqui por causa disso.

type Estado = "confirmando" | "confirmado" | "recusado";

export function VerificarEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [estado, setEstado] = useState<Estado>(token ? "confirmando" : "recusado");
  const [mensagem, setMensagem] = useState<string>("");
  const [email, setEmail] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    (async () => {
      try {
        const confirmada = await confirmarEmail(token);
        if (cancelado) return;
        setMensagem("O e-mail " + confirmada.email + " foi confirmado.");
        setEstado("confirmado");
      } catch (erro) {
        if (cancelado) return;
        setMensagem(extractErrorMessage(erro, "Este link não é mais válido."));
        setEstado("recusado");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function reenviar() {
    const erro = validateEmail(email);
    if (erro) {
      notify.info(erro);
      return;
    }
    setReenviando(true);
    try {
      await reenviarVerificacao(email.trim());
      // A resposta é sempre a mesma frase genérica: se o endereço existe ou não
      // existe, a tela não tem como saber, e não é ela que vai contar.
      setReenviado(true);
    } catch (e) {
      notify.error(extractErrorMessage(e, "Não foi possível reenviar agora."));
    } finally {
      setReenviando(false);
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
        <h1 className="auth-title">
          {estado === "confirmando" ? "Confirmando o seu e-mail…" : estado === "confirmado" ? "Conta ativada" : "Confirme o seu e-mail"}
        </h1>
        <p className="auth-sub">
          {estado === "confirmando"
            ? "Assim que o link for conferido, a sua conta poderá entrar."
            : estado === "confirmado"
              ? mensagem
              : "O link que você abriu não vale mais. Peça outra mensagem e confira o e-mail que chegar."}
        </p>

        {estado === "confirmado" ? (
          <Link to="/login" className="neu-btn">
            ENTRAR
          </Link>
        ) : null}

        {estado === "recusado" ? (
          <div className="auth-form">
            {mensagem ? <p className="form-error" role="alert">{mensagem}</p> : null}
            <div className="field">
              {/* F5 (item 7): o rotulo vira <label for> de verdade. Um span com a cara do
                  rotulo nao da nome ao campo — quem usa leitor de tela ouve so o
                  "seu@email.com" do placeholder, que e exemplo, nao pergunta. */}
              <label className="field-label" htmlFor="nx-reenvio-email">E-mail da conta</label>
              <input
                id="nx-reenvio-email"
                type="email"
                className="neu-input"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="auth-hint">
                Digite o mesmo e-mail do cadastro. A nova mensagem chega com um link válido por
                sete dias.
              </span>
            </div>
            {reenviado ? (
              <p className="auth-hint">
                Se houver uma conta esperando confirmação neste endereço, a mensagem foi enviada
                agora. Confira também a caixa de spam.
              </p>
            ) : null}
            <button type="button" className="neu-btn" onClick={reenviar} disabled={reenviando}>
              {reenviando ? "Enviando…" : "REENVIAR A MENSAGEM"}
            </button>
            <Link to="/login" className="auth-link">
              Já confirmei, quero entrar
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
