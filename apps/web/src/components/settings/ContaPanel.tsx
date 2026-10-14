import { useEffect, useState } from "react";
import { extractErrorMessage, extractFieldErrors } from "../../lib/api";
import { notify } from "../../lib/notify";
import { useAuth } from "../../context/AuthContext";
import { mascaraTelefone } from "../../lib/masks";
import { validateName, validatePassword } from "../../lib/validators";
import { PASSWORD_RULE_HINT } from "../../lib/uiCopy";
import { PasswordInput } from "../PasswordInput";
import { Bloco, BotaoSalvar, Campo } from "../Fields";
import { gravarPerfil, trocarSenha, type MudancaPerfil } from "../../lib/settingsApi";

// ===== Aba "Minha conta" =====
// Aqui cada pessoa cuida de si: nome e telefone são da própria conta, e todo
// papel — até o STAFF — pode mexer neles. O que exige permissão fica na aba da
// empresa. O telefone passa pela máscara na digitação, mas é a API que confere o
// DDD: a tela não guarda uma segunda cópia dessa regra para discordar da primeira.

export function ContaPanel() {
  const { user, reload } = useAuth();

  const [nome, setNome] = useState(user?.name ?? "");
  const [telefone, setTelefone] = useState(mascaraTelefone(user?.phone ?? ""));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  // A sessão é a dona destes valores: depois do reload() — ou de trocar de
  // empresa — o formulário volta a refletir o que o servidor tem.
  useEffect(() => {
    setNome(user?.name ?? "");
    setTelefone(mascaraTelefone(user?.phone ?? ""));
    setErros({});
  }, [user]);

  const telefoneOriginal = mascaraTelefone(user?.phone ?? "");
  const mudou = nome !== (user?.name ?? "") || telefone !== telefoneOriginal;

  async function gravar() {
    if (!user) return;
    const erroNome = validateName(nome);
    if (erroNome) {
      setErros({ name: erroNome });
      return;
    }

    // Só o que difere do que está guardado é enviado: campo ausente não toca no
    // registro, e enviar o formulário inteiro apagaria o que a pessoa não viu.
    const mudanca: MudancaPerfil = {};
    if (nome !== user.name) mudanca.name = nome;
    if (telefone !== telefoneOriginal) mudanca.phone = telefone === "" ? null : telefone;
    if (Object.keys(mudanca).length === 0) {
      notify.info("Nada para gravar: os dados já estão assim.");
      return;
    }

    setOcupado(true);
    setErros({});
    try {
      const { alterados } = await gravarPerfil(mudanca);
      notify.success(
        alterados.length === 0
          ? "Nada para gravar: os dados já estavam assim."
          : "Seus dados foram atualizados.",
      );
      await reload();
    } catch (e) {
      setErros(extractFieldErrors(e));
      notify.error(extractErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Bloco
      titulo="Seus dados"
      sub="Nome e telefone identificam você nos registros da empresa ativa."
      acao={<BotaoSalvar aoSalvar={gravar} ocupado={ocupado} desabilitado={!mudou} />}
    >
      <div className="nx-grade">
        <Campo rotulo="Nome" valor={nome} aoMudar={setNome} maxLength={120} erro={erros.name} />
        <Campo
          rotulo="Telefone"
          valor={telefone}
          aoMudar={(v) => setTelefone(mascaraTelefone(v))}
          placeholder="(11) 98888-7777"
          maxLength={19}
          dica="Com DDD. Deixar vazio grava sem telefone."
          erro={erros.phone}
        />
        <Campo
          rotulo="E-mail de acesso"
          valor={user?.email ?? ""}
          aoMudar={() => {}}
          somenteLeitura
          dica="O e-mail é a identidade da conta e não se altera nesta tela."
        />
        <div className="field">
          <span className="field-label">Papel na empresa ativa</span>
          <span className="badge">{user?.role ?? "—"}</span>
        </div>
      </div>
    </Bloco>
  );
}

/**
 * Troca de senha autenticada. É um componente à parte porque o estado das três
 * senhas não pode se misturar com o do formulário de perfil: re-renderizar o
 * nome não pode limpar o que a pessoa já digitou aqui.
 */
export function SenhaPanel() {
  const { user, login, logout } = useAuth();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [trocando, setTrocando] = useState(false);

  const pronto = atual.length > 0 && nova.length > 0 && confirmar.length > 0;

  async function trocar() {
    const erros: Record<string, string> = {};
    if (atual.length === 0) erros.currentPassword = "Informe a senha atual.";
    const erroNova = validatePassword(nova);
    if (erroNova) erros.newPassword = erroNova;
    if (confirmar.length === 0) {
      erros.confirmar = "Confirme a senha digitada.";
    } else if (confirmar !== nova) {
      erros.confirmar = "As senhas não coincidem.";
    }
    if (Object.keys(erros).length > 0) {
      setErros(erros);
      return;
    }

    setTrocando(true);
    setErros({});
    let reentrou = false;
    try {
      const { sessionsRevoked } = await trocarSenha(atual, nova);
      // Trocar a senha revoga todos os refresh tokens, inclusive o desta aba.
      // Entrar de novo com a senha nova evita que a pessoa descubra a troca só
      // quando a sessão atual expirar, no meio de um cadastro.
      if (user) {
        try {
          const resultado = await login(user.email, nova);
          // D3: com o segundo fator ligado a senha não reabre a porta sozinha. A
          // sessão desta aba já era a senha velha e não existe mais — encerrar aqui
          // devolve a pessoa ao login, onde a etapa se completa do jeito certo.
          if (resultado.estado === "sessao") {
            reentrou = true;
          } else {
            await logout();
          }
        } catch {
          await logout();
        }
      }
      setAtual("");
      setNova("");
      setConfirmar("");
      notify.success(
        (reentrou
          ? "Senha alterada. "
          : "Senha alterada. Entre de novo para concluir a autenticação. ") +
          (sessionsRevoked === 1
            ? "Uma sessão anterior foi encerrada."
            : sessionsRevoked + " sessões anteriores foram encerradas."),
      );
    } catch (e) {
      setErros(extractFieldErrors(e));
      notify.error(extractErrorMessage(e, "Não foi possível alterar a senha."));
    } finally {
      setTrocando(false);
    }
  }

  return (
    <Bloco
      titulo="Senha de acesso"
      sub={"A mesma regra do cadastro vale aqui: " + PASSWORD_RULE_HINT}
      acao={
        <BotaoSalvar
          aoSalvar={trocar}
          ocupado={trocando}
          rotulo="Alterar senha"
          desabilitado={!pronto}
          neutra
        />
      }
    >
      <div className="nx-grade">
        <PasswordInput
          label="Senha atual"
          value={atual}
          onChange={setAtual}
          erro={erros.currentPassword}
          autoComplete="current-password"
        />
        <PasswordInput
          label="Nova senha"
          value={nova}
          onChange={setNova}
          erro={erros.newPassword}
          autoComplete="new-password"
        />
        <PasswordInput
          label="Confirme a nova senha"
          value={confirmar}
          onChange={setConfirmar}
          erro={erros.confirmar}
          autoComplete="new-password"
        />
      </div>
      <p className="nx-bloco-sub">
        Alterar a senha encerra as sessões abertas nos outros aparelhos. Esta aba continua
        conectada: ela entra de novo com a senha que acabou de ser gravada.
      </p>
    </Bloco>
  );
}
